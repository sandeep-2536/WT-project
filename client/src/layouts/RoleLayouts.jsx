import SidebarLayout from './SidebarLayout';

const doctorNav = [
  { to: '/doctor', label: 'Dashboard', icon: '🏠' },
  { to: '/doctor/appointments', label: 'Appointments', icon: '📋' },
  { to: '/doctor/availability', label: 'My Availability', icon: '🗓️' },
];

export function DoctorLayout() {
  return <SidebarLayout navItems={doctorNav} title="Doctor Portal" />;
}

const nurseNav = [
  { to: '/nurse', label: 'Dashboard', icon: '🏠' },
  { to: '/nurse/schedule', label: 'My Schedule', icon: '📋' },
];

export function NurseLayout() {
  return <SidebarLayout navItems={nurseNav} title="Nurse Portal" />;
}

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/appointments', label: 'Appointments', icon: '📋' },
  { to: '/admin/doctors', label: 'Doctors', icon: '👨‍⚕️' },
  { to: '/admin/nurses', label: 'Nurses', icon: '👩‍⚕️' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
];

export function AdminLayout() {
  return <SidebarLayout navItems={adminNav} title="Admin Panel" />;
}
