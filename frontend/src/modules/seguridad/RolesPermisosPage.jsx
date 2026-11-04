import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  CircleAlert,
  Save,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

const catalogoPermisos = [
  {
    nombre: 'Seguridad',
    descripcion: 'Acceso y administración del sistema',
    permisos: [
      ['SEG_GESTIONAR_USUARIOS', 'Gestionar usuarios'],
      ['SEG_GESTIONAR_ROLES', 'Crear roles y asignar permisos'],
      ['SEG_VER_BITACORA', 'Consultar bitácora de cambios'],
    ],
  },
  {
    nombre: 'Empresa',
    descripcion: 'Configuración de sucursales y parámetros',
    permisos: [
      ['EMP_GESTIONAR_SUCURSALES', 'Gestionar sucursales y cajas'],
      ['EMP_EDITAR_PARAMETROS', 'Editar parámetros del sistema'],
    ],
  },
  {
    nombre: 'Inventario',
    descripcion: 'Existencias, productos y costos',
    permisos: [
      ['INV_VER_STOCK', 'Consultar stock y alertas'],
      ['INV_GESTIONAR_INSUMOS', 'Gestionar insumos'],
      ['INV_GESTIONAR_PRODUCTOS', 'Gestionar productos y precios'],
      ['INV_GESTIONAR_RECETAS', 'Editar recetas'],
      ['INV_REGISTRAR_MERMA', 'Registrar mermas y ajustes'],
      ['INV_VER_COSTOS', 'Ver costos y márgenes'],
    ],
  },
  {
    nombre: 'Punto de venta',
    descripcion: 'Pedidos, cobros y clientes',
    permisos: [
      ['POS_CREAR_ORDEN', 'Tomar pedidos'],
      ['POS_VER_COLA_PREPARACION', 'Ver cola de preparación'],
      ['POS_COBRAR', 'Facturar y cobrar'],
      ['POS_EMITIR_CCF', 'Emitir comprobante de crédito fiscal'],
      ['POS_APLICAR_DESCUENTO', 'Aplicar descuentos'],
      ['POS_ANULAR_VENTA', 'Anular ventas'],
      ['POS_GESTIONAR_CLIENTES', 'Gestionar clientes'],
    ],
  },
  {
    nombre: 'Caja',
    descripcion: 'Turnos, movimientos y cuadres',
    permisos: [
      ['CAJA_ABRIR_TURNO', 'Abrir turno de caja'],
      ['CAJA_CERRAR_TURNO', 'Cerrar turno y cuadrar'],
      ['CAJA_MOVIMIENTOS', 'Registrar ingresos y egresos'],
      ['CAJA_VER_CUADRES', 'Ver cuadres de todos los turnos'],
    ],
  },
  {
    nombre: 'Compras',
    descripcion: 'Proveedores y cuentas por pagar',
    permisos: [
      ['COM_GESTIONAR_PROVEEDORES', 'Gestionar proveedores'],
      ['COM_REGISTRAR_COMPRA', 'Registrar facturas de compra'],
      ['COM_PAGAR_PROVEEDOR', 'Registrar pagos a proveedores'],
      ['COM_VER_CXP', 'Ver cuentas por pagar'],
    ],
  },
  {
    nombre: 'Recursos humanos',
    descripcion: 'Personal, salarios y planilla',
    permisos: [
      ['RRHH_GESTIONAR_EMPLEADOS', 'Gestionar empleados'],
      ['RRHH_VER_SALARIOS', 'Ver salarios'],
      ['RRHH_CALCULAR_PLANILLA', 'Calcular y procesar planilla'],
      ['RRHH_VER_PLANILLA', 'Consultar planillas'],
    ],
  },
  {
    nombre: 'Reportes',
    descripcion: 'Indicadores y reportes del negocio',
    permisos: [['REP_VER_DASHBOARD', 'Ver dashboard y reportes de ventas']],
  },
];

const todosLosPermisos = catalogoPermisos.flatMap((modulo) => modulo.permisos.map(([codigo]) => codigo));

