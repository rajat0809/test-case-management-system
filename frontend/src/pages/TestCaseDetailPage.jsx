import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

export default function TestCaseDetailPage() {
  const { id } = useParams();
  const [tc, setTc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/testcases/${id}`).then(r => setTc(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!tc) return <p className="text-gray-500">Test case not found.</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/testcases" className="btn-secondary btn-sm"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-xl font-bold text-gray-900">{tc.title}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge value={tc.priority} label={`Priority: ${tc.priority}`} />
        <Badge value={tc.type} label={`Type: ${tc.type}`} />
        <Badge value={tc.status} />
        {tc.tags?.map(t => <span key={t} className="badge bg-gray-100 text-gray-600">{t}</span>)}
      </div>

      {tc.description && (
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-sm text-gray-600">{tc.description}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {tc.preconditions && (
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2 text-gray-700">Pre-conditions</h3>
            <p className="text-sm text-gray-600">{tc.preconditions}</p>
          </div>
        )}
        {tc.postconditions && (
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2 text-gray-700">Post-conditions</h3>
            <p className="text-sm text-gray-600">{tc.postconditions}</p>
          </div>
        )}
      </div>

      {tc.steps?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Test Steps</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600 w-10">#</th>
                  <th className="text-left p-2 font-medium text-gray-600">Action</th>
                  <th className="text-left p-2 font-medium text-gray-600">Expected Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tc.steps.map(s => (
                  <tr key={s.id}>
                    <td className="p-2 text-gray-400">{s.step_number}</td>
                    <td className="p-2">{s.action}</td>
                    <td className="p-2 text-gray-600">{s.expected_result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Created by {tc.created_by_name} · {new Date(tc.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
