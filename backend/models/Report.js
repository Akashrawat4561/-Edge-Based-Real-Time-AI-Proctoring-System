const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    integrityScore: { type: Number, default: 100, min: 0, max: 100 },
    finalRiskScore: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    // Violation categories
    faceViolations: { type: Number, default: 0 },
    objectViolations: { type: Number, default: 0 },
    audioViolations: { type: Number, default: 0 },
    browserViolations: { type: Number, default: 0 },
    // AI analysis
    aiRecommendation: { type: String, default: '' },
    riskLevel: { type: String, enum: ['safe', 'warning', 'high_risk'], default: 'safe' },
    remarks: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ReportSchema.index({ candidateId: 1 });
ReportSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('Report', ReportSchema);
