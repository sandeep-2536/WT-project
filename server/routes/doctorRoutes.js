// doctorRoutes.js
const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, setAvailability, listDoctors, getAvailableSlots } = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/list', listDoctors);
router.get('/:id/slots', getAvailableSlots);
router.get('/profile', authenticate, authorize('doctor'), getProfile);
router.put('/profile', authenticate, authorize('doctor'), updateProfile);
router.put('/availability', authenticate, authorize('doctor'), setAvailability);

module.exports = router;
