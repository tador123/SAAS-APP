/**
 * Status icons provide a secondary visual cue beyond color,
 * ensuring colorblind users can distinguish statuses.
 */
const statusIcons = {
  available: '●',
  occupied: '■',
  reserved: '◆',
  maintenance: '⚙',
  cleaning: '✦',
  pending: '◷',
  confirmed: '✓',
  checked_in: '→',
  checked_out: '←',
  cancelled: '✕',
  no_show: '⊘',
  preparing: '◔',
  ready: '★',
  served: '✓',
  completed: '✓',
  draft: '○',
  paid: '✓',
  overdue: '!',
  void: '—',
  refunded: '↩',
};

const statusColors = {
  // Room statuses
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  occupied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  reserved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cleaning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  // Reservation statuses
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  checked_in: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  checked_out: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Order statuses
  preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ready: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  served: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  // Invoice statuses
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  void: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function StatusBadge({ status }) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const icon = statusIcons[status] || '●';
  const label = status?.replace(/_/g, ' ') || 'unknown';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
