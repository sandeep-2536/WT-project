import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, nurseAPI } from '../../api/services';
import { StatCard, StatusBadge, Spinner, PageHeader } from '../../components/ui';
import { format, isToday } from 'date-fns';

export default function NurseDashboard() {
  const { user } = useAuth();

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['nurse-appointments-dash'],
    queryFn: () => appointmentAPI.nurseAppointments({ limit: 6 }),
    select: (res) => res.data,
  });

  const { data: profile } = useQuery({
    queryKey: ['nurse-profile'],
    queryFn: nurseAPI.profile,
    select: (res) => res.data.data.nurse,
  });

  const appointments = apptData?.data || [];
  const total = apptData?.pagination?.total || 0;
  const todayAppts = appointments.filter((a) => isToday(new Date(a.date)));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name} 👩‍⚕️`}
        subtitle={profile?.department ? `Department: ${profile.department}` : ''}
        action={<Link to="/nurse/schedule" className="btn-secondary">View schedule</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total assigned" value={total} icon="📋" color="purple" />
        <StatCard label="Today" value={todayAppts.length} icon="📅" color="blue" />
        <StatCard label="Current load" value={`${profile?.currentLoad || 0} / ${profile?.maxLoad || 8}`} icon="⚡" color="yellow" />
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Upcoming assignments</h2>
          <Link to="/nurse/schedule" className="text-sm text-purple-600 hover:underline">See all</Link>
        </div>

        {isLoading ? (
          <Spinner />
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No appointments assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((appt) => {
              const doctorName = appt.doctorId?.userId?.name || 'Unknown';
              const isNow = isToday(new Date(appt.date));
              return (
                <div key={appt._id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{appt.patientId?.name}</p>
                      {isNow && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Today</span>}
                    </div>
                    <p className="text-sm text-gray-500">
                      Dr. {doctorName} · {format(new Date(appt.date), 'dd MMM yyyy')} at {appt.time}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
