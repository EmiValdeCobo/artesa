import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ permiso, children }) {
  const { usuario, tiene, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-fg-muted">Cargando sesión…</div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (permiso && !tiene(permiso)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-danger">Acceso no autorizado</h2>
        <p className="mt-2 text-sm text-fg-muted">
          No tienes el permiso <code>{permiso}</code> necesario para ver esta pantalla.
        </p>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
