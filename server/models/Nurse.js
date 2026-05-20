const mongoose = require('mongoose');

const nurseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    department: { type: String, trim: true },
    qualifications: [String],
    availability: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        startTime: String,
        endTime: String,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    currentLoad: { type: Number, default: 0 }, // number of active assigned appointments
    maxLoad: { type: Number, default: 8 },     // max appointments per day
  },
  { timestamps: true }
);

nurseSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

nurseSchema.set('toObject', { virtuals: true });
nurseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Nurse', nurseSchema);
