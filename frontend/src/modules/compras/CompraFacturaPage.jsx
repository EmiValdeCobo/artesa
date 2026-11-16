import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import { listarCuentasPorPagar, listarInsumosCompra, listarProveedores, registrarCompra } from './comprasApi.js';

const nuevaLinea = (gasto) => gasto ? { descripcion: '', cantidad: '', costoUnitario: '' } : { idInsumo: '', cantidad: '', costoUnitario: '' };
const hoy = () => new Date().toLocaleDateString('sv-SE');
const dinero = (valor) => `$${String(valor ?? '0.00')}`;
function aCentavos(valor) {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(valor ?? '0').trim());
  if (!partes) return 0n;
  const centavos = BigInt(partes[2]) * 100n + BigInt((partes[3] ?? '').padEnd(2, '0').slice(0, 2) || '0');
  return partes[1] ? -centavos : centavos;
}
function formatoCentavos(centavos) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = absoluto / 100n;
  const fraccion = String(absoluto % 100n).padStart(2, '0');
  return `${negativo ? '-$' : '$'}${new Intl.NumberFormat('en-US').format(entero)}.${fraccion}`;
}
const ESTADOS = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'pagadas', texto: 'Pagadas' },
  { valor: 'todas', texto: 'Todas' },
];

function EstadoFactura({ factura }) {
  if (factura.estado_pago === 'PAGADO') return <EstadoBadge tipo="exito">Pagada</EstadoBadge>;
  if (Number(factura.dias_vencida) > 0) return <EstadoBadge tipo="error">Vencida · {factura.dias_vencida} d</EstadoBadge>;
  if (factura.estado_pago === 'PARCIAL') return <EstadoBadge tipo="info">Pago parcial</EstadoBadge>;
  return <EstadoBadge tipo="alerta">Pendiente</EstadoBadge>;
}

function HistorialGastos({ sucursales, recargarClave }) {
  const [estado, setEstado] = useState('pagadas');
  const [sucursal, setSucursal] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarCuentasPorPagar({ estado, ...(sucursal ? { idSucursal: sucursal } : {}) });
      setFilas(datos.filter((fila) => fila.tipo_costo === 'GASTO'));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado, sucursal, recargarClave]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return filas.filter((fila) => [fila.proveedor, fila.num_factura, fila.sucursal]
      .some((dato) => String(dato ?? '').toLocaleLowerCase('es').includes(termino)));
  }, [filas, busqueda]);
  const pagadas = visibles.filter((fila) => fila.estado_pago === 'PAGADO');
  const totalPagado = visibles.reduce((total, fila) => total + aCentavos(fila.pagado), 0n);

  const columnas = [
    { clave: 'fecha_emision', titulo: 'Fecha' },
    { clave: 'proveedor', titulo: 'Proveedor', render: (fila) => <div className="font-medium">{fila.proveedor}<p className="text-xs font-normal text-fg-muted">{fila.sucursal}</p></div> },
    { clave: 'num_factura', titulo: 'N.º de factura' },
    { clave: 'total', titulo: 'Total', alinear: 'right', render: (fila) => dinero(fila.total) },
    { clave: 'pagado', titulo: 'Abonado', alinear: 'right', render: (fila) => dinero(fila.pagado) },
    { clave: 'saldo', titulo: 'Saldo', alinear: 'right', render: (fila) => <span className="font-semibold">{dinero(fila.saldo)}</span> },
    { clave: 'estado_pago', titulo: 'Estado', render: (fila) => <EstadoFactura factura={fila} /> },
  ];

  return (
    <Card titulo="Gastos registrados" descripcion="Consulta el importe, los abonos y el saldo de cada factura de gasto." acciones={<Link to="/compras/cuentas-por-pagar" className="text-sm font-medium text-primary-text hover:underline">Abrir cuentas por pagar</Link>}>
      {error && <div className="mb-4"><BannerError error={{ titulo: 'No se pudieron cargar los gastos', mensaje: error, accion: '' }} /></div>}
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_240px]">
        <label className="flex flex-col text-sm font-medium">Buscar gasto<input className="input mt-1.5 h-10" placeholder="Proveedor o factura" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /></label>
        <Select etiqueta="Estado de pago" value={estado} onChange={(evento) => setEstado(evento.target.value)} opciones={ESTADOS} />
        <Select etiqueta="Sucursal" value={sucursal} onChange={(evento) => setSucursal(evento.target.value)} placeholder="Todas mis sucursales" opciones={sucursales.map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} />
      </div>
      <Table cargando={cargando} filas={visibles} idFila="id_compra" vacio={`No hay gastos ${estado === 'todas' ? '' : estado === 'pagadas' ? 'pagados' : 'pendientes'} para estos filtros.`} columnas={columnas} />
      {!cargando && !error && <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-fg-muted">Facturas pagadas: <span className="font-semibold text-fg">{pagadas.length}</span></p>
        <p className="text-base font-semibold">Total pagado en la lista: <span className="text-primary-text">{formatoCentavos(totalPagado)}</span></p>
      </div>}
      {!error && <p className="mt-2 text-xs text-fg-muted">Para revisar el saldo o registrar un abono, abre Cuentas por pagar.</p>}
    </Card>
  );
}

