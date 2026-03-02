const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  finalRiskScore: { type: Number, default: 0, min: 0, max: 100 },
  integrityScore: { type: Number, default: 100, min: 0, max: 100 },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  mode: { type: String, enum: ['Exam', 'Interview', 'Certification'], default: 'Exam' },
  examId: { type: String, default: null },
  // Offline edge sync tracking
  offlineSynced: { type: Boolean, default: false },
  deviceInfo: {
    userAgent: String,
    resolution: String,
  }
}, { timestamps: true });

// Index for efficient lookups
SessionSchema.index({ candidateId: 1, status: 1 });
SessionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Session', SessionSchema);