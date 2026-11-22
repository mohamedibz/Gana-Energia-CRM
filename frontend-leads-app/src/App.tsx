import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/Feedback';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { LoginPage } from './pages/LoginPage';
import { NewLeadPage } from './pages/NewLeadPage';
import { WeightsPage } from './pages/WeightsPage';
import type { ReactElement } from 'react';

function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  return status === 'authenticated' ? <Layout /> : <Navigate to="/login" replace />;
}

// Solo el administrador ve la configuración de pesos (el backend también lo exige)
function RequireAdmin({ children }: { children: ReactElement }) {
  const { agent } = useAuth();
  return agent?.rol === 'ADMIN' ? children : <Navigate to="/leads" replace />;
}

function LoginRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  return status === 'authenticated' ? <Navigate to="/leads" replace /> : <LoginPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/new" element={<NewLeadPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route
          path="/weights"
          element={
            <RequireAdmin>
              <WeightsPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/leads" replace />} />
    </Routes>
  );
}
