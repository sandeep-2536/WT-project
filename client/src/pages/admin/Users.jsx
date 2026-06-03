import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/services';
import { Pagination, Spinner, EmptyState, PageHeader, ConfirmModal } from '../../components/ui';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_BADGE = {
  patient: 'bg-blue-100 text-blue-700',
  doctor: 'bg-teal-100 text-teal-700',
  nurse: 'bg-purple-100 text-purple-700',
  admin: 'bg-gray-200 text-gray-700',
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'patient',
  specialization: '',
  department: '',
  qualifications: '',
  experience: '',
  consultationFee: '',
  maxLoad: '',
};

function AddUserModal({ open, form, setForm, loading, onSubmit, onCancel }) {
  if (!open) return null;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Add user</h3>
            <p className="text-sm text-gray-500 mt-1">Create an approved patient, doctor, or nurse account.</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 text-xl leading-none">x</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Full name</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Email</span>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Password</span>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Role</span>
              <select
                className="input"
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
              </select>
            </label>
          </div>

          {form.role === 'doctor' && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Specialization</span>
                <input
                  className="input"
                  value={form.specialization}
                  onChange={(e) => update('specialization', e.target.value)}
                  placeholder="e.g. Cardiology"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Qualifications</span>
                <input
                  className="input"
                  value={form.qualifications}
                  onChange={(e) => update('qualifications', e.target.value)}
                  placeholder="e.g. MBBS, MD"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Experience</span>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.experience}
                  onChange={(e) => update('experience', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Consultation fee</span>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.consultationFee}
                  onChange={(e) => update('consultationFee', e.target.value)}
                />
              </label>
            </div>
          )}

          {form.role === 'nurse' && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Department</span>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  placeholder="e.g. General"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Qualifications</span>
                <input
                  className="input"
                  value={form.qualifications}
                  onChange={(e) => update('qualifications', e.target.value)}
                  placeholder="e.g. BSc Nursing"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Max daily load</span>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={form.maxLoad}
                  onChange={(e) => update('maxLoad', e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => adminAPI.users({ page, limit: 15, search, role: roleFilter }),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => adminAPI.createUser(payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'User created');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      qc.invalidateQueries({ queryKey: ['admin-nurses'] });
      setForm(emptyForm);
      setAddOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
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

  const submitCreate = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    };

    if (form.role === 'doctor') {
      payload.specialization = form.specialization.trim();
      payload.qualifications = form.qualifications;
      payload.experience = Number(form.experience) || 0;
      payload.consultationFee = Number(form.consultationFee) || 0;
    }

    if (form.role === 'nurse') {
      payload.department = form.department.trim();
      payload.qualifications = form.qualifications;
      payload.maxLoad = Number(form.maxLoad) || 8;
    }

    createMutation.mutate(payload);
  };

  const closeAddModal = () => {
    if (createMutation.isPending) return;
    setAddOpen(false);
    setForm(emptyForm);
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${pagination.total || 0} total users`}
        action={<button onClick={() => setAddOpen(true)} className="btn-primary">Add User</button>}
      />

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
        <EmptyState title="No users found" />
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

      <AddUserModal
        open={addOpen}
        form={form}
        setForm={setForm}
        loading={createMutation.isPending}
        onSubmit={submitCreate}
        onCancel={closeAddModal}
      />

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
