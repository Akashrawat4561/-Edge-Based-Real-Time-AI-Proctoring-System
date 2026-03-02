const mongoose = require('mongoose');

const RISK_MAP = {
  'Multiple Faces': 50, 'Phone Detected': 40, 'No Face': 30,
  'Looking Away': 20, 'Multiple Voices': 35, 'book Detected': 30,
  'Book Detected': 30, 'remote Detected': 20, 'person Detected': 60,
  'Second Person Detected': 60, 'cell phone Detected': 40,
  'laptop Detected': 15, 'Tab Switching': 25, 'Copy Paste': 30,
  'Dev Tools Open': 40, 'Fullscreen Exit': 20, 'Face Mismatch': 50,
  'Noise Spike': 25, 'Network Drop': 10, 'Offline Mode': 5, 'Whisper Detected': 30,
};

const EventSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  // Open string — edge AI may send custom event types
  eventType: { type: String, required: true, trim: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  timestamp: { type: Date, default: Date.now },
  riskPoints: { type: Number, default: 0 },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Smart auto-recording flag: clip triggered when riskPoints >= 40
  clipTriggered: { type: Boolean, default: false },
}, { timestamps: true });

// Pre-save: auto-compute riskPoints, severity, and clipTriggered
EventSchema.pre('save', function (next) {
  const base = RISK_MAP[this.eventType] || 10;
  this.riskPoints = Math.round(base * Math.min(1, Math.max(0, this.confidence || 0.5)));
  this.clipTriggered = this.riskPoints >= 40;
  this.severity = this.riskPoints >= 40 ? 'high' : this.riskPoints >= 20 ? 'medium' : 'low';
  next();
});

// Indexes for fast lookups
EventSchema.index({ sessionId: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1, eventType: 1 });
EventSchema.index({ severity: 1 });

module.exports = mongoose.model('Event', EventSchema);