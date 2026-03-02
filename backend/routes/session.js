const express = require('express');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const router = express.Router();

// ─── POST /api/session/start ──────────────────────────────────────
router.post('/start', auth, async (req, res) => {
  try {
    const { examId, mode, deviceInfo } = req.body;

    // Prevent duplicate active sessions
    const existing = await Session.findOne({ candidateId: req.user.id, status: 'active' });
    if (existing) {
      // Return existing session so candidate can resume
      return res.json({ sessionId: existing._id, resumed: true });
    }

    const session = await Session.create({
      candidateId: req.user.id,
      examId: examId || null,
      mode: mode || 'Exam',
      deviceInfo: deviceInfo || {},
    });

    res.json({ sessionId: session._id, resumed: false });
  } catch (err) {
    console.error('Session start error:', err);
    res.status(500).json({ error: 'Could not start session.' });
  }
});

// ─── POST /api/session/end ────────────────────────────────────────
router.post('/end', auth, async (req, res) => {
  try {
    const { sessionId, finalRiskScore } = req.body;

    const session = await Session.findOne({ _id: sessionId, candidateId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (session.status === 'ended') {
      return res.json({ message: 'Session already ended.', sessionId });
    }

    const risk = Math.min(100, Math.max(0, finalRiskScore || 0));
    const integrity = Math.max(0, Math.min(100, 100 - risk * 0.8));

    session.endTime = new Date();
    session.finalRiskScore = risk;
    session.integrityScore = Math.round(integrity);
    session.status = 'ended';
    await session.save();

    res.json({ message: 'Session ended successfully.', sessionId, integrityScore: session.integrityScore });
  } catch (err) {
    console.error('Session end error:', err);
    res.status(500).json({ error: 'Could not end session.' });
  }
});

// ─── GET /api/session/current ─────────────────────────────────────
// Returns the current active session for the logged-in candidate
router.get('/current', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ candidateId: req.user.id, status: 'active' });
    if (!session) return res.json(null);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/session/sync-offline ──────────────────────────────
// Flush offline-stored events when network reconnects
router.post('/sync-offline', auth, async (req, res) => {
  try {
    const { events } = req.body; // array of { sessionId, eventType, confidence, metadata, timestamp }
    if (!Array.isArray(events) || events.length === 0) {
      return res.json({ synced: 0 });
    }

    const Event = require('../models/Event');
    const { getIO } = require('../socket');

    let synced = 0;
    for (const ev of events) {
      try {
        const session = await Session.findOne({ _id: ev.sessionId, candidateId: req.user.id });
        if (!session) continue;

        const event = await Event.create({
          sessionId: ev.sessionId,
          eventType: ev.eventType,
          confidence: ev.confidence,
          metadata: ev.metadata || {},
          timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
        });

        // Notify admins
        try {
          const io = getIO();
          io.to('admins').emit('new-event', {
            candidateId: req.user.id,
            sessionId: ev.sessionId,
            eventType: ev.eventType,
            confidence: ev.confidence,
            timestamp: event.timestamp,
            offlineSync: true,
          });
        } catch { }

        synced++;
      } catch { }
    }

    // Mark session as synced
    if (events[0]?.sessionId) {
      await Session.updateOne({ _id: events[0].sessionId }, { offlineSynced: true });
    }

    res.json({ synced });
  } catch (err) {
    console.error('Offline sync error:', err);
    res.status(500).json({ error: 'Sync failed.' });
  }
});

module.exports = router;