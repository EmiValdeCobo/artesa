import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  X,
  DollarSign,
  Download,
  Eye,
  Lock,
  Gift,
  Pencil,
  Trash2,
} from 'lucide-react';
import { rrhhApi } from '../../api/rrhh.api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { formatoDinero } from '../../utils/formato.js';

export default function PlanillasPage() {
  const { tiene } = useAuth();
  const { notificar, notificarError, confirm } = useAlert();

  const puedeCalcular = tiene('RRHH_CALCULAR_PLANILLA');

  const [planillas, setPlanillas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Filtros
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  // Modal Crear Planilla
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [formCrear, setFormCrear] = useState({
    idSucursal: '',
    periodo: new Date().toISOString().slice(0, 7), // AAAA-MM
  });
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Detalle de Planilla
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [planillaSeleccionada, setPlanillaSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  // Modal Asignar / Editar Bono
  const [modalBonoAbierto, setModalBonoAbierto] = useState(false);
  const [empleadoParaBono, setEmpleadoParaBono] = useState(null);
  const [formBono, setFormBono] = useState({ monto: '', descripcion: '' });
  const [guardandoBono, setGuardandoBono] = useState(false);

  const cargarPlanillas = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true);
    else setCargando(true);
    setErrorCarga(null);

    try {
      const filtros = {};
      if (filtroSucursal) filtros.idSucursal = filtroSucursal;
      if (filtroPeriodo) {
        filtros.desde = filtroPeriodo;
        filtros.hasta = filtroPeriodo;
      }

      const [lista, listaSucursales] = await Promise.all([
        rrhhApi.listarPlanillas(filtros),
        rrhhApi.listarSucursales().catch(() => []),
      ]);

      setPlanillas(lista || []);
      setSucursales(listaSucursales || []);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar las planillas.');
    } finally {
      if (silencioso) setActualizando(false);
      else setCargando(false);
    }
  }, [filtroSucursal, filtroPeriodo]);

  useEffect(() => {
    cargarPlanillas();
  }, [cargarPlanillas]);

  const abrirModalCrear = () => {
    setFormCrear({
      idSucursal: sucursales[0]?.id_sucursal ? String(sucursales[0].id_sucursal) : '',
      periodo: new Date().toISOString().slice(0, 7),
    });
    setModalCrearAbierto(true);
  };

  const handleCrearPlanilla = async (e) => {
    e.preventDefault();

    if (!formCrear.idSucursal) {
      notificar.advertencia('Selecciona una sucursal', {
        mensaje: 'Debes seleccionar la sucursal para generar la planilla.',
      });
      return;
    }
    if (!formCrear.periodo || !/^\d{4}-\d{2}$/.test(formCrear.periodo)) {
      notificar.advertencia('Período inválido', {
        mensaje: 'Ingresa un período válido en formato AAAA-MM.',
      });
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await rrhhApi.crearPlanilla({
        idSucursal: Number(formCrear.idSucursal),
        periodo: formCrear.periodo,
        ajustes: [],
      });

      notificar.exito('Período de planilla creado exitosamente');
      setModalCrearAbierto(false);
      await cargarPlanillas(true);

      // Abrir inmediatamente el detalle para calcular
      if (res?.idPlanilla) {
        verDetallePlanilla(res.idPlanilla);
      }
    } catch (err) {
      notificarError(err, { reintentar: () => handleCrearPlanilla(e) });
    } finally {
      setGuardandoCrear(false);
    }
  };

  const verDetallePlanilla = useCallback(async (idPlanilla) => {
    setCargandoDetalle(true);
    setModalDetalleAbierto(true);
    try {
      const detalle = await rrhhApi.obtenerPlanilla(idPlanilla);
      setPlanillaSeleccionada(detalle);
    } catch (err) {
      notificarError(err, { reintentar: () => verDetallePlanilla(idPlanilla) });
      setModalDetalleAbierto(false);
    } finally {
      setCargandoDetalle(false);
    }
  }, [notificarError]);

  const handleCalcular = async (idPlanilla) => {
    setProcesandoAccion(true);
    try {
      const res = await rrhhApi.calcularPlanilla(idPlanilla);
      notificar.exito(`Planilla calculada exitosamente para ${res.empleados} empleados`);
      await verDetallePlanilla(idPlanilla);
      await cargarPlanillas(true);
    } catch (err) {
      notificarError(err, { reintentar: () => handleCalcular(idPlanilla) });
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleProcesar = async (idPlanilla) => {
    const seguro = await confirm(
      '¿Confirmas el procesamiento definitivo de esta planilla? Una vez procesada se generarán las obligaciones de pago y no podrá modificarse.',
      {
        titulo: 'Confirmar procesamiento de planilla',
        destructivo: true,
        etiquetaAceptar: 'Sí, procesar planilla',
        etiquetaCancelar: 'Revisar cálculo',
      }
    );

    if (!seguro) return;

    setProcesandoAccion(true);
    try {
      await rrhhApi.procesarPlanilla(idPlanilla);
      notificar.exito('Planilla procesada y cerrada oficialmente');
      await verDetallePlanilla(idPlanilla);
      await cargarPlanillas(true);
    } catch (err) {
      notificarError(err, { reintentar: () => handleProcesar(idPlanilla) });
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleDescargarPdf = (idPlanilla) => {
    window.open(`/api/rrhh/planillas/${idPlanilla}/pdf`, '_blank');
  };

  const handleDescargarBoleta = (idPlanilla, idEmpleado) => {
    window.open(`/api/rrhh/planillas/${idPlanilla}/empleados/${idEmpleado}/boleta.pdf`, '_blank');
  };

  const abrirModalBono = (emp) => {
    setEmpleadoParaBono(emp);
    const montoActual = Number(emp.bonificaciones || 0) > 0 ? String(emp.bonificaciones) : '';
    const descActual = Array.isArray(emp.detalle) ? (emp.detalle[0] || '') : (emp.detalle || '');
    setFormBono({
      monto: montoActual,
      descripcion: descActual,
    });
    setModalBonoAbierto(true);
  };

  const handleGuardarBono = async (e) => {
    e.preventDefault();

    const montoLimpio = formBono.monto.trim();
    if (!montoLimpio || !/^\d+(\.\d{1,2})?$/.test(montoLimpio) || Number(montoLimpio) <= 0) {
      notificar.advertencia('Monto de bono inválido', {
        mensaje: 'Ingresa un monto de bono válido mayor a 0 (ej: 50.00).',
      });
      return;
    }
    if (!formBono.descripcion.trim()) {
      notificar.advertencia('Descripción requerida', {
        mensaje: 'Ingresa una descripción o motivo para el bono.',
      });
      return;
    }

    setGuardandoBono(true);
    try {
      await rrhhApi.guardarAjuste(
        planillaSeleccionada.planilla.id_planilla,
        empleadoParaBono.id_empleado,
        {
          bonificaciones: montoLimpio,
          descripcion: formBono.descripcion.trim(),
        }
      );
      notificar.exito(`Bono asignado a ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}`);
      setModalBonoAbierto(false);
      await verDetallePlanilla(planillaSeleccionada.planilla.id_planilla);
      await cargarPlanillas(true);
    } catch (err) {
      notificarError(err, { reintentar: () => handleGuardarBono(e) });
    } finally {
      setGuardandoBono(false);
    }
  };

  const handleQuitarBono = async () => {
    const seguro = await confirm(
      `¿Deseas quitar el bono asignado a ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}? Se recalcularán los descuentos de la planilla.`,
      {
        titulo: 'Quitar bono',
        destructivo: true,
        etiquetaAceptar: 'Sí, quitar bono',
      }
    );
    if (!seguro) return;

    setGuardandoBono(true);
    try {
      await rrhhApi.guardarAjuste(
        planillaSeleccionada.planilla.id_planilla,
        empleadoParaBono.id_empleado,
        {
          bonificaciones: '0',
          descripcion: '',
        }
      );
      notificar.exito(`Bono eliminado de ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}`);
      setModalBonoAbierto(false);
      await verDetallePlanilla(planillaSeleccionada.planilla.id_planilla);
      await cargarPlanillas(true);
    } catch (err) {
      notificarError(err, { reintentar: handleQuitarBono });
    } finally {
      setGuardandoBono(false);
    }
  };

  // Métricas
  const metricas = useMemo(() => {
    const total = planillas.length;
    const procesadas = planillas.filter((p) => p.procesada).length;
    const pendientes = total - procesadas;
    const totalNeto = planillas
      .filter((p) => p.procesada)
      .reduce((acc, curr) => acc + Number(curr.total_neto || 0), 0);
    return { total, procesadas, pendientes, totalNeto: totalNeto.toFixed(2) };
  }, [planillas]);

  const columnas = useMemo(
    () => [
      {
        clave: 'periodo',
        titulo: 'Período',
        tipo: 'fecha',
        valorOrden: (p) => p.periodo_inicio || '',
        render: (p) => (
          <div>
            <p className="font-semibold text-fg">
              {p.periodo_inicio ? p.periodo_inicio.slice(0, 7) : '—'}
            </p>
            <p className="text-xs text-fg-muted">
              {p.periodo_inicio?.slice(0, 10)} al {p.periodo_fin?.slice(0, 10)}
            </p>
          </div>
        ),
      },
      {
        clave: 'sucursal',
        titulo: 'Sucursal',
        tipo: 'texto',
        valorOrden: (p) => p.sucursal || '',
        render: (p) => <span className="font-medium text-fg">{p.sucursal}</span>,
      },
      {
        clave: 'empleados',
        titulo: 'Empleados',
        alinear: 'center',
        tipo: 'numero',
        valorOrden: (p) => p.empleados ?? 0,
        render: (p) => (
          <span className="inline-flex rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-fg border border-line">
            {p.empleados || 0}
          </span>
        ),
      },
      {
        clave: 'total_bruto',
        titulo: 'Total Devengado',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (p) => p.total_bruto,
        render: (p) => <span className="font-medium text-fg">{formatoDinero(p.total_bruto)}</span>,
      },
      {
        clave: 'total_neto',
        titulo: 'Total a Pagar',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (p) => p.total_neto,
        render: (p) => (
          <span className="font-bold text-success">{formatoDinero(p.total_neto)}</span>
        ),
      },
      {
        clave: 'estado',
        titulo: 'Estado',
        tipo: 'texto',
        valorOrden: (p) =>
          p.procesada
            ? 'Procesada'
            : Number(p.empleados) > 0
            ? 'Calculada'
            : 'Sin calcular',
        render: (p) => {
          if (p.procesada) {
            return <EstadoBadge tipo="exito">Procesada</EstadoBadge>;
          }
          if (Number(p.empleados) > 0) {
            return <EstadoBadge tipo="info">Calculada</EstadoBadge>;
          }
          return <EstadoBadge tipo="aviso">Sin calcular</EstadoBadge>;
        },
      },
      {
        clave: 'acciones',
        titulo: 'Acciones',
        alinear: 'right',
        ordenable: false,
        render: (p) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variante="ghost"
              onClick={() => verDetallePlanilla(p.id_planilla)}
              className="!px-2.5 !py-1 text-xs"
              icono={Eye}
            >
              Ver detalle
            </Button>
            {p.procesada && (
              <Button
                variante="ghost"
                onClick={() => handleDescargarPdf(p.id_planilla)}
                className="!px-2.5 !py-1 text-xs"
                icono={Download}
                title="Descargar PDF de planilla"
              >
                PDF
              </Button>
            )}
          </div>
        ),
      },
    ],
    [verDetallePlanilla]
  );

  const columnasDetalle = useMemo(
    () => [
      {
        clave: 'empleado',
        titulo: 'Empleado / DUI',
        tipo: 'texto',
        valorOrden: (emp) => `${emp.apellidos || ''} ${emp.nombres || ''}`.trim(),
        render: (emp) => (
          <div>
            <p className="font-semibold text-fg">
              {emp.apellidos}, {emp.nombres}
            </p>
            <p className="text-[11px] text-fg-muted font-mono">{emp.dui}</p>
          </div>
        ),
      },
      {
        clave: 'salario_bruto',
        titulo: 'Salario Base',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.salario_bruto,
        render: (emp) => (
          <span className="font-medium text-fg">{formatoDinero(emp.salario_bruto)}</span>
        ),
      },
      {
        clave: 'bonificaciones',
        titulo: 'Bono',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.bonificaciones,
        render: (emp) =>
          Number(emp.bonificaciones) > 0 ? (
            <div className="flex flex-col items-end">
              <span className="font-semibold text-success">
                +{formatoDinero(emp.bonificaciones)}
              </span>
              {(Array.isArray(emp.detalle) ? emp.detalle[0] : emp.detalle) ? (
                <span
                  className="text-[10px] text-fg-muted italic truncate max-w-[120px]"
                  title={Array.isArray(emp.detalle) ? emp.detalle.join(' · ') : emp.detalle}
                >
                  {Array.isArray(emp.detalle) ? emp.detalle[0] : emp.detalle}
                </span>
              ) : null}
              {!planillaSeleccionada?.planilla?.procesada && puedeCalcular && (
                <button
                  type="button"
                  onClick={() => abrirModalBono(emp)}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary-text hover:underline"
                >
                  <Pencil size={10} aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>
          ) : !planillaSeleccionada?.planilla?.procesada && puedeCalcular ? (
            <button
              type="button"
              onClick={() => abrirModalBono(emp)}
              className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-primary-text hover:bg-primary-soft hover:text-primary transition-colors"
              title="Asignar bono a este empleado"
            >
              <Plus size={11} aria-hidden="true" />
              Bono
            </button>
          ) : (
            <span className="text-fg-muted">—</span>
          ),
      },
      {
        clave: 'isss_laboral',
        titulo: 'ISSS (3%)',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.isss_laboral,
        render: (emp) => (
          <span className="text-danger">-{formatoDinero(emp.isss_laboral)}</span>
        ),
      },
      {
        clave: 'afp_laboral',
        titulo: 'AFP (7.25%)',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.afp_laboral,
        render: (emp) => (
          <span className="text-danger">-{formatoDinero(emp.afp_laboral)}</span>
        ),
      },
      {
        clave: 'renta_retenida',
        titulo: 'Renta',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.renta_retenida,
        render: (emp) => (
          <span className="text-danger">-{formatoDinero(emp.renta_retenida)}</span>
        ),
      },
      {
        clave: 'total_descuentos',
        titulo: 'Total Desc.',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.total_descuentos,
        render: (emp) => (
          <span className="font-semibold text-danger">-{formatoDinero(emp.total_descuentos)}</span>
        ),
      },
      {
        clave: 'salario_neto',
        titulo: 'Neto a Pagar',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.salario_neto,
        render: (emp) => (
          <span className="font-bold text-success text-sm bg-success-soft/20 px-1 py-0.5 rounded">
            {formatoDinero(emp.salario_neto)}
          </span>
        ),
      },
      {
        clave: 'boleta',
        titulo: 'Boleta',
        alinear: 'center',
        ordenable: false,
        render: (emp) =>
          planillaSeleccionada?.planilla?.procesada ? (
            <button
              type="button"
              onClick={() =>
                handleDescargarBoleta(
                  planillaSeleccionada.planilla.id_planilla,
                  emp.id_empleado
                )
              }
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-text hover:underline"
              title="Descargar boleta individual"
            >
              <Download size={13} aria-hidden="true" />
              Boleta
            </button>
          ) : (
            <span className="text-fg-muted text-[11px]">—</span>
          ),
      },
    ],
    [planillaSeleccionada, puedeCalcular, abrirModalBono]
  );

  if (cargando) {
    return (
      <Spinner texto="Cargando módulo de planillas…" className="min-h-[400px]" />
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Gestión · RR. HH."
        titulo="Planillas de pago"
        descripcion="Cálculo mensual de remuneraciones del personal, retenciones de ley (ISSS, AFP, Renta) y aportes patronales."
        acciones={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variante="ghost"
              onClick={() => cargarPlanillas(true)}
              cargando={actualizando}
              icono={RefreshCw}
              aria-label="Actualizar planillas"
            >
              Actualizar
            </Button>
            {puedeCalcular && (
              <Button variante="primary" onClick={abrirModalCrear} icono={Plus}>
                Nueva planilla
              </Button>
            )}
          </div>
        }
      />

      {errorCarga && (
        <BannerError
          error={{ titulo: 'Error al cargar planillas', mensaje: errorCarga }}
          onReintentar={() => cargarPlanillas(false)}
        />
      )}

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          icono={FileText}
          etiqueta="Total planillas"
          valor={metricas.total}
          tono="primario"
        />
        <Metrica
          icono={CheckCircle2}
          etiqueta="Planillas procesadas"
          valor={metricas.procesadas}
          tono="exito"
        />
        <Metrica
          icono={AlertTriangle}
          etiqueta="En proceso / pendientes"
          valor={metricas.pendientes}
          tono="aviso"
        />
        <Metrica
          icono={DollarSign}
          etiqueta="Neto histórico pagado"
          valor={formatoDinero(metricas.totalNeto)}
          tono="info"
        />
      </div>

      {/* Tabla de planillas */}
      <Card sinPadding>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="w-full sm:w-64">
            <Select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              opciones={[
                { valor: '', texto: 'Todas las sucursales' },
                ...sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre })),
              ]}
              tamano="sm"
            />
          </div>

          <div className="w-full sm:w-48">
            <input
              type="month"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="input w-full text-xs"
              placeholder="Filtrar por mes"
            />
          </div>
        </div>

        <Table
          columnas={columnas}
          filas={planillas}
          idFila="id_planilla"
          idTabla="rrhh_planillas"
          vacio={
            <EstadoVacio
              icono={FileText}
              mensaje="No hay planillas registradas"
              descripcion="Crea una nueva planilla para liquidar el sueldo de tu personal en el período correspondiente."
            />
          }
        />
      </Card>

      {/* Modal: Crear nueva planilla */}
      {modalCrearAbierto && (
        <Dialogo
          onCerrar={() => setModalCrearAbierto(false)}
          tamano="md"
          labelledBy="modal-crear-planilla-titulo"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Gestión · RR. HH.
              </p>
              <h2 id="modal-crear-planilla-titulo" className="mt-1 text-xl font-semibold text-fg">
                Nueva planilla de sueldos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModalCrearAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleCrearPlanilla} className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-fg">
                Sucursal <span className="text-danger">*</span>
              </label>
              <div className="mt-1.5">
                <Select
                  value={formCrear.idSucursal}
                  onChange={(e) => setFormCrear({ ...formCrear, idSucursal: e.target.value })}
                  opciones={[
                    { valor: '', texto: 'Selecciona una sucursal…' },
                    ...sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre })),
                  ]}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="crear-periodo" className="block text-sm font-medium text-fg">
                Mes a liquidar (AAAA-MM) <span className="text-danger">*</span>
              </label>
              <input
                id="crear-periodo"
                type="month"
                value={formCrear.periodo}
                onChange={(e) => setFormCrear({ ...formCrear, periodo: e.target.value })}
                className="input mt-1.5 w-full"
                required
              />
              <p className="mt-1 text-xs text-fg-muted">
                Se liquidará a todos los empleados activos de la sucursal durante el mes seleccionado.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                disabled={guardandoCrear}
              >
                Cancelar
              </Button>
              <Button variante="primary" type="submit" cargando={guardandoCrear}>
                Crear y abrir planilla
              </Button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* Modal / Visor de Detalle de Planilla */}
      {modalDetalleAbierto && (
        <Dialogo
          onCerrar={() => setModalDetalleAbierto(false)}
          tamano="xl"
          labelledBy="modal-detalle-titulo"
        >
          {cargandoDetalle ? (
            <Spinner texto="Cargando desglose de la planilla…" className="min-h-[300px]" />
          ) : planillaSeleccionada ? (
            <div>
              {/* Encabezado del visor */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                      Liquidación de planilla
                    </p>
                    <EstadoBadge
                      tipo={
                        planillaSeleccionada.planilla.procesada
                          ? 'exito'
                          : planillaSeleccionada.empleados?.length > 0
                          ? 'info'
                          : 'aviso'
                      }
                    >
                      {planillaSeleccionada.planilla.procesada
                        ? 'Procesada'
                        : planillaSeleccionada.empleados?.length > 0
                        ? 'Calculada'
                        : 'Sin calcular'}
                    </EstadoBadge>
                  </div>
                  <h2 id="modal-detalle-titulo" className="mt-1 text-xl font-bold text-fg">
                    {planillaSeleccionada.planilla.sucursal || 'Planilla'} — Período{' '}
                    {planillaSeleccionada.planilla.periodo_inicio?.slice(0, 7)}
                  </h2>
                  <p className="text-xs text-fg-muted">
                    Del {planillaSeleccionada.planilla.periodo_inicio?.slice(0, 10)} al{' '}
                    {planillaSeleccionada.planilla.periodo_fin?.slice(0, 10)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botones de acción del ciclo de vida */}
                  {puedeCalcular && !planillaSeleccionada.planilla.procesada && (
                    <>
                      <Button
                        variante="secondary"
                        onClick={() => handleCalcular(planillaSeleccionada.planilla.id_planilla)}
                        cargando={procesandoAccion}
                        icono={Calculator}
                      >
                        {planillaSeleccionada.empleados?.length > 0 ? 'Recalcular' : 'Calcular planilla'}
                      </Button>

                      {planillaSeleccionada.empleados?.length > 0 && (
                        <Button
                          variante="danger"
                          onClick={() => handleProcesar(planillaSeleccionada.planilla.id_planilla)}
                          cargando={procesandoAccion}
                          icono={Lock}
                        >
                          Procesar y cerrar
                        </Button>
                      )}
                    </>
                  )}

                  {planillaSeleccionada.planilla.procesada && (
                    <Button
                      variante="primary"
                      onClick={() => handleDescargarPdf(planillaSeleccionada.planilla.id_planilla)}
                      icono={Download}
                    >
                      Descargar PDF
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setModalDetalleAbierto(false)}
                    className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg ml-2"
                    aria-label="Cerrar modal"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Contenido / Tabla de empleados */}
              <div className="space-y-4 p-6 overflow-y-auto max-h-[75vh]">
                {planillaSeleccionada.empleados?.length > 0 ? (
                  <Table
                    columnas={columnasDetalle}
                    filas={planillaSeleccionada.empleados}
                    idFila="id_empleado"
                    idTabla="rrhh_planilla_detalle"
                    paginacion={planillaSeleccionada.empleados.length > 10}
                    filasPorPaginaInicial={25}
                    vacio="No hay empleados calculados en esta planilla."
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-line p-8 text-center">
                    <Calculator size={36} className="mx-auto text-fg-muted" aria-hidden="true" />
                    <h3 className="mt-2 text-base font-semibold text-fg">
                      Esta planilla aún no ha sido calculada
                    </h3>
                    <p className="mt-1 text-xs text-fg-muted max-w-sm mx-auto">
                      Haz clic en «Calcular planilla» para ejecutar el cálculo automático de salarios, retenciones del ISSS, AFP y tramos de Renta.
                    </p>
                    {puedeCalcular && (
                      <div className="mt-4">
                        <Button
                          variante="primary"
                          onClick={() => handleCalcular(planillaSeleccionada.planilla.id_planilla)}
                          cargando={procesandoAccion}
                          icono={Calculator}
                        >
                          Calcular planilla ahora
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Dialogo>
      )}

      {/* Modal: Asignar / Editar Bono */}
      {modalBonoAbierto && empleadoParaBono && (
        <Dialogo
          onCerrar={() => setModalBonoAbierto(false)}
          tamano="sm"
          labelledBy="modal-bono-titulo"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Gestión · RR. HH.
              </p>
              <h2 id="modal-bono-titulo" className="mt-1 text-lg font-bold text-fg">
                Bono para {empleadoParaBono.nombres} {empleadoParaBono.apellidos}
              </h2>
              <p className="text-xs text-fg-muted">
                DUI: {empleadoParaBono.dui} · Salario base: {formatoDinero(empleadoParaBono.salario_bruto)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalBonoAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleGuardarBono} className="space-y-4 p-5">
            <div>
              <label htmlFor="bono-monto" className="block text-sm font-medium text-fg">
                Monto del bono ($) <span className="text-danger">*</span>
              </label>
              <input
                id="bono-monto"
                type="text"
                inputMode="decimal"
                placeholder="Ej: 50.00"
                value={formBono.monto}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setFormBono({ ...formBono, monto: val });
                }}
                className="input mt-1.5 w-full font-mono"
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-fg-muted">
                El monto se suma a la base imponible y recalcula automáticamente ISSS, AFP y Renta.
              </p>
            </div>

            <div>
              <label htmlFor="bono-descripcion" className="block text-sm font-medium text-fg">
                Descripción / Motivo del bono <span className="text-danger">*</span>
              </label>
              <input
                id="bono-descripcion"
                type="text"
                maxLength={150}
                placeholder="Ej: Cumplimiento de metas de ventas, puntualidad..."
                value={formBono.descripcion}
                onChange={(e) => setFormBono({ ...formBono, descripcion: e.target.value })}
                className="input mt-1.5 w-full"
                required
              />
              <p className="mt-1 text-xs text-fg-muted">
                Se incluirá en el desglose de la planilla y en la boleta de pago del empleado.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-line">
              {Number(empleadoParaBono.bonificaciones || 0) > 0 ? (
                <Button
                  variante="ghost"
                  type="button"
                  className="text-danger hover:bg-danger-soft text-xs"
                  onClick={handleQuitarBono}
                  disabled={guardandoBono}
                  icono={Trash2}
                >
                  Quitar bono
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  variante="ghost"
                  type="button"
                  onClick={() => setModalBonoAbierto(false)}
                  disabled={guardandoBono}
                >
                  Cancelar
                </Button>
                <Button variante="primary" type="submit" cargando={guardandoBono} icono={Gift}>
                  Guardar bono
                </Button>
              </div>
            </div>
          </form>
        </Dialogo>
      )}
    </div>
  );
}
