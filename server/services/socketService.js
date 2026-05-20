let io;
const userSockets = new Map(); // userId -> socketId

const setupSocket = (socketServer) => {
  io = socketServer;

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Client sends their userId after connecting
    socket.on('register', (userId) => {
      userSockets.set(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`User ${userId} registered on socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      // Remove by socket id
      for (const [uid, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userSockets.delete(uid);
          break;
        }
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = { setupSocket, emitToUser, emitToAll };
