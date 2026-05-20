const { validationResult, body, param, query } = require('express-validator');
const { errorResponse } = require('../utils/response');

// Run validation and return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }
  next();
};

// Auth validators
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['patient', 'doctor', 'nurse']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Appointment validators
const bookAppointmentValidation = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID required'),
  body('date').isISO8601().withMessage('Valid date required (ISO 8601)'),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid time required (HH:MM)'),
  body('reason').optional().isLength({ max: 500 }),
];

const appointmentIdValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID required'),
];

// Pagination validators
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  bookAppointmentValidation,
  appointmentIdValidation,
  paginationValidation,
};
