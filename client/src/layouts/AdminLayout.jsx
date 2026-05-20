import SidebarLayout from './SidebarLayout';
const nav = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/appointments', label: 'Appointments', icon: '📋' },
  { to: '/admin/doctors', label: 'Doctors', icon: '👨‍⚕️' },
  { to: '/admin/nurses', label: 'Nurses', icon: '👩‍⚕️' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
];
export default function AdminLayout() {
  return <SidebarLayout navItems={nav} title="Admin Panel" />;
}
