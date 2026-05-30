/**
 * AppointmentService — all appointment lifecycle logic lives here, not in controllers.
 * Controllers call these methods and return HTTP responses.
 */

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const notificationService = require('./notificationService');
const { emitToUser } = require('./socketService');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDocumentId = (value) => value?._id || value;
const idsEqual = (left, right) => getDocumentId(left)?.toString() === getDocumentId(right)?.toString();

/**
 * Check if a doctor has the given day/time slot in their availability.
 */
const isDoctorAvailable = (doctor, date, time) => {
  const dayName = DAY_NAMES[new Date(date).getDay()];
  const slot = doctor.availability.find(
    (s) => s.day === dayName && s.isAvailable
  );
  if (!slot) return false;

  // Compare HH:MM
  return time >= slot.startTime && time < slot.endTime;
};

/**
 * Check if a time slot is already booked (excluding a specific appointment for rescheduling).
 */
const isSlotBooked = async (doctorId, date, time, excludeId = null) => {
  const query = {
    doctorId,
    date: new Date(date),
    time,
    status: { $in: ['pending', 'confirmed'] },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Appointment.findOne(query);
  return !!existing;
};

const findReplacementDoctor = async (appointment, rejectedDoctor) => {
  const baseQuery = { _id: { $ne: rejectedDoctor._id } };
  const date = appointment.date;
  const time = appointment.time;
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const findAvailable = async (specializationFilter) => {
    const doctors = await Doctor.find({
      ...baseQuery,
      specialization: specializationFilter,
    })
      .populate('userId', 'name email isActive')
      .sort({ rating: -1, createdAt: 1 });

    for (const doctor of doctors) {
      if (!doctor.userId?.isActive) continue;
      if (!isDoctorAvailable(doctor, date, time)) continue;
      const booked = await isSlotBooked(doctor._id, date, time);
      if (!booked) return doctor;
    }
    return null;
  };

  return (
    await findAvailable(new RegExp(`^${escapeRegex(rejectedDoctor.specialization)}$`, 'i'))
  ) || await findAvailable(/general/i);
};

/**
 * Generate alternate available slots for a doctor on a given date.
 */
const getAlternateSlots = async (doctor, date, count = 5) => {
  const dayName = DAY_NAMES[new Date(date).getDay()];
  const slot = doctor.availability.find((s) => s.day === dayName && s.isAvailable);
  if (!slot) return [];

  const slots = [];
  const [startH, startM] = slot.startTime.split(':').map(Number);
  const [endH, endM] = slot.endTime.split(':').map(Number);
  const duration = slot.slotDuration || 30;

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const bookedSlots = await Appointment.find({
    doctorId: doctor._id,
    date: new Date(date),
    status: { $in: ['pending', 'confirmed'] },
  }).select('time');

  const bookedTimes = new Set(bookedSlots.map((a) => a.time));

  while (currentMinutes + duration <= endMinutes && slots.length < count) {
    const h = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const m = String(currentMinutes % 60).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    if (!bookedTimes.has(timeStr)) {
      slots.push(timeStr);
    }
    currentMinutes += duration;
  }

  return slots;
};

/**
 * Auto-assign a nurse to an appointment based on availability and load.
 */
const assignNurse = async (appointment) => {
  const dayName = DAY_NAMES[new Date(appointment.date).getDay()];

  // Find nurses available on that day with load below max
  const nurses = await Nurse.find({
    'availability.day': dayName,
    'availability.isAvailable': true,
  }).populate('userId', 'name');

  // Filter by load capacity
  const available = nurses.filter((n) => n.currentLoad < n.maxLoad);
  if (!available.length) return null;

  // Pick nurse with lowest current load
  available.sort((a, b) => a.currentLoad - b.currentLoad);
  const nurse = available[0];

  // Update nurse load
  await Nurse.findByIdAndUpdate(nurse._id, { $inc: { currentLoad: 1 } });

  return nurse;
};

/**
 * Book a new appointment — main entry point called by patient controller.
 */
const bookAppointment = async ({ patientId, doctorId, date, time, reason }) => {
  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
  if (!doctor) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  if (!isDoctorAvailable(doctor, date, time)) {
    const alternates = await getAlternateSlots(doctor, date);
    throw Object.assign(
      new Error('Doctor is not available at the requested time'),
      { statusCode: 409, alternates }
    );
  }

  const alreadyBooked = await isSlotBooked(doctorId, date, time);
  if (alreadyBooked) {
    const alternates = await getAlternateSlots(doctor, date);
    throw Object.assign(
      new Error('This slot is already booked'),
      { statusCode: 409, alternates }
    );
  }

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    date: new Date(date),
    time,
    reason,
    status: 'pending',
  });

  // Notify doctor
  await notificationService.create({
    userId: doctor.userId._id,
    title: 'New appointment request',
    message: `You have a new appointment request for ${date} at ${time}`,
    type: 'general',
    relatedAppointment: appointment._id,
  });

  emitToUser(doctor.userId._id.toString(), 'new_appointment_request', {
    appointment,
    message: 'New appointment request received',
  });

  return appointment;
};

