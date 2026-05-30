const appointmentService = require('../services/appointmentService');
const Appointment = require('../models/Appointment');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// POST /api/appointments/book  (patient)
const book = async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;
    const appointment = await appointmentService.bookAppointment({
      patientId: req.user._id,
      doctorId,
      date,
      time,
      reason,
    });
    successResponse(res, { appointment }, 'Appointment request submitted', 201);
  } catch (err) {
    if (err.alternates) {
      return res.status(err.statusCode || 409).json({
        success: false,
        message: err.message,
        alternates: err.alternates,
      });
    }
    errorResponse(res, err.message, err.statusCode || 500);
  }
};

// PATCH /api/appointments/:id/approve  (doctor)
const approve = async (req, res) => {
  try {
    const appointment = await appointmentService.approveAppointment(req.params.id, req.user._id);
    successResponse(res, { appointment }, 'Appointment approved');
  } catch (err) {
    errorResponse(res, err.message, err.statusCode || 500);
  }
};

// PATCH /api/appointments/:id/reject  (doctor)
const reject = async (req, res) => {
  try {
    const appointment = await appointmentService.rejectAppointment(
      req.params.id,
      req.user._id,
      req.body.reason
    );
    successResponse(res, { appointment }, 'Appointment rejected');
  } catch (err) {
    errorResponse(res, err.message, err.statusCode || 500);
  }
};

// PATCH /api/appointments/:id/cancel  (patient)
const cancel = async (req, res) => {
  try {
    const appointment = await appointmentService.cancelAppointment(
      req.params.id,
      req.user._id,
      req.body.reason
    );
    successResponse(res, { appointment }, 'Appointment cancelled');
  } catch (err) {
    errorResponse(res, err.message, err.statusCode || 500);
  }
};

// PATCH /api/appointments/:id/accept-suggestion  (patient)
const acceptSuggestion = async (req, res) => {
  try {
    const appointment = await appointmentService.acceptReplacementSuggestion(
      req.params.id,
      req.user._id
    );
    successResponse(res, { appointment }, 'Replacement appointment request submitted');
  } catch (err) {
    errorResponse(res, err.message, err.statusCode || 500);
  }
};

// GET /api/appointments/my  (patient — their own)
const getMyAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = { patientId: req.user._id };
    if (status) filter.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('doctorId', 'specialization qualifications')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } })
        .populate({
          path: 'replacementSuggestion.doctorId',
          select: 'specialization consultationFee',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate('nurseId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    paginatedResponse(res, appointments, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/appointments/doctor  (doctor — their queue)
const getDoctorAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    const skip = (page - 1) * limit;

    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return errorResponse(res, 'Doctor profile not found', 404);

    const filter = { doctorId: doctor._id };
    if (status) filter.status = status;
    if (date) filter.date = new Date(date);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId', 'name email')
        .populate('nurseId')
        .sort({ date: 1, time: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    paginatedResponse(res, appointments, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/appointments/nurse  (nurse — their assigned)
const getNurseAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10, date } = req.query;
    const skip = (page - 1) * limit;

    const Nurse = require('../models/Nurse');
    const nurse = await Nurse.findOne({ userId: req.user._id });
    if (!nurse) return errorResponse(res, 'Nurse profile not found', 404);

    const filter = { nurseId: nurse._id, status: 'confirmed' };
    if (date) filter.date = new Date(date);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId', 'name email')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .sort({ date: 1, time: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    paginatedResponse(res, appointments, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/appointments/all  (admin)
const getAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date, doctorId } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    if (date) filter.date = new Date(date);
    if (doctorId) filter.doctorId = doctorId;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId', 'name email')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .populate({ path: 'nurseId', populate: { path: 'userId', select: 'name' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    paginatedResponse(res, appointments, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

module.exports = {
  book,
  approve,
  reject,
  cancel,
  acceptSuggestion,
  getMyAppointments,
  getDoctorAppointments,
  getNurseAppointments,
  getAllAppointments,
};
