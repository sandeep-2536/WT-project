import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentAPI } from '../../api/services';
import { StatusBadge, Pagination, Spinner, EmptyState, PageHeader } from '../../components/ui';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

export default function AdminAppointments() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', page, statusFilter, dateFilter],
    queryFn: () => appointmentAPI.allAppointments({
      page,
      limit: 15,
      status: statusFilter === 'all' ? undefined : statusFilter,
      date: dateFilter || undefined,
    }),
    select: (res) => res.data,
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="All Appointments" subtitle={`${pagination.total || 0} total`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${statusFilter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="date"
          className="input w-44 py-1.5"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="text-sm text-gray-400 hover:text-gray-700">✕</button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState icon="📋" title="No appointments found" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Doctor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nurse</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date & Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((appt) => (
                <tr key={appt._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{appt.patientId?.name}</p>
                    <p className="text-xs text-gray-400">{appt.patientId?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>Dr. {appt.doctorId?.userId?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{appt.doctorId?.specialization}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {appt.nurseId?.userId?.name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(appt.date), 'dd MMM yyyy')} · {appt.time}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  );
}
