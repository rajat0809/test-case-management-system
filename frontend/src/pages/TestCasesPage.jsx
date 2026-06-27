import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Search, Trash2, Eye, Edit } from 'lucide-react';

const EMPTY_FORM = {
  title: '', description: '', priority: 'medium', type: 'functional',
  preconditions: '', postconditions: '', tags: '', suite_id: '',
  steps: [{ step_number: 1, action: '', expected_result: '' }],
};

export default function TestCasesPage() {
  const { currentProject } = useProject();
  const { can } = useAuth();
  const [cases, setCases] = useState([]);
  const [suites, setSuites] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ search: '', priority: '', type: '' });
  const [selected, setSelected] = useState([]);
  const LIMIT = 20;

  const load = useCallback(() => {
    if (!currentProject) return;
    setLoading(true);
    const params = new URLSearchParams({ project_id: currentProject.id, page, limit: LIMIT });
    if (filters.search) params.set('search', filters.search);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.type) params.set('type', filters.type);
    api.get(`/testcases?${params}`).then(r => {
      setCases(r.data.data); setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [currentProject, page, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (currentProject)
      api.get(`/testsuites?project_id=${currentProject.id}`).then(r => setSuites(r.data));
  }, [currentProject]);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        project_id: currentProject.id,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        steps: form.steps.filter(s => s.action),
      };
      if (editing) { await api.put(`/testcases/${editing}`, payload); toast.success('Updated'); }
      else { await api.post('/testcases', payload); toast.success('Created'); }
      setModal(false); setEditing(null); setForm(EMPTY_FORM); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteCase = async (id) => {
    if (!confirm('Delete this test case?')) return;
    await api.delete(`/testcases/${id}`);
    toast.success('Deleted'); load();
  };

  const bulkDelete = async () => {
    if (!selected.length || !confirm(`Delete ${selected.length} cases?`)) return;
    await api.post('/testcases/bulk', { ids: selected, operation: 'delete' });
    toast.success('Deleted'); setSelected([]); load();
  };

  const addStep = () => setForm(f => ({
    ...f, steps: [...f.steps, { step_number: f.steps.length + 1, action: '', expected_result: '' }]
  }));

  const updateStep = (i, field, val) => setForm(f => {
    const steps = [...f.steps]; steps[i] = { ...steps[i], [field]: val }; return { ...f, steps };
  });

  if (!currentProject) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-gray-500">Select a project first.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
        <div className="flex gap-2">
          {selected.length > 0 && can('delete') && (
            <button onClick={bulkDelete} className="btn-danger btn-sm">
              <Trash2 size={14} /> Delete ({selected.length})
            </button>
          )}
          {can('create') && (
            <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setModal(true); }} className="btn-primary">
              <Plus size={16} /> New Test Case
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} className="text-gray-400" />
          <input className="input" placeholder="Search test cases..." value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
        </div>
        <select className="input w-36" value={filters.priority}
          onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
          <option value="">All Priority</option>
          {['low','medium','high','critical'].map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="input w-40" value={filters.type}
          onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}>
          <option value="">All Types</option>
          {['functional','integration','regression','smoke','ui','api'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {can('delete') && <th className="w-10 p-3"><input type="checkbox"
                    checked={selected.length === cases.length && cases.length > 0}
                    onChange={e => setSelected(e.target.checked ? cases.map(c => c.id) : [])} /></th>}
                  <th className="text-left p-3 font-medium text-gray-600">Title</th>
                  <th className="text-left p-3 font-medium text-gray-600">Priority</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Suite</th>
                  <th className="p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map(tc => (
                  <tr key={tc.id} className="hover:bg-gray-50">
                    {can('delete') && <td className="p-3">
                      <input type="checkbox" checked={selected.includes(tc.id)}
                        onChange={e => setSelected(s => e.target.checked ? [...s, tc.id] : s.filter(x => x !== tc.id))} />
                    </td>}
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{tc.title}</p>
                      {tc.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tc.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3"><Badge value={tc.priority} /></td>
                    <td className="p-3"><span className="text-xs text-gray-600 capitalize">{tc.type}</span></td>
                    <td className="p-3 text-xs text-gray-500">{tc.suite_name || '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Link to={`/testcases/${tc.id}`} className="btn-secondary btn-sm"><Eye size={13} /></Link>
                        {can('edit') && (
                          <button onClick={() => {
                            setEditing(tc.id);
                            setForm({ ...tc, tags: tc.tags?.join(', ') || '', steps: [{ step_number: 1, action: '', expected_result: '' }] });
                            setModal(true);
                          }} className="btn-secondary btn-sm"><Edit size={13} /></button>
                        )}
                        {can('delete') && (
                          <button onClick={() => deleteCase(tc.id)} className="btn-danger btn-sm"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cases.length === 0 && <p className="text-center text-gray-400 py-12">No test cases found.</p>}
          </div>
          <div className="px-4 pb-4">
            <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Test Case' : 'New Test Case'} size="xl">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['low','medium','high','critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {['functional','integration','regression','smoke','ui','api'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Suite</label>
              <select className="input" value={form.suite_id} onChange={e => setForm(f => ({ ...f, suite_id: e.target.value }))}>
                <option value="">None</option>
                {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pre-conditions</label>
              <textarea className="input" rows={2} value={form.preconditions}
                onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))} />
            </div>
            <div>
              <label className="label">Post-conditions</label>
              <textarea className="input" rows={2} value={form.postconditions}
                onChange={e => setForm(f => ({ ...f, postconditions: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" placeholder="login, smoke, regression" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Test Steps</label>
              <button type="button" onClick={addStep} className="btn-secondary btn-sm"><Plus size={13} /> Add Step</button>
            </div>
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <span className="col-span-1 text-xs text-gray-400 pt-2 text-center">{i + 1}</span>
                  <input className="input col-span-5 text-xs" placeholder="Action"
                    value={s.action} onChange={e => updateStep(i, 'action', e.target.value)} />
                  <input className="input col-span-6 text-xs" placeholder="Expected result"
                    value={s.expected_result} onChange={e => updateStep(i, 'expected_result', e.target.value)} />
                </div>
              ))}
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
