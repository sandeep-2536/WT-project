import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute, PublicRoute } from './routes/ProtectedRoute';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Patient pages
import PatientLayout from './layouts/PatientLayout';
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';

// Doctor pages
import DoctorLayout from './layouts/DoctorLayout';
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorAvailability from './pages/doctor/Availability';

// Nurse pages
import NurseLayout from './layouts/NurseLayout';
import NurseDashboard from './pages/nurse/Dashboard';
import NurseSchedule from './pages/nurse/Schedule';

// Admin pages
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminNewUsers from './pages/admin/NewUsers';
import AdminDoctors from './pages/admin/Doctors';
import AdminNurses from './pages/admin/Nurses';
import AdminAppointments from './pages/admin/Appointments';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Patient routes */}
          <Route element={<RoleRoute allowedRoles={['patient']} />}>
            <Route path="/patient" element={<PatientLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="book" element={<BookAppointment />} />
              <Route path="appointments" element={<MyAppointments />} />
            </Route>
          </Route>

          {/* Doctor routes */}
          <Route element={<RoleRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<DoctorLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="availability" element={<DoctorAvailability />} />
            </Route>
          </Route>

          {/* Nurse routes */}
          <Route element={<RoleRoute allowedRoles={['nurse']} />}>
            <Route path="/nurse" element={<NurseLayout />}>
              <Route index element={<NurseDashboard />} />
              <Route path="schedule" element={<NurseSchedule />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="new-users" element={<AdminNewUsers />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="nurses" element={<AdminNurses />} />
              <Route path="appointments" element={<AdminAppointments />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