export default function CompraFacturaPage({ tipoCosto = 'COSTO' }) {
  const gasto = tipoCosto === 'GASTO';
  const titulo = gasto ? 'Gastos operativos' : 'Registrar factura de compra';
  const { usuario, tiene } = useAuth();
  const navigate = useNavigate();
  const sucursales = useMemo(() => usuario?.sucursales ?? [], [usuario?.sucursales]);
  const puedeVerCuentas = tiene('COM_VER_CXP');
  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [form, setForm] = useState({ idProveedor: '', idSucursal: '', numeroFactura: '', fechaEmision: hoy(), condicionPago: 'CONTADO', items: [nuevaLinea(gasto)] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(false);
  const [recargarClave, setRecargarClave] = useState(0);

  useEffect(() => {
    let activo = true;
    async function cargarCatalogos() {
      setCargando(true);
      setError(null);
      try {
        const solicitudes = [listarProveedores(true)];
        if (!gasto) solicitudes.push(listarInsumosCompra());
        const datos = await Promise.all(solicitudes);
        if (!activo) return;
        setProveedores(datos[0]);
        setInsumos(gasto ? [] : datos[1]);
        setForm((actual) => ({
          ...actual,
          idProveedor: actual.idProveedor || String(datos[0][0]?.id_proveedor ?? ''),
          idSucursal: actual.idSucursal || String(sucursales[0]?.id_sucursal ?? ''),
        }));
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargarCatalogos();
    return () => { activo = false; };
  }, [gasto, sucursales]);

  const lineasValidas = useMemo(() => form.items.every((linea) => (
    gasto
      ? linea.descripcion.trim() && linea.cantidad && linea.costoUnitario
      : linea.idInsumo && linea.cantidad && linea.costoUnitario
  )), [form.items, gasto]);

  const editarCampo = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));
  const editarLinea = (indice, campo, valor) => setForm((actual) => ({
    ...actual,
    items: actual.items.map((linea, posicion) => posicion === indice ? { ...linea, [campo]: valor } : linea),
  }));

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setResultado(false);
    if (!form.idProveedor || !form.idSucursal || !lineasValidas) {
      setError('Completa los datos de la factura y todos sus conceptos.');
      return;
    }

    setGuardando(true);
    const datos = {
      idProveedor: Number(form.idProveedor),
      idSucursal: Number(form.idSucursal),
      numeroFactura: form.numeroFactura.trim(),
      fechaEmision: form.fechaEmision,
      condicionPago: form.condicionPago,
      tipoCosto,
      items: form.items.map((linea) => (gasto
        ? { descripcion: linea.descripcion.trim(), cantidad: linea.cantidad, costoUnitario: linea.costoUnitario }
        : { idInsumo: Number(linea.idInsumo), cantidad: linea.cantidad, costoUnitario: linea.costoUnitario })),
    };
    try {
      await registrarCompra(datos);
      setResultado(true);
      setForm((actual) => ({ ...actual, numeroFactura: '', fechaEmision: hoy(), items: [nuevaLinea(gasto)] }));
      if (gasto && puedeVerCuentas) setRecargarClave((clave) => clave + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Compras · Almacén"
        titulo={titulo}
        descripcion={gasto
          ? 'Registra facturas de servicios y otros gastos de funcionamiento del negocio.'
          : 'Registra una factura de insumos para actualizar las existencias de la sucursal.'}
        acciones={<Button variante="ghost" icono={ArrowLeft} onClick={() => navigate(-1)}>Volver</Button>}
      />
      {error && <BannerError error={{ titulo: 'No se pudo guardar la factura', mensaje: error, accion: '' }} />}
      {resultado && (
        <div role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success">
          {gasto ? 'Gasto registrado correctamente.' : 'Factura registrada correctamente.'}
          {form.condicionPago === 'CREDITO' && puedeVerCuentas && <Link className="ml-1 underline" to="/compras/cuentas-por-pagar">Consultar cuenta pendiente</Link>}
        </div>
      )}

      <form onSubmit={enviar} className="space-y-5">
        <Card titulo={gasto ? '1. Datos de la factura' : 'Datos de la factura'} descripcion={gasto ? 'Indica quién emitió el comprobante y a qué sucursal corresponde.' : 'Indica el proveedor, la sucursal y los datos del comprobante.'}>
          <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Select etiqueta="Proveedor" value={form.idProveedor} onChange={(evento) => editarCampo('idProveedor', evento.target.value)} placeholder={cargando ? 'Cargando proveedores…' : 'Selecciona proveedor'} opciones={proveedores.map((item) => ({ valor: String(item.id_proveedor), texto: item.razon_social }))} />
            <Select etiqueta="Sucursal" value={form.idSucursal} onChange={(evento) => editarCampo('idSucursal', evento.target.value)} placeholder="Selecciona sucursal" opciones={sucursales.map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} />
            <label className="flex h-full flex-col text-sm font-medium">Número de factura<input className="input mt-1.5 h-10" value={form.numeroFactura} onChange={(evento) => editarCampo('numeroFactura', evento.target.value)} maxLength={50} required /></label>
            <label className="flex h-full flex-col text-sm font-medium">Fecha de emisión<input className="input mt-1.5 h-10" type="date" value={form.fechaEmision} onChange={(evento) => editarCampo('fechaEmision', evento.target.value)} required /></label>
            <Select etiqueta="Condición de pago" value={form.condicionPago} onChange={(evento) => editarCampo('condicionPago', evento.target.value)} opciones={[{ valor: 'CONTADO', texto: 'Contado' }, { valor: 'CREDITO', texto: 'Crédito' }]} />
          </div>
          {gasto && <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-fg-muted">Si eliges crédito, la factura aparecerá en Cuentas por pagar para registrar abonos.</p>}
        </Card>

        <Card
          titulo={gasto ? '2. Conceptos del gasto' : 'Insumos recibidos'}
          descripcion={gasto ? 'Anota cada concepto que aparece en la factura. Los gastos no cambian las existencias.' : 'Indica los insumos, las cantidades y el costo unitario que aparecen en la factura.'}
          acciones={<Button icono={Plus} variante="secondary" onClick={() => setForm((actual) => ({ ...actual, items: [...actual.items, nuevaLinea(gasto)] }))}>{gasto ? 'Agregar concepto' : 'Agregar insumo'}</Button>}
        >
          <div className="space-y-3">
            {form.items.map((linea, indice) => (
              <div key={indice} className="grid gap-3 rounded-xl border border-line bg-muted/30 p-4 md:grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(130px,1fr)_auto] md:items-end">
                {gasto
                  ? <label className="flex h-full flex-col text-sm font-medium">Concepto<input className="input mt-1.5 h-10" placeholder="Ej. servicio de internet" value={linea.descripcion} onChange={(evento) => editarLinea(indice, 'descripcion', evento.target.value)} maxLength={150} required /></label>
                  : <Select etiqueta="Insumo" value={linea.idInsumo} onChange={(evento) => editarLinea(indice, 'idInsumo', evento.target.value)} placeholder="Selecciona insumo" opciones={insumos.map((item) => ({ valor: String(item.id_insumo), texto: `${item.nombre} · ${item.unidad_codigo}` }))} />}
                <label className="flex h-full flex-col text-sm font-medium">Cantidad<input className="input mt-1.5 h-10" type="number" min="0.0001" step="0.0001" value={linea.cantidad} onChange={(evento) => editarLinea(indice, 'cantidad', evento.target.value)} required /></label>
                <label className="flex h-full flex-col text-sm font-medium">Costo por unidad<input className="input mt-1.5 h-10" type="number" min="0" step="0.000001" value={linea.costoUnitario} onChange={(evento) => editarLinea(indice, 'costoUnitario', evento.target.value)} required /><span className="mt-1 block text-xs font-normal text-fg-muted">USD, sin IVA</span></label>
                <Button variante="ghost" icono={Trash2} aria-label={`Quitar ${gasto ? 'concepto' : 'insumo'} ${indice + 1}`} disabled={form.items.length === 1} onClick={() => setForm((actual) => ({ ...actual, items: actual.items.filter((_, posicion) => posicion !== indice) }))} />
              </div>
            ))}
          </div>
          {!gasto && <p className="mt-4 text-sm text-fg-muted">Las existencias y el costo promedio se actualizarán al guardar la factura.</p>}
        </Card>
        <div className="flex justify-end"><Button type="submit" cargando={guardando} disabled={cargando || !lineasValidas || !proveedores.length || !sucursales.length}>{gasto ? 'Guardar gasto' : 'Registrar factura'}</Button></div>
      </form>

      {gasto && (puedeVerCuentas
        ? <HistorialGastos sucursales={sucursales} recargarClave={recargarClave} />
        : <Card titulo="Consulta de gastos"><p className="text-sm text-fg-muted">La consulta de facturas no está habilitada para tu usuario. Puedes guardar gastos y pedir acceso a Cuentas por pagar para revisar sus saldos.</p></Card>)}
    </div>
  );
}
