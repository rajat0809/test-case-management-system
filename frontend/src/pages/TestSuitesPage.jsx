import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Layers, Trash2, Eye } from 'lucide-react';

export default function TestSuitesPage() {
  const { currentProject } = useProject();
  const { can } = useAuth();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    if (!currentProject) return;
    api.get(`/testsuites?project_id=${currentProject.id}`).then(r => setSuites(r.data)).finally(() => setLoading(false));
  }, [currentProject]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id) => {
    const r = await api.get(`/testsuites/${id}`);
    setDetailModal(r.data);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, project_id: currentProject.id };
      if (editing) await api.put(`/testsuites/${editing}`, payload);
      else await api.post('/testsuites', payload);
      toast.success(editing ? 'Updated' : 'Created');
      setModal(false); setEditing(null); setForm({ name: '', description: '' }); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id) => {
    if (!confirm('Delete suite?')) return;
    await api.delete(`/testsuites/${id}`);
    toast.success('Deleted'); load();
  };

  if (!currentProject) return <p className="text-gray-500 text-center mt-20">Select a project first.</p>;
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Test Suites</h1>
        {can('create') && (
          <button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setModal(true); }} className="btn-primary">
            <Plus size={16} /> New Suite
          </button>
        )}
      </div>

      {suites.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No test suites yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suites.map(s => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <span className="badge bg-blue-50 text-blue-700">{s.test_case_count} cases</span>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{s.description || 'No description'}</p>
              <div className="flex gap-2">
                <button onClick={() => loadDetail(s.id)} className="btn-secondary btn-sm flex-1 justify-center">
                  <Eye size={13} /> View Cases
                </button>
                {can('edit') && (
                  <button onClick={() => { setEditing(s.id); setForm({ name: s.name, description: s.description || '' }); setModal(true); }}
                    className="btn-secondary btn-sm">Edit</button>
                )}
                {can('delete') && (
                  <button onClick={() => del(s.id)} className="btn-danger btn-sm"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Suite' : 'New Suite'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Suite Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.name} size="lg">
        {detailModal?.test_cases?.length ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-left p-2 font-medium">Title</th>
              <th className="text-left p-2 font-medium">Priority</th>
              <th className="text-left p-2 font-medium">Type</th>
            </tr></thead>
            <tbody className="divide-y">
              {detailModal.test_cases.map(tc => (
                <tr key={tc.id}>
                  <td className="p-2">{tc.title}</td>
                  <td className="p-2 capitalize">{tc.priority}</td>
                  <td className="p-2 capitalize">{tc.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-400 text-center py-8">No test cases in this suite.</p>}
      </Modal>
    </div>
  );
}