/**
 * Approve an appointment — called by doctor controller.
 */
const approveAppointment = async (appointmentId, doctorUserId) => {
  const appointment = await Appointment.findById(appointmentId).populate('doctorId');
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (!idsEqual(appointment.doctorId.userId, doctorUserId)) {
    throw Object.assign(new Error('Not authorised'), { statusCode: 403 });
  }

  if (appointment.status !== 'pending') {
    throw Object.assign(new Error(`Cannot approve appointment with status: ${appointment.status}`), { statusCode: 400 });
  }

  // Auto-assign nurse
  const nurse = await assignNurse(appointment);

  appointment.status = 'confirmed';
  if (nurse) appointment.nurseId = nurse._id;
  await appointment.save();

  // Notify patient
  await notificationService.create({
    userId: appointment.patientId,
    title: 'Appointment confirmed',
    message: `Your appointment on ${appointment.date.toDateString()} at ${appointment.time} has been confirmed.${nurse ? ` Nurse ${nurse.userId?.name} has been assigned.` : ''}`,
    type: 'appointment_confirmed',
    relatedAppointment: appointment._id,
  });

  // Notify nurse if assigned
  if (nurse) {
    await notificationService.create({
      userId: nurse.userId._id,
      title: 'New appointment assigned',
      message: `You have been assigned to an appointment on ${appointment.date.toDateString()} at ${appointment.time}`,
      type: 'nurse_assigned',
      relatedAppointment: appointment._id,
    });

    emitToUser(nurse.userId._id.toString(), 'nurse_assigned', { appointment });
  }

  emitToUser(appointment.patientId.toString(), 'appointment_confirmed', { appointment });

  return appointment;
};

/**
 * Reject an appointment — called by doctor controller.
 */
const rejectAppointment = async (appointmentId, doctorUserId, reason) => {
  const appointment = await Appointment.findById(appointmentId).populate({
    path: 'doctorId',
    populate: { path: 'userId', select: 'name isActive' },
  });
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (!idsEqual(appointment.doctorId.userId, doctorUserId)) {
    throw Object.assign(new Error('Not authorised'), { statusCode: 403 });
  }

  if (appointment.status !== 'pending') {
    throw Object.assign(new Error(`Cannot reject appointment with status: ${appointment.status}`), { statusCode: 400 });
  }

  appointment.status = 'rejected';
  appointment.rejectionReason = reason;
  const replacementDoctor = await findReplacementDoctor(appointment, appointment.doctorId);
  appointment.replacementSuggestion = replacementDoctor
    ? {
        doctorId: replacementDoctor._id,
        date: appointment.date,
        time: appointment.time,
        status: 'pending',
      }
    : { status: 'unavailable' };
  await appointment.save();

  const replacementText = replacementDoctor
    ? ` Dr. ${replacementDoctor.userId?.name || 'another doctor'} is available at the same time. Please confirm if you want this replacement.`
    : ' No replacement doctor is currently available for the same time.';

  await notificationService.create({
    userId: appointment.patientId,
    title: 'Appointment rejected',
    message: `Your appointment on ${appointment.date.toDateString()} at ${appointment.time} was rejected. ${reason ? `Reason: ${reason}.` : ''}${replacementText}`,
    type: 'appointment_rejected',
    relatedAppointment: appointment._id,
  });

  emitToUser(appointment.patientId.toString(), 'appointment_rejected', { appointment });

  return appointment;
};

