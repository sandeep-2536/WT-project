const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true },   // e.g. "17:00"
    slotDuration: { type: Number, default: 30 }, // minutes
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    qualifications: [String],
    experience: { type: Number, default: 0 }, // years
    consultationFee: { type: Number, default: 0 },
    availability: [availabilitySlotSchema],
    bio: { type: String, maxlength: 500 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Virtual to populate user info
doctorSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

doctorSchema.set('toObject', { virtuals: true });
doctorSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Doctor', doctorSchema);
