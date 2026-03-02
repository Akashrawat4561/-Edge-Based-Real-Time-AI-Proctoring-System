const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
  // Face verification data (optional)
  faceDescriptor: {
    type: [Number], // array of floats for 128d face embeddings
    default: undefined
  },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
}, { timestamps: true });

// Index for faster login lookups
UserSchema.index({ email: 1 });

module.exports = mongoose.model('User', UserSchema);