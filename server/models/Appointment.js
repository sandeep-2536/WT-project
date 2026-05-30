const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    time: {
      type: String, // "10:30"
      required: [true, 'Appointment time is required'],
    },
    endTime: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show'],
      default: 'pending',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    notes: { type: String, maxlength: 1000 }, // doctor notes after visit
    rejectionReason: { type: String },
    cancellationReason: { type: String },
    isRescheduled: { type: Boolean, default: false },
    originalAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    replacementSuggestion: {
      doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
      date: Date,
      time: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'unavailable'],
      },
    },
  },
  { timestamps: true }
);

// Compound index to prevent double-booking
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);

appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ nurseId: 1, date: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
