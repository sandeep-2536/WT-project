import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/services';
import { Pagination, Spinner, EmptyState, PageHeader, ConfirmModal } from '../../components/ui';
import toast from 'react-hot-toast';

export default function AdminDoctors() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [specFilter, setSpecFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-doctors', page, specFilter],
    queryFn: () => adminAPI.doctors({ page, limit: 12, specialization: specFilter }),
    select: (res) => res.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteDoctor(id),
    onSuccess: () => {
      toast.success('Doctor removed');
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to remove doctor'),
  });

  const doctors = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="Doctor Management" subtitle={`${pagination.total || 0} doctors`} />

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          className="input w-56"
          placeholder="Filter by specialization..."
          value={specFilter}
          onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : doctors.length === 0 ? (
        <EmptyState icon="👨‍⚕️" title="No doctors found" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc._id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-600 flex-shrink-0">
                  {doc.userId?.name?.[0] || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">Dr. {doc.userId?.name}</p>
                  <p className="text-sm text-teal-600">{doc.specialization}</p>
                  <p className="text-xs text-gray-400">{doc.userId?.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${doc.userId?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {doc.userId?.isActive ? 'Active' : 'Off'}
                </span>
              </div>

              <div className="text-sm text-gray-500 space-y-1 mb-4">
                <p>🎓 {doc.qualifications?.join(', ') || 'N/A'}</p>
                <p>⏱️ {doc.experience} yrs experience</p>
                <p>💰 ₹{doc.consultationFee} consultation fee</p>
                <p>🗓️ {doc.availability?.length || 0} availability slots</p>
              </div>

              <button
                onClick={() => setDeleteTarget(doc._id)}
                className="text-xs text-red-500 hover:text-red-700 hover:underline"
              >
                Remove doctor
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove doctor?"
        message="This will remove the doctor profile and revert their role to patient. Existing appointments are not affected."
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
