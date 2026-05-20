import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/services';
import { Pagination, Spinner, EmptyState, PageHeader } from '../../components/ui';

export default function AdminNurses() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-nurses', page],
    queryFn: () => adminAPI.nurses({ page, limit: 12 }),
    select: (res) => res.data,
  });

  const nurses = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="Nurse Management" subtitle={`${pagination.total || 0} nurses`} />

      {isLoading ? (
        <Spinner />
      ) : nurses.length === 0 ? (
        <EmptyState icon="👩‍⚕️" title="No nurses found" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nurses.map((nurse) => (
            <div key={nurse._id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg font-bold text-purple-600 flex-shrink-0">
                  {nurse.userId?.name?.[0] || 'N'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{nurse.userId?.name}</p>
                  <p className="text-sm text-purple-600">{nurse.department || 'General'}</p>
                  <p className="text-xs text-gray-400">{nurse.userId?.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${nurse.userId?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {nurse.userId?.isActive ? 'Active' : 'Off'}
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>⚡ Load: {nurse.currentLoad} / {nurse.maxLoad}</p>
                <p>🗓️ {nurse.availability?.length || 0} days available</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  );
}
