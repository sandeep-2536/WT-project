import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/services';
import { ConfirmModal, EmptyState, PageHeader, Pagination, Spinner } from '../../components/ui';

const ROLE_BADGE = {
  doctor: 'bg-teal-100 text-teal-700',
  nurse: 'bg-purple-100 text-purple-700',
};

export default function AdminNewUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionTarget, setActionTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-users', page, search, roleFilter],
    queryFn: () => adminAPI.pendingUsers({ page, limit: 15, search, role: roleFilter }),
    select: (res) => res.data,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => adminAPI.approvePendingUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['admin-pending-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      qc.invalidateQueries({ queryKey: ['admin-nurses'] });
      setActionTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => adminAPI.rejectPendingUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['admin-pending-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setActionTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Rejection failed'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination || {};
  const target = users.find((u) => u._id === actionTarget?.id);
  const isReject = actionTarget?.type === 'reject';
  const pendingMutation = isReject ? rejectMutation : approveMutation;

  const getProfileDetails = (user) => {
    const profile = user.requestedProfile || {};
    const qualifications = Array.isArray(profile.qualifications)
      ? profile.qualifications.join(', ')
      : profile.qualifications;

    if (user.role === 'doctor') {
      return [
        profile.specialization || 'General',
        `${profile.experience ?? 0} yrs`,
        `Fee ${profile.consultationFee ?? 0}`,
        qualifications,
      ].filter(Boolean).join(' | ');
    }

    return [
      profile.department || 'General',
      `Max load ${profile.maxLoad ?? 8}`,
      qualifications,
    ].filter(Boolean).join(' | ');
  };

  return (
    <div>
      <PageHeader title="New Users" subtitle={`${pagination.total || 0} pending requests`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          className="input w-56"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input w-36"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All roles</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState title="No pending users" description="Doctor and nurse requests will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Requested</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {getProfileDetails(u)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActionTarget({ id: u._id, type: 'approve' })}
                        className="text-xs font-medium text-green-600 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionTarget({ id: u._id, type: 'reject' })}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <ConfirmModal
        open={!!actionTarget}
        title={isReject ? 'Reject request?' : 'Approve request?'}
        message={
          isReject
            ? `This will reject ${target?.name}'s ${target?.role} account request.`
            : `This will activate ${target?.name}'s ${target?.role} account and create their profile.`
        }
        danger={isReject}
        loading={pendingMutation.isPending}
        onConfirm={() => {
          if (!actionTarget) return;
          pendingMutation.mutate(actionTarget.id);
        }}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  );
}
