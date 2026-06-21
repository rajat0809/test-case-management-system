import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TestTube } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const DEMO = [
    { role: 'Admin', email: 'admin@tcms.com', password: 'Admin@123' },
    { role: 'Test Lead', email: 'testlead@tcms.com', password: 'Lead@123' },
    { role: 'Tester', email: 'tester@tcms.com', password: 'Tester@123' },
    { role: 'Read Only', email: 'readonly@tcms.com', password: 'Read@123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-4">
            <TestTube size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TCMS</h1>
          <p className="text-gray-500 text-sm mt-1">Test Case Management System</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-5">Sign in</h2>
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            No account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Demo Credentials</p>
          <div className="space-y-2">
            {DEMO.map(d => (
              <button key={d.role} onClick={() => setForm({ email: d.email, password: d.password })}
                className="w-full flex items-center justify-between text-xs bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
                <span className="font-medium text-gray-700">{d.role}</span>
                <span className="text-gray-400">{d.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Click to fill credentials</p>
        </div>
      </div>
    </div>
  );
}
