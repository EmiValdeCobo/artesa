import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { traducirError } from '../../errors/traducirError.js';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import Insignia from '../../components/branding/Insignia.jsx';
import { ICONOS } from '../../config/iconos.js';

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

function UsuarioModal({ usuario, roles, sucursales, guardando, onClose, onSubmit }) {
  const { notificar } = useAlert();
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
    if (Object.keys(encontrados).length) {
      enfocarPrimero(encontrados);
      notificar.advertencia('Campos requeridos incompletos', {
        mensaje: 'Revisa los campos señalados en el formulario.',
      });
      return;
    }
    ultimoEnvio.current = { ...formulario, idRol: Number(formulario.idRol), sucursales: formulario.sucursales.map(Number) };
    onSubmit(ultimoEnvio.current);
  };

  const claseInvalida = 'aria-invalid:border-danger';

  return (
    <Dialogo tamano="lg" labelledBy="usuario-modal-titulo" describedBy="usuario-modal-descripcion" enfoqueInicial={usernameRef} cerrarConFondo={false} onCerrar={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div>
          <h2 id="usuario-modal-titulo" className="text-h3">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <p id="usuario-modal-descripcion" className="mt-1 text-body-sm text-fg-muted">Asigna sus credenciales, rol y sucursales de operación.</p>
        </div>
        <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar formulario" onClick={onClose} />
      </div>

      <form noValidate onSubmit={enviar}>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label htmlFor={idCampo('username')} className="rotulo block">Nombre de usuario</label>
            <input id={idCampo('username')} ref={usernameRef} className={`input mt-1.5 ${claseInvalida}`} value={formulario.username} onChange={(event) => actualizar('username', event.target.value)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={errores.username ? true : undefined} aria-describedby={describir(errores, 'username')} />
            <CampoError id={idCampo('username')} mensaje={errores.username} />
          </div>

          <div>
            <label htmlFor={idCampo('password')} className="rotulo block">{usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
            <input id={idCampo('password')} className={`input mt-1.5 ${claseInvalida}`} type="password" value={formulario.password} onChange={(event) => actualizar('password', event.target.value)}
              autoComplete="new-password" placeholder={usuario ? 'Dejar vacío para conservarla' : 'Mínimo 8 caracteres'} aria-invalid={errores.password ? true : undefined} aria-describedby={describir(errores, 'password')} />
            <CampoError id={idCampo('password')} mensaje={errores.password} />
          </div>

          <div>
            <Select id={idCampo('idRol')} etiqueta="Rol" placeholder="Seleccionar rol…" vacio="No hay roles activos" className={claseInvalida} value={formulario.idRol} onChange={(event) => actualizar('idRol', event.target.value)}
              aria-invalid={errores.idRol ? true : undefined} aria-describedby={describir(errores, 'idRol')} opciones={roles.map((rol) => ({ valor: rol.id_rol, texto: rol.nombre }))} />
            <CampoError id={idCampo('idRol')} mensaje={errores.idRol} />
          </div>

          <fieldset id={idCampo('sucursales')} tabIndex={-1} className="outline-none" aria-describedby={describir(errores, 'sucursales')}>
            <legend className="rotulo">Sucursales asignadas</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sucursales.map((sucursal) => (
                <label key={sucursal.id_sucursal} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-body-sm transition-colors hover:bg-muted has-[:checked]:bg-primary-soft ${errores.sucursales ? 'border-danger' : 'border-line'}`}>
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={formulario.sucursales.includes(sucursal.id_sucursal)} onChange={() => alternarSucursal(sucursal.id_sucursal)} />
                  <span><span className="block font-medium">{sucursal.nombre}</span><span className="text-label-sm tabular-nums text-fg-muted">{sucursal.codigo_establecimiento}</span></span>
                </label>
              ))}
            </div>
            <CampoError id={idCampo('sucursales')} mensaje={errores.sucursales} />
          </fieldset>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2.5 border-t border-line bg-surface p-5 sm:flex-row sm:justify-end sm:p-6">
          <Button variante="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar usuario'}</Button>
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
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(''); // '' = todos · 'activos' · 'inactivos'
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

  const usuariosFiltrados = useMemo(() => usuarios.filter((usuario) =>
    `${usuario.username} ${usuario.rol}`.toLowerCase().includes(filtro.trim().toLowerCase())
    && (!filtroEstado || (filtroEstado === 'activos') === Boolean(usuario.activo))), [usuarios, filtro, filtroEstado]);
  const hayFiltros = Boolean(filtro.trim() || filtroEstado);
  const limpiarFiltros = () => { setFiltro(''); setFiltroEstado(''); };
  const abrirNuevo = () => { setUsuarioEditando(null); setModalAbierto(true); };

  const cerrarModal = () => { setModalAbierto(false); setUsuarioEditando(null); };

  const guardarUsuario = async (datos) => {
    setGuardando(true);
    try {
      const actualizado = usuarioEditando
        ? await api.put(`/seguridad/usuarios/${usuarioEditando.id_usuario}`, datos)
        : await api.post('/seguridad/usuarios', datos);
      setUsuarios((actuales) => usuarioEditando ? actuales.map((item) => item.id_usuario === actualizado.id_usuario ? actualizado : item) : [actualizado, ...actuales]);
      notificar.exito(usuarioEditando ? 'Usuario actualizado correctamente' : 'Usuario creado exitosamente');
      cerrarModal();
    } catch (err) {
      notificarError(err, { reintentar: () => guardarUsuario(datos) });
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
      notificar.exito(accion === 'activar' ? `Usuario «${usuario.username}» activado` : `Usuario «${usuario.username}» desactivado`);
    } catch (err) {
      alFallarAccion(err, () => cambiarEstado(usuario, accion));
    }
  };

  const desactivar = async (usuario) => {
    if (String(usuario.id_usuario) === String(usuarioSesion?.id)) return avisarAutoproteccion('desactivar');
    if (!await confirm(`¿Desactivar al usuario "${usuario.username}"? Podrá reactivarse después.`, { destructivo: true, titulo: 'Desactivar usuario', etiquetaAceptar: 'Desactivar' })) return;
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
      notificar.exito(`Usuario «${usuario.username}» eliminado definitivamente`);
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
      <EncabezadoPagina seccion="Administración · Usuarios y roles" titulo="Usuarios" descripcion="Administra cuentas, roles y sucursales de operación." />

      {errorCarga ? (
        <BannerError className="mt-6" error={errorCarga} onReintentar={cargarDatos} />
      ) : (
        <>
          {/* Barra de herramientas: búsqueda + un filtro + acción principal */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
              <input type="search" className="input pl-9" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar usuario o rol…" aria-label="Buscar usuario" />
            </div>
            <div className="w-full sm:w-44">
              <Select aria-label="Filtrar por estado" placeholder="Todos los estados" value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}
                opciones={[{ valor: 'activos', texto: 'Activos' }, { valor: 'inactivos', texto: 'Inactivos' }]} />
            </div>
            <Button icono={ICONOS.crear} className="sm:ml-auto" disabled={cargando} onClick={abrirNuevo}>Nuevo usuario</Button>
          </div>

          <Card sinPadding className="mt-4 overflow-hidden" icono={Users} titulo="Cuentas del sistema"
            descripcion={cargando ? 'Cargando cuentas…' : <span className="tabular-nums">{hayFiltros ? `${usuariosFiltrados.length} de ${usuarios.length} cuentas` : `${usuarios.length} cuentas registradas`}</span>}>
            {!cargando && !usuarios.length ? (
              <EstadoVacio icono={UserPlus} titulo="Aún no hay usuarios registrados" accion={<Button icono={ICONOS.crear} onClick={abrirNuevo}>Nuevo usuario</Button>}>
                Crea la primera cuenta y asígnale un rol y sus sucursales.
              </EstadoVacio>
            ) : !cargando && !usuariosFiltrados.length ? (
              <EstadoVacio icono={Search} titulo="Sin resultados" accion={<Button variante="ghost" onClick={limpiarFiltros}>Limpiar filtros</Button>}>
                Ningún usuario coincide con tu búsqueda. Prueba con otro nombre o rol.
              </EstadoVacio>
            ) : (
              <Table
                cargando={cargando}
                filas={usuariosFiltrados}
                idFila="id_usuario"
                idTabla="seguridad-usuarios"
                ordenInicial={{ clave: 'username', direccion: 'asc' }}
                minAncho="min-w-[700px]"
                idSeleccionado={modalAbierto ? usuarioEditando?.id_usuario : undefined}
                columnas={[
                  {
                    clave: 'username',
                    titulo: 'Usuario',
                    tipo: 'texto',
                    render: (usuario) => (
                      <span className="inline-flex items-center gap-2 font-medium text-fg">
                        {usuario.username}
                        {String(usuario.id_usuario) === String(usuarioSesion?.id) && <Insignia variante="info">Tú</Insignia>}
                      </span>
                    ),
                  },
                  {
                    clave: 'rol',
                    titulo: 'Rol',
                    tipo: 'texto',
                    valorOrden: (usuario) => usuario.rol,
                    render: (usuario) => <Insignia variante="primario" icono={ShieldCheck}>{usuario.rol}</Insignia>,
                  },
                  {
                    clave: 'sucursales',
                    titulo: 'Sucursales',
                    tipo: 'texto',
                    clase: 'max-w-xs',
                    valorOrden: (usuario) => (usuario.sucursales ?? []).map((sucursal) => sucursal.nombre).join(', ') || 'Sin asignar',
                    render: (usuario) => (
                      <span className="text-body-sm text-fg-muted">
                        {(usuario.sucursales ?? []).map((sucursal) => sucursal.nombre).join(', ') || 'Sin asignar'}
                      </span>
                    ),
                  },
                  {
                    clave: 'activo',
                    titulo: 'Estado',
                    tipo: 'booleano',
                    valorOrden: (usuario) => Boolean(usuario.activo),
                    render: (usuario) => <EstadoBadge tipo={usuario.activo ? 'exito' : 'inactivo'}>{usuario.activo ? 'Activo' : 'Inactivo'}</EstadoBadge>,
                  },
                  {
                    clave: 'acciones',
                    titulo: 'Acciones',
                    alinear: 'right',
                    ordenable: false,
                    render: (usuario) => (
                      <div className="flex justify-end gap-1">
                        <BotonIcono icono={ICONOS.editar} etiqueta={`Editar ${usuario.username}`} titulo="Editar" onClick={() => { setUsuarioEditando(usuario); setModalAbierto(true); }} />
                        {usuario.activo
                          ? <BotonIcono icono={ICONOS.desactivarUsuario} etiqueta={`Desactivar ${usuario.username}`} titulo="Desactivar" onClick={() => desactivar(usuario)} />
                          : <BotonIcono icono={ICONOS.activarUsuario} etiqueta={`Activar ${usuario.username}`} titulo="Activar" onClick={() => activar(usuario)} />
                        }
                        <BotonIcono icono={ICONOS.eliminar} tono="peligro" etiqueta={`Eliminar ${usuario.username}`} titulo="Eliminar definitivamente" onClick={() => eliminar(usuario)} />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}

      {modalAbierto && <UsuarioModal usuario={usuarioEditando} roles={roles} sucursales={sucursales} guardando={guardando} onClose={cerrarModal} onSubmit={guardarUsuario} />}
    </div>
  );
}
