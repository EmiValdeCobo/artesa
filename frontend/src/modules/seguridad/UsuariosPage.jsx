import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Plus, Search, ShieldCheck, Trash2, UserCheck, UserRound, UserX, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { traducirError } from '../../errors/traducirError.js';

const formularioInicial = { username: '', password: '', idRol: '', sucursales: [] };
const ORDEN_CAMPOS = ['username', 'password', 'idRol', 'sucursales'];
const PATRON_USUARIO = /^[a-zA-Z0-9._-]+$/;

// Misma regla que el backend (seguridad.schemas.js), pero con el mensaje junto al campo y antes de llamar a la API.
function validarFormulario(formulario, esEdicion) {
  const errores = {};
  const username = formulario.username.trim();
  if (!username) errores.username = 'Escribe un nombre de usuario.';
  else if (username.length < 3) errores.username = 'El nombre de usuario debe tener al menos 3 caracteres.';
  else if (username.length > 50) errores.username = 'El nombre de usuario debe tener como máximo 50 caracteres.';
  else if (!PATRON_USUARIO.test(username)) errores.username = 'Usa solo letras, números, punto, guion o guion bajo (sin espacios).';

  if (!esEdicion && !formulario.password) errores.password = 'Escribe una contraseña.';
  else if (formulario.password && formulario.password.length < 8) errores.password = 'La contraseña debe tener al menos 8 caracteres.';

  if (!formulario.idRol) errores.idRol = 'Selecciona un rol.';
  if (!formulario.sucursales.length) errores.sucursales = 'Selecciona al menos una sucursal.';
  return errores;
}

const idCampo = (campo) => `usuario-${campo}`;
const describir = (errores, campo) => (errores[campo] ? idError(idCampo(campo)) : undefined);

