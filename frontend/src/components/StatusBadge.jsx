
const STATUS_CONFIGS = {
  // Booking statuses
  pending: { label: 'Pending Approval', className: 'status-pending' },
  confirmed: { label: 'Confirmed', className: 'status-confirmed' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled' },
  completed: { label: 'Completed', className: 'status-completed' },

  // Resource statuses
  active: { label: 'Active', className: 'status-confirmed' },
  inactive: { label: 'Archived', className: 'status-cancelled' },
  maintenance: { label: 'Maintenance', className: 'status-maintenance' },

  // Roles
  student: { label: 'Student', className: 'status-completed' },
  manager: { label: 'Manager', className: 'status-maintenance' },
  admin: { label: 'Admin', className: 'status-rejected' },
};

export default function StatusBadge({ status, role, style = {} }) {
  const key = (status || role || '').toLowerCase();
  const config = STATUS_CONFIGS[key] || {
    label: key || 'Status',
    className: 'status-cancelled',
  };

  return (
    <span className={`status-pill ${config.className}`} style={style}>
      <span className="status-dot" />
      {config.label}
    </span>
  );
}
