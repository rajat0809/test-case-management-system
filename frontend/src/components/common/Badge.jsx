const COLORS = {
  // Priority
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  // Status / execution
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  blocked: 'bg-purple-100 text-purple-800',
  skipped: 'bg-gray-100 text-gray-600',
  pending: 'bg-blue-100 text-blue-700',
  // Defect status
  open: 'bg-red-100 text-red-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
  wontfix: 'bg-gray-200 text-gray-500',
  // Project status
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-200 text-gray-500',
  // Roles
  admin: 'bg-purple-100 text-purple-800',
  'test-lead': 'bg-blue-100 text-blue-800',
  tester: 'bg-green-100 text-green-800',
  'read-only': 'bg-gray-100 text-gray-600',
};

export default function Badge({ value, label }) {
  const cls = COLORS[value] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`badge ${cls}`}>{label || value}</span>
  );
}
