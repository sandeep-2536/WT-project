import SidebarLayout from './SidebarLayout';

const nav = [
  { to: '/patient', label: 'Dashboard', icon: '🏠' },
  { to: '/patient/book', label: 'Book Appointment', icon: '📅' },
  { to: '/patient/appointments', label: 'My Appointments', icon: '📋' },
];

export default function PatientLayout() {
  return <SidebarLayout navItems={nav} title="Patient Portal" />;
}
