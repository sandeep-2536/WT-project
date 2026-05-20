import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentAPI } from '../../api/services';
import { StatusBadge, Pagination, Spinner, EmptyState, PageHeader } from '../../components/ui';
import { format } from 'date-fns';

export default function NurseSchedule() {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['nurse-appointments', page, dateFilter],
    queryFn: () => appointmentAPI.nurseAppointments({
      page,
      limit: 12,
      date: dateFilter || undefined,
    }),
    select: (res) => res.data,
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader
        title="My Schedule"
        subtitle={`${pagination.total || 0} assigned appointments`}
      />

      <div className="flex items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filter by date</label>
          <input
            type="date"
            className="input w-44 py-1.5"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          />
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-sm text-gray-400 hover:text-gray-700 mt-4"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState icon="🗓️" title="No appointments found" description="Try clearing the date filter" />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const doctorName = appt.doctorId?.userId?.name || 'Unknown';
            return (
              <div key={appt._id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{appt.patientId?.name}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-500 mt-1">
                      <span>👨‍⚕️ Dr. {doctorName}</span>
                      <span>📅 {format(new Date(appt.date), 'dd MMM yyyy')}</span>
                      <span>🕐 {appt.time}</span>
                      <span>✉️ {appt.patientId?.email}</span>
                      {appt.reason && <span className="col-span-2">📝 {appt.reason}</span>}
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  );
}
