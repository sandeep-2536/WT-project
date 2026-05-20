const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

const create = async ({ userId, title, message, type, relatedAppointment }) => {
  const notification = await Notification.create({
    userId, title, message, type, relatedAppointment,
  });
  // Push to client in real-time
  emitToUser(userId.toString(), 'notification', notification);
  return notification;
};

const getForUser = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ userId }),
  ]);
  return { notifications, total };
};

const markRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
};

const markAllRead = async (userId) => {
  return Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, isRead: false });
};

module.exports = { create, getForUser, markRead, markAllRead, getUnreadCount };
