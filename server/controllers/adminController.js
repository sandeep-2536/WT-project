const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Appointment = require('../models/Appointment');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    paginatedResponse(res, users, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// PATCH /api/admin/users/:id/toggle
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    user.isActive = !user.isActive;
    await user.save();
    successResponse(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/admin/doctors
const getDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 20, specialization } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

    const [doctors, total] = await Promise.all([
      Doctor.find(filter).populate('userId', 'name email isActive').skip(skip).limit(parseInt(limit)),
      Doctor.countDocuments(filter),
    ]);
    paginatedResponse(res, doctors, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// POST /api/admin/doctors  (create doctor profile for existing user)
const createDoctor = async (req, res) => {
  try {
    const { userId, specialization, qualifications, experience, consultationFee } = req.body;
    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 'User not found', 404);
    if (user.role !== 'doctor') {
      await User.findByIdAndUpdate(userId, { role: 'doctor' });
    }
    const doctor = await Doctor.create({ userId, specialization, qualifications, experience, consultationFee });
    successResponse(res, { doctor }, 'Doctor created', 201);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// DELETE /api/admin/doctors/:id
const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);
    await User.findByIdAndUpdate(doctor.userId, { role: 'patient' });
    successResponse(res, null, 'Doctor deleted');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/admin/nurses
const getNurses = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [nurses, total] = await Promise.all([
      Nurse.find().populate('userId', 'name email isActive').skip(skip).limit(parseInt(limit)),
      Nurse.countDocuments(),
    ]);
    paginatedResponse(res, nurses, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const [
      totalPatients, totalDoctors, totalNurses,
      totalAppointments, pendingAppointments, confirmedAppointments,
      completedAppointments, cancelledAppointments,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Doctor.countDocuments(),
      Nurse.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
    ]);

    // Appointments per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyData = await Appointment.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    successResponse(res, {
      counts: { totalPatients, totalDoctors, totalNurses, totalAppointments },
      appointmentsByStatus: { pendingAppointments, confirmedAppointments, completedAppointments, cancelledAppointments },
      monthlyData,
    });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

module.exports = { getUsers, toggleUserStatus, getDoctors, createDoctor, deleteDoctor, getNurses, getAnalytics };
