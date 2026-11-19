import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Download,
  FileX,
  Gift,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
  MinusCircle,
  BadgeDollarSign,
  X,
} from 'lucide-react';
import { rrhhApi } from '../../api/rrhh.api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import Skeleton, { SkeletonFilas } from '../../components/feedback/Skeleton.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { Button, Card, Table } from '../../components/ui/index.js';
import { formatoDinero } from '../../utils/formato.js';
import { estadoPlanilla, abrirPdfPlanilla, abrirBoletaEmpleado } from './planillaUtils.js';

const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const nombreEmpleado = (emp) => `${emp.apellidos}, ${emp.nombres}`;

// Detalle de una planilla a ancho completo (/rrhh/planillas/:idPlanilla).
export default function PlanillaDetallePage() {
  const { idPlanilla } = useParams();
  const location = useLocation();
  const { tiene } = useAuth();
  const { notificar, notificarError, confirm } = useAlert();
  const puedeCalcular = tiene('RRHH_CALCULAR_PLANILLA');

  // Filtros del listado (sucursal y mes) para volver con ellos aplicados.
  const rutaVolver = `/rrhh${location.state?.busquedaListado ?? ''}`;

  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [accion, setAccion] = useState(null); // 'calcular' | 'procesar' | null
  const [busqueda, setBusqueda] = useState('');

  // Modal Asignar / Editar Bono
  const [modalBonoAbierto, setModalBonoAbierto] = useState(false);
  const [empleadoParaBono, setEmpleadoParaBono] = useState(null);
  const [formBono, setFormBono] = useState({ monto: '', descripcion: '' });
  const [guardandoBono, setGuardandoBono] = useState(false);

  const inicioRef = useRef(null);

  const cargarDetalle = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const datos = await rrhhApi.obtenerPlanilla(idPlanilla);
      setDetalle(datos);
      setNoEncontrada(false);
    } catch (err) {
      if ([400, 403, 404].includes(err?.status)) setNoEncontrada(true);
      else setError(err?.message || 'No se pudo cargar la planilla.');
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [idPlanilla]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  // Al llegar a la pantalla, el foco va al inicio del contenido (antes de "Volver a planillas").
  useEffect(() => {
    inicioRef.current?.focus({ preventScroll: true });
  }, [idPlanilla]);

  const planilla = detalle?.planilla;
  const empleados = useMemo(() => detalle?.empleados ?? [], [detalle]);
  const totales = detalle?.totales;
  const procesada = Boolean(planilla?.procesada);
  const editable = puedeCalcular && !procesada;
  const estado = estadoPlanilla({ procesada, empleados: empleados.length });
  const ocupado = accion !== null;

  const handleCalcular = async () => {
    setAccion('calcular');
    try {
      const res = await rrhhApi.calcularPlanilla(idPlanilla);
      notificar.exito(`Planilla calculada exitosamente para ${res.empleados} empleados`);
      await cargarDetalle({ silencioso: true });
    } catch (err) {
      notificarError(err, { reintentar: handleCalcular });
    } finally {
      setAccion(null);
    }
  };

  const handleProcesar = async () => {
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

    setAccion('procesar');
    try {
      await rrhhApi.procesarPlanilla(idPlanilla);
      notificar.exito('Planilla procesada y cerrada oficialmente');
      await cargarDetalle({ silencioso: true });
    } catch (err) {
      notificarError(err, { reintentar: handleProcesar });
    } finally {
      setAccion(null);
    }
  };

  const abrirModalBono = useCallback((emp) => {
    setEmpleadoParaBono(emp);
    const montoActual = Number(emp.bonificaciones || 0) > 0 ? String(emp.bonificaciones) : '';
    const descActual = Array.isArray(emp.detalle) ? (emp.detalle[0] || '') : (emp.detalle || '');
    setFormBono({ monto: montoActual, descripcion: descActual });
    setModalBonoAbierto(true);
  }, []);

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
      await rrhhApi.guardarAjuste(planilla.id_planilla, empleadoParaBono.id_empleado, {
        bonificaciones: montoLimpio,
        descripcion: formBono.descripcion.trim(),
      });
      notificar.exito(`Bono asignado a ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}`);
      setModalBonoAbierto(false);
      await cargarDetalle({ silencioso: true });
    } catch (err) {
      notificarError(err, { reintentar: () => handleGuardarBono(e) });
    } finally {
      setGuardandoBono(false);
    }
  };

  const handleQuitarBono = async () => {
    const seguro = await confirm(
      `¿Deseas quitar el bono asignado a ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}? Se recalcularán los descuentos de la planilla.`,
      { titulo: 'Quitar bono', destructivo: true, etiquetaAceptar: 'Sí, quitar bono' }
    );
    if (!seguro) return;

    setGuardandoBono(true);
    try {
      await rrhhApi.guardarAjuste(planilla.id_planilla, empleadoParaBono.id_empleado, {
        bonificaciones: '0',
        descripcion: '',
      });
      notificar.exito(`Bono eliminado de ${empleadoParaBono.nombres} ${empleadoParaBono.apellidos}`);
      setModalBonoAbierto(false);
      await cargarDetalle({ silencioso: true });
    } catch (err) {
      notificarError(err, { reintentar: handleQuitarBono });
    } finally {
      setGuardandoBono(false);
    }
  };

  const empleadosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    if (!termino) return empleados;
    return empleados.filter((emp) =>
      normalizar(`${emp.nombres} ${emp.apellidos} ${emp.dui}`).includes(termino)
    );
  }, [empleados, busqueda]);

  const columnasDetalle = useMemo(
    () => [
      {
        clave: 'empleado',
        titulo: 'Empleado / DUI',
        tipo: 'texto',
        valorOrden: (emp) => `${emp.apellidos || ''} ${emp.nombres || ''}`.trim(),
        render: (emp) => (
          <div className="min-w-0 max-w-56">
            <p className="truncate font-semibold text-fg" title={nombreEmpleado(emp)}>
              {nombreEmpleado(emp)}
            </p>
            <p className="font-mono text-label-sm text-fg-muted">{emp.dui}</p>
          </div>
        ),
      },
      {
        clave: 'salario_bruto',
        titulo: 'Salario base',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.salario_bruto,
        render: (emp) => <span className="font-medium text-fg">{formatoDinero(emp.salario_bruto)}</span>,
      },
      {
        clave: 'bonificaciones',
        titulo: 'Bono',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.bonificaciones,
        render: (emp) => {
          const motivo = Array.isArray(emp.detalle) ? emp.detalle[0] : emp.detalle;
          if (Number(emp.bonificaciones) > 0) {
            return (
              <div className="flex flex-col items-end">
                <span className="font-semibold text-success-text">+{formatoDinero(emp.bonificaciones)}</span>
                {motivo ? (
                  <span
                    className="max-w-32 truncate text-label-sm italic text-fg-muted"
                    title={Array.isArray(emp.detalle) ? emp.detalle.join(' · ') : emp.detalle}
                  >
                    {motivo}
                  </span>
                ) : null}
                {editable && (
                  <button
                    type="button"
                    onClick={() => abrirModalBono(emp)}
                    disabled={ocupado}
                    aria-label={`Editar bono de ${nombreEmpleado(emp)}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-label-sm text-primary-text hover:underline disabled:opacity-50"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Editar
                  </button>
                )}
              </div>
            );
          }
          return editable ? (
            <button
              type="button"
              onClick={() => abrirModalBono(emp)}
              disabled={ocupado}
              aria-label={`Asignar bono a ${nombreEmpleado(emp)}`}
              className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-label-sm text-primary-text transition-colors hover:bg-primary-soft motion-reduce:transition-none disabled:opacity-50"
            >
              <Plus size={14} aria-hidden="true" />
              Bono
            </button>
          ) : (
            <span className="text-fg-muted">—</span>
          );
        },
      },
      {
        clave: 'isss_laboral',
        titulo: 'ISSS (3%)',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.isss_laboral,
        render: (emp) => <span className="text-danger-text">-{formatoDinero(emp.isss_laboral)}</span>,
      },
      {
        clave: 'afp_laboral',
        titulo: 'AFP (7.25%)',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.afp_laboral,
        render: (emp) => <span className="text-danger-text">-{formatoDinero(emp.afp_laboral)}</span>,
      },
      {
        clave: 'renta_retenida',
        titulo: 'Renta',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.renta_retenida,
        render: (emp) => <span className="text-danger-text">-{formatoDinero(emp.renta_retenida)}</span>,
      },
      {
        clave: 'total_descuentos',
        titulo: 'Descuentos',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.total_descuentos,
        render: (emp) => (
          <span className="font-semibold text-danger-text">-{formatoDinero(emp.total_descuentos)}</span>
        ),
      },
      {
        clave: 'salario_neto',
        titulo: 'Neto a pagar',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (emp) => emp.salario_neto,
        render: (emp) => <span className="font-bold text-success-text">{formatoDinero(emp.salario_neto)}</span>,
      },
      {
        clave: 'boleta',
        titulo: 'Boleta',
        alinear: 'right',
        ordenable: false,
        render: (emp) =>
          procesada ? (
            <button
              type="button"
              onClick={() => abrirBoletaEmpleado(planilla.id_planilla, emp.id_empleado)}
              aria-label={`Descargar boleta de ${nombreEmpleado(emp)}`}
              className="inline-flex items-center gap-1 text-label-sm text-primary-text hover:underline"
            >
              <Download size={14} aria-hidden="true" />
              Boleta
            </button>
          ) : (
            <span className="text-label-sm text-fg-muted">—</span>
          ),
      },
    ],
    [editable, ocupado, procesada, planilla, abrirModalBono]
  );

  // Totales de toda la planilla, calculados en SQL (GET /rrhh/planillas/:id → totales); no se suma en JS.
  const pie = totales
    ? {
        empleado: 'Total planilla',
        salario_bruto: formatoDinero(totales.salario_bruto),
        bonificaciones: formatoDinero(totales.bonificaciones),
        isss_laboral: formatoDinero(totales.isss_laboral),
        afp_laboral: formatoDinero(totales.afp_laboral),
        renta_retenida: formatoDinero(totales.renta_retenida),
        total_descuentos: formatoDinero(totales.total_descuentos),
        salario_neto: formatoDinero(totales.salario_neto),
      }
    : null;

  const enlaceVolver = (
    <Link to={rutaVolver} className="btn-ghost">
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
      Volver a planillas
    </Link>
  );

  const periodo = planilla?.periodo_inicio?.slice(0, 7);

  return (
    <div ref={inicioRef} tabIndex={-1} className="space-y-6 outline-none">
      {cargando ? (
        <div role="status" className="space-y-6">
          <span className="sr-only">Cargando planilla…</span>
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-80 max-w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Metrica key={i} etiqueta="Cargando" cargando />
            ))}
          </div>
          <Card sinPadding>
            <SkeletonFilas filas={8} columnas={5} texto="Cargando empleados…" />
          </Card>
        </div>
      ) : noEncontrada ? (
        <Card>
          <EstadoVacio
            icono={FileX}
            titulo="No encontramos esta planilla"
            accion={
              <Link to="/rrhh" className="btn-ghost">
                <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                Ir a Planilla
              </Link>
            }
          >
            Puede que no exista o que no tengas acceso a su sucursal.
          </EstadoVacio>
        </Card>
      ) : error && !detalle ? (
        <div className="space-y-4">
          {enlaceVolver}
          <BannerError
            error={{ titulo: 'Error al cargar la planilla', mensaje: error }}
            onReintentar={() => cargarDetalle()}
          />
        </div>
      ) : detalle ? (
        <>
          <EncabezadoPagina
            seccion="Gestión · RR. HH."
            titulo={
              <>
                Planilla {periodo} · {planilla.sucursal}{' '}
                <span className="inline-block align-middle"><EstadoBadge tipo={estado.tipo}>{estado.texto}</EstadoBadge></span>
              </>
            }
            descripcion={`Del ${planilla.periodo_inicio?.slice(0, 10)} al ${planilla.periodo_fin?.slice(0, 10)}`}
            acciones={
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                {enlaceVolver}
                {editable && (
                  <Button
                    variante="secondary"
                    onClick={handleCalcular}
                    cargando={accion === 'calcular'}
                    disabled={ocupado}
                    icono={Calculator}
                  >
                    {empleados.length > 0 ? 'Recalcular' : 'Calcular planilla'}
                  </Button>
                )}
                {editable && empleados.length > 0 && (
                  <Button
                    variante="danger"
                    onClick={handleProcesar}
                    cargando={accion === 'procesar'}
                    disabled={ocupado}
                    icono={Lock}
                  >
                    Procesar y cerrar
                  </Button>
                )}
                {procesada && (
                  <Button variante="primary" onClick={() => abrirPdfPlanilla(planilla.id_planilla)} icono={Download}>
                    Descargar PDF
                  </Button>
                )}
              </div>
            }
          />

          {error && (
            <BannerError
              error={{ titulo: 'Error al actualizar la planilla', mensaje: error }}
              onReintentar={() => cargarDetalle({ silencioso: true })}
            />
          )}

          {empleados.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metrica icono={Users} etiqueta="Empleados" valor={empleados.length} />
                <Metrica
                  icono={Wallet}
                  etiqueta="Salario base"
                  valor={formatoDinero(totales?.salario_bruto)}
                  detalle={`+ ${formatoDinero(totales?.bonificaciones)} en bonos`}
                />
                <Metrica
                  icono={MinusCircle}
                  etiqueta="Total descuentos"
                  valor={formatoDinero(totales?.total_descuentos)}
                />
                <Metrica
                  icono={BadgeDollarSign}
                  etiqueta="Neto a pagar"
                  valor={formatoDinero(totales?.salario_neto)}
                />
              </div>

              <Card sinPadding>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                  <label className="relative w-full sm:w-72">
                    <span className="sr-only">Buscar empleado o DUI</span>
                    <Search
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                    />
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar empleado o DUI…"
                      className="input h-control-sm w-full pl-9"
                    />
                  </label>
                  <p className="text-label-sm text-fg-muted" aria-live="polite">
                    {busqueda.trim()
                      ? `${empleadosFiltrados.length} de ${empleados.length} empleados`
                      : `${empleados.length} ${empleados.length === 1 ? 'empleado' : 'empleados'}`}
                  </p>
                </div>

                <Table
                  etiqueta="Empleados de la planilla"
                  columnas={columnasDetalle}
                  filas={empleadosFiltrados}
                  idFila="id_empleado"
                  idTabla="rrhh_planilla_detalle"
                  pie={pie}
                  minAncho="min-w-[880px]"
                  maxAltura="max-h-[calc(100dvh-12rem)]"
                  scrollConPaginacion
                  paginacion={empleados.length > 25}
                  filasPorPaginaInicial={25}
                  vacio={
                    <EstadoVacio
                      icono={Search}
                      titulo="Sin resultados"
                      accion={
                        <Button variante="ghost" tamano="sm" icono={X} onClick={() => setBusqueda('')}>
                          Limpiar búsqueda
                        </Button>
                      }
                    >
                      Ningún empleado coincide con «{busqueda}».
                    </EstadoVacio>
                  }
                />
              </Card>
            </>
          ) : (
            <Card>
              <EstadoVacio
                icono={Calculator}
                titulo="Esta planilla aún no ha sido calculada"
                accion={
                  puedeCalcular && !procesada ? (
                    <Button variante="primary" onClick={handleCalcular} cargando={accion === 'calcular'} icono={Calculator}>
                      Calcular planilla ahora
                    </Button>
                  ) : null
                }
              >
                Haz clic en «Calcular planilla» para ejecutar el cálculo automático de salarios, retenciones del ISSS, AFP y tramos de Renta.
              </EstadoVacio>
            </Card>
          )}
        </>
      ) : null}

      {/* Modal: Asignar / Editar Bono */}
      {modalBonoAbierto && empleadoParaBono && (
        <Dialogo onCerrar={() => setModalBonoAbierto(false)} tamano="sm" labelledBy="modal-bono-titulo">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="rotulo !text-primary-text">Gestión · RR. HH.</p>
              <h2 id="modal-bono-titulo" className="mt-1 text-h3 text-fg">
                Bono para {empleadoParaBono.nombres} {empleadoParaBono.apellidos}
              </h2>
              <p className="text-label-sm text-fg-muted">
                DUI: {empleadoParaBono.dui} · Salario base: {formatoDinero(empleadoParaBono.salario_bruto)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalBonoAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleGuardarBono} className="space-y-4 p-5">
            <div>
              <label htmlFor="bono-monto" className="block text-label text-fg">
                Monto del bono ($) <span className="text-danger-text">*</span>
              </label>
              <input
                id="bono-monto"
                type="text"
                inputMode="decimal"
                placeholder="Ej: 50.00"
                value={formBono.monto}
                onChange={(e) => setFormBono({ ...formBono, monto: e.target.value.replace(/[^0-9.]/g, '') })}
                className="input mt-1.5 w-full font-mono"
                required
                autoFocus
              />
              <p className="mt-1 text-label-sm text-fg-muted">
                El monto se suma a la base imponible y recalcula automáticamente ISSS, AFP y Renta.
              </p>
            </div>

            <div>
              <label htmlFor="bono-descripcion" className="block text-label text-fg">
                Descripción o motivo del bono <span className="text-danger-text">*</span>
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
              <p className="mt-1 text-label-sm text-fg-muted">
                Se incluirá en el desglose de la planilla y en la boleta de pago del empleado.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2.5 border-t border-line pt-3">
              {Number(empleadoParaBono.bonificaciones || 0) > 0 ? (
                <Button
                  variante="ghost"
                  tamano="sm"
                  type="button"
                  className="text-danger-text hover:bg-danger-soft"
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
                <Button variante="ghost" type="button" onClick={() => setModalBonoAbierto(false)} disabled={guardandoBono}>
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
