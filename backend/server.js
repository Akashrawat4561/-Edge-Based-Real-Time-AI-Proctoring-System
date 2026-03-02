require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');
const socket = require('./socket');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ FATAL: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

const server = http.createServer(app);

// ── Database Connection ───────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('📦 Connected to MongoDB successfully.');

    // ── Initialize Socket.io ──────────────────────────────────────
    socket.init(server);
    console.log('📡 Socket.io initialized.');

    // ── Start Server ──────────────────────────────────────────────
    server.listen(PORT, () => {
      console.log(`🚀 Proctoring System Server is live on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// ── Graceful Shutdown ──────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('🔌 MongoDB connection closed. Exiting process.');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});