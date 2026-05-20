import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/services';
import { StatCard, Spinner, PageHeader } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  completed: '#3b82f6',
  cancelled: '#9ca3af',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminAPI.analytics,
    select: (res) => res.data.data,
  });

  if (isLoading) return <Spinner />;

  const counts = analytics?.counts || {};
  const byStatus = analytics?.appointmentsByStatus || {};
  const monthly = (analytics?.monthlyData || []).map((d) => ({
    name: MONTH_NAMES[d._id.month - 1],
    appointments: d.count,
  }));

  const pieData = [
    { name: 'Pending', value: byStatus.pendingAppointments || 0 },
    { name: 'Confirmed', value: byStatus.confirmedAppointments || 0 },
    { name: 'Completed', value: byStatus.completedAppointments || 0 },
    { name: 'Cancelled', value: byStatus.cancelledAppointments || 0 },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#9ca3af'];

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System-wide overview" />

      {/* Count stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patients" value={counts.totalPatients} icon="👤" color="blue" />
        <StatCard label="Doctors" value={counts.totalDoctors} icon="👨‍⚕️" color="teal" />
        <StatCard label="Nurses" value={counts.totalNurses} icon="👩‍⚕️" color="purple" />
        <StatCard label="Appointments" value={counts.totalAppointments} icon="📋" color="yellow" />
      </div>

      {/* Appointment status stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending" value={byStatus.pendingAppointments} icon="⏳" color="yellow" />
        <StatCard label="Confirmed" value={byStatus.confirmedAppointments} icon="✅" color="green" />
        <StatCard label="Completed" value={byStatus.completedAppointments} icon="🏁" color="blue" />
        <StatCard label="Cancelled" value={byStatus.cancelledAppointments} icon="✕" color="red" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Appointments (last 6 months)</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status pie chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Appointments by status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
