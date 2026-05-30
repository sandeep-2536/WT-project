const express = require('express');
const router = express.Router();
const {
  getUsers,
  toggleUserStatus,
  getPendingUsers,
  approvePendingUser,
  rejectPendingUser,
  getDoctors,
  createDoctor,
  deleteDoctor,
  getNurses,
  getAnalytics,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/response');

const isAdmin = [authenticate, authorize('admin')];

router.get('/users', ...isAdmin, getUsers);
router.patch('/users/:id/toggle', ...isAdmin, toggleUserStatus);
router.get('/pending-users', ...isAdmin, getPendingUsers);
router.patch('/pending-users/:id/approve', ...isAdmin, approvePendingUser);
router.patch('/pending-users/:id/reject', ...isAdmin, rejectPendingUser);
router.get('/doctors', ...isAdmin, getDoctors);
router.post('/doctors', ...isAdmin, createDoctor);
router.delete('/doctors/:id', ...isAdmin, deleteDoctor);
router.get('/nurses', ...isAdmin, getNurses);
router.get('/analytics', ...isAdmin, getAnalytics);

// Notifications (any authenticated user)
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getForUser(req.user._id, page, limit);
    successResponse(res, result);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

module.exports = router;
