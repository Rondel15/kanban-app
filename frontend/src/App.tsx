import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import AuthPage from '@/pages/AuthPage';
import ProjectsPage from '@/pages/ProjectsPage';
import BoardPage from '@/pages/BoardPage';
import DashboardPage from '@/pages/DashboardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  const apply = useThemeStore(s => s.apply);
  useEffect(() => { apply(); }, [apply]);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/projects/:id/board" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
