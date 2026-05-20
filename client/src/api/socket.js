import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) return;

  socket = io(window.location.origin, {
    withCredentials: true,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket.emit('register', userId);
  });

  // Global notification handler
  socket.on('notification', (data) => {
    toast.success(data.title || 'New notification');
  });

  socket.on('appointment_confirmed', () => {
    toast.success('Your appointment has been confirmed!');
  });

  socket.on('appointment_rejected', () => {
    toast.error('Your appointment was rejected.');
  });
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
