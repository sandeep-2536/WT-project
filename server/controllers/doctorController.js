const Doctor = require('../models/Doctor');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// GET /api/doctor/profile
const getProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!doctor) return errorResponse(res, 'Doctor profile not found', 404);
    successResponse(res, { doctor });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// PUT /api/doctor/profile
const updateProfile = async (req, res) => {
  try {
    const { specialization, qualifications, experience, consultationFee, bio } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      { specialization, qualifications, experience, consultationFee, bio },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');
    if (!doctor) return errorResponse(res, 'Doctor profile not found', 404);
    successResponse(res, { doctor }, 'Profile updated');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// PUT /api/doctor/availability
const setAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      { availability },
      { new: true }
    );
    if (!doctor) return errorResponse(res, 'Doctor profile not found', 404);
    successResponse(res, { doctor }, 'Availability updated');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/doctor/list?specialization=&page=&limit=
const listDoctors = async (req, res) => {
  try {
    const { specialization, page = 1, limit = 12, search } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

    let query = Doctor.find(filter).populate('userId', 'name email');
    if (search) {
      // Search by name (via population) is tricky — use aggregation or filter after fetch for simplicity
    }

    const [doctors, total] = await Promise.all([
      query.skip(skip).limit(parseInt(limit)),
      Doctor.countDocuments(filter),
    ]);

    paginatedResponse(res, doctors, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/doctor/:id/slots?date=
const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return errorResponse(res, 'Date query param required', 400);

    const appointmentService = require('../services/appointmentService');
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);

    const slots = await appointmentService.getAlternateSlots(doctor, date, 20);
    successResponse(res, { slots });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

module.exports = { getProfile, updateProfile, setAvailability, listDoctors, getAvailableSlots };
