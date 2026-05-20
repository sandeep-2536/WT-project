require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/harms';

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Doctor.deleteMany({});
  await Nurse.deleteMany({});
  console.log('Cleared collections');

  // Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@harms.dev',
    password: 'Admin@1234',
    role: 'admin',
  });

  // Doctors
  const doctorUsers = await User.create([
    { name: 'Dr. Priya Sharma', email: 'priya@harms.dev', password: 'Doctor@1234', role: 'doctor' },
    { name: 'Dr. Rajan Mehta', email: 'rajan@harms.dev', password: 'Doctor@1234', role: 'doctor' },
    { name: 'Dr. Sunita Rao', email: 'sunita@harms.dev', password: 'Doctor@1234', role: 'doctor' },
  ]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = days.map((day) => ({ day, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true }));

  await Doctor.create([
    { userId: doctorUsers[0]._id, specialization: 'Cardiology', qualifications: ['MBBS', 'MD'], experience: 10, consultationFee: 500, availability: slots, bio: 'Expert cardiologist with 10 years experience.' },
    { userId: doctorUsers[1]._id, specialization: 'Orthopedics', qualifications: ['MBBS', 'MS'], experience: 8, consultationFee: 600, availability: slots, bio: 'Orthopedic surgeon specialising in joint replacement.' },
    { userId: doctorUsers[2]._id, specialization: 'Dermatology', qualifications: ['MBBS', 'MD'], experience: 6, consultationFee: 400, availability: slots, bio: 'Experienced dermatologist.' },
  ]);

  // Nurses
  const nurseUsers = await User.create([
    { name: 'Nurse Deepa', email: 'deepa@harms.dev', password: 'Nurse@1234', role: 'nurse' },
    { name: 'Nurse Anita', email: 'anita@harms.dev', password: 'Nurse@1234', role: 'nurse' },
  ]);

  const nurseSlots = days.map((day) => ({ day, startTime: '08:00', endTime: '16:00', isAvailable: true }));
  await Nurse.create([
    { userId: nurseUsers[0]._id, department: 'Cardiology', availability: nurseSlots, maxLoad: 8 },
    { userId: nurseUsers[1]._id, department: 'General', availability: nurseSlots, maxLoad: 8 },
  ]);

  // Patients
  await User.create([
    { name: 'Amit Kumar', email: 'amit@harms.dev', password: 'Patient@1234', role: 'patient' },
    { name: 'Neha Singh', email: 'neha@harms.dev', password: 'Patient@1234', role: 'patient' },
  ]);

  console.log('\n=== Seed complete ===');
  console.log('admin@harms.dev  /  Admin@1234');
  console.log('priya@harms.dev  /  Doctor@1234');
  console.log('deepa@harms.dev  /  Nurse@1234');
  console.log('amit@harms.dev   /  Patient@1234');

  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });
