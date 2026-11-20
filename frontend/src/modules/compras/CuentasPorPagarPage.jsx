import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CreditCard, FileText, Search } from 'lucide-react';
import { ICONOS } from '../../config/iconos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { listarTodasLasCuentasPorPagar } from './comprasApi.js';
import PagoDialogo from './PagoDialogo.jsx';
import DetalleFacturaDialogo, { EstadoFactura as EstadoPago, useEliminarFactura } from './DetalleFacturaDialogo.jsx';
import FiltroPeriodo, { ResumenPeriodo } from './FiltroPeriodo.jsx';
import { mesActual, rangoDePeriodo, totalesPeriodo } from './periodo.js';

const dinero = (valor) => `$${String(valor ?? '0.00')}`;
const ESTADOS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'pagadas', texto: 'Pagadas' },
  { valor: 'todas', texto: 'Todas' },
];

export default function CuentasPorPagarPage() {
  const { tiene, usuario } = useAuth();
  const puedePagar = tiene('COM_PAGAR_PROVEEDOR');
  const puedeEliminar = tiene('COM_ELIMINAR_FACTURA');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [estado, setEstado] = useState('pendientes');
  const [modal, setModal] = useState(null);
  const [detalle, setDetalle] = useState(null);
  // Período: por defecto el mes en curso, filtrado por fecha de vencimiento (se puede cambiar a emisión).
  const [periodo, setPeriodo] = useState(() => mesActual());
  const [campoFecha, setCampoFecha] = useState('vencimiento');
  const { desde, hasta } = rangoDePeriodo(periodo);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setFilas(await listarTodasLasCuentasPorPagar({ ...(sucursal ? { idSucursal: sucursal } : {}), estado, campoFecha, ...(desde ? { desde, hasta } : {}) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado, sucursal, campoFecha, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return filas.filter((factura) => [factura.proveedor, factura.num_factura, factura.sucursal]
      .some((valor) => String(valor ?? '').toLocaleLowerCase('es').includes(termino)));
  }, [filas, busqueda]);
  const totales = useMemo(() => totalesPeriodo(visibles), [visibles]);
  const eliminar = useEliminarFactura(() => { setDetalle(null); cargar(); });
  const vencidas = visibles.filter((factura) => factura.estado_pago !== 'PAGADO' && Number(factura.dias_vencida) > 0).length;

  const columnas = [
    {
      clave: 'fecha_vencimiento',
      titulo: 'Vencimiento',
      tipo: 'fecha',
      valorOrden: (factura) => factura.fecha_vencimiento,
      render: (factura) => (
        <div>
          {factura.fecha_vencimiento || '—'}
          <p className="text-body-sm text-fg-muted">Emisión {factura.fecha_emision}</p>
        </div>
      ),
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      tipo: 'texto',
      valorOrden: (factura) => factura.proveedor,
      render: (factura) => (
        <div className="font-medium">
          {factura.proveedor}
          <p className="text-body-sm font-normal text-fg-muted">{factura.sucursal}</p>
        </div>
      ),
    },
    {
      clave: 'num_factura',
      titulo: 'Factura',
      tipo: 'texto',
      valorOrden: (factura) => factura.num_factura,
      render: (factura) => (
        <div>
          {factura.num_factura}
          <p className="text-body-sm text-fg-muted">
            {factura.tipo_costo === 'GASTO' ? 'Gasto' : 'Compra de insumos'}
            {factura.tipo_documento ? ` · ${factura.tipo_documento}` : ''}
          </p>
        </div>
      ),
    },
    {
      clave: 'total',
      titulo: 'Total',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (factura) => factura.total,
      render: (factura) => dinero(factura.total),
    },
    {
      clave: 'pagado',
      titulo: 'Pagado',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (factura) => factura.pagado,
      render: (factura) => dinero(factura.pagado),
    },
    {
      clave: 'saldo',
      titulo: 'Saldo',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (factura) => factura.saldo,
      render: (factura) => <span className="font-semibold">{dinero(factura.saldo)}</span>,
    },
    {
      clave: 'estado_pago',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (factura) =>
        factura.estado_pago === 'PAGADO'
          ? 'Pagada'
          : Number(factura.dias_vencida) > 0
          ? `Vencida ${factura.dias_vencida}`
          : factura.estado_pago === 'PARCIAL'
          ? 'Pago parcial'
          : 'Pendiente',
      render: (factura) => <EstadoPago factura={factura} />,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (factura) => (
        <div className="flex justify-end gap-2">
          <BotonIcono icono={ICONOS.ver} etiqueta={`Ver detalle de factura ${factura.num_factura}`} titulo="Ver detalle" onClick={() => setDetalle(factura.id_compra)} />
          {puedePagar && factura.estado_pago !== 'PAGADO' && (
            <BotonIcono icono={CreditCard} etiqueta={`Registrar abono a factura ${factura.num_factura}`} titulo="Registrar abono" onClick={() => setModal(factura)} />
          )}
          {puedeEliminar && (
            <BotonIcono icono={ICONOS.eliminar} tono="peligro" etiqueta={`Eliminar factura ${factura.num_factura}`} titulo="Eliminar" onClick={() => eliminar(factura)} />
          )}
        </div>
      ),
    },
  ];

  function pagoRegistrado() {
    setModal(null);
    setDetalle(null);
    setError(null);
    cargar();
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Gestión · Compras" titulo="Cuentas por pagar" descripcion="Consulta facturas y registra pagos a proveedores." />
      {error && <BannerError error={{ titulo: 'No se pudieron cargar las cuentas por pagar', mensaje: error, accion: '' }} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icono={FileText} cargando={cargando} valor={cargando ? null : visibles.length} etiqueta="Facturas mostradas" />
        <Metrica icono={AlertTriangle} tono={!cargando && vencidas > 0 ? 'peligro' : 'neutro'} cargando={cargando} valor={cargando ? null : vencidas} etiqueta="Facturas vencidas" />
        <Metrica icono={Building2} valor={usuario?.sucursales?.length ?? 0} etiqueta="Sucursales asignadas" />
      </div>
      <Card sinPadding className="overflow-hidden" icono={FileText} titulo="Facturas de proveedores" descripcion={cargando ? 'Filtra por estado, sucursal o escribe para buscar una factura.' : `${visibles.length} facturas`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input className="input pl-9" aria-label="Buscar factura" placeholder="Proveedor, sucursal o factura" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
          </div>
          <div className="w-full sm:w-44"><Select tamano="sm" aria-label="Estado de pago" value={estado} onChange={(evento) => setEstado(evento.target.value)} opciones={ESTADOS} /></div>
          <div className="w-full sm:w-56"><Select tamano="sm" aria-label="Sucursal" value={sucursal} onChange={(evento) => setSucursal(evento.target.value)} placeholder="Todas mis sucursales" opciones={(usuario?.sucursales ?? []).map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} /></div>
          {(busqueda || sucursal) && <Button variante="ghost" tamano="sm" onClick={() => { setBusqueda(''); setSucursal(''); }}>Limpiar filtros</Button>}
          <FiltroPeriodo idBase="cxp-periodo" periodo={periodo} onCambiar={setPeriodo} campoFecha={campoFecha} onCampoFecha={setCampoFecha} />
        </div>
        <ResumenPeriodo totales={totales} cantidad={visibles.length} periodo={periodo} cargando={cargando} />
        <Table
          cargando={cargando}
          filas={visibles}
          idFila="id_compra"
          vacio={<EstadoVacio icono={FileText} titulo={`No hay facturas ${estado === 'todas' ? '' : estado === 'pagadas' ? 'pagadas' : 'pendientes'} para estos filtros.`} />}
          columnas={columnas}
          idTabla="compras-cxp"
          ordenInicial={{ clave: 'fecha_vencimiento', direccion: 'asc' }}
        />
      </Card>
      {detalle && <DetalleFacturaDialogo idCompra={detalle} cerrar={() => setDetalle(null)} puedePagar={puedePagar} onAbonar={(factura) => setModal(factura)} />}
      {modal && <PagoDialogo factura={modal} cerrar={() => setModal(null)} onPagado={pagoRegistrado} />}
    </div>
  );
}
