import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const TestCasesPage = lazy(() => import('./pages/TestCasesPage'));
const TestCaseDetailPage = lazy(() => import('./pages/TestCaseDetailPage'));
const TestSuitesPage = lazy(() => import('./pages/TestSuitesPage'));
const ExecutionsPage = lazy(() => import('./pages/ExecutionsPage'));
const DefectsPage = lazy(() => import('./pages/DefectsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Toaster position="top-right" />
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="testcases" element={<TestCasesPage />} />
                <Route path="testcases/:id" element={<TestCaseDetailPage />} />
                <Route path="testsuites" element={<TestSuitesPage />} />
                <Route path="executions" element={<ExecutionsPage />} />
                <Route path="defects" element={<DefectsPage />} />
                <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              </Route>
            </Routes>
          </Suspense>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
