import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, Plus, ReceiptText, Search, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import CampoError from '../../components/forms/CampoError.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { mascaraDecimal, mascaraEntero, mascaraIdentificador } from '../../utils/mascaras.js';
import { listarGastos, listarInsumosCompra, listarProveedores, registrarCompra } from './comprasApi.js';
import PagoDialogo from './PagoDialogo.jsx';
import DetalleFacturaDialogo, { useEliminarFactura } from './DetalleFacturaDialogo.jsx';
import FiltroPeriodo, { ResumenPeriodo } from './FiltroPeriodo.jsx';
import { mesActual, rangoDePeriodo, totalesPeriodo } from './periodo.js';
import { ICONOS } from '../../config/iconos.js';
import { TIPOS_DOCUMENTO, costoBorradorConIva, resumenCompra } from './ivaCompras.js';

const nuevaLinea = (gasto) => gasto ? { descripcion: '', cantidad: '', costoUnitario: '' } : { idInsumo: '', cantidad: '', costoUnitario: '' };
const hoy = () => {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const fecha = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${fecha.year}-${fecha.month}-${fecha.day}`;
};
const ERROR_FECHA_FUTURA = 'La fecha de emisión no puede ser futura. Registra la factura cuando llegue su fecha de emisión; si es a crédito, el vencimiento sí puede quedar en una fecha futura.';
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

function HistorialGastos({ sucursales, recargarClave, puedePagar, puedeEliminar }) {
  const [estado, setEstado] = useState('pagadas');
  const [sucursal, setSucursal] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalPago, setModalPago] = useState(null);
  const [detalle, setDetalle] = useState(null);
  // Gastos se filtran por fecha de emisión; por defecto, el mes en curso.
  const [periodo, setPeriodo] = useState(() => mesActual());
  const { desde, hasta } = rangoDePeriodo(periodo);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarGastos({ estado, campoFecha: 'emision', ...(sucursal ? { idSucursal: sucursal } : {}), ...(desde ? { desde, hasta } : {}) });
      setFilas(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado, sucursal, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar, recargarClave]);
  const eliminar = useEliminarFactura(() => { setDetalle(null); cargar(); });

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return filas.filter((fila) => [fila.proveedor, fila.num_factura, fila.sucursal]
      .some((dato) => String(dato ?? '').toLocaleLowerCase('es').includes(termino)));
  }, [filas, busqueda]);
  const pagadas = visibles.filter((fila) => fila.estado_pago === 'PAGADO');
  const totalPagado = visibles.reduce((total, fila) => total + aCentavos(fila.pagado), 0n);
  const totales = useMemo(() => totalesPeriodo(visibles), [visibles]);

  const columnas = [
    {
      clave: 'fecha_emision',
      titulo: 'Fecha',
      tipo: 'fecha',
      valorOrden: (fila) => fila.fecha_emision,
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      tipo: 'texto',
      valorOrden: (fila) => fila.proveedor,
      render: (fila) => (
        <div className="font-medium">
          {fila.proveedor}
          <p className="text-body-sm font-normal text-fg-muted">{fila.sucursal}</p>
        </div>
      ),
    },
    {
      clave: 'num_factura',
      titulo: 'N.º de factura',
      tipo: 'texto',
      valorOrden: (fila) => fila.num_factura,
      render: (fila) => (
        <div>
          {fila.num_factura}
          {fila.tipo_documento && <p className="text-body-sm text-fg-muted">{fila.tipo_documento}</p>}
        </div>
      ),
    },
    {
      clave: 'total',
      titulo: 'Total',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (fila) => fila.total,
      render: (fila) => dinero(fila.total),
    },
    {
      clave: 'pagado',
      titulo: 'Abonado',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (fila) => fila.pagado,
      render: (fila) => dinero(fila.pagado),
    },
    {
      clave: 'saldo',
      titulo: 'Saldo',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (fila) => fila.saldo,
      render: (fila) => <span className="font-semibold">{dinero(fila.saldo)}</span>,
    },
    {
      clave: 'estado_pago',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (fila) =>
        fila.estado_pago === 'PAGADO'
          ? 'Pagada'
          : Number(fila.dias_vencida) > 0
          ? `Vencida ${fila.dias_vencida}`
          : fila.estado_pago === 'PARCIAL'
          ? 'Pago parcial'
          : 'Pendiente',
      render: (fila) => <EstadoFactura factura={fila} />,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (fila) => (
        <div className="flex justify-end gap-2">
          <BotonIcono icono={ICONOS.ver} etiqueta={`Ver detalle de factura ${fila.num_factura}`} titulo="Ver detalle" onClick={() => setDetalle(fila.id_compra)} />
          {puedePagar && fila.estado_pago !== 'PAGADO' && (
            <BotonIcono icono={CreditCard} etiqueta={`Registrar abono a factura ${fila.num_factura}`} titulo="Registrar abono" onClick={() => setModalPago(fila)} />
          )}
          {puedeEliminar && (
            <BotonIcono icono={ICONOS.eliminar} tono="peligro" etiqueta={`Eliminar factura ${fila.num_factura}`} titulo="Eliminar" onClick={() => eliminar(fila)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <Card sinPadding className="overflow-hidden" icono={ReceiptText} titulo="Gastos registrados" descripcion="Consulta el importe, los abonos y el saldo de cada factura de gasto.">
      {error && <div className="px-5 pt-4"><BannerError error={{ titulo: 'No se pudieron cargar los gastos', mensaje: error, accion: '' }} /></div>}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <div className="relative w-full max-w-xs"><Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" /><input className="input pl-9" aria-label="Buscar gasto" placeholder="Proveedor o factura" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /></div>
        <div className="w-full sm:w-44"><Select tamano="sm" aria-label="Estado de pago" value={estado} onChange={(evento) => setEstado(evento.target.value)} opciones={ESTADOS} /></div>
        <div className="w-full sm:w-56"><Select tamano="sm" aria-label="Sucursal" value={sucursal} onChange={(evento) => setSucursal(evento.target.value)} placeholder="Todas mis sucursales" opciones={sucursales.map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} /></div>
        {(busqueda || sucursal) && <Button variante="ghost" tamano="sm" onClick={() => { setBusqueda(''); setSucursal(''); }}>Limpiar filtros</Button>}
        <FiltroPeriodo idBase="gastos-periodo" periodo={periodo} onCambiar={setPeriodo} />
      </div>
      <ResumenPeriodo totales={totales} cantidad={visibles.length} periodo={periodo} cargando={cargando} />
      <Table
        cargando={cargando}
        filas={visibles}
        idFila="id_compra"
        vacio={<EstadoVacio icono={ReceiptText} titulo={`No hay gastos ${estado === 'todas' ? '' : estado === 'pagadas' ? 'pagados' : 'pendientes'} para estos filtros.`} />}
        columnas={columnas}
        idTabla="compras-historial-gastos"
        ordenInicial={{ clave: 'fecha_emision', direccion: 'desc' }}
      />
      {!cargando && !error && <div className="flex flex-col gap-2 border-t border-line px-5 py-4 text-body sm:flex-row sm:items-center sm:justify-between">
        <p className="text-fg-muted">Facturas pagadas: <span className="font-semibold text-fg">{pagadas.length}</span></p>
        <p className="font-semibold">Total pagado en la lista: <span className="tabular-nums">{formatoCentavos(totalPagado)}</span></p>
      </div>}
      {!error && <p className="px-5 pb-4 text-body-sm text-fg-muted">{puedePagar ? 'Los gastos a crédito permanecen pendientes hasta registrar sus abonos.' : 'Consulta disponible en modo lectura; no tienes permiso para registrar abonos.'}</p>}
      {detalle && <DetalleFacturaDialogo idCompra={detalle} cerrar={() => setDetalle(null)} puedePagar={puedePagar} onAbonar={(factura) => setModalPago(factura)} />}
      {modalPago && <PagoDialogo factura={modalPago} cerrar={() => setModalPago(null)} onPagado={() => { setModalPago(null); setDetalle(null); cargar(); }} />}
    </Card>
  );
}

export default function CompraFacturaPage({ tipoCosto = 'COSTO' }) {
  const gasto = tipoCosto === 'GASTO';
  const titulo = gasto ? 'Gastos operativos' : 'Nueva factura de compra';
  const { usuario, tiene } = useAuth();
  const { notificar, notificarError } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [borradorAviso, setBorradorAviso] = useState(() => Boolean(location.state?.borrador?.items?.length));
  const sucursales = useMemo(() => usuario?.sucursales ?? [], [usuario?.sucursales]);
  const puedeVerCuentas = tiene('COM_VER_CXP');
  const puedePagar = tiene('COM_PAGAR_PROVEEDOR');
  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [form, setForm] = useState({ idProveedor: '', idSucursal: '', numeroFactura: '', fechaEmision: hoy(), condicionPago: 'CONTADO', tipoDocumento: 'CCF', items: [nuevaLinea(gasto)] });
  const [alertasMargen, setAlertasMargen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [recargarClave, setRecargarClave] = useState(0);
  const [errorFechaEmision, setErrorFechaEmision] = useState('');
  const borradorAplicado = useRef(false);

  useEffect(() => {
    let activo = true;
    async function cargarCatalogos() {
      setCargando(true);
      setErrorCarga(null);
      try {
        // Nueva factura solo lista proveedores de COMPRA; Gastos operativos solo de SERVICIO.
        const solicitudes = [listarProveedores(true, gasto ? 'SERVICIO' : 'COMPRA')];
        if (!gasto) solicitudes.push(listarInsumosCompra());
        const datos = await Promise.all(solicitudes);
        if (!activo) return;
        setProveedores(datos[0]);
        setInsumos(gasto ? [] : datos[1]);
        // Borrador sugerido desde las alertas de stock mínimo: prellena líneas y sucursal;
        // nada se envía al backend hasta que el usuario guarde la factura.
        const borrador = location.state?.borrador;
        if (!gasto && !borradorAplicado.current && borrador?.items?.length) {
          borradorAplicado.current = true;
          setForm((actual) => ({
            ...actual,
            idSucursal: String(borrador.idSucursal || actual.idSucursal || sucursales[0]?.id_sucursal || ''),
            items: borrador.items.map((linea) => ({
              idInsumo: String(linea.idInsumo),
              cantidad: linea.cantidad ?? '',
              // El borrador trae costo_promedio (NETO, sin IVA) pero el campo espera el precio
              // del documento con IVA incluido: se convierte (× 1.13 en CCF) para no registrar
              // un costo 11.5 % menor. Se guarda el neto para reconvertir si cambia el documento.
              costoUnitario: linea.costoUnitario != null && linea.costoUnitario !== '' ? costoBorradorConIva(linea.costoUnitario, actual.tipoDocumento) : '',
              costoNeto: linea.costoUnitario ?? '',
              origen: linea.origen,
              unidad: linea.unidad,
            })),
          }));
        }
        setForm((actual) => ({
          ...actual,
          idProveedor: actual.idProveedor || String(datos[0][0]?.id_proveedor ?? ''),
          idSucursal: actual.idSucursal || String(sucursales[0]?.id_sucursal ?? ''),
        }));
      } catch (err) {
        if (activo) setErrorCarga(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargarCatalogos();
    return () => { activo = false; };
  }, [gasto, sucursales, location.state?.borrador]);

  const lineasValidas = useMemo(() => form.items.every((linea) => (
    gasto
      ? linea.descripcion.trim() && linea.cantidad && linea.costoUnitario
      : linea.idInsumo && linea.cantidad && linea.costoUnitario
  )), [form.items, gasto]);

  const resumen = useMemo(() => resumenCompra(form.items, form.tipoDocumento), [form.items, form.tipoDocumento]);

  const editarCampo = (campo, valor) => {
    if (campo === 'tipoDocumento') {
      // Las líneas del borrador que el usuario no tocó se recalculan con el nuevo documento.
      setForm((actual) => ({
        ...actual,
        tipoDocumento: valor,
        items: actual.items.map((linea) => (linea.costoNeto && linea.costoUnitario === costoBorradorConIva(linea.costoNeto, actual.tipoDocumento)
          ? { ...linea, costoUnitario: costoBorradorConIva(linea.costoNeto, valor) }
          : linea)),
      }));
      return;
    }
    setForm((actual) => ({ ...actual, [campo]: valor }));
    if (campo === 'fechaEmision') setErrorFechaEmision(valor > hoy() ? ERROR_FECHA_FUTURA : '');
  };
  const editarLinea = (indice, campo, valor) => setForm((actual) => ({
    ...actual,
    items: actual.items.map((linea, posicion) => posicion === indice ? { ...linea, [campo]: valor } : linea),
  }));

  async function enviar(evento) {
    evento.preventDefault();
    if (form.fechaEmision > hoy()) {
      setErrorFechaEmision(ERROR_FECHA_FUTURA);
      notificar.advertencia('Fecha de emisión no válida', { mensaje: ERROR_FECHA_FUTURA });
      return;
    }
    if (!form.idProveedor || !form.idSucursal || !lineasValidas) {
      notificar.advertencia('Datos incompletos', {
        mensaje: 'Completa los datos de la factura y todos sus conceptos antes de continuar.',
      });
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
      tipoDocumento: form.tipoDocumento,
      items: form.items.map((linea) => (gasto
        ? { descripcion: linea.descripcion.trim(), cantidad: linea.cantidad, costoUnitario: linea.costoUnitario }
        : { idInsumo: Number(linea.idInsumo), cantidad: linea.cantidad, costoUnitario: linea.costoUnitario })),
    };
    try {
      const respuesta = await registrarCompra(datos);
      // El servidor avisa qué productos quedaron con margen bajo el mínimo tras el nuevo costo;
      // el precio de venta nunca cambia solo, por eso se pide a la persona revisarlo.
      const alertas = Array.isArray(respuesta?.alertasMargen) ? respuesta.alertasMargen : [];
      setAlertasMargen(alertas);
      if (alertas.length) {
        notificar.advertencia('Margen bajo el mínimo', {
          mensaje: `${alertas.length === 1 ? 'Un producto quedó' : `${alertas.length} productos quedaron`} con margen menor al mínimo. Revisa su precio de venta.`,
        });
      }
      notificar.exito(gasto ? 'Gasto registrado' : 'Factura registrada', {
        mensaje: gasto && form.condicionPago === 'CREDITO'
          ? 'Gasto registrado como pendiente. Si no aparece con el filtro Pagadas, selecciona Pendientes o Todas y confirma la sucursal.'
          : form.condicionPago === 'CREDITO' && puedeVerCuentas
          ? 'Factura registrada. Puedes consultar el saldo en Cuentas por pagar.'
          : (gasto ? 'Gasto registrado correctamente. Si no aparece, revisa los filtros de estado y sucursal.' : 'Factura registrada correctamente.'),
      });
      setBorradorAviso(false);
      setForm((actual) => ({ ...actual, numeroFactura: '', fechaEmision: hoy(), items: [nuevaLinea(gasto)] }));
      setErrorFechaEmision('');
      if (gasto && puedeVerCuentas) setRecargarClave((clave) => clave + 1);
    } catch (err) {
      const detalleFecha = err.detalles?.find((detalle) => String(detalle.campo).startsWith('fechaEmision'))?.mensaje;
      if (detalleFecha) {
        const mensajeFecha = /futura/i.test(detalleFecha) ? ERROR_FECHA_FUTURA : detalleFecha;
        setErrorFechaEmision(mensajeFecha);
        notificar.advertencia('Fecha de emisión no válida', { mensaje: mensajeFecha });
        return;
      }
      notificarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Gestión · Compras"
        titulo={titulo}
        descripcion={gasto
          ? 'Registra facturas de servicios y otros gastos de funcionamiento del negocio.'
          : 'Registra una factura de insumos para actualizar las existencias de la sucursal.'}
        acciones={<Button variante="ghost" icono={ArrowLeft} onClick={() => navigate(-1)}>Volver</Button>}
      />
      {borradorAviso && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-body text-warning-text">
          <p><strong>Borrador sugerido.</strong> Revisa los datos antes de guardar: las cantidades se calcularon con lo que falta para llegar al mínimo y el precio parte del costo promedio conocido (con IVA si el documento es CCF). Elige el proveedor y confirma con «Nueva factura»; si sales de esta pantalla el borrador se descarta.</p>
          <button type="button" className="btn-ghost min-h-8 shrink-0 !p-1.5" onClick={() => setBorradorAviso(false)} aria-label="Cerrar aviso de borrador"><X size={15} aria-hidden="true" /></button>
        </div>
      )}
      {alertasMargen.length > 0 && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-body text-warning-text">
          <div>
            <p><strong>Margen bajo el mínimo.</strong> Con el nuevo costo, estos productos ganan menos de lo esperado. Revisa su precio de venta en el catálogo.</p>
            <ul className="mt-2 space-y-1">
              {alertasMargen.map((alerta) => (
                <li key={alerta.idProducto ?? alerta.nombre} className="tabular-nums">{alerta.nombre}: margen {alerta.margenPct} % (mínimo {alerta.margenMinimoPct} %)</li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn-ghost min-h-8 shrink-0 !p-1.5" onClick={() => setAlertasMargen([])} aria-label="Cerrar aviso de margen bajo"><X size={15} aria-hidden="true" /></button>
        </div>
      )}
      {errorCarga && <BannerError error={{ titulo: gasto ? 'No se pudieron cargar los datos de compras' : 'No se pudieron cargar los insumos y proveedores', mensaje: errorCarga, accion: '' }} />}

      <form onSubmit={enviar} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="min-w-0 space-y-6">
        <Card titulo={gasto ? '1. Datos de la factura' : 'Datos de la factura'} descripcion={gasto ? 'Indica quién emitió el comprobante y a qué sucursal corresponde.' : 'Indica el proveedor, la sucursal y los datos del comprobante.'}>
          <div className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-2">
            <Select etiqueta="Proveedor" value={form.idProveedor} onChange={(evento) => editarCampo('idProveedor', evento.target.value)} placeholder={cargando ? 'Cargando proveedores…' : 'Selecciona proveedor'} opciones={proveedores.map((item) => ({ valor: String(item.id_proveedor), texto: item.razon_social }))} />
            <Select etiqueta="Sucursal" value={form.idSucursal} onChange={(evento) => editarCampo('idSucursal', evento.target.value)} placeholder="Selecciona sucursal" opciones={sucursales.map((item) => ({ valor: String(item.id_sucursal), texto: item.nombre }))} />
            <label className="flex h-full flex-col text-label">Número de factura<input className="input mt-1.5 h-10" value={form.numeroFactura} onChange={(evento) => editarCampo('numeroFactura', mascaraIdentificador(evento.target.value, 50))} maxLength={50} autoCapitalize="characters" spellCheck={false} required /></label>
            <label className="flex h-full flex-col text-label">Fecha de emisión<input id="fecha-emision" aria-invalid={Boolean(errorFechaEmision)} aria-describedby={errorFechaEmision ? 'fecha-emision-error' : undefined} className="input mt-1.5 h-10" type="date" max={hoy()} value={form.fechaEmision} onChange={(evento) => editarCampo('fechaEmision', evento.target.value)} required /><CampoError id="fecha-emision" mensaje={errorFechaEmision} /></label>
            <Select etiqueta="Condición de pago" value={form.condicionPago} onChange={(evento) => editarCampo('condicionPago', evento.target.value)} opciones={[{ valor: 'CONTADO', texto: 'Contado' }, { valor: 'CREDITO', texto: 'Crédito' }]} />
            <Select etiqueta="Tipo de documento" value={form.tipoDocumento} onChange={(evento) => editarCampo('tipoDocumento', evento.target.value)} opciones={TIPOS_DOCUMENTO} />
          </div>
          <p className="mt-3 text-body-sm text-fg-muted">{form.tipoDocumento === 'CCF'
            ? 'Con CCF se separa el 13 % de IVA como crédito fiscal; el costo queda sin IVA.'
            : 'Con CF o sujeto excluido el IVA no se recupera: queda como parte del costo.'}</p>
          {gasto && <p className="mt-4 rounded-lg bg-muted/60 p-3 text-body text-fg-muted">En contado el sistema registra el pago al guardar. En crédito queda pendiente; podrás registrar abonos desde esta lista. La fecha de vencimiento del crédito sí puede ser futura.</p>}
        </Card>

        <Card
          titulo={gasto ? '2. Conceptos del gasto' : 'Insumos recibidos'}
          descripcion={gasto ? 'Anota cada concepto que aparece en la factura. Los gastos no cambian las existencias.' : 'Indica los insumos, las cantidades y el precio unitario tal como aparece en la factura (IVA incluido).'}
          acciones={<Button icono={Plus} variante="secondary" onClick={() => setForm((actual) => ({ ...actual, items: [...actual.items, nuevaLinea(gasto)] }))}>{gasto ? 'Agregar concepto' : 'Agregar insumo'}</Button>}
        >
          <div className="space-y-3">
            {form.items.map((linea, indice) => (
              <div key={indice} className="grid min-w-0 gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0 md:grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(130px,1fr)_auto] md:items-start">
                {gasto
                  ? <label className="flex flex-col text-label">Concepto<input className="input mt-1.5 h-10" placeholder="Ej. servicio de internet" value={linea.descripcion} onChange={(evento) => editarLinea(indice, 'descripcion', evento.target.value)} maxLength={150} required /></label>
                  : <Select etiqueta="Insumo" value={linea.idInsumo} onChange={(evento) => editarLinea(indice, 'idInsumo', evento.target.value)} placeholder="Selecciona insumo" opciones={insumos.map((item) => ({ valor: String(item.id_insumo), texto: `${item.nombre} · ${item.unidad_codigo}` }))} />}
                <label className="flex flex-col text-label">Cantidad<input className="input mt-1.5 h-10 text-right tabular-nums" type="text" inputMode="numeric" placeholder="0" maxLength={8} value={linea.cantidad} onChange={(evento) => editarLinea(indice, 'cantidad', mascaraEntero(evento.target.value, 8))} required />{linea.origen === 'faltante' && <span className="mt-1 block text-body-sm font-normal text-fg-muted">Faltante para llegar al mínimo{linea.unidad ? ` (${linea.unidad})` : ''}</span>}</label>
                <label className="flex flex-col text-label">Costo por unidad<input className="input mt-1.5 h-10 text-right tabular-nums" type="text" inputMode="decimal" placeholder="0.00" value={linea.costoUnitario} onChange={(evento) => editarLinea(indice, 'costoUnitario', mascaraDecimal(evento.target.value, 6, 6))} required />{/* Desde la migración 017 la BD interpreta este valor CON IVA y lo divide entre 1.13 (en CCF).
                    Antes decía «sin IVA»: el usuario escribía el neto y el IVA se quitaba dos veces,
                    dejando el costo 11.5 % menor al real. */}<span className="mt-1 block text-body-sm font-normal text-fg-muted">USD, IVA incluido</span></label>
                {/* Separador invisible con la altura de la etiqueta: alinea el botón con los controles, no con el texto. */}
                <div className="flex flex-col"><span className="mb-1.5 hidden text-body md:block" aria-hidden="true">&nbsp;</span><Button className="h-10" variante="ghost" icono={Trash2} aria-label={`Quitar ${gasto ? 'concepto' : 'insumo'} ${indice + 1}`} disabled={form.items.length === 1} onClick={() => setForm((actual) => ({ ...actual, items: actual.items.filter((_, posicion) => posicion !== indice) }))} /></div>
              </div>
            ))}
          </div>
          {!gasto && <p className="mt-4 text-body text-fg-muted">Las existencias y el costo promedio se actualizarán al guardar la factura.</p>}
        </Card>
        </div>
        <aside aria-label="Totales de la factura" className="min-w-0 space-y-4 rounded-lg bg-muted p-4 xl:sticky xl:top-4">
          <p className="rotulo">Resumen</p>
          <dl className="space-y-2 text-body">
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Líneas</dt><dd className="tabular-nums">{form.items.length}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Condición</dt><dd>{form.condicionPago === 'CREDITO' ? 'Crédito' : 'Contado'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular-nums">{formatoCentavos(resumen.subtotal)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">IVA crédito fiscal</dt><dd className="tabular-nums">{formatoCentavos(resumen.iva)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatoCentavos(resumen.total)}</dd></div>
          </dl>
          <p className="text-body-sm text-fg-muted">Vista previa. El total definitivo lo calcula el sistema al guardar.</p>
          <div className="flex"><Button className="w-full" type="submit" cargando={guardando} disabled={cargando || !lineasValidas || !proveedores.length || !sucursales.length}>{gasto ? 'Guardar gasto' : 'Nueva factura'}</Button></div>
        </aside>
      </form>

      {gasto && (puedeVerCuentas
        ? <HistorialGastos sucursales={sucursales} recargarClave={recargarClave} puedePagar={puedePagar} puedeEliminar={tiene('COM_ELIMINAR_FACTURA')} />
        : <Card titulo="Consulta de gastos"><p className="text-body text-fg-muted">La consulta de facturas no está habilitada para tu usuario. Puedes guardar gastos y pedir acceso a Cuentas por pagar para revisar sus saldos.</p></Card>)}
    </div>
  );
}
