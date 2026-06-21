import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Play, Eye, CheckCircle, XCircle, MinusCircle, SkipForward, Clock } from 'lucide-react';

const STATUS_ICONS = {
  pass: <CheckCircle size={14} className="text-green-600" />,
  fail: <XCircle size={14} className="text-red-600" />,
  blocked: <MinusCircle size={14} className="text-purple-600" />,
  skipped: <SkipForward size={14} className="text-gray-400" />,
  pending: <Clock size={14} className="text-blue-500" />,
};

export default function ExecutionsPage() {
  const { currentProject } = useProject();
  const { can } = useAuth();
  const [runs, setRuns] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [runDetail, setRunDetail] = useState(null);
  const [execModal, setExecModal] = useState(null);
  const [form, setForm] = useState({ name: '', suite_id: '' });
  const [execForm, setExecForm] = useState({ status: 'pending', comments: '' });

  const load = useCallback(() => {
    if (!currentProject) return;
    setLoading(true);
    Promise.all([
      api.get(`/runs?project_id=${currentProject.id}`),
      api.get(`/testsuites?project_id=${currentProject.id}`),
    ]).then(([runsR, suitesR]) => {
      setRuns(runsR.data); setSuites(suitesR.data);
    }).finally(() => setLoading(false));
  }, [currentProject]);

  useEffect(() => { load(); }, [load]);

  const loadRunDetail = async (id) => {
    const r = await api.get(`/runs/${id}`);
    setRunDetail(r.data);
  };

  const createRun = async (e) => {
    e.preventDefault();
    try {
      await api.post('/runs', { ...form, project_id: currentProject.id });
      toast.success('Test run created'); setCreateModal(false); setForm({ name: '', suite_id: '' }); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const updateExec = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/executions/${execModal.id}`, execForm);
      toast.success('Updated');
      setExecModal(null);
      // Refresh run detail
      if (runDetail) loadRunDetail(runDetail.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  if (!currentProject) return <p className="text-gray-500 text-center mt-20">Select a project first.</p>;
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Test Executions</h1>
        {can('execute') && (
          <button onClick={() => setCreateModal(true)} className="btn-primary">
            <Plus size={16} /> New Run
          </button>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="card p-12 text-center">
          <Play size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No test runs yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(r => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">by {r.created_by_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <Badge value={r.status} />
              </div>
              <div className="flex gap-6 mt-3 text-sm">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> {r.passed} pass</span>
                <span className="flex items-center gap-1 text-red-600"><XCircle size={14} /> {r.failed} fail</span>
                <span className="flex items-center gap-1 text-blue-600"><Clock size={14} /> {r.pending} pending</span>
                <span className="text-gray-400">/ {r.total_cases} total</span>
              </div>
              {+r.total_cases > 0 && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(r.passed / r.total_cases) * 100}%` }} />
                </div>
              )}
              <button onClick={() => loadRunDetail(r.id)} className="btn-secondary btn-sm mt-3">
                <Eye size={13} /> View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Run Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Test Run">
        <form onSubmit={createRun} className="space-y-4">
          <div>
            <label className="label">Run Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Test Suite (optional)</label>
            <select className="input" value={form.suite_id} onChange={e => setForm(f => ({ ...f, suite_id: e.target.value }))}>
              <option value="">Select a suite to auto-include cases</option>
              {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Run</button>
          </div>
        </form>
      </Modal>

      {/* Run Detail Modal */}
      <Modal open={!!runDetail} onClose={() => setRunDetail(null)} title={runDetail?.name} size="xl">
        <div className="space-y-3">
          {runDetail?.executions?.map(ex => (
            <div key={ex.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {STATUS_ICONS[ex.status]}
                <div>
                  <p className="text-sm font-medium">{ex.title}</p>
                  <div className="flex gap-2">
                    <Badge value={ex.priority} />
                    {ex.comments && <span className="text-xs text-gray-400">{ex.comments}</span>}
                  </div>
                </div>
              </div>
              {can('execute') && (
                <button onClick={() => { setExecModal(ex); setExecForm({ status: ex.status, comments: ex.comments || '' }); }}
                  className="btn-secondary btn-sm">Update</button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Update Execution Modal */}
      <Modal open={!!execModal} onClose={() => setExecModal(null)} title="Update Execution">
        <form onSubmit={updateExec} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">{execModal?.title}</p>
            <label className="label">Result</label>
            <select className="input" value={execForm.status} onChange={e => setExecForm(f => ({ ...f, status: e.target.value }))}>
              {['pending', 'pass', 'fail', 'blocked', 'skipped'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Comments</label>
            <textarea className="input" rows={3} value={execForm.comments}
              onChange={e => setExecForm(f => ({ ...f, comments: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setExecModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
