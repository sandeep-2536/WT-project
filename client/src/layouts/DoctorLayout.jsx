import SidebarLayout from './SidebarLayout';
const nav = [
  { to: '/doctor', label: 'Dashboard', icon: '🏠' },
  { to: '/doctor/appointments', label: 'Appointments', icon: '📋' },
  { to: '/doctor/availability', label: 'My Availability', icon: '🗓️' },
];
export default function DoctorLayout() {
  return <SidebarLayout navItems={nav} title="Doctor Portal" />;
}
