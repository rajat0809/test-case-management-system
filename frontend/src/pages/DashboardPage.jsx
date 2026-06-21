import { useState, useEffect, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import api from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { CheckCircle, XCircle, AlertCircle, Clock, Bug, ClipboardList } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const COLORS = { pass: '#22c55e', fail: '#ef4444', blocked: '#a855f7', skipped: '#94a3b8', pending: '#3b82f6' };
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export default function DashboardPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.get(`/analytics/${currentProject.id}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [currentProject]);

  const statusData = useMemo(() => {
    if (!data) return [];
    const s = data.execution_summary;
    return [
      { name: 'Pass', value: +s.passed, color: COLORS.pass },
      { name: 'Fail', value: +s.failed, color: COLORS.fail },
      { name: 'Blocked', value: +s.blocked, color: COLORS.blocked },
      { name: 'Pending', value: +s.pending, color: COLORS.pending },
    ].filter(d => d.value > 0);
  }, [data]);

  const priorityData = useMemo(() => {
    if (!data) return [];
    return data.priority_distribution.map(d => ({
      name: d.priority.charAt(0).toUpperCase() + d.priority.slice(1),
      count: +d.count,
    }));
  }, [data]);

  if (!currentProject) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <ClipboardList size={48} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">No Project Selected</h2>
      <p className="text-gray-500">Go to Projects and select one to see analytics.</p>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  if (!data) return <p className="text-gray-500">No data available.</p>;

  const s = data.execution_summary;
  const STATS = [
    { label: 'Total Executed', value: +s.total, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'Passed', value: +s.passed, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Failed', value: +s.failed, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Pending', value: +s.pending, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard — {currentProject.name}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-3`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Test Status Distribution</h2>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16">No execution data yet</p>}
        </div>

        {/* Bar chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Test Cases by Priority</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {priorityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Execution Trend (Last 7 Days)</h2>
        {data.trend.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="passed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-10">No trend data yet</p>}
      </div>

      {/* Tester stats */}
      {data.tester_stats.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Execution by Tester</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-600">Tester</th>
                <th className="text-right py-2 font-medium text-gray-600">Assigned</th>
                <th className="text-right py-2 font-medium text-gray-600">Passed</th>
                <th className="text-right py-2 font-medium text-gray-600">Failed</th>
              </tr></thead>
              <tbody>{data.tester_stats.map(t => (
                <tr key={t.name} className="border-b last:border-0">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="py-2 text-right text-gray-600">{t.assigned}</td>
                  <td className="py-2 text-right text-green-600">{t.passed}</td>
                  <td className="py-2 text-right text-red-600">{t.failed}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
