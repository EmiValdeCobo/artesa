import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ClienteLoginPage from './pages/ClienteLoginPage.jsx';
import ClienteHomePage from './pages/ClienteHomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RolesPermisosPage from './modules/seguridad/RolesPermisosPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/cliente/login" element={<ClienteLoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute portal="admin">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="seguridad"
          element={
            <ProtectedRoute permiso="SEG_GESTIONAR_ROLES">
              <RolesPermisosPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route
        path="/cliente"
        element={<ProtectedRoute portal="cliente"><ClienteHomePage /></ProtectedRoute>}
      />
    </Routes>
  );
}
