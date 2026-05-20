import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI } from '../../api/services';
import { StatCard, StatusBadge, Spinner, PageHeader } from '../../components/ui';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => appointmentAPI.myAppointments({ limit: 5 }),
    select: (res) => res.data,
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  const counts = {
    total: pagination.total || 0,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
  };

  const upcoming = appointments.filter((a) =>
    ['pending', 'confirmed'].includes(a.status) && new Date(a.date) >= new Date()
  );

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name} 👋`}
        subtitle="Here's a summary of your appointments"
        action={
          <Link to="/patient/book" className="btn-primary">
            + Book Appointment
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={pagination.total} icon="📋" color="blue" />
        <StatCard label="Pending" value={appointments.filter(a => a.status === 'pending').length} icon="⏳" color="yellow" />
        <StatCard label="Confirmed" value={appointments.filter(a => a.status === 'confirmed').length} icon="✅" color="green" />
        <StatCard label="Upcoming" value={upcoming.length} icon="📅" color="purple" />
      </div>

      {/* Recent appointments */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent appointments</h2>
          <Link to="/patient/appointments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>

        {isLoading ? (
          <Spinner />
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-medium text-gray-600">No appointments yet</p>
            <Link to="/patient/book" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((appt) => (
              <div key={appt._id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Dr. {appt.doctorId?.userId?.name || appt.doctorId?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {appt.doctorId?.specialization} · {format(new Date(appt.date), 'dd MMM yyyy')} at {appt.time}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
