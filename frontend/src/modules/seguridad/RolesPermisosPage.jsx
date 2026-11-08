import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, CircleAlert, Edit3, Info, KeyRound, Layers, Lock, Plus, Save, Search, ShieldCheck, Trash2, Undo2, Users } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/AlertProvider.jsx';
import BannerError from '../../components/BannerError.jsx';
import EstadoVacio from '../../components/EstadoVacio.jsx';
import Insignia from '../../components/Insignia.jsx';
import Metrica from '../../components/Metrica.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import { traducirError } from '../../errors/traducirError.js';
import AsignarPermisoDialogo from './AsignarPermisoDialogo.jsx';
import PermisoModal from './PermisoModal.jsx';
import RolModal from './RolModal.jsx';
import {
  agruparPorModulo, coincidePermiso, diferencias, infoModulo, mismosIds, motivoBloqueoEliminarRol,
  motivoBloqueoPermiso, motivoBloqueoRevocar, validarAsignacion,
} from './rbac.js';

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
const porModuloYCodigo = (a, b) => a.modulo.localeCompare(b.modulo, 'es') || a.codigo.localeCompare(b.codigo, 'es');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

// Error generado en el propio frontend (validaciones previas) con el formato que espera BannerError.
const errorLocal = (titulo, mensaje, accion) => ({ esErrorUsuario: true, categoria: 'usuario', titulo, mensaje, accion, reintentable: false });

// Barra fina de cobertura (permisos del rol / permisos totales). Decorativa: el dato también va en texto.
function Cobertura({ valor, total, className = '' }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-muted ${className}`} aria-hidden="true">
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${porcentaje(valor, total)}%` }} />
    </div>
  );
}

