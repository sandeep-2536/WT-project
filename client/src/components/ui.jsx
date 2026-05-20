// Stat card for dashboards
export function StatCard({ label, value, icon, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Status badge for appointments
export function StatusBadge({ status }) {
  const map = {
    pending:   'badge-pending',
    confirmed: 'badge-confirmed',
    rejected:  'badge-rejected',
    cancelled: 'badge-cancelled',
    completed: 'badge-completed',
    'no-show': 'badge-cancelled',
  };
  return <span className={map[status] || 'badge-pending'}>{status}</span>;
}

// Pagination controls
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-600">Page {page} of {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

// Empty state placeholder
export function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-medium text-gray-600">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}

// Loading spinner
export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

// Page header
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Confirmation modal
export function ConfirmModal({ open, title, message, onConfirm, onCancel, loading, danger }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
