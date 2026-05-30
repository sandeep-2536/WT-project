const express = require('express');
const router = express.Router();
const {
  book, approve, reject, cancel, acceptSuggestion,
  getMyAppointments, getDoctorAppointments,
  getNurseAppointments, getAllAppointments,
} = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { bookAppointmentValidation, appointmentIdValidation, validate } = require('../middleware/validationMiddleware');

router.post('/book', authenticate, authorize('patient'), bookAppointmentValidation, validate, book);
router.patch('/:id/approve', authenticate, authorize('doctor'), appointmentIdValidation, validate, approve);
router.patch('/:id/reject', authenticate, authorize('doctor'), appointmentIdValidation, validate, reject);
router.patch('/:id/cancel', authenticate, authorize('patient'), appointmentIdValidation, validate, cancel);
router.patch('/:id/accept-suggestion', authenticate, authorize('patient'), appointmentIdValidation, validate, acceptSuggestion);

router.get('/my', authenticate, authorize('patient'), getMyAppointments);
router.get('/doctor', authenticate, authorize('doctor'), getDoctorAppointments);
router.get('/nurse', authenticate, authorize('nurse'), getNurseAppointments);
router.get('/all', authenticate, authorize('admin'), getAllAppointments);

module.exports = router;
