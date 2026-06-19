const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const logger = require('../utils/logger');

let io = null;

// Map of userId -> Set<socketId> (a user can have multiple connections)
const onlineUsers = new Map();

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

    // Handle joining a chat room
    socket.on('chat:join', (roomId) => {
      socket.join(`chat:${roomId}`);
      logger.info('Joined chat room', { userId, roomId });
    });

    // Handle leaving a chat room
    socket.on('chat:leave', (roomId) => {
      socket.leave(`chat:${roomId}`);
    });

    // Handle typing indicator
    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`chat:${roomId}`).emit('chat:typing', {
        userId,
        roomId,
        isTyping,
      });
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
    io.to(`chat:${roomId}`).emit(event, data);
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
