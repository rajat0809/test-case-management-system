import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Users, TestTube, FolderOpen, Check } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const EMPTY_FORM = { name: '', description: '', version: '', status: 'active' };

export default function ProjectsPage() {
  const { currentProject, selectProject } = useProject();
  const { can } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/projects/${editing}`, form);
        toast.success('Project updated');
      } else {
        await api.post('/projects', form);
        toast.success('Project created');
      }
      setModal(false); setForm(EMPTY_FORM); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', version: p.version || '', status: p.status });
    setEditing(p.id); setModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {can('create') && (
          <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setModal(true); }} className="btn-primary">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className={`card p-5 cursor-pointer transition-all hover:shadow-md
              ${currentProject?.id === p.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {currentProject?.id === p.id && <Check size={14} className="text-blue-600" />}
                  </div>
                  {p.version && <span className="text-xs text-gray-400">{p.version}</span>}
                </div>
                <Badge value={p.status} />
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Users size={12} /> {p.member_count} members</span>
                <span className="flex items-center gap-1"><TestTube size={12} /> {p.test_case_count} tests</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => selectProject(p)} className="btn-primary btn-sm flex-1 justify-center">
                  {currentProject?.id === p.id ? 'Selected' : 'Select'}
                </button>
                {can('edit') && (
                  <button onClick={() => openEdit(p)} className="btn-secondary btn-sm">Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Project' : 'New Project'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Version</label>
              <input className="input" placeholder="v1.0.0" value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['active', 'inactive', 'completed', 'archived'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
