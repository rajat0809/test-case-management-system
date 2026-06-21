// frontend/src/pages/UsersPage.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const updateRole = async (id, role) => {
    const u = users.find(x => x.id === id);
    await api.put(`/users/${id}`, { ...u, role });
    toast.success('Role updated'); load();
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u.id}`, { ...u, is_active: !u.is_active });
    toast.success('Updated'); load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Name</th>
              <th className="text-left p-3 font-medium text-gray-600">Email</th>
              <th className="text-left p-3 font-medium text-gray-600">Role</th>
              <th className="text-left p-3 font-medium text-gray-600">Status</th>
              <th className="p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-gray-500">{u.email}</td>
                <td className="p-3">
                  <select className="input text-xs py-1 w-32" value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}>
                    {['admin','test-lead','tester','read-only'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <Badge value={u.is_active ? 'active' : 'inactive'} />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => toggleActive(u)}
                    className={`btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}