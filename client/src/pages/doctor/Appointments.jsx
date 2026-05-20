import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentAPI } from '../../api/services';
import { StatusBadge, Pagination, Spinner, EmptyState, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled'];

function RejectModal({ open, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 text-lg mb-3">Reject appointment</h3>
        <p className="text-sm text-gray-600 mb-4">Provide a reason (optional — patient will see this)</p>
        <textarea
          className="input resize-none mb-4"
          rows={3}
          placeholder="e.g. Not available on this day, please reschedule..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="btn-danger"
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorAppointments() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectTarget, setRejectTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', page, statusFilter],
    queryFn: () => appointmentAPI.doctorAppointments({
      page,
      limit: 10,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    select: (res) => res.data,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => appointmentAPI.approve(id),
    onSuccess: () => {
      toast.success('Appointment approved — nurse auto-assigned');
      qc.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => appointmentAPI.reject(id, reason),
    onSuccess: () => {
      toast.success('Appointment rejected');
      qc.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setRejectTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader
        title="Appointment Requests"
        subtitle={`${pagination.total || 0} total`}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState icon="📭" title="No appointments found" />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-gray-900">{appt.patientId?.name}</p>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-500">
                    <span>📅 {format(new Date(appt.date), 'dd MMM yyyy')}</span>
                    <span>🕐 {appt.time}</span>
                    <span>✉️ {appt.patientId?.email}</span>
                    {appt.reason && <span className="col-span-3">📝 {appt.reason}</span>}
                    {appt.nurseId && (
                      <span className="col-span-2 text-green-700">
                        👩‍⚕️ Nurse: {appt.nurseId?.userId?.name || 'Assigned'}
                      </span>
                    )}
                  </div>
                </div>

                {appt.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(appt._id)}
                      disabled={approveMutation.isPending}
                      className="btn-primary text-sm py-1.5"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(appt._id)}
                      className="btn-danger text-sm py-1.5"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <RejectModal
        open={!!rejectTarget}
        loading={rejectMutation.isPending}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget, reason })}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
