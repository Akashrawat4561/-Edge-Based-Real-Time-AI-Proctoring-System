const express = require('express');
const Session = require('../models/Session');
const Event = require('../models/Event');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// All admin routes require authentication + admin role
router.use(auth, requireRole('admin'));

// ─── Risk & Integrity computation helpers ──────────────────────────
const RISK_MAP = {
  'Multiple Faces': 50, 'Phone Detected': 40, 'No Face': 30,
  'Looking Away': 20, 'Multiple Voices': 35, 'Book Detected': 30,
  'book Detected': 30, 'remote Detected': 20, 'person Detected': 60,
  'Second Person Detected': 60, 'cell phone Detected': 40,
  'laptop Detected': 15, 'Tab Switching': 25, 'Copy Paste': 30,
  'Dev Tools Open': 40, 'Fullscreen Exit': 20, 'Face Mismatch': 50,
};

const computeIntegrity = (events) => {
  if (!events.length) return 100;
  let totalRisk = 0;
  events.forEach(e => {
    totalRisk += (RISK_MAP[e.eventType] || 10) * (e.confidence || 0.5);
  });
  const avgRisk = totalRisk / events.length;
  return Math.max(0, Math.min(100, Math.round(100 - avgRisk)));
};

const getAIRecommendation = (integrityScore) => {
  if (integrityScore >= 85) return 'Excellent integrity. Exam result is fully reliable.';
  if (integrityScore >= 70) return 'Good integrity with minor events. Result is likely reliable.';
  if (integrityScore >= 50) return 'Moderate suspicious activity. Manual review recommended.';
  if (integrityScore >= 30) return 'Significant violations detected. High probability of assistance. Review required.';
  return 'Critical integrity failure. Strong recommendation to invalidate this exam result.';
};

// ─── GET /api/admin/live ──────────────────────────────────────────
// All currently active candidate sessions with event counts
router.get('/live', async (req, res) => {
  try {
    const sessions = await Session.find({ status: 'active' })
      .populate('candidateId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(sessions.map(async (s) => {
      const eventCount = await Event.countDocuments({ sessionId: s._id });
      const highRiskCount = await Event.countDocuments({ sessionId: s._id, severity: 'high' });
      return { ...s, eventCount, highRiskCount };
    }));

    res.json(result);
  } catch (err) {
    console.error('Live sessions error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/admin/report/:sessionId ────────────────────────────
// Full AI integrity report for a session
router.get('/report/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('candidateId', 'name email');

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const events = await Event.find({ sessionId: session._id })
      .sort({ timestamp: 1 })
      .lean();

    const integrityScore = session.integrityScore || computeIntegrity(events);

    // Violation breakdown
    const faceViolations = events.filter(e =>
      ['Multiple Faces', 'No Face', 'Looking Away', 'Face Mismatch'].includes(e.eventType)).length;
    const objectViolations = events.filter(e =>
      e.eventType.includes('Detected')).length;
    const audioViolations = events.filter(e =>
      ['Multiple Voices', 'Noise Spike', 'Whisper Detected'].includes(e.eventType)).length;
    const browserViolations = events.filter(e =>
      ['Tab Switching', 'Fullscreen Exit', 'Copy Paste', 'Dev Tools Open'].includes(e.eventType)).length;

    const aiRecommendation = getAIRecommendation(integrityScore);
    const duration = session.endTime
      ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000)
      : null;

    res.json({
      session,
      events,
      integrityScore,
      aiRecommendation,
      violations: { faceViolations, objectViolations, audioViolations, browserViolations },
      duration,
      totalRiskEvents: events.length,
      highSeverityCount: events.filter(e => e.severity === 'high').length,
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/admin/candidate-sessions/:candidateId ───────────────
// All sessions for a specific candidate (newest first)
router.get('/candidate-sessions/:candidateId', async (req, res) => {
  try {
    const sessions = await Session.find({ candidateId: req.params.candidateId })
      .sort({ startTime: -1 })
      .lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/risk ───────────────────────────────
// Aggregate risk analytics across all ended sessions
router.get('/analytics/risk', async (req, res) => {
  try {
    const sessions = await Session.find({ status: 'ended' }).lean();

    const safe = sessions.filter(s => (s.finalRiskScore || 0) < 31).length;
    const warning = sessions.filter(s => (s.finalRiskScore || 0) >= 31 && (s.finalRiskScore || 0) < 71).length;
    const danger = sessions.filter(s => (s.finalRiskScore || 0) >= 71).length;
    const avgRisk = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + (s.finalRiskScore || 0), 0) / sessions.length)
      : 0;
    const avgIntegrity = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + (s.integrityScore || 100), 0) / sessions.length)
      : 100;

    // Most common violation type
    const allEvents = await Event.find({}).lean();
    const typeCount = {};
    allEvents.forEach(e => { typeCount[e.eventType] = (typeCount[e.eventType] || 0) + 1; });
    const mostCommon = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

    res.json({
      totalSessions: sessions.length,
      activeSessions: await Session.countDocuments({ status: 'active' }),
      safe, warning, danger, avgRisk, avgIntegrity,
      mostCommonViolation: mostCommon ? { type: mostCommon[0], count: mostCommon[1] } : null,
      totalEvents: allEvents.length,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/trends ─────────────────────────────
// Daily event trends for the last 7 days
router.get('/analytics/trends', async (req, res) => {
  try {
    const days = 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await Event.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json(events);
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/admin/candidates/all ───────────────────────────────
// All registered candidates
router.get('/candidates/all', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { role: 'candidate' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const candidates = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);
    res.json({ candidates, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;