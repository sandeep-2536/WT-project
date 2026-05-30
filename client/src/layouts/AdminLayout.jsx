import SidebarLayout from './SidebarLayout';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: 'D' },
  { to: '/admin/new-users', label: 'New Users', icon: '+' },
  { to: '/admin/appointments', label: 'Appointments', icon: 'A' },
  { to: '/admin/doctors', label: 'Doctors', icon: 'Dr' },
  { to: '/admin/nurses', label: 'Nurses', icon: 'N' },
  { to: '/admin/users', label: 'Users', icon: 'U' },
];

export default function AdminLayout() {
  return <SidebarLayout navItems={nav} title="Admin Panel" />;
}