const rolesIniciales = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Acceso total al sistema', esSistema: true, permisos: todosLosPermisos },
  {
    id: 2,
    nombre: 'GERENTE_SUCURSAL',
    descripcion: 'Opera y supervisa una sucursal',
    esSistema: true,
    permisos: ['INV_VER_STOCK', 'INV_GESTIONAR_INSUMOS', 'INV_REGISTRAR_MERMA', 'INV_VER_COSTOS', 'POS_CREAR_ORDEN', 'POS_VER_COLA_PREPARACION', 'POS_COBRAR', 'POS_EMITIR_CCF', 'POS_APLICAR_DESCUENTO', 'POS_ANULAR_VENTA', 'POS_GESTIONAR_CLIENTES', 'CAJA_ABRIR_TURNO', 'CAJA_CERRAR_TURNO', 'CAJA_MOVIMIENTOS', 'CAJA_VER_CUADRES', 'COM_REGISTRAR_COMPRA', 'COM_VER_CXP', 'RRHH_VER_PLANILLA', 'REP_VER_DASHBOARD'],
  },
  { id: 3, nombre: 'CAJERO', descripcion: 'Toma pedidos, cobra y cierra su caja', esSistema: true, permisos: ['POS_CREAR_ORDEN', 'POS_COBRAR', 'POS_EMITIR_CCF', 'POS_GESTIONAR_CLIENTES', 'CAJA_ABRIR_TURNO', 'CAJA_CERRAR_TURNO', 'CAJA_MOVIMIENTOS', 'INV_VER_STOCK'] },
  { id: 4, nombre: 'BARISTA', descripcion: 'Ve y prepara pedidos, consulta stock', esSistema: true, permisos: ['POS_VER_COLA_PREPARACION', 'INV_VER_STOCK', 'INV_REGISTRAR_MERMA'] },
  { id: 5, nombre: 'BODEGUERO', descripcion: 'Gestiona inventario y compras', esSistema: true, permisos: ['INV_VER_STOCK', 'INV_GESTIONAR_INSUMOS', 'INV_REGISTRAR_MERMA', 'INV_VER_COSTOS', 'COM_GESTIONAR_PROVEEDORES', 'COM_REGISTRAR_COMPRA', 'COM_VER_CXP'] },
  { id: 6, nombre: 'CONTADOR', descripcion: 'Compras, pagos, planilla y reportes', esSistema: true, permisos: ['COM_REGISTRAR_COMPRA', 'COM_PAGAR_PROVEEDOR', 'COM_VER_CXP', 'CAJA_VER_CUADRES', 'RRHH_VER_PLANILLA', 'RRHH_VER_SALARIOS', 'REP_VER_DASHBOARD', 'INV_VER_COSTOS'] },
  { id: 7, nombre: 'RRHH', descripcion: 'Gestión de personal y planilla', esSistema: true, permisos: ['RRHH_GESTIONAR_EMPLEADOS', 'RRHH_VER_SALARIOS', 'RRHH_CALCULAR_PLANILLA', 'RRHH_VER_PLANILLA'] },
];

