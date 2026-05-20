import SidebarLayout from './SidebarLayout';
const nav = [
  { to: '/nurse', label: 'Dashboard', icon: '🏠' },
  { to: '/nurse/schedule', label: 'My Schedule', icon: '📋' },
];
export default function NurseLayout() {
  return <SidebarLayout navItems={nav} title="Nurse Portal" />;
}
