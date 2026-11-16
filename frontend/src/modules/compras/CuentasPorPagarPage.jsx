import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import { listarCuentasPorPagar, registrarPago } from './comprasApi.js';

const dinero = (valor) => `$${String(valor ?? '0.00')}`;
const ESTADOS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'pagadas', texto: 'Pagadas' },
  { valor: 'todas', texto: 'Todas' },
];

function EstadoPago({ factura }) {
  if (factura.estado_pago === 'PAGADO') return <EstadoBadge tipo="exito">Pagada</EstadoBadge>;
  if (Number(factura.dias_vencida) > 0) return <EstadoBadge tipo="error">Vencida · {factura.dias_vencida} d</EstadoBadge>;
  if (factura.estado_pago === 'PARCIAL') return <EstadoBadge tipo="info">Pago parcial</EstadoBadge>;
  return <EstadoBadge tipo="alerta">Pendiente</EstadoBadge>;
}

function PagoDialogo({ factura, cerrar, onPagado }) {
  const [monto, setMonto] = useState(factura?.saldo ?? '');
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const pago = await registrarPago(factura.id_compra, { monto, metodo, referencia: referencia.trim() || null });
      onPagado(pago);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo onCerrar={() => !guardando && cerrar()} tamano="sm" labelledBy="pago-titulo">
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">Compras · Cuentas por pagar</p>
        <h2 id="pago-titulo" className="mt-1 text-xl font-semibold">Registrar pago</h2>
        <p className="mt-1 text-sm text-fg-muted">{factura.proveedor} · Factura {factura.num_factura}</p>
      </div>
      {error && <div className="px-5 pt-4"><BannerError error={{ titulo: 'No se pudo registrar el pago', mensaje: error, accion: '' }} /></div>}
      <form onSubmit={enviar} className="space-y-4 p-5">
        <div className="rounded-lg bg-muted p-3 text-sm"><div className="flex justify-between"><span>Saldo pendiente</span><strong>{dinero(factura.saldo)}</strong></div></div>
        <label className="flex flex-col text-sm font-medium">Monto del pago
          <input className="input mt-1.5 h-10" type="number" min="0.01" step="0.01" max={factura.saldo} value={monto} onChange={(evento) => setMonto(evento.target.value)} required />
          <span className="mt-1 block text-xs font-normal text-fg-muted">No puede superar el saldo pendiente.</span>
        </label>
        <Select etiqueta="Método" value={metodo} onChange={(evento) => setMetodo(evento.target.value)} opciones={[
          { valor: 'EFECTIVO', texto: 'Efectivo' }, { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
          { valor: 'CHEQUE', texto: 'Cheque' }, { valor: 'TARJETA', texto: 'Tarjeta' },
        ]} />
        <label className="flex flex-col text-sm font-medium">Referencia <span className="font-normal text-fg-muted">(opcional)</span>
          <input className="input mt-1.5 h-10" maxLength={100} value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />
        </label>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variante="ghost" onClick={cerrar}>Cancelar</Button>
          <Button type="submit" icono={CreditCard} cargando={guardando}>Registrar pago</Button>
        </div>
      </form>
    </Dialogo>
  );
}

export default function CuentasPorPagarPage() {
  const { tiene, usuario } = useAuth();
  const puedePagar = tiene('COM_PAGAR_PROVEEDOR');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [estado, setEstado] = useState('pendientes');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setFilas(await listarCuentasPorPagar({ ...(sucursal ? { idSucursal: sucursal } : {}), estado }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado, sucursal]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return filas.filter((factura) => [factura.proveedor, factura.num_factura, factura.sucursal]
      .some((valor) => String(valor ?? '').toLocaleLowerCase('es').includes(termino)));
  }, [filas, busqueda]);
  const vencidas = visibles.filter((factura) => factura.estado_pago !== 'PAGADO' && Number(factura.dias_vencida) > 0).length;

  const columnas = [
    { clave: 'fecha_vencimiento', titulo: 'Vencimiento', render: (factura) => <div>{factura.fecha_vencimiento || '—'}<p className="text-xs text-fg-muted">Emisión {factura.fecha_emision}</p></div> },
    { clave: 'proveedor', titulo: 'Proveedor', render: (factura) => <div className="font-medium">{factura.proveedor}<p className="text-xs font-normal text-fg-muted">{factura.sucursal}</p></div> },
    { clave: 'num_factura', titulo: 'Factura', render: (factura) => <div>{factura.num_factura}<p className="text-xs text-fg-muted">{factura.tipo_costo === 'GASTO' ? 'Gasto' : 'Compra de insumos'}</p></div> },
    { clave: 'total', titulo: 'Total', alinear: 'right', render: (factura) => dinero(factura.total) },
    { clave: 'pagado', titulo: 'Pagado', alinear: 'right', render: (factura) => dinero(factura.pagado) },
    { clave: 'saldo', titulo: 'Saldo', alinear: 'right', render: (factura) => <span className="font-semibold">{dinero(factura.saldo)}</span> },
    { clave: 'estado_pago', titulo: 'Estado', render: (factura) => <EstadoPago factura={factura} /> },
    ...(puedePagar ? [{ clave: 'acciones', titulo: 'Acciones', alinear: 'right', render: (factura) => factura.estado_pago === 'PAGADO' ? '—' : <Button icono={CreditCard} variante="secondary" onClick={() => setModal(factura)}>Pagar</Button> }] : []),
  ];

  function pagoRegistrado() {
    setModal(null);
    setError(null);
    cargar();
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Compras · Almacén" titulo="Cuentas por pagar" descripcion="Consulta facturas y registra pagos a proveedores." />
      {error && <BannerError error={{ titulo: 'No se pudieron cargar las cuentas por pagar', mensaje: error, accion: '' }} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-fg-muted">Facturas mostradas</p><p className="mt-1 text-2xl font-semibold">{cargando ? '—' : visibles.length}</p></Card>
        <Card><p className="text-sm text-fg-muted">Facturas vencidas</p><p className="mt-1 text-2xl font-semibold">{cargando ? '—' : vencidas}</p></Card>
        <Card><p className="text-sm text-fg-muted">Sucursales asignadas</p><p className="mt-1 text-sm font-medium">{usuario?.sucursales?.length ?? 0}</p></Card>
      </div>
      <Card titulo="Facturas de proveedores" descripcion="Filtra por estado, sucursal o escribe para buscar una factura.">
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_240px]">
          <label className="flex flex-col text-sm font-medium">Buscar factura<div className="relative mt-1.5"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" /><input className="input h-10 pl-10" placeholder="Proveedor, sucursal o factura" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /></div></label>
          <Select etiqueta="Estado de pago" value={estado} onChange={(evento) => setEstado(evento.target.value)} opciones={ESTADOS} />
          <Select etiqueta="Sucursal" value={sucursal} onChange={(evento) => setSucursal(evento.target.value)} placeholder="Todas mis sucursales" opciones={(usuario?.sucursales ?? []).map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} />
        </div>
        <Table cargando={cargando} filas={visibles} idFila="id_compra" vacio={`No hay facturas ${estado === 'todas' ? '' : estado === 'pagadas' ? 'pagadas' : 'pendientes'} para estos filtros.`} columnas={columnas} />
      </Card>
      {modal && <PagoDialogo factura={modal} cerrar={() => setModal(null)} onPagado={pagoRegistrado} />}
    </div>
  );
}
