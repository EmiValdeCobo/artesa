import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { traducirError } from '../../errors/traducirError.js';
import Insignia from '../../components/branding/Insignia.jsx';
import { motivoBloqueoRevocar } from './rbac.js';

// Asigna o quita UN permiso a varios roles. Cada casilla se aplica al instante:
//   marcar   → POST   /seguridad/roles/:id/permisos/:idPermiso  (responde con los permisos del rol)
//   desmarcar → DELETE /seguridad/roles/:id/permisos/:idPermiso (204)
// Es la vista inversa de la matriz de la pestaña Roles (que guarda todo junto con PUT).
export default function AsignarPermisoDialogo({ permiso, roles, usuarioSesion, onCambio, onRolDesactualizado, onClose }) {
  const [pendientes, setPendientes] = useState([]); // roles con una petición en curso
  const [error, setError] = useState(null);

  const tiene = (rol) => rol.permisos.some((item) => item.id_permiso === permiso.id_permiso);

  const alternar = async (rol) => {
    if (pendientes.includes(rol.id_rol)) return;
    setError(null);
    setPendientes((actuales) => [...actuales, rol.id_rol]);
    const asignado = tiene(rol);
    try {
      const ruta = `/seguridad/roles/${rol.id_rol}/permisos/${permiso.id_permiso}`;
      if (asignado) {
        await api.delete(ruta);
        onCambio(rol.id_rol, rol.permisos.filter((item) => item.id_permiso !== permiso.id_permiso));
      } else {
        onCambio(rol.id_rol, await api.post(ruta, {}));
      }
    } catch (err) {
      const u = traducirError(err);
      if (u.id === 'SESION_EXPIRADA') return;
      setError(u);
      // 404/409: el rol, el permiso o la asignación cambiaron en otra sesión → se vuelve a cargar todo.
      if (['ROL_NO_ENCONTRADO', 'PERMISO_NO_ENCONTRADO', 'ASIGNACION_DUPLICADA', 'ASIGNACION_NO_EXISTE'].includes(u.id)) onRolDesactualizado();
    } finally {
      setPendientes((actuales) => actuales.filter((id) => id !== rol.id_rol));
    }
  };

  return (
    <Dialogo tamano="md" labelledBy="asignar-titulo" describedBy="asignar-descripcion" onCerrar={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div className="min-w-0">
          <h2 id="asignar-titulo" className="text-xl font-bold tracking-tight">Asignar a roles</h2>
          <p id="asignar-descripcion" className="mt-1 text-sm text-fg-muted">
            <span className="break-all font-mono text-xs">{permiso.codigo}</span> · Los cambios se aplican al instante.
          </p>
        </div>
        <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <BannerError error={error} onCerrar={() => setError(null)} />
        <ul className="space-y-1.5" aria-label="Roles">
          {roles.map((rol) => {
            const asignado = tiene(rol);
            const ocupado = pendientes.includes(rol.id_rol);
            // Solo se bloquea QUITAR (anti-bloqueo); asignar siempre es seguro.
            const bloqueo = !rol.activo ? 'Rol inactivo: no se puede modificar.' : asignado ? motivoBloqueoRevocar(rol, permiso.codigo, usuarioSesion) : null;
            return (
              <li key={rol.id_rol}>
                <label className={`flex min-h-11 items-start gap-3 rounded-lg border border-line px-3 py-2.5 text-sm ${bloqueo ? 'bg-muted/60' : 'cursor-pointer hover:bg-muted'}`}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={asignado} disabled={Boolean(bloqueo) || ocupado} onChange={() => alternar(rol)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {rol.nombre}
                      {rol.es_sistema && <Insignia>Sistema</Insignia>}
                      {ocupado && <span role="status" className="text-xs font-normal text-fg-muted">Guardando…</span>}
                    </span>
                    {bloqueo && <span className="mt-0.5 flex items-start gap-1 text-xs text-fg-muted"><Lock size={12} aria-hidden="true" className="mt-0.5 shrink-0" /> {bloqueo}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-end border-t border-line p-5 sm:p-6">
        <button type="button" className="btn-primary min-h-11 sm:min-h-10" onClick={onClose}>Listo</button>
      </div>
    </Dialogo>
  );
}
