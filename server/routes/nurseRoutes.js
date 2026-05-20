const express = require('express');
const router = express.Router();
const Nurse = require('../models/Nurse');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../utils/response');

router.get('/profile', authenticate, authorize('nurse'), async (req, res) => {
  try {
    const nurse = await Nurse.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!nurse) return errorResponse(res, 'Nurse profile not found', 404);
    successResponse(res, { nurse });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

router.put('/availability', authenticate, authorize('nurse'), async (req, res) => {
  try {
    const nurse = await Nurse.findOneAndUpdate(
      { userId: req.user._id },
      { availability: req.body.availability },
      { new: true }
    );
    successResponse(res, { nurse }, 'Availability updated');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

module.exports = router;
