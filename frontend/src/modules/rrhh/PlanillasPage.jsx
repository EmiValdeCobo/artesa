import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  X,
  DollarSign,
  Download,
  Eye,
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
import { formatoDinero, formatoFecha, formatoMes } from '../../utils/formato.js';
import { estadoPlanilla, abrirPdfPlanilla } from './planillaUtils.js';

export default function PlanillasPage() {
  const { tiene } = useAuth();
  const { notificar, notificarError } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();

  const puedeCalcular = tiene('RRHH_CALCULAR_PLANILLA');

  const [planillas, setPlanillas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Filtros en la URL (?sucursal=&mes=): sobreviven al ir al detalle y volver.
  const [searchParams, setSearchParams] = useSearchParams();
  const filtroSucursal = searchParams.get('sucursal') ?? '';
  const filtroPeriodo = searchParams.get('mes') ?? '';
  const cambiarFiltro = (clave, valor) => {
    setSearchParams((prev) => {
      const sig = new URLSearchParams(prev);
      if (valor) sig.set(clave, valor);
      else sig.delete(clave);
      return sig;
    }, { replace: true });
  };
  // El detalle recibe la búsqueda actual para que "Volver a planillas" conserve los filtros.
  const estadoDetalle = useMemo(() => ({ busquedaListado: location.search }), [location.search]);

  // Modal Crear Planilla
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [formCrear, setFormCrear] = useState({
    idSucursal: '',
    periodo: new Date().toISOString().slice(0, 7), // AAAA-MM
    tipoPeriodo: 'QUINCENAL',
    quincena: new Date().getDate() <= 15 ? '1' : '2',
  });
  const [guardandoCrear, setGuardandoCrear] = useState(false);

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
      tipoPeriodo: 'QUINCENAL',
      quincena: new Date().getDate() <= 15 ? '1' : '2',
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
    const [anio, mes] = formCrear.periodo.split('-').map(Number);
    const ultimoDia = formCrear.tipoPeriodo === 'QUINCENAL' && Number(formCrear.quincena) === 1
      ? 15
      : new Date(anio, mes, 0).getDate();
    const finPeriodo = `${formCrear.periodo}-${String(ultimoDia).padStart(2, '0')}`;
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    if (finPeriodo > hoyISO) {
      notificar.advertencia('Período no finalizado', {
        mensaje: 'Solo puedes generar planillas de períodos que ya finalizaron. No se permiten meses futuros.',
      });
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await rrhhApi.crearPlanilla({
        idSucursal: Number(formCrear.idSucursal),
        periodo: formCrear.periodo,
        tipoPeriodo: formCrear.tipoPeriodo,
        ...(formCrear.tipoPeriodo === 'QUINCENAL' ? { quincena: Number(formCrear.quincena) } : {}),
        ajustes: [],
      });

      notificar.exito('Período de planilla creado exitosamente');
      setModalCrearAbierto(false);
      await cargarPlanillas(true);

      // Abrir inmediatamente el detalle para calcular
      if (res?.idPlanilla) {
        navigate(`/rrhh/planillas/${res.idPlanilla}`, { state: estadoDetalle });
      }
    } catch (err) {
      notificarError(err, { reintentar: () => handleCrearPlanilla(e) });
    } finally {
      setGuardandoCrear(false);
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
              {p.periodo_inicio ? formatoMes(p.periodo_inicio.slice(0, 7)) : '—'}
              <span className="ml-2 text-xs font-normal text-fg-muted">
                {p.tipo_periodo === 'QUINCENAL'
                  ? `Quincena ${Number(p.periodo_inicio?.slice(8, 10)) <= 15 ? 1 : 2}`
                  : 'Mensual'}
              </span>
            </p>
            <p className="text-xs text-fg-muted">
              {formatoFecha(p.periodo_inicio)} al {formatoFecha(p.periodo_fin)}
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
        titulo: 'Total devengado',
        alinear: 'right',
        tipo: 'dinero',
        valorOrden: (p) => p.total_bruto,
        render: (p) => <span className="font-medium text-fg">{formatoDinero(p.total_bruto)}</span>,
      },
      {
        clave: 'total_neto',
        titulo: 'Total a pagar',
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
        valorOrden: (p) => estadoPlanilla(p).texto,
        render: (p) => {
          const estado = estadoPlanilla(p);
          return <EstadoBadge tipo={estado.tipo}>{estado.texto}</EstadoBadge>;
        },
      },
      {
        clave: 'acciones',
        titulo: 'Acciones',
        alinear: 'right',
        ordenable: false,
        render: (p) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              to={`/rrhh/planillas/${p.id_planilla}`}
              state={estadoDetalle}
              className="btn-ghost btn-sm"
              aria-label={`Ver detalle de la planilla ${p.periodo_inicio ? formatoMes(p.periodo_inicio.slice(0, 7)) : ''} de ${p.sucursal}`}
            >
              <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
              Ver detalle
            </Link>
            {p.procesada && (
              <Button
                variante="ghost"
                onClick={() => abrirPdfPlanilla(p.id_planilla)}
                tamano="sm"
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
    [estadoDetalle]
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
        descripcion="Cálculo quincenal o mensual de remuneraciones del personal, retenciones de ley (ISSS, AFP, Renta) y aportes patronales."
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
          tono="neutro"
        />
        <Metrica
          icono={CheckCircle2}
          etiqueta="Planillas procesadas"
          valor={metricas.procesadas}
          tono="neutro"
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
          tono="neutro"
        />
      </div>

      {/* Tabla de planillas */}
      <Card sinPadding>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="w-full sm:w-64">
            <Select
              value={filtroSucursal}
              onChange={(e) => cambiarFiltro('sucursal', e.target.value)}
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
              onChange={(e) => cambiarFiltro('mes', e.target.value)}
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
              titulo="No hay planillas registradas"
            >
              Crea una nueva planilla para liquidar el sueldo de tu personal en el período correspondiente.
            </EstadoVacio>
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
              aria-label="Cerrar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleCrearPlanilla} className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-fg">
                Sucursal <span className="text-danger-text">*</span>
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
                Mes a liquidar (AAAA-MM) <span className="text-danger-text">*</span>
              </label>
              <input
                id="crear-periodo"
                type="month"
                value={formCrear.periodo}
                onChange={(e) => setFormCrear({ ...formCrear, periodo: e.target.value })}
                className="input mt-1.5 w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fg">
                  Tipo de planilla <span className="text-danger-text">*</span>
                </label>
                <div className="mt-1.5">
                  <Select
                    value={formCrear.tipoPeriodo}
                    onChange={(e) => setFormCrear({ ...formCrear, tipoPeriodo: e.target.value })}
                    opciones={[
                      { valor: 'QUINCENAL', texto: 'Quincenal' },
                      { valor: 'MENSUAL', texto: 'Mensual' },
                    ]}
                  />
                </div>
              </div>
              {formCrear.tipoPeriodo === 'QUINCENAL' && (
                <div>
                  <label className="block text-sm font-medium text-fg">
                    Quincena <span className="text-danger-text">*</span>
                  </label>
                  <div className="mt-1.5">
                    <Select
                      value={formCrear.quincena}
                      onChange={(e) => setFormCrear({ ...formCrear, quincena: e.target.value })}
                      opciones={[
                        { valor: '1', texto: '1.ª (días 1 al 15)' },
                        { valor: '2', texto: '2.ª (16 a fin de mes)' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-fg-muted">
              {formCrear.tipoPeriodo === 'QUINCENAL'
                ? 'Se liquida la mitad del salario mensual con el tope de ISSS y la tabla de Renta quincenales.'
                : 'Se liquida el salario mensual completo con la tabla de Renta mensual.'}
            </p>

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
    </div>
  );
}
