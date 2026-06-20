const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const logger = require('../utils/logger');

let io = null;

// Map of userId -> Set<socketId> (a user can have multiple connections)
const onlineUsers = new Map();

// Map of consultationId -> Set<socketId> (who's in the consultation room)
const consultationRooms = new Map();

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    logger.info('Socket connected', { userId, socketId: socket.id });

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit('user:online', { userId, online: true });

    // ==================== CHAT EVENTS ====================
    socket.on('chat:join', (roomId) => {
      socket.join(`chat:${roomId}`);
      logger.info('Joined chat room', { userId, roomId });
    });

    socket.on('chat:leave', (roomId) => {
      socket.leave(`chat:${roomId}`);
    });

    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`chat:${roomId}`).emit('chat:typing', { userId, roomId, isTyping });
    });

    // ==================== WEBRTC CONSULTATION EVENTS ====================

    // Join a consultation room
    socket.on('consultation:join', ({ consultationId }) => {
      socket.join(`consultation:${consultationId}`);
      if (!consultationRooms.has(consultationId)) {
        consultationRooms.set(consultationId, new Set());
      }
      consultationRooms.get(consultationId).add(socket.id);
      socket.consultationId = consultationId;
      logger.info('User joined consultation room', { userId, consultationId, socketId: socket.id });
      socket.to(`consultation:${consultationId}`).emit('consultation:user-joined', {
        userId,
        userName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
        role: socket.user.role,
      });
    });

    // Leave a consultation room
    socket.on('consultation:leave', ({ consultationId }) => {
      socket.leave(`consultation:${consultationId}`);
      const room = consultationRooms.get(consultationId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) consultationRooms.delete(consultationId);
      }
      socket.to(`consultation:${consultationId}`).emit('consultation:user-left', { userId });
    });

    // WebRTC Offer
    socket.on('webrtc:offer', ({ consultationId, offer, targetUserId }) => {
      logger.info('WebRTC offer', { from: userId, to: targetUserId, consultationId });
      io.to(`user:${targetUserId}`).emit('webrtc:offer', {
        offer, fromUserId: userId,
        fromUserName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim(),
        consultationId,
      });
    });

    // WebRTC Answer
    socket.on('webrtc:answer', ({ consultationId, answer, targetUserId }) => {
      logger.info('WebRTC answer', { from: userId, to: targetUserId, consultationId });
      io.to(`user:${targetUserId}`).emit('webrtc:answer', { answer, fromUserId: userId, consultationId });
    });

    // WebRTC ICE Candidate
    socket.on('webrtc:ice-candidate', ({ consultationId, candidate, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', { candidate, fromUserId: userId, consultationId });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId, socketId: socket.id, reason });
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId, online: false });
        }
      }
      // Clean up consultation room membership
      if (socket.consultationId) {
        const room = consultationRooms.get(socket.consultationId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) consultationRooms.delete(socket.consultationId);
        }
        io.to(`consultation:${socket.consultationId}`).emit('consultation:user-left', { userId });
      }
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToRoom(roomId, event, data) {
  if (io) {
    io.to(roomId).emit(event, data);
  }
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRoom,
  isUserOnline,
  getOnlineUsers,
};
