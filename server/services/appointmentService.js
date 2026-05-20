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

  if (appointment.doctorId.userId.toString() !== doctorUserId.toString()) {
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
  const appointment = await Appointment.findById(appointmentId).populate('doctorId');
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (appointment.doctorId.userId.toString() !== doctorUserId.toString()) {
    throw Object.assign(new Error('Not authorised'), { statusCode: 403 });
  }

  if (appointment.status !== 'pending') {
    throw Object.assign(new Error(`Cannot reject appointment with status: ${appointment.status}`), { statusCode: 400 });
  }

  appointment.status = 'rejected';
  appointment.rejectionReason = reason;
  await appointment.save();

  await notificationService.create({
    userId: appointment.patientId,
    title: 'Appointment rejected',
    message: `Your appointment on ${appointment.date.toDateString()} at ${appointment.time} was rejected. ${reason ? `Reason: ${reason}` : ''}`,
    type: 'appointment_rejected',
    relatedAppointment: appointment._id,
  });

  emitToUser(appointment.patientId.toString(), 'appointment_rejected', { appointment });

  return appointment;
};

/**
 * Cancel an appointment — called by patient controller.
 */
const cancelAppointment = async (appointmentId, patientId, reason) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (appointment.patientId.toString() !== patientId.toString()) {
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
  getAlternateSlots,
  isSlotBooked,
};
