import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentAPI } from '../../api/services';
import { StatusBadge, Pagination, Spinner, EmptyState, PageHeader, ConfirmModal } from '../../components/ui';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

export default function MyAppointments() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments', page, statusFilter],
    queryFn: () => appointmentAPI.myAppointments({
      page,
      limit: 10,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    select: (res) => res.data,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentAPI.cancel(id, 'Cancelled by patient'),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['patient-appointments'] });
      setCancelTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="My Appointments" subtitle={`${pagination.total || 0} total appointments`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState icon="📭" title="No appointments found" description="Try changing the filter above" />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const doctorName = appt.doctorId?.userId?.name || 'Unknown';
            const nurseName = appt.nurseId?.userId?.name;
            const canCancel = ['pending', 'confirmed'].includes(appt.status);

            return (
              <div key={appt._id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-gray-900">Dr. {doctorName}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600">
                      <span>📌 {appt.doctorId?.specialization}</span>
                      <span>📅 {format(new Date(appt.date), 'dd MMM yyyy')}</span>
                      <span>🕐 {appt.time}</span>
                      {nurseName && <span>👩‍⚕️ Nurse: {nurseName}</span>}
                      {appt.reason && <span className="col-span-2">📝 {appt.reason}</span>}
                    </div>
                    {appt.rejectionReason && (
                      <p className="mt-2 text-sm text-red-600 bg-red-50 rounded px-3 py-1.5">
                        Rejection reason: {appt.rejectionReason}
                      </p>
                    )}
                  </div>

                  {canCancel && (
                    <button
                      onClick={() => setCancelTarget(appt._id)}
                      className="ml-4 text-sm text-red-600 hover:underline flex-shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel appointment?"
        message="This action cannot be undone. The doctor will be notified."
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
