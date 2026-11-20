import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  X,
  CreditCard,
  Shield,
} from 'lucide-react';
import { rrhhApi } from '../../api/rrhh.api.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { formatoDinero, formatoFecha } from '../../utils/formato.js';
import {
  mascaraDui,
  mascaraNit,
  mascaraDecimal,
  completarDecimales,
  PATRONES,
} from '../../utils/mascaras.js';

const FORMULARIO_VACIO = {
  nombres: '',
  apellidos: '',
  dui: '',
  nit: '',
  idSucursal: '',
  idPuesto: '',
  idUsuario: '',
  salarioNominal: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  activo: true,
};

export default function EmpleadosPage() {
  const { notificar, notificarError, confirm } = useAlert();

  const [empleados, setEmpleados] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroPuesto, setFiltroPuesto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [erroresForm, setErroresForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true);
    else setCargando(true);
    setErrorCarga(null);

    try {
      const [listaEmpleados, listaPuestos, listaSucursales, listaUsuarios] = await Promise.all([
        rrhhApi.listarEmpleados(),
        rrhhApi.listarPuestos(),
        rrhhApi.listarSucursales().catch(() => []),
        rrhhApi.listarUsuarios().catch(() => []),
      ]);

      setEmpleados(listaEmpleados || []);
      setPuestos(listaPuestos || []);
      setSucursales(listaSucursales || []);
      setUsuarios(listaUsuarios || []);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los datos de empleados.');
    } finally {
      if (silencioso) setActualizando(false);
      else setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirModalCrear = () => {
    setEmpleadoEditando(null);
    setFormulario({
      ...FORMULARIO_VACIO,
      idSucursal: sucursales[0]?.id_sucursal ? String(sucursales[0].id_sucursal) : '',
      idPuesto: puestos[0]?.id_puesto ? String(puestos[0].id_puesto) : '',
      salarioNominal: puestos[0]?.salario_base || '365.00',
    });
    setErroresForm({});
    setModalAbierto(true);
  };

  const abrirModalEditar = (emp) => {
    setEmpleadoEditando(emp);
    setFormulario({
      nombres: emp.nombres || '',
      apellidos: emp.apellidos || '',
      dui: emp.dui || '',
      nit: emp.nit || '',
      idSucursal: emp.id_sucursal ? String(emp.id_sucursal) : '',
      idPuesto: emp.id_puesto ? String(emp.id_puesto) : '',
      idUsuario: emp.id_usuario ? String(emp.id_usuario) : '',
      salarioNominal: emp.salario_nominal || '',
      fechaIngreso: emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : '',
      activo: Boolean(emp.activo),
    });
    setErroresForm({});
    setModalAbierto(true);
  };

  // Al cambiar puesto en creación, sugiere el salario base
  const handleCambioPuesto = (nuevoIdPuesto) => {
    const puestoSel = puestos.find((p) => String(p.id_puesto) === String(nuevoIdPuesto));
    setFormulario((prev) => ({
      ...prev,
      idPuesto: nuevoIdPuesto,
      salarioNominal: !empleadoEditando && puestoSel?.salario_base ? puestoSel.salario_base : prev.salarioNominal,
    }));
  };

  const validarFormulario = () => {
    const errs = {};
    if (!formulario.nombres.trim() || formulario.nombres.trim().length < 2) {
      errs.nombres = 'Ingresa los nombres del empleado (mínimo 2 letras).';
    }
    if (!formulario.apellidos.trim() || formulario.apellidos.trim().length < 2) {
      errs.apellidos = 'Ingresa los apellidos del empleado (mínimo 2 letras).';
    }
    if (!formulario.dui.trim() || !PATRONES.dui.test(formulario.dui.trim())) {
      errs.dui = 'El DUI es obligatorio con formato 00000000-0.';
    }
    if (formulario.nit && formulario.nit.trim() && !PATRONES.nit.test(formulario.nit.trim())) {
      errs.nit = 'El NIT debe tener formato 0000-000000-000-0 (o déjalo en blanco si está homologado).';
    }
    if (!formulario.idSucursal) {
      errs.idSucursal = 'Selecciona una sucursal.';
    }
    if (!formulario.idPuesto) {
      errs.idPuesto = 'Selecciona un puesto de trabajo.';
    }
    const sal = String(formulario.salarioNominal).trim();
    if (!sal || !PATRONES.monto.test(sal) || Number(sal) <= 0) {
      errs.salarioNominal = 'Ingresa un salario válido mayor a cero.';
    }
    if (!formulario.fechaIngreso || !PATRONES.fecha.test(formulario.fechaIngreso)) {
      errs.fechaIngreso = 'Ingresa una fecha válida (AAAA-MM-DD).';
    }
    if (formulario.idUsuario) {
      const yaOcupado = empleados.find(
        (e) => e.id_usuario === formulario.idUsuario && (!empleadoEditando || e.id_empleado !== empleadoEditando.id_empleado)
      );
      if (yaOcupado) {
        errs.idUsuario = `El usuario seleccionado ya está asignado a ${yaOcupado.nombres} ${yaOcupado.apellidos}. Selecciona un usuario disponible o «Ninguno».`;
      }
    }

    setErroresForm(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) {
      notificar.advertencia('Corrige los errores en el formulario', {
        mensaje: 'Revisa los campos marcados en rojo antes de guardar el empleado.',
      });
      return;
    }

    setGuardando(true);

    const payload = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      dui: formulario.dui.trim(),
      nit: formulario.nit.trim() || null,
      idSucursal: Number(formulario.idSucursal),
      idPuesto: Number(formulario.idPuesto),
      idUsuario: formulario.idUsuario ? formulario.idUsuario : null,
      salarioNominal: completarDecimales(formulario.salarioNominal),
      fechaIngreso: formulario.fechaIngreso,
      activo: formulario.activo,
    };

    try {
      if (empleadoEditando) {
        await rrhhApi.actualizarEmpleado(empleadoEditando.id_empleado, payload);
        notificar.exito('Empleado actualizado correctamente');
      } else {
        await rrhhApi.crearEmpleado(payload);
        notificar.exito('Empleado registrado exitosamente');
      }
      setModalAbierto(false);
      await cargarDatos(true);
    } catch (err) {
      notificarError(err, { reintentar: () => handleGuardar(e) });
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = useCallback(async (emp) => {
    const accion = emp.activo ? 'desactivar' : 'activar';
    const seguro = await confirm(
      `¿Deseas ${accion} al empleado «${emp.nombres} ${emp.apellidos}»? ${
        emp.activo ? 'Dejará de incluirse en el cálculo de futuras planillas.' : 'Podrá volver a procesarse en planilla.'
      }`,
      {
        titulo: `${emp.activo ? 'Desactivar' : 'Activar'} empleado`,
        destructivo: emp.activo,
        etiquetaAceptar: emp.activo ? 'Sí, desactivar' : 'Sí, activar',
      }
    );

    if (!seguro) return;

    try {
      if (emp.activo) {
        await rrhhApi.desactivarEmpleado(emp.id_empleado);
        notificar.exito(`Empleado «${emp.nombres} ${emp.apellidos}» desactivado`);
      } else {
        await rrhhApi.activarEmpleado(emp.id_empleado);
        notificar.exito(`Empleado «${emp.nombres} ${emp.apellidos}» activado`);
      }
      await cargarDatos(true);
    } catch (err) {
      notificarError(err, { reintentar: () => toggleEstado(emp) });
    }
  }, [confirm, notificar, notificarError, cargarDatos]);

  // Filtrado
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((e) => {
      const texto = `${e.nombres} ${e.apellidos} ${e.dui}`.toLowerCase();
      const coincideTexto = !filtroTexto || texto.includes(filtroTexto.toLowerCase());
      const coincideSucursal = !filtroSucursal || String(e.id_sucursal) === String(filtroSucursal);
      const coincidePuesto = !filtroPuesto || String(e.id_puesto) === String(filtroPuesto);
      const coincideEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVOS' && e.activo) ||
        (filtroEstado === 'INACTIVOS' && !e.activo);
      return coincideTexto && coincideSucursal && coincidePuesto && coincideEstado;
    });
  }, [empleados, filtroTexto, filtroSucursal, filtroPuesto, filtroEstado]);

  // Métricas
  const metricas = useMemo(() => {
    const total = empleados.length;
    const activos = empleados.filter((e) => e.activo).length;
    const inactivos = total - activos;
    const totalNomina = empleados
      .filter((e) => e.activo)
      .reduce((acc, curr) => acc + Number(curr.salario_nominal || 0), 0);
    return { total, activos, inactivos, totalNomina: totalNomina.toFixed(2) };
  }, [empleados]);

  // Opciones para combos
  const opcionesSucursales = useMemo(
    () => [{ valor: '', texto: 'Todas las sucursales' }, ...sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre }))],
    [sucursales]
  );
  const opcionesPuestos = useMemo(
    () => [{ valor: '', texto: 'Todos los puestos' }, ...puestos.map((p) => ({ valor: String(p.id_puesto), texto: p.nombre }))],
    [puestos]
  );
  const opcionesUsuarios = useMemo(() => {
    const empleadosPorUsuario = new Map();
    empleados.forEach((e) => {
      if (e.id_usuario && (!empleadoEditando || e.id_empleado !== empleadoEditando.id_empleado)) {
        empleadosPorUsuario.set(e.id_usuario, `${e.nombres} ${e.apellidos}`);
      }
    });

    const lista = [{ valor: '', texto: 'Ninguno (sin acceso de inicio de sesión)' }];
    usuarios.forEach((u) => {
      const nombreRol = typeof u.rol === 'string' ? u.rol : u.rol?.nombre || 'Sin rol';
      const asignadoA = empleadosPorUsuario.get(u.id_usuario);
      lista.push({
        valor: u.id_usuario,
        texto: asignadoA
          ? `${u.username} (${nombreRol}) — Asignado a: ${asignadoA}`
          : `${u.username} (${nombreRol}) [Disponible]`,
        disabled: Boolean(asignadoA),
      });
    });
    return lista;
  }, [usuarios, empleados, empleadoEditando]);

  const columnas = useMemo(
    () => [
      {
        clave: 'empleado',
        titulo: 'Empleado / Identificación',
        tipo: 'texto',
        valorOrden: (e) => `${e.apellidos || ''} ${e.nombres || ''}`.trim(),
        render: (e) => (
          <div>
            <p className="font-semibold text-fg">
              {e.apellidos}, {e.nombres}
            </p>
            <p className="text-xs text-fg-muted">
              DUI: <span className="font-mono">{e.dui}</span>
              {e.nit ? ` · NIT: ${e.nit}` : ''}
            </p>
          </div>
        ),
      },
      {
        clave: 'puesto_sucursal',
        titulo: 'Puesto y Sucursal',
        tipo: 'texto',
        valorOrden: (e) => `${e.puesto?.nombre || ''} ${e.sucursal?.nombre || ''}`.trim(),
        render: (e) => (
          <div>
            <p className="font-medium text-fg">{e.puesto?.nombre || '—'}</p>
            <p className="text-xs text-fg-muted">{e.sucursal?.nombre || '—'}</p>
          </div>
        ),
      },
      {
        clave: 'salario_nominal',
        titulo: 'Salario Nominal',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (e) => e.salario_nominal,
        render: (e) => (
          <span className="font-semibold text-fg">{formatoDinero(e.salario_nominal)}</span>
        ),
      },
      {
        clave: 'fecha_ingreso',
        titulo: 'Ingreso',
        tipo: 'fecha',
        valorOrden: (e) => e.fecha_ingreso,
        render: (e) => (
          <span className="text-xs text-fg-muted">
            {formatoFecha(e.fecha_ingreso)}
          </span>
        ),
      },
      {
        clave: 'usuario',
        titulo: 'Usuario',
        tipo: 'texto',
        valorOrden: (e) => e.usuario?.username || '',
        render: (e) => (
          <span className="text-xs text-fg-muted">
            {e.usuario?.username ? (
              <span className="inline-flex items-center gap-1 text-primary-text font-medium">
                <Shield size={12} aria-hidden="true" />
                {e.usuario.username}
              </span>
            ) : (
              'Sin usuario'
            )}
          </span>
        ),
      },
      {
        clave: 'activo',
        titulo: 'Estado',
        tipo: 'booleano',
        valorOrden: (e) => Boolean(e.activo),
        render: (e) => (
          <EstadoBadge tipo={e.activo ? 'exito' : 'inactivo'}>
            {e.activo ? 'Activo' : 'Inactivo'}
          </EstadoBadge>
        ),
      },
      {
        clave: 'acciones',
        titulo: 'Acciones',
        alinear: 'right',
        ordenable: false,
        render: (e) => (
          <div className="flex items-center justify-end gap-1.5">
            <BotonIcono
              icono={ICONOS.editar}
              etiqueta={`Editar empleado ${e.nombres} ${e.apellidos}`}
              titulo="Editar"
              onClick={() => abrirModalEditar(e)}
            />
            {e.activo ? (
              <BotonIcono
                icono={ICONOS.desactivarUsuario}
                tono="aviso"
                etiqueta={`Desactivar empleado ${e.nombres}`}
                titulo="Desactivar"
                onClick={() => toggleEstado(e)}
              />
            ) : (
              <BotonIcono
                icono={ICONOS.activarUsuario}
                tono="exito"
                etiqueta={`Activar empleado ${e.nombres}`}
                titulo="Activar"
                onClick={() => toggleEstado(e)}
              />
            )}
          </div>
        ),
      },
    ],
    [toggleEstado]
  );

  if (cargando) {
    return (
      <Spinner texto="Cargando directorio de empleados…" className="min-h-[400px]" />
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Gestión · RR. HH."
        titulo="Empleados"
        descripcion="Administración del personal de la empresa, asignación de cargos, sucursales y salarios nominales."
        acciones={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variante="ghost"
              onClick={() => cargarDatos(true)}
              cargando={actualizando}
              icono={RefreshCw}
              aria-label="Actualizar datos de empleados"
            >
              Actualizar
            </Button>
            <Button variante="primary" onClick={abrirModalCrear} icono={Plus}>
              Nuevo empleado
            </Button>
          </div>
        }
      />

      {errorCarga && (
        <BannerError
          error={{ titulo: 'Error al cargar empleados', mensaje: errorCarga }}
          onReintentar={() => cargarDatos(false)}
        />
      )}

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          icono={Users}
          etiqueta="Total empleados"
          valor={metricas.total}
          tono="neutro"
        />
        <Metrica
          icono={UserCheck}
          etiqueta="Empleados activos"
          valor={metricas.activos}
          tono="neutro"
        />
        <Metrica
          icono={UserX}
          etiqueta="Empleados inactivos"
          valor={metricas.inactivos}
          tono="neutro"
        />
        <Metrica
          icono={CreditCard}
          etiqueta="Planilla nominal estimada"
          valor={formatoDinero(metricas.totalNomina)}
          tono="neutro"
        />
      </div>

      {/* Contenido principal */}
      <Card sinPadding>
        {/* Barra de filtros */}
        <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por nombre, apellido, DUI…"
            className="input w-full text-xs"
          />

          <Select
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
            opciones={opcionesSucursales}
            tamano="sm"
          />

          <Select
            value={filtroPuesto}
            onChange={(e) => setFiltroPuesto(e.target.value)}
            opciones={opcionesPuestos}
            tamano="sm"
          />

          <Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            opciones={[
              { valor: 'TODOS', texto: 'Todos los estados' },
              { valor: 'ACTIVOS', texto: 'Solo activos' },
              { valor: 'INACTIVOS', texto: 'Solo inactivos' },
            ]}
            tamano="sm"
          />
        </div>

        {/* Tabla */}
        <Table
          columnas={columnas}
          filas={empleadosFiltrados}
          idFila="id_empleado"
          idTabla="rrhh_empleados"
          vacio={
            <EstadoVacio
              icono={Users}
              titulo="No se encontraron empleados"
            >
              {filtroTexto || filtroSucursal || filtroPuesto || filtroEstado !== 'TODOS'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'Registra el primer empleado en el botón superior.'}
            </EstadoVacio>
          }
        />
      </Card>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <Dialogo
          onCerrar={() => setModalAbierto(false)}
          tamano="lg"
          labelledBy="modal-empleado-titulo"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Gestión · RR. HH.
              </p>
              <h2 id="modal-empleado-titulo" className="mt-1 text-xl font-semibold text-fg">
                {empleadoEditando ? 'Editar empleado' : 'Registrar nuevo empleado'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleGuardar} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="emp-nombres" className="block text-sm font-medium text-fg">
                  Nombres <span className="text-danger-text">*</span>
                </label>
                <input
                  id="emp-nombres"
                  type="text"
                  value={formulario.nombres}
                  onChange={(e) => setFormulario({ ...formulario, nombres: e.target.value })}
                  placeholder="Ej: Juan Carlos"
                  className={`input mt-1.5 w-full ${erroresForm.nombres ? 'border-danger' : ''}`}
                  required
                />
                {erroresForm.nombres && (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.nombres}</p>
                )}
              </div>

              <div>
                <label htmlFor="emp-apellidos" className="block text-sm font-medium text-fg">
                  Apellidos <span className="text-danger-text">*</span>
                </label>
                <input
                  id="emp-apellidos"
                  type="text"
                  value={formulario.apellidos}
                  onChange={(e) => setFormulario({ ...formulario, apellidos: e.target.value })}
                  placeholder="Ej: Pérez Rodríguez"
                  className={`input mt-1.5 w-full ${erroresForm.apellidos ? 'border-danger' : ''}`}
                  required
                />
                {erroresForm.apellidos && (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.apellidos}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="emp-dui" className="block text-sm font-medium text-fg">
                  DUI <span className="text-danger-text">*</span>
                </label>
                <input
                  id="emp-dui"
                  type="text"
                  inputMode="numeric"
                  value={formulario.dui}
                  onChange={(e) => setFormulario({ ...formulario, dui: mascaraDui(e.target.value) })}
                  placeholder="00000000-0"
                  maxLength={10}
                  className={`input mt-1.5 w-full font-mono ${erroresForm.dui ? 'border-danger' : ''}`}
                  required
                />
                {erroresForm.dui ? (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.dui}</p>
                ) : (
                  <p className="mt-1 text-xs text-fg-muted">9 dígitos con guion.</p>
                )}
              </div>

              <div>
                <label htmlFor="emp-nit" className="block text-sm font-medium text-fg">
                  NIT <span className="text-xs text-fg-muted">(Opcional si está homologado)</span>
                </label>
                <input
                  id="emp-nit"
                  type="text"
                  inputMode="numeric"
                  value={formulario.nit}
                  onChange={(e) => setFormulario({ ...formulario, nit: mascaraNit(e.target.value) })}
                  placeholder="0000-000000-000-0"
                  maxLength={17}
                  className={`input mt-1.5 w-full font-mono ${erroresForm.nit ? 'border-danger' : ''}`}
                />
                {erroresForm.nit ? (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.nit}</p>
                ) : (
                  <p className="mt-1 text-xs text-fg-muted">14 dígitos con guiones.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-fg">
                  Sucursal asignada <span className="text-danger-text">*</span>
                </label>
                <div className="mt-1.5">
                  <Select
                    value={formulario.idSucursal}
                    onChange={(e) => setFormulario({ ...formulario, idSucursal: e.target.value })}
                    opciones={[
                      { valor: '', texto: 'Selecciona una sucursal…' },
                      ...sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre })),
                    ]}
                  />
                </div>
                {erroresForm.idSucursal && (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.idSucursal}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-fg">
                  Puesto de trabajo <span className="text-danger-text">*</span>
                </label>
                <div className="mt-1.5">
                  <Select
                    value={formulario.idPuesto}
                    onChange={(e) => handleCambioPuesto(e.target.value)}
                    opciones={[
                      { valor: '', texto: 'Selecciona un puesto…' },
                      ...puestos.map((p) => ({ valor: String(p.id_puesto), texto: `${p.nombre} (Base: ${formatoDinero(p.salario_base)})` })),
                    ]}
                  />
                </div>
                {erroresForm.idPuesto && (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.idPuesto}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="emp-salario" className="block text-sm font-medium text-fg">
                  Salario nominal pactado ($) <span className="text-danger-text">*</span>
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                    $
                  </span>
                  <input
                    id="emp-salario"
                    type="text"
                    inputMode="decimal"
                    value={formulario.salarioNominal}
                    onChange={(e) =>
                      setFormulario({ ...formulario, salarioNominal: mascaraDecimal(e.target.value, 2) })
                    }
                    placeholder="365.00"
                    className={`input w-full pl-8 font-semibold ${erroresForm.salarioNominal ? 'border-danger' : ''}`}
                    required
                  />
                </div>
                {erroresForm.salarioNominal ? (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.salarioNominal}</p>
                ) : (
                  <p className="mt-1 text-xs text-fg-muted">
                    Base mensual sobre la cual se calculan ISSS, AFP y Renta.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="emp-fecha" className="block text-sm font-medium text-fg">
                  Fecha de ingreso <span className="text-danger-text">*</span>
                </label>
                <input
                  id="emp-fecha"
                  type="date"
                  value={formulario.fechaIngreso}
                  onChange={(e) => setFormulario({ ...formulario, fechaIngreso: e.target.value })}
                  className={`input mt-1.5 w-full ${erroresForm.fechaIngreso ? 'border-danger' : ''}`}
                  required
                />
                {erroresForm.fechaIngreso && (
                  <p className="mt-1 text-xs text-danger-text">{erroresForm.fechaIngreso}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg">
                Usuario de sistema vinculado <span className="text-xs text-fg-muted">(Opcional)</span>
              </label>
              <div className="mt-1.5">
                <Select
                  value={formulario.idUsuario}
                  onChange={(e) => setFormulario({ ...formulario, idUsuario: e.target.value })}
                  opciones={opcionesUsuarios}
                />
              </div>
              {erroresForm.idUsuario ? (
                <p className="mt-1 text-xs text-danger-text">{erroresForm.idUsuario}</p>
              ) : (
                <p className="mt-1 text-xs text-fg-muted">
                  Vincula este empleado a una cuenta de usuario para trazabilidad en turnos y ventas.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                type="button"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button variante="primary" type="submit" cargando={guardando}>
                {empleadoEditando ? 'Guardar cambios' : 'Registrar empleado'}
              </Button>
            </div>
          </form>
        </Dialogo>
      )}
    </div>
  );
}
