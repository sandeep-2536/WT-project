import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Appointments
export const appointmentAPI = {
  book: (data) => api.post('/appointments/book', data),
  approve: (id) => api.patch(`/appointments/${id}/approve`),
  reject: (id, reason) => api.patch(`/appointments/${id}/reject`, { reason }),
  cancel: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }),
  myAppointments: (params) => api.get('/appointments/my', { params }),
  doctorAppointments: (params) => api.get('/appointments/doctor', { params }),
  nurseAppointments: (params) => api.get('/appointments/nurse', { params }),
  allAppointments: (params) => api.get('/appointments/all', { params }),
};

// Doctors
export const doctorAPI = {
  list: (params) => api.get('/doctor/list', { params }),
  slots: (id, date) => api.get(`/doctor/${id}/slots`, { params: { date } }),
  profile: () => api.get('/doctor/profile'),
  updateProfile: (data) => api.put('/doctor/profile', data),
  setAvailability: (availability) => api.put('/doctor/availability', { availability }),
};

// Nurse
export const nurseAPI = {
  profile: () => api.get('/nurse/profile'),
  setAvailability: (availability) => api.put('/nurse/availability', { availability }),
};

// Admin
export const adminAPI = {
  users: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
  doctors: (params) => api.get('/admin/doctors', { params }),
  createDoctor: (data) => api.post('/admin/doctors', data),
  deleteDoctor: (id) => api.delete(`/admin/doctors/${id}`),
  nurses: (params) => api.get('/admin/nurses', { params }),
  analytics: () => api.get('/admin/analytics'),
};

// Notifications
export const notificationAPI = {
  list: (params) => api.get('/admin/notifications', { params }),
};
