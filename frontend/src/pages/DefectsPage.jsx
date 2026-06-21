// frontend/src/pages/DefectsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Bug } from 'lucide-react';

export default function DefectsPage() {
  const { currentProject } = useProject();
  const { can } = useAuth();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' });

  const load = useCallback(() => {
    if (!currentProject) return;
    api.get(`/defects?project_id=${currentProject.id}`)
      .then(r => setDefects(r.data)).finally(() => setLoading(false));
  }, [currentProject]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/defects', { ...form, project_id: currentProject.id });
      toast.success('Defect reported'); setModal(false);
      setForm({ title: '', description: '', severity: 'medium' }); load();
    } catch { toast.error('Error'); }
  };

  const updateStatus = async (id, status) => {
    const d = defects.find(x => x.id === id);
    await api.put(`/defects/${id}`, { ...d, status });
    load();
  };

  if (!currentProject) return <p className="text-gray-500 text-center mt-20">Select a project first.</p>;
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Defects</h1>
        {can('execute') && (
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} /> Report Defect
          </button>
        )}
      </div>

      {defects.length === 0 ? (
        <div className="card p-12 text-center">
          <Bug size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No defects reported. Great job!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Title</th>
                <th className="text-left p-3 font-medium text-gray-600">Severity</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Reported by</th>
                <th className="p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {defects.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium">{d.title}</p>
                    {d.test_case_title && <p className="text-xs text-gray-400">From: {d.test_case_title}</p>}
                  </td>
                  <td className="p-3"><Badge value={d.severity} /></td>
                  <td className="p-3"><Badge value={d.status} /></td>
                  <td className="p-3 text-gray-500 text-xs">{d.reported_by_name}</td>
                  <td className="p-3">
                    {can('execute') && (
                      <select className="input text-xs py-1" value={d.status}
                        onChange={e => updateStatus(d.id, e.target.value)}>
                        {['open','in-progress','resolved','closed','wontfix'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Report Defect">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="label">Severity</label>
            <select className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              {['low','medium','high','critical'].map(s => <option key={s}>{s}</option>)}
            </select></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Report</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}