function ModuloPermisos({ modulo, permisosSeleccionados, onToggle, onToggleModulo, filtro }) {
  const visibles = modulo.permisos.filter(([, descripcion]) =>
    `${descripcion} ${modulo.nombre}`.toLowerCase().includes(filtro.toLowerCase()),
  );
  if (!visibles.length) return null;

  const codigosVisibles = visibles.map(([codigo]) => codigo);
  const seleccionados = codigosVisibles.filter((codigo) => permisosSeleccionados.includes(codigo)).length;
  const todosSeleccionados = seleccionados === codigosVisibles.length;

  return (
    <section className="rounded-xl border border-line bg-surface" aria-labelledby={`modulo-${modulo.nombre}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 id={`modulo-${modulo.nombre}`} className="font-semibold">{modulo.nombre}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">{modulo.descripcion}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary-text">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={todosSeleccionados}
            onChange={() => onToggleModulo(codigosVisibles, todosSeleccionados)}
            aria-label={`Seleccionar todos los permisos de ${modulo.nombre}`}
          />
          Seleccionar todo
        </label>
      </div>
      <div className="grid gap-1 p-3 sm:grid-cols-2">
        {visibles.map(([codigo, descripcion]) => (
          <label key={codigo} className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              checked={permisosSeleccionados.includes(codigo)}
              onChange={() => onToggle(codigo)}
              aria-label={descripcion}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{descripcion}</span>
              <span className="mt-1 block truncate font-mono text-[10px] text-fg-muted">{codigo}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="border-t border-line px-5 py-2 text-right text-xs text-fg-muted">
        {seleccionados} de {codigosVisibles.length} seleccionados
      </div>
    </section>
  );
}

export default function RolesPermisosPage() {
  const [roles, setRoles] = useState(rolesIniciales);
  const [rolId, setRolId] = useState(rolesIniciales[0].id);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState(rolesIniciales[0].permisos);
  const [filtro, setFiltro] = useState('');
  const [guardado, setGuardado] = useState(false);

  const rolActivo = roles.find((rol) => rol.id === rolId) ?? roles[0];
  const modulosVisibles = useMemo(
    () => catalogoPermisos.filter((modulo) => modulo.permisos.some(([, descripcion]) => `${descripcion} ${modulo.nombre}`.toLowerCase().includes(filtro.toLowerCase()))),
    [filtro],
  );

  useEffect(() => {
    setPermisosSeleccionados(rolActivo.permisos);
    setGuardado(false);
  }, [rolActivo]);

  const cambiarPermiso = (codigo) => {
    setGuardado(false);
    setPermisosSeleccionados((actuales) => actuales.includes(codigo)
      ? actuales.filter((permiso) => permiso !== codigo)
      : [...actuales, codigo]);
  };

  const cambiarModulo = (codigos, todosSeleccionados) => {
    setGuardado(false);
    setPermisosSeleccionados((actuales) => {
      if (todosSeleccionados) return actuales.filter((permiso) => !codigos.includes(permiso));
      return [...new Set([...actuales, ...codigos])];
    });
  };

  const guardarCambios = () => {
    setRoles((actuales) => actuales.map((rol) => (rol.id === rolId ? { ...rol, permisos: permisosSeleccionados } : rol)));
    setGuardado(true);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-text">
            <ShieldCheck size={17} aria-hidden="true" /> Seguridad
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Roles y permisos</h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">Define qué acciones puede realizar cada rol dentro de artesa.</p>
        </div>
        <button type="button" className="btn-primary" onClick={guardarCambios}>
          <Save size={17} aria-hidden="true" /> Guardar cambios
        </button>
      </div>

      {guardado && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success" role="status">
          <Check size={17} aria-hidden="true" /> Cambios guardados para {rolActivo.nombre} en esta sesión.
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-3 lg:sticky lg:top-6">
          <div className="flex items-center justify-between px-2 pb-3">
            <div>
              <h2 className="font-semibold">Roles del sistema</h2>
              <p className="mt-1 text-xs text-fg-muted">{roles.length} roles disponibles</p>
            </div>
            <Users size={19} className="text-fg-muted" aria-hidden="true" />
          </div>
          <div className="space-y-1" role="listbox" aria-label="Roles disponibles">
            {roles.map((rol) => (
              <button
                type="button"
                key={rol.id}
                role="option"
                aria-selected={rol.id === rolId}
                onClick={() => setRolId(rol.id)}
                className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${rol.id === rolId ? 'bg-primary-soft text-primary-text' : 'hover:bg-muted'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{rol.nombre}</span>
                  {rol.esSistema && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted">Sistema</span>}
                </span>
                <span className="mt-1 block text-xs text-fg-muted">{rol.descripcion}</span>
                <span className="mt-2 block text-[11px] text-primary-text">{rol.permisos.length} permisos activos</span>
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="card mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">Configurando</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-lg font-bold">{rolActivo.nombre}</h2>
                <ChevronDown size={16} className="text-fg-muted" aria-hidden="true" />
              </div>
              <p className="mt-1 text-sm text-fg-muted">{rolActivo.descripcion}</p>
            </div>
            <div className="rounded-lg bg-primary-soft px-4 py-3 text-center">
              <p className="text-2xl font-bold text-primary-text">{permisosSeleccionados.length}</p>
              <p className="text-[11px] font-medium text-primary-text">permisos activos</p>
            </div>
          </div>

          <div className="relative mb-5">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <input className="input pl-10" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar permiso o módulo…" aria-label="Buscar permiso" />
          </div>

          <div className="space-y-4">
            {modulosVisibles.map((modulo) => (
              <ModuloPermisos key={modulo.nombre} modulo={modulo} permisosSeleccionados={permisosSeleccionados} onToggle={cambiarPermiso} onToggleModulo={cambiarModulo} filtro={filtro} />
            ))}
            {!modulosVisibles.length && (
              <div className="card flex flex-col items-center py-12 text-center">
                <CircleAlert size={26} className="text-warning" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">No encontramos permisos</h3>
                <p className="mt-1 text-sm text-fg-muted">Prueba con otro término de búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
