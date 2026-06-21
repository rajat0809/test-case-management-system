import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  LayoutDashboard, FolderOpen, ClipboardList, Layers,
  Play, Bug, Users, LogOut, ChevronDown, TestTube
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/testcases', icon: ClipboardList, label: 'Test Cases' },
  { to: '/testsuites', icon: Layers, label: 'Test Suites' },
  { to: '/executions', icon: Play, label: 'Executions' },
  { to: '/defects', icon: Bug, label: 'Defects' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { currentProject, selectProject } = useProject();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col transition-all duration-200 shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <TestTube size={24} className="text-blue-400 shrink-0" />
          {sidebarOpen && <span className="font-bold text-lg">TCMS</span>}
        </div>

        {/* Project selector */}
        {sidebarOpen && currentProject && (
          <div className="p-3 border-b border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Current Project</p>
            <button onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-sm text-white font-medium hover:text-blue-300 transition-colors w-full text-left">
              <span className="truncate">{currentProject.name}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <Users size={18} className="shrink-0" />
              {sidebarOpen && 'Users'}
            </NavLink>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-700">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-gray-400 hover:text-white">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <Layers size={18} />
          </button>
          {currentProject ? (
            <h1 className="text-sm font-medium text-gray-600">
              📁 <span className="text-gray-900">{currentProject.name}</span>
            </h1>
          ) : (
            <h1 className="text-sm text-gray-500">No project selected</h1>
          )}
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
