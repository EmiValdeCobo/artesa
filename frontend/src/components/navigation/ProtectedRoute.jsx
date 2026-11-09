import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ permiso, portal = 'admin', children }) {
  const { usuario, tipoSesion, tiene, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-fg-muted">Cargando sesión…</div>
      </div>
    );
  }

  if (!usuario || tipoSesion !== portal) {
    return <Navigate to={portal === 'cliente' ? '/cliente/login' : '/admin/login'} replace />;
  }

  if (permiso && !tiene(permiso)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-danger">Acceso no autorizado</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Esta pantalla no está disponible para tu cuenta. Si la necesitas, pídela a un administrador.
        </p>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
