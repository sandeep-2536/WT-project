import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, doctorAPI } from '../../api/services';
import { StatCard, StatusBadge, Spinner, PageHeader } from '../../components/ui';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { user } = useAuth();

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['doctor-appointments-dash'],
    queryFn: () => appointmentAPI.doctorAppointments({ limit: 5 }),
    select: (res) => res.data,
  });

  const { data: profileData } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: doctorAPI.profile,
    select: (res) => res.data.data.doctor,
  });

  const appointments = apptData?.data || [];
  const total = apptData?.pagination?.total || 0;
  const pending = appointments.filter((a) => a.status === 'pending').length;
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length;

  return (
    <div>
      <PageHeader
        title={`Welcome, Dr. ${user?.name} 👨‍⚕️`}
        subtitle={profileData?.specialization ? `${profileData.specialization} · ${profileData.experience} yrs experience` : ''}
        action={
          <Link to="/doctor/appointments" className="btn-primary">
            View appointments
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total requests" value={total} icon="📋" color="blue" />
        <StatCard label="Pending" value={pending} icon="⏳" color="yellow" />
        <StatCard label="Confirmed" value={confirmed} icon="✅" color="green" />
        <StatCard label="Slots set" value={profileData?.availability?.length || 0} icon="🗓️" color="teal" />
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent appointment requests</h2>
          <Link to="/doctor/appointments" className="text-sm text-blue-600 hover:underline">See all</Link>
        </div>

        {isLoading ? (
          <Spinner />
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No appointment requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((appt) => (
              <div key={appt._id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{appt.patientId?.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(appt.date), 'dd MMM yyyy')} at {appt.time}
                    {appt.reason && ` · ${appt.reason}`}
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
