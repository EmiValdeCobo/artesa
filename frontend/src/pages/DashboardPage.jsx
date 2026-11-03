import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { usuario, permisos } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold">Bienvenido, {usuario.username}</h1>
      <p className="mt-1 text-fg-muted">Rol: {usuario.rol} · Sucursal: {usuario.sucursales.map((s) => s.nombre).join(', ') || '—'}</p>
      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">Tus permisos ({permisos.length})</h2>
        <div className="flex flex-wrap gap-2">
          {permisos.map((p) => (
            <span key={p} className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-medium text-secondary-text">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
