const express = require('express');
const Event = require('../models/Event');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const { getIO } = require('../socket');
const router = express.Router();

// Risk map for priority classification
const RISK_MAP = {
  'Multiple Faces': 50, 'Phone Detected': 40, 'No Face': 30,
  'Looking Away': 20, 'Multiple Voices': 35, 'Book Detected': 30,
  'book Detected': 30, 'remote Detected': 20, 'person Detected': 60,
  'Second Person Detected': 60, 'cell phone Detected': 40, 'laptop Detected': 15,
  'Tab Switching': 25, 'Copy Paste': 30, 'Dev Tools Open': 40,
  'Fullscreen Exit': 20, 'Face Mismatch': 50, 'Noise Spike': 25,
};

const getPriority = (eventType, riskPoints) => {
  if (riskPoints >= 40) return 'high';
  if (riskPoints >= 20) return 'medium';
  return 'low';
};

// ─── POST /api/events ─────────────────────────────────────────────
// Candidate sends a suspicious event (Edge AI metadata only — no video)
router.post('/', auth, async (req, res) => {
  try {
    const { sessionId, eventType, confidence, metadata } = req.body;

    if (!sessionId || !eventType || confidence === undefined) {
      return res.status(400).json({ error: 'sessionId, eventType, and confidence are required.' });
    }
    if (confidence < 0 || confidence > 1) {
      return res.status(400).json({ error: 'confidence must be between 0 and 1.' });
    }

    // Verify session belongs to requester and is active
    const session = await Session.findOne({
      _id: sessionId,
      candidateId: req.user.id,
      status: 'active'
    });
    if (!session) {
      return res.status(403).json({ error: 'Invalid or inactive session.' });
    }

    const event = await Event.create({
      sessionId,
      eventType,
      confidence,
      metadata: metadata || {},
    });

    // Update session's running risk score (optimistically)
    const base = RISK_MAP[eventType] || 10;
    const riskAdd = base * confidence;
    await Session.findByIdAndUpdate(sessionId, {
      $inc: { finalRiskScore: riskAdd },
    });
    // Re-clamp (MongoDB doesn't support clamping in $inc, so cap manually)
    await Session.findOneAndUpdate(
      { _id: sessionId, finalRiskScore: { $gt: 100 } },
      { finalRiskScore: 100 }
    );

    const priority = getPriority(eventType, event.riskPoints);

    // Build edge payload (metadata only — no raw video)
    const edgePayload = {
      candidateId: req.user.id,
      candidateName: req.user.name || 'Unknown',
      sessionId,
      event_type: eventType,    // ← Edge Decision Engine format
      confidence: confidence,
      timestamp: event.timestamp,
      risk_points: event.riskPoints,
      severity: event.severity,
      priority,
    };

    // Emit real-time alert to all admins
    try {
      const io = getIO();
      io.to('admins').emit('new-event', edgePayload);

      // High priority: also emit a dedicated alert
      if (priority === 'high') {
        io.to('admins').emit('high-risk-alert', edgePayload);
      }
    } catch { } // Socket not initialized yet in tests

    res.json({
      message: 'Event logged.',
      eventId: event._id,
      riskPoints: event.riskPoints,
      severity: event.severity,
      clipTriggered: event.clipTriggered, // Smart auto-recording flag
    });
  } catch (err) {
    console.error('Event log error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/events/:candidateId ─────────────────────────────────
// Admin fetches all events for a candidate (across their sessions)
router.get('/:candidateId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const sessions = await Session.find({ candidateId: req.params.candidateId })
      .sort({ startTime: -1 })
      .lean();

    if (!sessions.length) return res.json([]);

    const sessionIds = sessions.map(s => s._id);

    const { page = 1, limit = 100, severity, eventType } = req.query;
    const filter = { sessionId: { $in: sessionIds } };
    if (severity) filter.severity = severity;
    if (eventType) filter.eventType = eventType;

    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json(events);
  } catch (err) {
    console.error('Events fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/events/session/:sessionId ───────────────────────────
// Get events for a specific session
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const events = await Event.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;