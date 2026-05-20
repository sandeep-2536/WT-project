import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/services';
import { Pagination, Spinner, EmptyState, PageHeader, ConfirmModal } from '../../components/ui';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_BADGE = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-teal-100 text-teal-700',
  nurse:   'bg-purple-100 text-purple-700',
  admin:   'bg-gray-200 text-gray-700',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => adminAPI.users({ page, limit: 15, search, role: roleFilter }),
    select: (res) => res.data,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => adminAPI.toggleUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setToggleTarget(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination || {};
  const target = users.find((u) => u._id === toggleTarget);

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${pagination.total || 0} total users`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          className="input w-56"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input w-36"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All roles</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
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
                  <td className="px-4 py-3 text-gray-500">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => setToggleTarget(u._id)}
                        className={`text-xs font-medium hover:underline ${u.isActive ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <ConfirmModal
        open={!!toggleTarget}
        title={target?.isActive ? 'Deactivate user?' : 'Activate user?'}
        message={`This will ${target?.isActive ? 'prevent' : 'restore'} ${target?.name}'s access to the system.`}
        danger={target?.isActive}
        loading={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate(toggleTarget)}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
