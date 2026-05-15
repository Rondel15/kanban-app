import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import AuthPage from '@/pages/AuthPage';
import ProjectsPage from '@/pages/ProjectsPage';
import BoardPage from '@/pages/BoardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
