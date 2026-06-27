// frontend/src/pages/UsersPage.jsx

import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Users, Plus, Shield } from 'lucide-react';

const EMPTY = { name: '', email: '', password: '', role: 'tester' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = () => {
    api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('All fields are required'); return;
    }
    try {
      await api.post('/auth/register', form);
      toast.success('User created: ' + form.name);
      setModal(false); setForm(EMPTY); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create user'); }
  };

  const updateRole = async (id, role) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    try {
      await api.put(`/users/${id}`, { ...u, role });
      toast.success('Role updated → ' + role);
      load();
    } catch { toast.error('Update failed'); }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { ...u, is_active: !u.is_active });
      toast.success(u.is_active ? `${u.name} deactivated` : `${u.name} activated`);
      load();
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          User Management
          <span className="ml-2 text-sm font-normal text-gray-500">({users.length} users)</span>
        </h1>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* RBAC matrix */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-blue-700" />
          <p className="text-sm font-semibold text-blue-700">Permission Matrix (RBAC)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead><tr className="border-b border-blue-200">
              <th className="text-left py-1 font-medium text-blue-600">Feature</th>
              <th className="text-center py-1 text-purple-700">Admin</th>
              <th className="text-center py-1 text-blue-700">Test Lead</th>
              <th className="text-center py-1 text-green-700">Tester</th>
              <th className="text-center py-1 text-gray-500">Read Only</th>
            </tr></thead>
            <tbody className="divide-y divide-blue-100">
              {[
                ['Create/edit test cases','✓','✓','✗','✗'],
                ['Execute tests & update results','✓','✓','✓','✗'],
                ['Report defects','✓','✓','✓','✗'],
                ['Manage projects','✓','✓','✗','✗'],
                ['Manage users','✓','✗','✗','✗'],
                ['View dashboards & analytics','✓','✓','Partial','Partial'],
              ].map(([f,...cols]) => (
                <tr key={f}>
                  <td className="py-1 font-medium text-gray-700">{f}</td>
                  {cols.map((c,i) => (
                    <td key={i} className={`text-center py-1 font-medium ${c==='✓'?'text-green-600':c==='✗'?'text-red-500':'text-yellow-600'}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Name</th>
                <th className="text-left p-3 font-medium text-gray-600">Email</th>
                <th className="text-left p-3 font-medium text-gray-600">Role</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="p-3 font-medium text-gray-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="p-3">
                    <select
                      className="input text-xs py-1 w-28"
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                    >
                      {['admin','test-lead','tester','read-only'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3"><Badge value={u.is_active ? 'active' : 'inactive'} /></td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleActive(u)}
                      className={u.is_active ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add New User">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input className="input" required placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input className="input" type="email" required placeholder="priya@company.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input className="input" type="password" required minLength={6} placeholder="Min 6 characters"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {['tester','test-lead','read-only','admin'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add User</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