const acceptReplacementSuggestion = async (appointmentId, patientId) => {
  const original = await Appointment.findById(appointmentId)
    .populate('replacementSuggestion.doctorId')
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

  if (!original) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  if (!idsEqual(original.patientId, patientId)) {
    throw Object.assign(new Error('Not authorised'), { statusCode: 403 });
  }
  if (original.status !== 'rejected') {
    throw Object.assign(new Error('Only rejected appointments can use a replacement suggestion'), { statusCode: 400 });
  }
  if (original.replacementSuggestion?.status !== 'pending' || !original.replacementSuggestion?.doctorId) {
    throw Object.assign(new Error('No pending replacement suggestion available'), { statusCode: 400 });
  }

  const doctor = original.replacementSuggestion.doctorId;
  const date = original.replacementSuggestion.date || original.date;
  const time = original.replacementSuggestion.time || original.time;

  if (!isDoctorAvailable(doctor, date, time)) {
    original.replacementSuggestion.status = 'unavailable';
    await original.save();
    throw Object.assign(new Error('Suggested doctor is no longer available'), { statusCode: 409 });
  }

  const booked = await isSlotBooked(doctor._id, date, time);
  if (booked) {
    original.replacementSuggestion.status = 'unavailable';
    await original.save();
    throw Object.assign(new Error('Suggested slot is no longer available'), { statusCode: 409 });
  }

  const appointment = await Appointment.create({
    patientId: original.patientId,
    doctorId: doctor._id,
    date,
    time,
    reason: original.reason,
    status: 'pending',
    isRescheduled: true,
    originalAppointmentId: original._id,
  });

  original.replacementSuggestion.status = 'accepted';
  await original.save();

  const populatedDoctor = await Doctor.findById(doctor._id).populate('userId', 'name');
  await notificationService.create({
    userId: populatedDoctor.userId._id,
    title: 'Replacement appointment request',
    message: `A patient accepted a replacement request for ${new Date(date).toDateString()} at ${time}`,
    type: 'general',
    relatedAppointment: appointment._id,
  });

  emitToUser(populatedDoctor.userId._id.toString(), 'new_appointment_request', {
    appointment,
    message: 'Replacement appointment request received',
  });

  return appointment;
};

/**
 * Cancel an appointment — called by patient controller.
 */
const cancelAppointment = async (appointmentId, patientId, reason) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (!idsEqual(appointment.patientId, patientId)) {
    throw Object.assign(new Error('Not authorised'), { statusCode: 403 });
  }

  if (['completed', 'cancelled', 'rejected'].includes(appointment.status)) {
    throw Object.assign(new Error(`Cannot cancel appointment with status: ${appointment.status}`), { statusCode: 400 });
  }

  // Decrement nurse load if nurse was assigned
  if (appointment.nurseId) {
    await Nurse.findByIdAndUpdate(appointment.nurseId, { $inc: { currentLoad: -1 } });
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  await appointment.save();

  // Notify doctor
  const doctor = await require('../models/Doctor').findById(appointment.doctorId);
  if (doctor) {
    await notificationService.create({
      userId: doctor.userId,
      title: 'Appointment cancelled',
      message: `Patient cancelled the appointment on ${appointment.date.toDateString()} at ${appointment.time}`,
      type: 'appointment_cancelled',
      relatedAppointment: appointment._id,
    });
  }

  return appointment;
};

module.exports = {
  bookAppointment,
  approveAppointment,
  rejectAppointment,
  cancelAppointment,
  acceptReplacementSuggestion,
  getAlternateSlots,
  isSlotBooked,
};
