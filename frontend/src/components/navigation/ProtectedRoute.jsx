import { Navigate, Outlet } from 'react-router-dom';
import AccesoDenegado from '../sistema/AccesoDenegado.jsx';
import Skeleton from '../feedback/Skeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ permiso, portal = 'admin', children }) {
  const { usuario, tipoSesion, tiene, cargando } = useAuth();

  if (cargando) {
    return (
      // Esqueleto del armazón (sidebar + encabezado + bloques) mientras se valida la sesión.
      <div role="status" className="flex min-h-screen bg-background">
        <span className="sr-only">Cargando sesión…</span>
        {portal === 'admin' && <div aria-hidden="true" className="hidden w-sidebar shrink-0 bg-sidebar lg:block" />}
        <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!usuario || tipoSesion !== portal) {
    return <Navigate to="/admin/login" replace />;
  }

  const tieneAcceso = permiso
    ? (Array.isArray(permiso) ? permiso.some((p) => tiene(p)) : tiene(permiso))
    : true;

  if (!tieneAcceso) {
    return <AccesoDenegado />;
  }

  return children ? children : <Outlet />;
}
