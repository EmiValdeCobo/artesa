import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Search, ShieldCheck, Trash2, UserCheck, UserRound, UserX, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/AlertProvider.jsx';

const formularioInicial = { username: '', password: '', idRol: '', sucursales: [] };

function UsuarioModal({ usuario, roles, sucursales, guardando, error, onClose, onSubmit }) {
  const [formulario, setFormulario] = useState(usuario
    ? { username: usuario.username, password: '', idRol: String(usuario.id_rol), sucursales: usuario.sucursales.map((sucursal) => sucursal.id_sucursal) }
    : formularioInicial);

  const actualizar = (campo, valor) => setFormulario((actual) => ({ ...actual, [campo]: valor }));
  const alternarSucursal = (idSucursal) => actualizar(
    'sucursales',
    formulario.sucursales.includes(idSucursal)
      ? formulario.sucursales.filter((id) => id !== idSucursal)
      : [...formulario.sucursales, idSucursal],
  );

  const enviar = (event) => {
    event.preventDefault();
    onSubmit({ ...formulario, idRol: Number(formulario.idRol), sucursales: formulario.sucursales.map(Number) });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-espresso-950/50 p-4" role="presentation">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-surface p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="usuario-modal-titulo">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="usuario-modal-titulo" className="text-xl font-bold">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <p className="mt-1 text-sm text-fg-muted">Asigna sus credenciales, rol y sucursales de operación.</p>
          </div>
          <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Cerrar formulario"><X size={18} /></button>
        </div>

        {error && <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

        <form className="mt-6 space-y-5" onSubmit={enviar}>
          <label className="block text-sm font-medium">
            Nombre de usuario
            <input className="input mt-1.5" value={formulario.username} onChange={(event) => actualizar('username', event.target.value)} required minLength={3} maxLength={50} autoFocus />
          </label>
          <label className="block text-sm font-medium">
            {usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            <input className="input mt-1.5" type="password" value={formulario.password} onChange={(event) => actualizar('password', event.target.value)} required={!usuario} minLength={8} placeholder={usuario ? 'Dejar vacío para conservarla' : 'Mínimo 8 caracteres'} />
          </label>
          <label className="block text-sm font-medium">
            Rol
            <select className="input mt-1.5" value={formulario.idRol} onChange={(event) => actualizar('idRol', event.target.value)} required>
              <option value="">Seleccionar rol…</option>
              {roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Sucursales asignadas</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sucursales.map((sucursal) => (
                <label key={sucursal.id_sucursal} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-3 text-sm hover:bg-muted">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={formulario.sucursales.includes(sucursal.id_sucursal)} onChange={() => alternarSucursal(sucursal.id_sucursal)} />
                  <span><span className="block font-medium">{sucursal.nombre}</span><span className="text-xs text-fg-muted">{sucursal.codigo_establecimiento}</span></span>
                </label>
              ))}
            </div>
            {!formulario.sucursales.length && <p className="mt-2 text-xs text-danger">Selecciona al menos una sucursal.</p>}
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando || !formulario.sucursales.length}>{guardando ? 'Guardando…' : 'Guardar usuario'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { usuario: usuarioSesion } = useAuth();
  const { confirm } = useAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [usuariosData, rolesData, sucursalesData] = await Promise.all([
        api.get('/seguridad/usuarios'),
        api.get('/seguridad/roles'),
        api.get('/seguridad/sucursales'),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
      setSucursales(sucursalesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const usuariosFiltrados = useMemo(() => usuarios.filter((usuario) => `${usuario.username} ${usuario.rol}`.toLowerCase().includes(filtro.toLowerCase())), [usuarios, filtro]);

  const guardarUsuario = async (datos) => {
    setGuardando(true);
    setError('');
    try {
      const actualizado = usuarioEditando
        ? await api.put(`/seguridad/usuarios/${usuarioEditando.id_usuario}`, datos)
        : await api.post('/seguridad/usuarios', datos);
      setUsuarios((actuales) => usuarioEditando ? actuales.map((item) => item.id_usuario === actualizado.id_usuario ? actualizado : item) : [actualizado, ...actuales]);
      setModalAbierto(false);
      setUsuarioEditando(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (usuario) => {
    if (String(usuario.id_usuario) === String(usuarioSesion?.id)) {
      setError('No puedes desactivar tu propio usuario.');
      return;
    }
    if (!await confirm(`¿Desactivar al usuario "${usuario.username}"? Podrá reactivarse después.`, { tipo: 'advertencia', titulo: 'Desactivar usuario' })) return;
    try {
      await api.patch(`/seguridad/usuarios/${usuario.id_usuario}/desactivar`);
      setUsuarios((actuales) => actuales.map((item) => item.id_usuario === usuario.id_usuario ? { ...item, activo: false } : item));
    } catch (err) {
      setError(err.message);
    }
  };

  const activar = async (usuario) => {
    if (!await confirm(`¿Reactivar al usuario "${usuario.username}"?`, { tipo: 'pregunta', titulo: 'Activar usuario' })) return;
    try {
      await api.patch(`/seguridad/usuarios/${usuario.id_usuario}/activar`);
      setUsuarios((actuales) => actuales.map((item) => item.id_usuario === usuario.id_usuario ? { ...item, activo: true } : item));
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (usuario) => {
    if (String(usuario.id_usuario) === String(usuarioSesion?.id)) {
      setError('No puedes eliminar tu propio usuario.');
      return;
    }
    if (!await confirm(`¿Eliminar permanentemente al usuario "${usuario.username}"? No se mostrará más en el sistema (el registro queda en la base de datos).`, { tipo: 'error', titulo: 'Eliminar usuario' })) return;
    try {
      await api.delete(`/seguridad/usuarios/${usuario.id_usuario}/eliminar`);
      setUsuarios((actuales) => actuales.filter((item) => item.id_usuario !== usuario.id_usuario));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-text"><UserRound size={17} aria-hidden="true" /> Seguridad</div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-fg-muted">Administra cuentas, roles y sucursales de operación.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setUsuarioEditando(null); setModalAbierto(true); }}><Plus size={17} aria-hidden="true" /> Nuevo usuario</button>
      </div>

      {error && !modalAbierto && <p className="mt-5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

      <div className="card mt-7 p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div><h2 className="font-semibold">Cuentas del sistema</h2><p className="mt-1 text-xs text-fg-muted">{usuarios.length} cuentas registradas</p></div>
          <div className="relative w-full sm:w-72"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" /><input className="input pl-9" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar usuario o rol…" aria-label="Buscar usuario" /></div>
        </div>
        {cargando ? <p className="p-8 text-center text-sm text-fg-muted">Cargando usuarios…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wide text-fg-muted"><tr><th className="px-5 py-3 font-semibold">Usuario</th><th className="px-5 py-3 font-semibold">Rol</th><th className="px-5 py-3 font-semibold">Sucursales</th><th className="px-5 py-3 font-semibold">Estado</th><th className="px-5 py-3 text-right font-semibold">Acciones</th></tr></thead>
              <tbody className="divide-y divide-line">
                {usuariosFiltrados.map((usuario) => <tr key={usuario.id_usuario} className="hover:bg-muted/60">
                  <td className="px-5 py-4 font-medium">{usuario.username}</td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-text"><ShieldCheck size={13} />{usuario.rol}</span></td>
                  <td className="max-w-xs px-5 py-4 text-xs text-fg-muted">{usuario.sucursales.map((sucursal) => sucursal.nombre).join(', ') || 'Sin asignar'}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${usuario.activo ? 'bg-success-soft text-success' : 'bg-muted text-fg-muted'}`}>{usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost !p-2" onClick={() => { setUsuarioEditando(usuario); setModalAbierto(true); }} aria-label={`Editar ${usuario.username}`} title="Editar"><Edit3 size={16} /></button>
                      {usuario.activo
                        ? <button type="button" className="btn-ghost !p-2 text-warning" onClick={() => desactivar(usuario)} aria-label={`Desactivar ${usuario.username}`} title="Desactivar"><UserX size={16} /></button>
                        : <button type="button" className="btn-ghost !p-2 text-success" onClick={() => activar(usuario)} aria-label={`Activar ${usuario.username}`} title="Activar"><UserCheck size={16} /></button>
                      }
                      <button type="button" className="btn-danger !p-2" onClick={() => eliminar(usuario)} aria-label={`Eliminar ${usuario.username}`} title="Eliminar definitivamente"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>)}
              </tbody>
            </table>
            {!usuariosFiltrados.length && <p className="p-8 text-center text-sm text-fg-muted">No se encontraron usuarios.</p>}
          </div>
        )}
      </div>

      {modalAbierto && <UsuarioModal usuario={usuarioEditando} roles={roles} sucursales={sucursales} guardando={guardando} error={error} onClose={() => { setModalAbierto(false); setUsuarioEditando(null); setError(''); }} onSubmit={guardarUsuario} />}
    </div>
  );
}

