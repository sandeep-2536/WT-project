const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/patient/profile
router.get('/profile', authenticate, authorize('patient'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, { user });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

// PUT /api/patient/profile
router.put('/profile', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true });
    successResponse(res, { user }, 'Profile updated');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

module.exports = router;
