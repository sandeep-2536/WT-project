const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Appointment = require('../models/Appointment');
const appointmentService = require('../services/appointmentService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const parseList = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

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

// POST /api/admin/users
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      specialization,
      department,
      qualifications,
      experience,
      consultationFee,
      maxLoad,
    } = req.body;

    if (!name || !email || !password || !role) {
      return errorResponse(res, 'Name, email, password, and role are required', 400);
    }
    if (!['patient', 'doctor', 'nurse'].includes(role)) {
      return errorResponse(res, 'Admin can create patient, doctor, or nurse users only', 400);
    }
    if (password.length < 8) {
      return errorResponse(res, 'Password must be at least 8 characters', 400);
    }
    if (role === 'doctor' && !specialization) {
      return errorResponse(res, 'Specialization is required for doctors', 400);
    }
    if (role === 'nurse' && !department) {
      return errorResponse(res, 'Department is required for nurses', 400);
    }

    const existing = await User.findOne({ email });
    if (existing) return errorResponse(res, 'Email already registered', 409);

    const user = await User.create({
      name,
      email,
      password,
      role,
      isActive: true,
      approvalStatus: 'approved',
    });

    if (role === 'doctor') {
      await Doctor.create({
        userId: user._id,
        specialization,
        qualifications: parseList(qualifications),
        experience: Number(experience) || 0,
        consultationFee: Number(consultationFee) || 0,
      });
    }

    if (role === 'nurse') {
      await Nurse.create({
        userId: user._id,
        department,
        qualifications: parseList(qualifications),
        maxLoad: Number(maxLoad) || 8,
      });
    }

    successResponse(res, { user }, `${role} user created`, 201);
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

// GET /api/admin/pending-users
const getPendingUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;
    const filter = {
      approvalStatus: 'pending',
      role: { $in: ['doctor', 'nurse'] },
    };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    paginatedResponse(res, users, page, limit, total);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// PATCH /api/admin/pending-users/:id/approve
const approvePendingUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    if (!['doctor', 'nurse'].includes(user.role)) {
      return errorResponse(res, 'Only doctor and nurse requests can be approved here', 400);
    }
    if (user.approvalStatus !== 'pending') {
      return errorResponse(res, 'User request is not pending', 400);
    }

    if (user.role === 'doctor') {
      const profile = user.requestedProfile || {};
      await Doctor.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          specialization: profile.specialization || 'General',
          qualifications: parseList(profile.qualifications),
          experience: profile.experience ?? 0,
          consultationFee: profile.consultationFee ?? 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      const profile = user.requestedProfile || {};
      await Nurse.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          department: profile.department || 'General',
          qualifications: parseList(profile.qualifications),
          maxLoad: profile.maxLoad ?? 8,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    user.approvalStatus = 'approved';
    user.isActive = true;
    await user.save();

    successResponse(res, { user }, `${user.role} approved successfully`);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// PATCH /api/admin/pending-users/:id/reject
const rejectPendingUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    if (user.approvalStatus !== 'pending') {
      return errorResponse(res, 'User request is not pending', 400);
    }

    user.approvalStatus = 'rejected';
    user.isActive = false;
    await user.save();

    successResponse(res, { user }, 'User request rejected');
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

// PATCH /api/admin/appointments/:id/assign-nurse
const assignNurseToAppointment = async (req, res) => {
  try {
    const { nurseId } = req.body;
    if (!nurseId) return errorResponse(res, 'Nurse is required', 400);

    const appointment = await appointmentService.assignNurseToAppointment(req.params.id, nurseId);
    successResponse(res, { appointment }, 'Nurse assigned to appointment');
  } catch (err) {
    errorResponse(res, err.message, err.statusCode || 500);
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

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus,
  getPendingUsers,
  approvePendingUser,
  rejectPendingUser,
  getDoctors,
  createDoctor,
  deleteDoctor,
  getNurses,
  assignNurseToAppointment,
  getAnalytics,
};
