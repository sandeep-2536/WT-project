const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const AuditLog = require('../models/AuditLog');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
      specialization,
      department,
      qualifications,
      experience,
      consultationFee,
      maxLoad,
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return errorResponse(res, 'Email already registered', 409);

    const needsApproval = role === 'doctor' || role === 'nurse';
    const user = await User.create({
      name,
      email,
      password,
      role,
      isActive: !needsApproval,
      approvalStatus: needsApproval ? 'pending' : 'approved',
      requestedProfile: needsApproval
        ? {
            specialization,
            department,
            qualifications,
            experience,
            consultationFee,
            maxLoad,
          }
        : undefined,
    });

    await AuditLog.create({ userId: user._id, action: 'REGISTER', entity: 'User', entityId: user._id, ip: req.ip });

    if (needsApproval) {
      return successResponse(
        res,
        { user },
        'Registration request submitted. An admin must approve your account before you can log in.',
        201
      );
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken });

    successResponse(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return errorResponse(res, 'Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return errorResponse(res, 'Invalid credentials', 401);

    if (user.approvalStatus === 'pending') {
      return errorResponse(res, 'Account pending admin approval', 403);
    }
    if (user.approvalStatus === 'rejected') {
      return errorResponse(res, 'Account request rejected, contact admin', 403);
    }
    if (!user.isActive) return errorResponse(res, 'Account deactivated, contact admin', 403);

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken });

    await AuditLog.create({ userId: user._id, action: 'LOGIN', ip: req.ip });

    // Remove password from response
    const userObj = user.toJSON();

    successResponse(res, { user: userObj, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    successResponse(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    await AuditLog.create({ userId: req.user._id, action: 'LOGOUT', ip: req.ip });
    successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, { user });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

module.exports = { register, login, refresh, logout, getMe };
