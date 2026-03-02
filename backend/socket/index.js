const socketio = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
  init: (server) => {
    io = socketio(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // ── JWT Authentication middleware ──────────────────────────────
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided.'));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // { id, role, name }
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid or expired token.'));
      }
    });

    // ── Connection handler ─────────────────────────────────────────
    io.on('connection', (socket) => {
      const { id: userId, role, name } = socket.user;
      console.log(`🔌 [Socket] ${role.toUpperCase()} connected: ${name || userId} (${socket.id})`);

      // Admin: join admin broadcast room
      if (role === 'admin') {
        socket.join('admins');
        console.log(`   ↳ Joined "admins" room`);

        // Admin can request candidate data refresh
        socket.on('request-refresh', () => {
          socket.emit('refresh-ack', { message: 'Refreshing data...' });
        });
      }

      // Candidate: join their own private room (for targeted alerts)
      if (role === 'candidate') {
        socket.join(`candidate:${userId}`);
        console.log(`   ↳ Joined "candidate:${userId}" room`);

        // Candidate can signal that they've started/stopped exam
        socket.on('exam-started', (data) => {
          console.log(`📋 Exam started by ${name}: session ${data?.sessionId}`);
          io.to('admins').emit('candidate-online', {
            candidateId: userId,
            candidateName: name,
            sessionId: data?.sessionId,
            timestamp: new Date(),
          });
        });

        socket.on('exam-ended', (data) => {
          console.log(`🏁 Exam ended by ${name}: session ${data?.sessionId}`);
          io.to('admins').emit('candidate-offline', {
            candidateId: userId,
            sessionId: data?.sessionId,
            timestamp: new Date(),
          });
        });
      }

      // ── Disconnect handler ───────────────────────────────────────
      socket.on('disconnect', (reason) => {
        console.log(`❌ [Socket] ${role.toUpperCase()} disconnected: ${name || userId} — ${reason}`);

        if (role === 'candidate') {
          io.to('admins').emit('candidate-disconnected', {
            candidateId: userId,
            candidateName: name,
            reason,
            timestamp: new Date(),
          });
        }
      });

      // ── Ping/pong for connection health check ────────────────────
      socket.on('ping-check', () => {
        socket.emit('pong-check', { ts: Date.now() });
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.io has not been initialized. Call init(server) first.');
    return io;
  },
};