function GrupoPermisos({ grupo, seleccion, bloqueos, soloLectura, abierto, onAbrirCerrar, onAlternar, onAlternarGrupo }) {
  const ids = grupo.permisos.map((permiso) => permiso.id_permiso);
  const marcados = ids.filter((id) => seleccion.includes(id)).length;
  const todos = marcados === ids.length;
  const titulo = `modulo-${grupo.modulo}`;

  return (
    <section className="card overflow-hidden !p-0" aria-labelledby={titulo}>
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
        <button type="button" className="-ml-1 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left hover:bg-muted/60" aria-expanded={abierto} aria-controls={`${titulo}-lista`} onClick={onAbrirCerrar}>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-fg-muted transition-transform ${abierto ? '' : '-rotate-90'}`} />
          <span className="min-w-0">
            <span id={titulo} className="block font-semibold">{grupo.etiqueta}</span>
            <span className="block truncate text-xs text-fg-muted">{grupo.descripcion}</span>
          </span>
        </button>
        <Insignia variante={marcados ? 'primario' : 'neutro'}>{marcados}/{ids.length}</Insignia>
        {!soloLectura && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 pl-2 text-xs font-semibold text-primary-text">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={todos} ref={(el) => { if (el) el.indeterminate = marcados > 0 && !todos; }}
              onChange={() => onAlternarGrupo(ids, todos)} aria-label={`Seleccionar todos los permisos de ${grupo.etiqueta}`} />
            <span className="hidden sm:inline">Todo</span>
          </label>
        )}
      </div>
      <div id={`${titulo}-lista`} hidden={!abierto} className="grid gap-1 border-t border-line p-3 sm:grid-cols-2">
        {grupo.permisos.map((permiso) => {
          const marcado = seleccion.includes(permiso.id_permiso);
          const bloqueo = marcado ? bloqueos.get(permiso.id_permiso) : null;
          const inactivo = soloLectura || Boolean(bloqueo);
          return (
            <label key={permiso.id_permiso} title={bloqueo || undefined}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${marcado ? 'border-primary/30 bg-primary-soft/50' : 'border-transparent'} ${inactivo ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={marcado} disabled={inactivo} onChange={() => onAlternar(permiso.id_permiso)} aria-label={permiso.descripcion || permiso.codigo} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{permiso.descripcion || permiso.codigo}</span>
                <span className="mt-1 block truncate font-mono text-xs text-fg-muted">{permiso.codigo}</span>
                {bloqueo && <span className="mt-1 flex items-start gap-1 text-xs text-fg-muted"><Lock size={12} aria-hidden="true" className="mt-0.5 shrink-0" /> {bloqueo}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function RolesPermisosPage() {
  const { usuario: usuarioSesion, tiene, recargarSesion } = useAuth();
  const { confirm, notificar, notificarError } = useAlert();

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [usuariosPorRol, setUsuariosPorRol] = useState(null); // { [id_rol]: n }; null = no se pudo saber (falta permiso o falló)
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [pestana, setPestana] = useState('roles');
  const [rolId, setRolId] = useState(null);
  const [borrador, setBorrador] = useState(null); // ids marcados sin guardar; null = igual a lo guardado
  const [actualizandoRol, setActualizandoRol] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [colapsados, setColapsados] = useState(() => new Set());

  const [filtroPermisos, setFiltroPermisos] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');

  const [modalRol, setModalRol] = useState(null);         // { rol: null | rol }
  const [modalPermiso, setModalPermiso] = useState(null); // { permiso: null | permiso }
  const [asignando, setAsignando] = useState(null);       // permiso abierto en "Asignar a roles"
  const [guardandoModal, setGuardandoModal] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const panelRef = useRef(null);
  const ultimaPeticion = useRef(0); // evita que una respuesta tardía apague el indicador de otra más nueva

  // ── Carga ────────────────────────────────────────────────────────────────────
  const cargarDatos = async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setErrorCarga(null);
    try {
      const [rolesData, permisosData] = await Promise.all([api.get('/seguridad/roles'), api.get('/seguridad/permisos')]);
      setRoles(rolesData);
      setPermisos(permisosData);
      setRolId((actual) => (rolesData.some((rol) => rol.id_rol === actual) ? actual : rolesData[0]?.id_rol ?? null));
      setBorrador(null);
    } catch (err) {
      const u = traducirError(err);
      if (silencioso) { if (u.id !== 'SESION_EXPIRADA') notificarError(u); } else setErrorCarga(u);
    } finally {
      setCargando(false);
    }
    // El conteo de usuarios por rol es opcional: solo quien administra usuarios puede consultarlo.
    if (tiene('SEG_GESTIONAR_USUARIOS')) {
      try {
        const conteo = {};
        for (const item of await api.get('/seguridad/usuarios')) conteo[item.id_rol] = (conteo[item.id_rol] ?? 0) + 1;
        setUsuariosPorRol(conteo);
      } catch { setUsuariosPorRol(null); }
    } else setUsuariosPorRol(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, []);

  const rolActivo = roles.find((rol) => rol.id_rol === rolId) ?? null;
  const baseIds = useMemo(() => (rolActivo ? rolActivo.permisos.map((permiso) => permiso.id_permiso) : []), [rolActivo]);
  const seleccion = borrador ?? baseIds;
  const hayCambios = borrador !== null && !mismosIds(borrador, baseIds);
  const soloLectura = Boolean(rolActivo) && !rolActivo.activo;
  const esRolDeSesion = Boolean(rolActivo) && rolActivo.nombre === usuarioSesion?.rol;
  const usuariosDelRol = (rol) => (usuariosPorRol ? usuariosPorRol[rol.id_rol] ?? 0 : null);

  // Índice permiso → roles que lo tienen (se calcula una vez por cambio de datos, no por fila).
  const rolesPorPermiso = useMemo(() => {
    const indice = new Map();
    for (const rol of roles) for (const permiso of rol.permisos) indice.set(permiso.id_permiso, [...(indice.get(permiso.id_permiso) ?? []), rol]);
    return indice;
  }, [roles]);
  const rolesConPermiso = (permiso) => rolesPorPermiso.get(permiso.id_permiso) ?? [];

  // Permisos que no se pueden quitar del rol abierto (anti-bloqueo), con su motivo.
  const bloqueos = useMemo(
    () => new Map(permisos.map((permiso) => [permiso.id_permiso, rolActivo ? motivoBloqueoRevocar(rolActivo, permiso.codigo, usuarioSesion) : null])),
    [permisos, rolActivo, usuarioSesion],
  );

  const modulos = useMemo(() => [...new Set(permisos.map((permiso) => String(permiso.modulo).toUpperCase()))].sort(), [permisos]);
  const grupos = useMemo(() => agruparPorModulo(permisos.filter((permiso) => coincidePermiso(permiso, filtro))), [permisos, filtro]);
  const permisosFiltrados = useMemo(
    () => permisos.filter((permiso) => coincidePermiso(permiso, filtroPermisos) && (!filtroModulo || String(permiso.modulo).toUpperCase() === filtroModulo)),
    [permisos, filtroPermisos, filtroModulo],
  );
  const sinAsignar = permisos.filter((permiso) => !rolesConPermiso(permiso).length).length;

  // En escritorio el panel Roles | Permisos ocupa justo la altura visible bajo el encabezado, y cada
  // columna hace scroll por separado. Se mide aquí porque lo que hay encima (título, métricas) varía.
  // En pantallas pequeñas no se fija altura y todo fluye con el scroll normal de la página.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const ajustar = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) { panel.style.height = ''; return; }
      const arriba = panel.getBoundingClientRect().top + window.scrollY;
      panel.style.height = `${Math.max(window.innerHeight - arriba - 32, 480)}px`; // 32 = padding inferior de <main>
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [pestana, cargando, errorCarga]);

  // Avisa al cerrar la pestaña del navegador con cambios sin guardar.
  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (evento) => { evento.preventDefault(); evento.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  // ── Utilidades ───────────────────────────────────────────────────────────────
  const confirmarDescartar = async () => !hayCambios || confirm(
    `Tienes cambios sin guardar en el rol "${rolActivo.nombre}". Si continúas se perderán.`,
    { tipo: 'advertencia', titulo: 'Cambios sin guardar', etiquetaAceptar: 'Descartar cambios', etiquetaCancelar: 'Seguir editando' },
  );

  const reemplazarPermisosDeRol = (idRol, lista) => setRoles((actuales) => actuales.map((rol) => (rol.id_rol === idRol ? { ...rol, permisos: lista } : rol)));

  // Si el cambio toca el rol con el que inició sesión, se actualizan los permisos de la sesión (menú y rutas).
  const sincronizarSesion = (nombreRol) => { if (nombreRol && nombreRol === usuarioSesion?.rol) recargarSesion(); };

  // Un 404 en una acción significa que los datos quedaron desactualizados: se avisa y se refresca.
  const alFallarAccion = (err, reintentar) => {
    const u = traducirError(err);
    if (u.id === 'SESION_EXPIRADA') return;
    notificarError(u, { reintentar });
    if (['ROL_NO_ENCONTRADO', 'PERMISO_NO_ENCONTRADO'].includes(u.id)) cargarDatos({ silencioso: true });
  };

  const alternarModuloAbierto = (modulo) => setColapsados((actual) => {
    const siguiente = new Set(actual);
    if (!siguiente.delete(modulo)) siguiente.add(modulo);
    return siguiente;
  });

  // ── Roles: selección y asignación de permisos (PUT) ──────────────────────────
  const refrescarPermisosRol = async (idRol) => {
    const peticion = ++ultimaPeticion.current;
    setActualizandoRol(true);
    try {
      reemplazarPermisosDeRol(idRol, await api.get(`/seguridad/roles/${idRol}/permisos`));
    } catch (err) {
      alFallarAccion(err);
    } finally {
      if (peticion === ultimaPeticion.current) setActualizandoRol(false);
    }
  };

  const seleccionarRol = async (idRol) => {
    if (idRol === rolId) return;
    if (!(await confirmarDescartar())) return;
    setRolId(idRol);
    setBorrador(null);
    setErrorAsignacion(null);
    refrescarPermisosRol(idRol); // trae los permisos vigentes por si otra sesión los cambió
  };

  const alternarPermiso = (idPermiso) => {
    setErrorAsignacion(null);
    setBorrador(seleccion.includes(idPermiso) ? seleccion.filter((id) => id !== idPermiso) : [...seleccion, idPermiso]);
  };

  const alternarGrupo = (ids, todos) => {
    setErrorAsignacion(null);
    if (!todos) { setBorrador([...new Set([...seleccion, ...ids])]); return; }
    setBorrador(seleccion.filter((id) => !ids.includes(id) || bloqueos.get(id))); // los bloqueados se quedan marcados
  };

  const descartarCambios = () => { setBorrador(null); setErrorAsignacion(null); };

  const guardarAsignacion = async () => {
    const motivo = validarAsignacion(rolActivo, seleccion, permisos, usuarioSesion);
    if (motivo) { setErrorAsignacion(errorLocal('No se puede guardar', motivo, 'Corrige la selección e inténtalo de nuevo.')); return; }

    const { quitados } = diferencias(baseIds, seleccion);
    const afectados = usuariosDelRol(rolActivo);
    const perderanAcceso = quitados.length > 0 && (afectados === null || afectados > 0);
    if (perderanAcceso || seleccion.length === 0) {
      const codigos = quitados.map((id) => permisos.find((permiso) => permiso.id_permiso === id)?.codigo).filter(Boolean);
      const quien = afectados === null ? 'Los usuarios con este rol' : plural(afectados, 'usuario con este rol', 'usuarios con este rol');
      const partes = [];
      if (quitados.length) partes.push(`${quien} perderán acceso a: ${codigos.join(', ')}.`);
      if (seleccion.length === 0) partes.push('El rol quedará sin ningún permiso.');
      if (!(await confirm(partes.join('\n'), { tipo: 'advertencia', titulo: `Guardar permisos de ${rolActivo.nombre}`, etiquetaAceptar: 'Guardar de todos modos' }))) return;
    }

    setGuardando(true);
    setErrorAsignacion(null);
    try {
      const lista = await api.put(`/seguridad/roles/${rolActivo.id_rol}/permisos`, { idPermisos: seleccion });
      reemplazarPermisosDeRol(rolActivo.id_rol, lista);
      setBorrador(null);
      notificar.exito('Permisos guardados', { mensaje: `${rolActivo.nombre} ahora tiene ${plural(lista.length, 'permiso activo', 'permisos activos')}.` });
      sincronizarSesion(rolActivo.nombre);
    } catch (err) {
      const u = traducirError(err);
      if (u.id === 'SESION_EXPIRADA') return;
      if (u.canal === 'modal') { notificarError(u); cargarDatos({ silencioso: true }); return; } // no sabemos si se guardó
      setErrorAsignacion(u);
      if (['ROL_NO_ENCONTRADO', 'PERMISOS_NO_DISPONIBLES'].includes(u.id)) cargarDatos({ silencioso: true });
    } finally {
      setGuardando(false);
    }
  };

  // ── Roles: crear / editar / eliminar ─────────────────────────────────────────
  const abrirModalRol = async (rol = null) => {
    if (!(await confirmarDescartar())) return;
    setBorrador(null);
    setErrorModal(null);
    setModalRol({ rol });
  };
  const cerrarModalRol = () => { setModalRol(null); setErrorModal(null); };

  const guardarRol = async (datos) => {
    const editando = modalRol.rol;
    setGuardandoModal(true);
    setErrorModal(null);
    try {
      const guardado = editando ? await api.put(`/seguridad/roles/${editando.id_rol}`, datos) : await api.post('/seguridad/roles', datos);
      setRoles((actuales) => (editando
        ? actuales.map((rol) => (rol.id_rol === guardado.id_rol ? guardado : rol))
        : [...actuales, guardado]).sort(porNombre));
      if (editando) {
        notificar.exito('Rol actualizado', { mensaje: `Se guardaron los cambios de ${guardado.nombre}.` });
        if (editando.nombre === usuarioSesion?.rol) recargarSesion();
      } else {
        setRolId(guardado.id_rol);
        setBorrador(null);
        setPestana('roles');
        notificar.exito('Rol creado', { mensaje: `Marca los permisos que tendrá ${guardado.nombre} y guarda.` });
      }
      cerrarModalRol();
    } catch (err) {
      const u = traducirError(err);
      if (u.id === 'SESION_EXPIRADA') return;
      if (u.canal === 'modal') { notificarError(u); cerrarModalRol(); cargarDatos({ silencioso: true }); } else setErrorModal(u);
    } finally {
      setGuardandoModal(false);
    }
  };

  const ejecutarEliminarRol = async (rol) => {
    try {
      await api.delete(`/seguridad/roles/${rol.id_rol}`);
      const restantes = roles.filter((item) => item.id_rol !== rol.id_rol);
      setRoles(restantes);
      if (rol.id_rol === rolId) { setRolId(restantes[0]?.id_rol ?? null); setBorrador(null); setErrorAsignacion(null); }
      notificar.exito('Rol eliminado', { mensaje: `${rol.nombre} ya no aparece en el sistema.` });
    } catch (err) {
      alFallarAccion(err, () => ejecutarEliminarRol(rol));
    }
  };

  const eliminarRol = async (rol) => {
    const motivo = motivoBloqueoEliminarRol(rol, { usuariosAsignados: usuariosDelRol(rol), usuarioSesion });
    if (motivo) { notificar.advertencia(`No se puede eliminar ${rol.nombre}`, { mensaje: motivo }); return; }
    const aviso = usuariosPorRol === null ? '\nNo pudimos comprobar si tiene usuarios asignados. Revisa la pantalla de Usuarios antes de continuar.' : '';
    if (!(await confirm(
      `¿Eliminar el rol "${rol.nombre}"? Se quitarán sus ${plural(rol.permisos.length, 'permiso', 'permisos')} y dejará de mostrarse.${aviso}`,
      { destructivo: true, titulo: 'Eliminar rol', etiquetaAceptar: 'Eliminar' },
    ))) return;
    ejecutarEliminarRol(rol);
  };

  // ── Permisos: crear / editar / eliminar / asignar ────────────────────────────
  const abrirModalPermiso = (permiso = null) => { setErrorModal(null); setModalPermiso({ permiso }); };
  const cerrarModalPermiso = () => { setModalPermiso(null); setErrorModal(null); };

  const guardarPermiso = async (datos) => {
    const editando = modalPermiso.permiso;
    if (editando && datos.codigo !== editando.codigo) {
      const n = rolesConPermiso(editando).length;
      const seguir = await confirm(
        `Vas a cambiar el código «${editando.codigo}» por «${datos.codigo}».\nLas rutas del backend que exijan el código anterior dejarán de reconocer este permiso${n ? ` en ${plural(n, 'rol', 'roles')}` : ''}.`,
        { tipo: 'advertencia', titulo: 'Cambiar código de permiso', etiquetaAceptar: 'Cambiar código' },
      );
      if (!seguir) return;
    }
    setGuardandoModal(true);
    setErrorModal(null);
    try {
      const guardado = editando ? await api.put(`/seguridad/permisos/${editando.id_permiso}`, datos) : await api.post('/seguridad/permisos', datos);
      setPermisos((actuales) => (editando
        ? actuales.map((permiso) => (permiso.id_permiso === guardado.id_permiso ? guardado : permiso))
        : [...actuales, guardado]).sort(porModuloYCodigo));
      if (editando) {
        setRoles((actuales) => actuales.map((rol) => ({ ...rol, permisos: rol.permisos.map((permiso) => (permiso.id_permiso === guardado.id_permiso ? guardado : permiso)) })));
        if (tiene(editando.codigo)) recargarSesion();
      }
      notificar.exito(editando ? 'Permiso actualizado' : 'Permiso creado', { mensaje: editando ? `Se guardaron los cambios de ${guardado.codigo}.` : `${guardado.codigo} ya está disponible para asignarlo a los roles.` });
      cerrarModalPermiso();
    } catch (err) {
      const u = traducirError(err);
      if (u.id === 'SESION_EXPIRADA') return;
      if (u.canal === 'modal') { notificarError(u); cerrarModalPermiso(); cargarDatos({ silencioso: true }); } else setErrorModal(u);
    } finally {
      setGuardandoModal(false);
    }
  };

  const ejecutarEliminarPermiso = async (permiso) => {
    try {
      await api.delete(`/seguridad/permisos/${permiso.id_permiso}`);
      setPermisos((actuales) => actuales.filter((item) => item.id_permiso !== permiso.id_permiso));
      setRoles((actuales) => actuales.map((rol) => ({ ...rol, permisos: rol.permisos.filter((item) => item.id_permiso !== permiso.id_permiso) })));
      setBorrador((actual) => (actual ? actual.filter((id) => id !== permiso.id_permiso) : actual));
      notificar.exito('Permiso eliminado', { mensaje: `${permiso.codigo} se quitó del catálogo y de los roles.` });
      if (tiene(permiso.codigo)) recargarSesion();
    } catch (err) {
      alFallarAccion(err, () => ejecutarEliminarPermiso(permiso));
    }
  };

  const eliminarPermiso = async (permiso) => {
    const motivo = motivoBloqueoPermiso(permiso);
    if (motivo) { notificar.advertencia(`No se puede eliminar ${permiso.codigo}`, { mensaje: motivo }); return; }
    const n = rolesConPermiso(permiso).length;
    if (!(await confirm(
      `¿Eliminar el permiso «${permiso.codigo}»?${n ? `\nSe quitará de ${plural(n, 'rol', 'roles')} y quien dependa de él perderá esa acción.` : ''}\nLas rutas del backend que lo exijan quedarán inaccesibles para todos menos para quien tenga otro permiso válido.`,
      { destructivo: true, titulo: 'Eliminar permiso', etiquetaAceptar: 'Eliminar' },
    ))) return;
    ejecutarEliminarPermiso(permiso);
  };

  const abrirAsignacion = async (permiso) => {
    if (!(await confirmarDescartar())) return;
    setBorrador(null);
    setAsignando(permiso);
  };

  const alCambiarAsignacion = (idRol, lista) => {
    reemplazarPermisosDeRol(idRol, lista);
    sincronizarSesion(roles.find((rol) => rol.id_rol === idRol)?.nombre);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const permisoEnAsignacion = asignando ? permisos.find((permiso) => permiso.id_permiso === asignando.id_permiso) ?? asignando : null;
  const { agregados, quitados } = diferencias(baseIds, seleccion);
  const listo = !cargando && !errorCarga;
  const bloqueoEliminar = rolActivo ? motivoBloqueoEliminarRol(rolActivo, { usuariosAsignados: usuariosDelRol(rolActivo), usuarioSesion }) : null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-text"><ShieldCheck size={17} aria-hidden="true" /> Seguridad</div>
          <h1 className="text-2xl font-bold tracking-tight">Roles y permisos</h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">Define qué acciones puede realizar cada rol dentro de artesa.</p>
        </div>
        <button type="button" className="btn-primary" disabled={!listo} onClick={() => (pestana === 'roles' ? abrirModalRol() : abrirModalPermiso())}>
          <Plus size={17} aria-hidden="true" /> {pestana === 'roles' ? 'Nuevo rol' : 'Nuevo permiso'}
        </button>
      </div>

      {listo && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metrica icono={Users} valor={roles.length} etiqueta="Roles" tono="primario" />
          <Metrica icono={KeyRound} valor={permisos.length} etiqueta="Permisos" tono="info" />
          <Metrica icono={Layers} valor={modulos.length} etiqueta="Módulos" tono="neutro" />
          <Metrica icono={CircleAlert} valor={sinAsignar} etiqueta="Permisos sin asignar" tono={sinAsignar ? 'aviso' : 'exito'} />
        </div>
      )}

      <Pestanas className="mt-6" etiqueta="Secciones" activa={pestana} onCambiar={setPestana}
        pestanas={[{ clave: 'roles', texto: 'Roles', icono: Users, total: listo ? roles.length : undefined }, { clave: 'permisos', texto: 'Permisos', icono: KeyRound, total: listo ? permisos.length : undefined }]} />

      {errorCarga ? (
        <BannerError className="mt-7" error={errorCarga} onReintentar={() => cargarDatos()} />
      ) : cargando ? (
        <p role="status" className="card mt-7 p-8 text-center text-sm text-fg-muted">Cargando roles y permisos…</p>
      ) : pestana === 'roles' ? (
        <div ref={panelRef} role="tabpanel" id="panel-roles" aria-labelledby="tab-roles" className="mt-7 grid gap-6 lg:grid-cols-[300px_1fr] lg:grid-rows-[minmax(0,1fr)]">
          <aside className="h-fit lg:-mx-1 lg:h-full lg:min-h-0 scroll-fino lg:overflow-y-auto lg:px-1 lg:py-1 lg:[scrollbar-gutter:stable]">
            {/* Móvil: selector compacto en lugar de una lista larga */}
            <div className="card lg:hidden">
              <label htmlFor="selector-rol" className="block text-sm font-medium">Rol</label>
              <select id="selector-rol" className="input mt-1.5" value={rolId ?? ''} onChange={(evento) => seleccionarRol(Number(evento.target.value))}>
                {roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}{rol.activo ? '' : ' (inactivo)'}</option>)}
              </select>
            </div>

            <nav className="card hidden p-3 lg:block" aria-label="Roles disponibles">
              <h2 className="px-2 pb-3 text-sm font-semibold">{plural(roles.length, 'rol', 'roles')}</h2>
              <ul className="space-y-1">
                {roles.map((rol) => {
                  const n = usuariosDelRol(rol);
                  const actual = rol.id_rol === rolId;
                  return (
                    <li key={rol.id_rol}>
                      <button type="button" aria-current={actual ? 'true' : undefined} onClick={() => seleccionarRol(rol.id_rol)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${actual ? 'border-primary/40 bg-primary-soft' : 'border-transparent hover:bg-muted'}`}>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`break-all text-sm font-semibold ${actual ? 'text-primary-text' : ''}`}>{rol.nombre}</span>
                          {rol.es_sistema && <Insignia>Sistema</Insignia>}
                          {!rol.activo && <Insignia variante="aviso">Inactivo</Insignia>}
                        </span>
                        {rol.descripcion && <span className="mt-1 line-clamp-2 block text-xs text-fg-muted">{rol.descripcion}</span>}
                        <Cobertura className="mt-3" valor={rol.permisos.length} total={permisos.length} />
                        <span className="mt-1.5 block text-xs text-fg-muted">{rol.permisos.length}/{permisos.length} permisos{n !== null && ` · ${plural(n, 'usuario', 'usuarios')}`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!roles.length && <p className="px-3 py-6 text-center text-sm text-fg-muted">Aún no hay roles. Crea el primero con «Nuevo rol».</p>}
            </nav>
          </aside>

          {rolActivo ? (
            <div className="min-w-0 lg:-mx-1 lg:h-full lg:min-h-0 scroll-fino lg:overflow-y-auto lg:px-1 lg:py-1 lg:[scrollbar-gutter:stable]">
              <div className="card mb-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-xl font-bold tracking-tight">{rolActivo.nombre}</h2>
                      {rolActivo.es_sistema && <Insignia>Sistema</Insignia>}
                      {esRolDeSesion && <Insignia variante="info">Tu rol</Insignia>}
                      {soloLectura && <Insignia variante="aviso">Inactivo</Insignia>}
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{rolActivo.descripcion || 'Sin descripción.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost min-h-10" disabled={soloLectura} title={soloLectura ? 'Un rol inactivo no se puede modificar' : undefined} onClick={() => abrirModalRol(rolActivo)}><Edit3 size={15} aria-hidden="true" /> Editar</button>
                    <button type="button" className="btn-danger min-h-10" onClick={() => eliminarRol(rolActivo)} title={bloqueoEliminar || undefined}><Trash2 size={15} aria-hidden="true" /> Eliminar</button>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
                  <div className="min-w-48 flex-1">
                    <p className="flex items-baseline justify-between text-sm"><span className="font-medium">Permisos activos</span><span className="text-fg-muted"><strong className="text-fg">{seleccion.length}</strong> de {permisos.length}</span></p>
                    <Cobertura className="mt-2" valor={seleccion.length} total={permisos.length} />
                  </div>
                  <p className="text-sm text-fg-muted">
                    {usuariosDelRol(rolActivo) === null ? 'Usuarios: sin acceso para consultarlos' : <><strong className="text-fg">{usuariosDelRol(rolActivo)}</strong> {usuariosDelRol(rolActivo) === 1 ? 'usuario asignado' : 'usuarios asignados'}</>}
                  </p>
                </div>
              </div>

              {soloLectura && (
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm" role="status">
                  <Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" /> Este rol está inactivo: puedes ver sus permisos, pero no modificarlos.
                </div>
              )}
              <BannerError className="mb-5" error={errorAsignacion} onCerrar={() => setErrorAsignacion(null)} onReintentar={guardarAsignacion} />

              <div className="relative mb-5">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <input className="input pl-10" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar permiso o módulo…" aria-label="Buscar permiso" />
                {actualizandoRol && <span role="status" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted">Actualizando…</span>}
              </div>

              <div className="space-y-4">
                {grupos.map((grupo) => (
                  <GrupoPermisos key={grupo.modulo} grupo={grupo} seleccion={seleccion} bloqueos={bloqueos} soloLectura={soloLectura || guardando}
                    abierto={Boolean(filtro.trim()) || !colapsados.has(grupo.modulo)} onAbrirCerrar={() => alternarModuloAbierto(grupo.modulo)} onAlternar={alternarPermiso} onAlternarGrupo={alternarGrupo} />
                ))}
                {!grupos.length && (
                  <div className="card">
                    <EstadoVacio icono={permisos.length ? Search : KeyRound} titulo={permisos.length ? 'No encontramos permisos' : 'Aún no hay permisos'}>
                      {permisos.length ? 'Prueba con otro término de búsqueda.' : 'Crea permisos desde la pestaña Permisos para poder asignarlos.'}
                    </EstadoVacio>
                  </div>
                )}
              </div>

              {hayCambios && (
                <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-surface p-4 shadow-lg" role="region" aria-label="Cambios sin guardar">
                  <p className="text-sm"><span className="font-semibold">Cambios sin guardar</span> · <span className="text-success">{agregados.length} por agregar</span> · <span className="text-danger">{quitados.length} por quitar</span></p>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={descartarCambios} disabled={guardando}><Undo2 size={16} aria-hidden="true" /> Descartar</button>
                    <button type="button" className="btn-primary" onClick={guardarAsignacion} disabled={guardando}><Save size={16} aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar cambios'}</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card"><EstadoVacio icono={Users} titulo="Sin roles">Crea un rol para empezar a asignarle permisos.</EstadoVacio></div>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="panel-permisos" aria-labelledby="tab-permisos" className="card mt-7 overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4 sm:p-5">
            <div>
              <h2 className="font-semibold">Catálogo de permisos</h2>
              <p className="mt-1 text-xs text-fg-muted">{plural(permisosFiltrados.length, 'permiso', 'permisos')}{permisosFiltrados.length !== permisos.length && ` de ${permisos.length}`}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <select className="input sm:w-48" value={filtroModulo} onChange={(event) => setFiltroModulo(event.target.value)} aria-label="Filtrar por módulo">
                <option value="">Todos los módulos</option>
                {modulos.map((modulo) => <option key={modulo} value={modulo}>{infoModulo(modulo).etiqueta}</option>)}
              </select>
              <div className="relative sm:w-72">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <input className="input pl-9" value={filtroPermisos} onChange={(event) => setFiltroPermisos(event.target.value)} placeholder="Buscar código o descripción…" aria-label="Buscar permiso" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <caption className="sr-only">Catálogo de permisos con sus módulos y roles asignados</caption>
              <thead className="bg-muted text-xs uppercase tracking-wide text-fg-muted">
                <tr><th scope="col" className="px-5 py-3 font-semibold">Código</th><th scope="col" className="px-5 py-3 font-semibold">Módulo</th><th scope="col" className="px-5 py-3 font-semibold">Descripción</th><th scope="col" className="px-5 py-3 font-semibold">Roles</th><th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {permisosFiltrados.map((permiso) => {
                  const conPermiso = rolesConPermiso(permiso);
                  const bloqueo = motivoBloqueoPermiso(permiso);
                  return (
                    <tr key={permiso.id_permiso} className="hover:bg-muted/60">
                      <td className="px-5 py-4 font-mono text-xs font-medium">{permiso.codigo}</td>
                      <td className="px-5 py-4"><Insignia variante="primario">{infoModulo(permiso.modulo).etiqueta}</Insignia></td>
                      <td className="max-w-xs px-5 py-4 text-fg-muted">{permiso.descripcion || '—'}</td>
                      <td className="max-w-56 px-5 py-4 text-xs">
                        {conPermiso.length
                          ? <span className="text-fg-muted" title={conPermiso.map((rol) => rol.nombre).join(', ')}>{conPermiso.slice(0, 2).map((rol) => rol.nombre).join(', ')}{conPermiso.length > 2 && ` +${conPermiso.length - 2}`}</span>
                          : <Insignia variante="aviso">Sin asignar</Insignia>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="btn-ghost !p-2" onClick={() => abrirAsignacion(permiso)} aria-label={`Asignar ${permiso.codigo} a roles`} title="Asignar a roles"><Users size={16} /></button>
                          <button type="button" className="btn-ghost !p-2" onClick={() => abrirModalPermiso(permiso)} aria-label={`Editar ${permiso.codigo}`} title="Editar"><Edit3 size={16} /></button>
                          <button type="button" className="btn-danger !p-2" onClick={() => eliminarPermiso(permiso)} aria-label={`Eliminar ${permiso.codigo}`} title={bloqueo || 'Eliminar'}>{bloqueo ? <Lock size={16} /> : <Trash2 size={16} />}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!permisosFiltrados.length && (
              <EstadoVacio icono={permisos.length ? Search : KeyRound} titulo={permisos.length ? 'Sin coincidencias' : 'Aún no hay permisos'}>
                {permisos.length ? 'Ningún permiso coincide con tu búsqueda. Prueba con otro término o módulo.' : 'Crea el primero con «Nuevo permiso».'}
              </EstadoVacio>
            )}
          </div>
        </div>
      )}

      {modalRol && <RolModal rol={modalRol.rol} roles={roles} guardando={guardandoModal} error={errorModal} onDescartarError={() => setErrorModal(null)} onClose={cerrarModalRol} onSubmit={guardarRol} />}
      {modalPermiso && <PermisoModal permiso={modalPermiso.permiso} permisos={permisos} modulos={modulos} guardando={guardandoModal} error={errorModal} onDescartarError={() => setErrorModal(null)} onClose={cerrarModalPermiso} onSubmit={guardarPermiso} />}
      {permisoEnAsignacion && <AsignarPermisoDialogo permiso={permisoEnAsignacion} roles={roles} usuarioSesion={usuarioSesion} onCambio={alCambiarAsignacion} onRolDesactualizado={() => cargarDatos({ silencioso: true })} onClose={() => setAsignando(null)} />}
    </div>
  );
}