function UsuarioModal({ usuario, roles, sucursales, guardando, error, onDescartarError, onClose, onSubmit }) {
  const [formulario, setFormulario] = useState(usuario
    ? { username: usuario.username, password: '', idRol: String(usuario.id_rol), sucursales: usuario.sucursales.map((sucursal) => sucursal.id_sucursal) }
    : formularioInicial);
  const [errores, setErrores] = useState({});
  const usernameRef = useRef(null);
  const ultimoEnvio = useRef(null);

  const enfocarPrimero = (mapa) => {
    const campo = ORDEN_CAMPOS.find((nombre) => mapa[nombre]);
    if (campo) document.getElementById(idCampo(campo))?.focus();
  };

  // Errores que devuelve el servidor (usuario duplicado, rol inactivo…): se marcan junto a su campo.
  useEffect(() => {
    if (!error?.campos) return;
    setErrores(error.campos);
    enfocarPrimero(error.campos);
  }, [error]);

  const actualizar = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };
  const alternarSucursal = (idSucursal) => actualizar(
    'sucursales',
    formulario.sucursales.includes(idSucursal)
      ? formulario.sucursales.filter((id) => id !== idSucursal)
      : [...formulario.sucursales, idSucursal],
  );

  const enviar = (event) => {
    event.preventDefault();
    const encontrados = validarFormulario(formulario, Boolean(usuario));
    setErrores(encontrados);
    if (Object.keys(encontrados).length) { enfocarPrimero(encontrados); return; }
    ultimoEnvio.current = { ...formulario, idRol: Number(formulario.idRol), sucursales: formulario.sucursales.map(Number) };
    onSubmit(ultimoEnvio.current);
  };

  const claseInvalida = 'aria-invalid:border-danger';

  return (
    <Dialogo tamano="lg" labelledBy="usuario-modal-titulo" describedBy="usuario-modal-descripcion" enfoqueInicial={usernameRef} cerrarConFondo={false} onCerrar={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div>
          <h2 id="usuario-modal-titulo" className="text-xl font-bold tracking-tight">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <p id="usuario-modal-descripcion" className="mt-1 text-sm text-fg-muted">Asigna sus credenciales, rol y sucursales de operación.</p>
        </div>
        <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Cerrar formulario"><X size={18} /></button>
      </div>

      <form noValidate onSubmit={enviar}>
        <div className="space-y-5 p-5 sm:p-6">
          <BannerError error={error} onCerrar={onDescartarError} onReintentar={() => ultimoEnvio.current && onSubmit(ultimoEnvio.current)} />

          <div>
            <label htmlFor={idCampo('username')} className="block text-sm font-medium">Nombre de usuario</label>
            <input id={idCampo('username')} ref={usernameRef} className={`input mt-1.5 ${claseInvalida}`} value={formulario.username} onChange={(event) => actualizar('username', event.target.value)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={errores.username ? true : undefined} aria-describedby={describir(errores, 'username')} />
            <CampoError id={idCampo('username')} mensaje={errores.username} />
          </div>

          <div>
            <label htmlFor={idCampo('password')} className="block text-sm font-medium">{usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
            <input id={idCampo('password')} className={`input mt-1.5 ${claseInvalida}`} type="password" value={formulario.password} onChange={(event) => actualizar('password', event.target.value)}
              autoComplete="new-password" placeholder={usuario ? 'Dejar vacío para conservarla' : 'Mínimo 8 caracteres'} aria-invalid={errores.password ? true : undefined} aria-describedby={describir(errores, 'password')} />
            <CampoError id={idCampo('password')} mensaje={errores.password} />
          </div>

          <div>
            <label htmlFor={idCampo('idRol')} className="block text-sm font-medium">Rol</label>
            <select id={idCampo('idRol')} className={`input mt-1.5 ${claseInvalida}`} value={formulario.idRol} onChange={(event) => actualizar('idRol', event.target.value)}
              aria-invalid={errores.idRol ? true : undefined} aria-describedby={describir(errores, 'idRol')}>
              <option value="">Seleccionar rol…</option>
              {roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>)}
            </select>
            <CampoError id={idCampo('idRol')} mensaje={errores.idRol} />
          </div>

          <fieldset id={idCampo('sucursales')} tabIndex={-1} className="outline-none" aria-describedby={describir(errores, 'sucursales')}>
            <legend className="text-sm font-medium">Sucursales asignadas</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sucursales.map((sucursal) => (
                <label key={sucursal.id_sucursal} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm hover:bg-muted ${errores.sucursales ? 'border-danger' : 'border-line'}`}>
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={formulario.sucursales.includes(sucursal.id_sucursal)} onChange={() => alternarSucursal(sucursal.id_sucursal)} />
                  <span><span className="block font-medium">{sucursal.nombre}</span><span className="text-xs text-fg-muted">{sucursal.codigo_establecimiento}</span></span>
                </label>
              ))}
            </div>
            <CampoError id={idCampo('sucursales')} mensaje={errores.sucursales} />
          </fieldset>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2.5 border-t border-line bg-surface p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" className="btn-ghost min-h-11 sm:min-h-10" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary min-h-11 sm:min-h-10" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar usuario'}</button>
        </div>
      </form>
    </Dialogo>
  );
}

export default function UsuariosPage() {
  const { usuario: usuarioSesion } = useAuth();
  const { confirm, notificar, notificarError } = useAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);       // la lista no cargó → mensaje en línea con "Reintentar"
  const [errorGuardado, setErrorGuardado] = useState(null); // el formulario no se pudo guardar → dentro del formulario
  const [filtro, setFiltro] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [usuariosData, rolesData, sucursalesData] = await Promise.all([
        api.get('/seguridad/usuarios'),
        api.get('/seguridad/roles'),
        api.get('/seguridad/sucursales'),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData.filter((rol) => rol.activo)); // el endpoint también devuelve inactivos y no se pueden asignar
      setSucursales(sucursalesData);
    } catch (err) {
      setErrorCarga(traducirError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const usuariosFiltrados = useMemo(() => usuarios.filter((usuario) => `${usuario.username} ${usuario.rol}`.toLowerCase().includes(filtro.toLowerCase())), [usuarios, filtro]);

  const cerrarModal = () => { setModalAbierto(false); setUsuarioEditando(null); setErrorGuardado(null); };

  const guardarUsuario = async (datos) => {
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const actualizado = usuarioEditando
        ? await api.put(`/seguridad/usuarios/${usuarioEditando.id_usuario}`, datos)
        : await api.post('/seguridad/usuarios', datos);
      setUsuarios((actuales) => usuarioEditando ? actuales.map((item) => item.id_usuario === actualizado.id_usuario ? actualizado : item) : [actualizado, ...actuales]);
      cerrarModal();
    } catch (err) {
      const u = traducirError(err);
      if (u.id === 'SESION_EXPIRADA') return; // lo atiende el aviso global y la redirección al login
      if (u.canal === 'modal') {
        // No sabemos si se guardó (tiempo agotado): se detiene al usuario y se refresca la lista para que lo verifique.
        notificarError(u);
        cerrarModal();
        cargarDatos();
      } else {
        setErrorGuardado(u); // dentro del formulario, junto a los campos afectados
      }
    } finally {
      setGuardando(false);
    }
  };

  // Un 404 en una acción de fila significa que la lista quedó desactualizada: se avisa y se refresca.
  const alFallarAccion = (err, reintentar) => {
    const u = notificarError(err, { reintentar });
    if (u.id === 'USUARIO_NO_ENCONTRADO') cargarDatos();
  };

  const avisarAutoproteccion = (verbo) => notificar.advertencia(`No puedes ${verbo} tu propia cuenta`, {
    mensaje: 'Es la cuenta con la que tienes la sesión iniciada.',
    accion: 'Pídele a otro administrador que lo haga.',
  });

  const cambiarEstado = async (usuario, accion) => {
    try {
      await api.patch(`/seguridad/usuarios/${usuario.id_usuario}/${accion}`);
      setUsuarios((actuales) => actuales.map((item) => item.id_usuario === usuario.id_usuario ? { ...item, activo: accion === 'activar' } : item));
    } catch (err) {
      alFallarAccion(err, () => cambiarEstado(usuario, accion));
    }
  };

  const desactivar = async (usuario) => {
    if (String(usuario.id_usuario) === String(usuarioSesion?.id)) return avisarAutoproteccion('desactivar');
    if (!await confirm(`¿Desactivar al usuario "${usuario.username}"? Podrá reactivarse después.`, { tipo: 'advertencia', titulo: 'Desactivar usuario', etiquetaAceptar: 'Desactivar' })) return;
    cambiarEstado(usuario, 'desactivar');
  };

  const activar = async (usuario) => {
    if (!await confirm(`¿Reactivar al usuario "${usuario.username}"?`, { tipo: 'pregunta', titulo: 'Activar usuario', etiquetaAceptar: 'Activar' })) return;
    cambiarEstado(usuario, 'activar');
  };

  const ejecutarEliminar = async (usuario) => {
    try {
      await api.delete(`/seguridad/usuarios/${usuario.id_usuario}/eliminar`);
      setUsuarios((actuales) => actuales.filter((item) => item.id_usuario !== usuario.id_usuario));
    } catch (err) {
      alFallarAccion(err, () => ejecutarEliminar(usuario));
    }
  };

  const eliminar = async (usuario) => {
    if (String(usuario.id_usuario) === String(usuarioSesion?.id)) return avisarAutoproteccion('eliminar');
    if (!await confirm(`¿Eliminar permanentemente al usuario "${usuario.username}"? No se mostrará más en el sistema.`, { destructivo: true, titulo: 'Eliminar usuario', etiquetaAceptar: 'Eliminar' })) return;
    ejecutarEliminar(usuario);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-text"><UserRound size={17} aria-hidden="true" /> Seguridad</div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-fg-muted">Administra cuentas, roles y sucursales de operación.</p>
        </div>
        <button type="button" className="btn-primary" disabled={Boolean(errorCarga) || cargando} onClick={() => { setUsuarioEditando(null); setModalAbierto(true); }}><Plus size={17} aria-hidden="true" /> Nuevo usuario</button>
      </div>

      {errorCarga ? (
        <BannerError className="mt-7" error={errorCarga} onReintentar={cargarDatos} />
      ) : (
        <div className="card mt-7 p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
            <div><h2 className="font-semibold">Cuentas del sistema</h2><p className="mt-1 text-xs text-fg-muted">{usuarios.length} cuentas registradas</p></div>
            <div className="relative w-full sm:w-72"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" /><input className="input pl-9" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar usuario o rol…" aria-label="Buscar usuario" /></div>
          </div>
          {cargando ? <p role="status" className="p-8 text-center text-sm text-fg-muted">Cargando usuarios…</p> : (
            <div className="max-h-[560px] overflow-x-auto overflow-y-auto scroll-fino">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-line bg-muted text-xs uppercase tracking-wide text-fg-muted shadow-xs"><tr><th className="bg-muted px-5 py-3 font-semibold">Usuario</th><th className="bg-muted px-5 py-3 font-semibold">Rol</th><th className="bg-muted px-5 py-3 font-semibold">Sucursales</th><th className="bg-muted px-5 py-3 font-semibold">Estado</th><th className="bg-muted px-5 py-3 text-right font-semibold">Acciones</th></tr></thead>
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
              {!usuariosFiltrados.length && <p className="p-8 text-center text-sm text-fg-muted">{usuarios.length ? 'Ningún usuario coincide con tu búsqueda. Prueba con otro nombre o rol.' : 'Aún no hay usuarios registrados. Crea el primero con «Nuevo usuario».'}</p>}
            </div>
          )}
        </div>
      )}

      {modalAbierto && <UsuarioModal usuario={usuarioEditando} roles={roles} sucursales={sucursales} guardando={guardando} error={errorGuardado} onDescartarError={() => setErrorGuardado(null)} onClose={cerrarModal} onSubmit={guardarUsuario} />}
    </div>
  );
}
