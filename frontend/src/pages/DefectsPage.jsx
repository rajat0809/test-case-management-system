// frontend/src/pages/DefectsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Bug, AlertTriangle } from 'lucide-react';

const EMPTY = { title: '', description: '', severity: 'medium' };

export default function DefectsPage() {
  const { currentProject } = useProject();
  const { can, user } = useAuth();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(() => {
    if (!currentProject) return;
    setLoading(true);
    api.get(`/defects?project_id=${currentProject.id}`)
      .then(r => setDefects(r.data))
      .catch(() => toast.error('Failed to load defects'))
      .finally(() => setLoading(false));
  }, [currentProject]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    try {
      await api.post('/defects', { ...form, project_id: currentProject.id });
      toast.success('Defect reported');
      setModal(false); setForm(EMPTY); load();
    } catch { toast.error('Failed to report defect'); }
  };

  const updateStatus = async (id, status) => {
    const d = defects.find(x => x.id === id);
    if (!d) return;
    try {
      await api.put(`/defects/${id}`, { ...d, status });
      toast.success(`Status → ${status}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const deleteDefect = async (id) => {
    if (!confirm('Delete this defect?')) return;
    try {
      await api.put(`/defects/${id}`, { status: 'closed' });
      toast.success('Defect closed');
      load();
    } catch { toast.error('Failed'); }
  };

  const openCount = defects.filter(d => d.status === 'open').length;
  const criticalCount = defects.filter(d => d.severity === 'critical' && d.status !== 'resolved' && d.status !== 'closed').length;

  if (!currentProject) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Bug size={48} className="text-gray-300 mb-4" />
      <p className="text-gray-500">Select a project to view defects.</p>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Defects
          <span className="ml-2 text-sm font-normal text-gray-500">({defects.length} total)</span>
        </h1>
        {can('execute') && (
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} /> Report Defect
          </button>
        )}
      </div>

      {/* Summary cards */}
      {defects.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-2xl font-bold text-red-600">{openCount}</p>
            <p className="text-sm text-gray-500">Open defects</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-purple-600">{criticalCount}</p>
            <p className="text-sm text-gray-500">Critical unresolved</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-green-600">{defects.filter(d => d.status === 'resolved').length}</p>
            <p className="text-sm text-gray-500">Resolved</p>
          </div>
        </div>
      )}

      {!can('execute') && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <AlertTriangle size={16} className="shrink-0" />
          Read-only access — you can view defects but cannot report or update them.
        </div>
      )}

      {defects.length === 0 ? (
        <div className="card p-12 text-center">
          <Bug size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600 mb-1">No defects reported</p>
          <p className="text-gray-400 text-sm">Great job! Everything is passing.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Title</th>
                  <th className="text-left p-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Reported by</th>
                  <th className="p-3 font-medium text-gray-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {defects.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{d.title}</p>
                      {d.test_case_title && (
                        <p className="text-xs text-gray-400 mt-0.5">From: {d.test_case_title}</p>
                      )}
                    </td>
                    <td className="p-3"><Badge value={d.severity} /></td>
                    <td className="p-3">
                      {can('execute') ? (
                        <select
                          className="input text-xs py-1 w-32"
                          value={d.status}
                          onChange={e => updateStatus(d.id, e.target.value)}
                        >
                          {['open','in-progress','resolved','closed','wontfix'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : <Badge value={d.status} />}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{d.reported_by_name}</td>
                    <td className="p-3 text-center">
                      {can('execute') && (
                        <button
                          onClick={() => deleteDefect(d.id)}
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Report Defect">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input className="input" required placeholder="Brief description of the bug"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description / Steps to reproduce</label>
            <textarea className="input" rows={4} placeholder="1. Navigate to...&#10;2. Enter invalid data...&#10;3. Observe..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Severity</label>
            <select className="input" value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-danger">Report Defect</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}