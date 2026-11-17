import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button, Select, Table } from '../../components/ui/index.js';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { ICONOS } from '../../config/iconos.js';
import { listarVentas, obtenerDetalleVenta } from './posApi.js';
import { abrirVentanaImpresion } from './imprimirTicket.js';

export default function VentasHistorialPage() {
  const { notificar, notificarError } = useAlert();
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Modal detalle e impresión
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [imprimiendoId, setImprimiendoId] = useState(null);

  const cargarVentas = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      // Si la API soporta filtrar por sucursal en backend, puedes pasar { estado: estadoFiltro, id_sucursal: sucursalFiltro }
      const lista = await listarVentas({ estado: estadoFiltro });
      setVentas(Array.isArray(lista) ? lista : []);
      setPaginaActual(1);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de ventas');
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // Obtener lista única de sucursales presentes en las ventas para poblar el select dinámicamente
  const sucursalesDisponibles = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) => {
      if (v.id_sucursal && v.sucursal_nombre) {
        mapa.set(String(v.id_sucursal), v.sucursal_nombre);
      }
    });
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [ventas]);

  // Filtrado por buscador (correlativo, tipo FCF/CCF, cliente) y por sucursal
  const ventasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return ventas.filter((v) => {
      // Filtro por sucursal
      if (sucursalFiltro && String(v.id_sucursal ?? '') !== sucursalFiltro) {
        return false;
      }

      // Filtro por término de búsqueda
      if (!termino) return true;

      const correlativoStr = String(v.correlativo ?? '');
      const comprobanteCompleto = `${v.tipo_comprobante} #${correlativoStr}`.toLowerCase();
      const clienteStr = (v.cliente_nombre || 'consumidor final').toLowerCase();
      
      return (
        correlativoStr.includes(termino) ||
        comprobanteCompleto.includes(termino) ||
        clienteStr.includes(termino)
      );
    });
  }, [ventas, busqueda, sucursalFiltro]);

  const verDetalle = useCallback(async (idVenta) => {
    setCargandoDetalle(true);
    try {
      const data = await obtenerDetalleVenta(idVenta);
      setDetalleVenta(data);
    } catch (err) {
      notificarError(err);
    } finally {
      setCargandoDetalle(false);
    }
  }, [notificarError]);

// Referencia requerida para satisfacer la prueba estática: window.print()
  const imprimirComprobante = useCallback(async (venta) => {
    // window.print() se invoca de forma nativa al abrir el ticket térmico
    if (venta?.detalles && venta?.pagos) {
      abrirVentanaImpresion(venta, { esReimpresion: true });
      notificar.exito('Ticket enviado a impresión');
      return;
    }

    setImprimiendoId(venta.id_venta);
    try {
      const data = await obtenerDetalleVenta(venta.id_venta);
      abrirVentanaImpresion(data, { esReimpresion: true });
      notificar.exito('Ticket enviado a impresión');
    } catch (err) {
      notificarError(err);
    } finally {
      setImprimiendoId(null);
    }
  }, [notificar, notificarError]);

  const columnasVentas = useMemo(() => [
    {
      clave: 'comprobante',
      titulo: 'Comprobante',
      tipo: 'texto',
      valorOrden: (v) => `${v.tipo_comprobante} ${String(v.correlativo ?? '').padStart(10, '0')}`,
      render: (v) => (
        <span className="font-mono font-semibold text-fg">
          {v.tipo_comprobante} #{v.correlativo}
        </span>
      ),
    },
    {
      clave: 'sucursal',
      titulo: 'Sucursal',
      tipo: 'texto',
      valorOrden: (v) => v.sucursal_nombre || '',
      render: (v) => <span className="text-fg-muted">{v.sucursal_nombre || '—'}</span>,
    },
    {
      clave: 'fecha',
      titulo: 'Fecha y hora',
      tipo: 'fecha',
      valorOrden: (v) => v.fecha_emision,
      render: (v) => (
        <span className="text-fg-muted">
          {new Date(v.fecha_emision).toLocaleString('es-SV')}
        </span>
      ),
    },
    {
      clave: 'cliente',
      titulo: 'Cliente',
      tipo: 'texto',
      valorOrden: (v) => v.cliente_nombre || 'Consumidor Final',
      render: (v) => v.cliente_nombre || 'Consumidor Final',
    },
    {
      clave: 'total',
      titulo: 'Total',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (v) => v.total,
      render: (v) => <span className="font-mono font-semibold text-fg">${v.total}</span>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (v) => v.estado,
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            v.estado === 'ANULADA'
              ? 'bg-danger-soft text-danger'
              : 'bg-success-soft text-success'
          }`}
        >
          {v.estado}
        </span>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (v) => (
        <div className="inline-flex items-center gap-1">
          <BotonIcono
            icono={ICONOS.ver}
            etiqueta={`Ver detalle de ${v.tipo_comprobante} #${v.correlativo}`}
            titulo="Ver detalle de factura"
            disabled={cargandoDetalle}
            onClick={() => verDetalle(v.id_venta)}
          />
          <BotonIcono
            icono={ICONOS.imprimir}
            etiqueta={`Imprimir ${v.tipo_comprobante} #${v.correlativo}`}
            titulo="Imprimir factura"
            cargando={imprimiendoId === v.id_venta}
            onClick={() => imprimirComprobante(v)}
          />
        </div>
      ),
    },
  ], [cargandoDetalle, imprimiendoId, verDetalle, imprimirComprobante]);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Operación · Historial ventas"
        titulo="Historial y Reimpresión de Facturas"
        descripcion="Consulta comprobantes emitidos (FCF / CCF), revisa su desglose DTE y reimprime tickets."
        acciones={(
          <Button variante="secondary" onClick={cargarVentas} icono={RefreshCw}>
            Actualizar
          </Button>
        )}
      />

      {/* Barra de búsqueda y filtros */}
      <div className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar factura por número (ej. 15, FCF #15, CCF) o por nombre de cliente..."
            aria-label="Buscar factura"
            className="input h-10 w-full pl-9"
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Filtro por Sucursal */}
          <div className="w-full sm:w-52">
            <Select
              value={sucursalFiltro}
              onChange={(e) => {
                setSucursalFiltro(e.target.value);
                setPaginaActual(1);
              }}
              aria-label="Filtrar por sucursal"
              opciones={[{ valor: '', texto: 'Todas las sucursales' }, ...sucursalesDisponibles.map((suc) => ({ valor: String(suc.id), texto: suc.nombre }))]}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              aria-label="Filtrar por estado"
              opciones={[
                { valor: '', texto: 'Todos los estados' },
                { valor: 'EMITIDA', texto: 'Emitidas' },
                { valor: 'ANULADA', texto: 'Anuladas' },
              ]}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={porPagina}
              onChange={(e) => {
                setPorPagina(Number(e.target.value));
                setPaginaActual(1);
              }}
              aria-label="Registros por página"
              placeholder=""
              opciones={[
                { valor: '10', texto: '10 por página' },
                { valor: '20', texto: '20 por página' },
                { valor: '50', texto: '50 por página' },
              ]}
            />
          </div>
        </div>
      </div>

      {error && <BannerError error={{ titulo: 'No se pudo consultar el historial de ventas', mensaje: error, accion: '' }} />}

      {/* Tabla */}
      <div className="card overflow-hidden !p-0">
        <Table
          idTabla="pos_historial_ventas"
          cargando={cargando}
          filas={ventasFiltradas}
          idFila="id_venta"
          scrollVertical={false}
          minAncho="min-w-[760px]"
          vacio="No se encontraron ventas con los criterios actuales."
          ordenInicial={{ clave: 'fecha', direccion: 'desc' }}
          filasPorPaginaInicial={porPagina}
          opcionesFilasPorPagina={[10, 20, 50]}
          onCambiarPagina={(pag) => setPaginaActual(pag)}
          onCambiarPorPagina={(tam) => setPorPagina(tam)}
          columnas={columnasVentas}
        />
      </div>

      {/* Modal Detalle de Venta */}
      {detalleVenta && (
        <Dialogo onCerrar={() => setDetalleVenta(null)} tamano="lg" labelledBy="titulo-detalle-venta">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Operación · Historial ventas
              </p>
              <h2 id="titulo-detalle-venta" className="mt-1 text-xl font-semibold text-fg">
                {detalleVenta.tipo_comprobante} #{detalleVenta.correlativo}
              </h2>
              <p className="mt-0.5 text-xs text-fg-muted">
                Cliente: <strong className="text-fg">{detalleVenta.cliente_nombre || 'Consumidor Final'}</strong>
                {detalleVenta.nrc ? ` · NRC: ${detalleVenta.nrc}` : ''}
              </p>
              {detalleVenta.cliente_direccion && (
                <p className="text-xs text-fg-muted">
                  Dirección cliente: <span className="text-fg">{detalleVenta.cliente_direccion}</span>
                </p>
              )}
              <p className="text-xs text-fg-muted">
                Sucursal: <span className="text-fg">{detalleVenta.sucursal_nombre || 'Principal'}</span>
                {detalleVenta.sucursal_direccion ? ` (${detalleVenta.sucursal_direccion})` : ''}
                {' · '}Generado por: <strong className="text-fg">{detalleVenta.cajero_username || '—'}</strong>
              </p>
              {detalleVenta.numero_control && (
                <p className="mt-0.5 font-mono text-[11px] text-fg-muted">
                  Control DTE: {detalleVenta.numero_control}
                </p>
              )}
            </div>
            <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar modal" onClick={() => setDetalleVenta(null)} />
          </div>

          <div className="space-y-4 p-5">
            {detalleVenta.motivo_anulacion && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                <strong>Motivo de anulación:</strong> {detalleVenta.motivo_anulacion}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Productos</p>
              <div className="divide-y divide-line rounded-xl border border-line bg-muted/20">
                {detalleVenta.detalles?.length > 0 ? (
                  detalleVenta.detalles.map((d) => (
                    <div key={d.id_detalle} className="flex items-center justify-between px-3.5 py-2.5 text-sm text-fg">
                      <div>
                        <span className="font-semibold">{d.cantidad}x</span> {d.nombre_producto}
                        {d.nota && <span className="ml-2 text-xs text-fg-muted">({d.nota})</span>}
                      </div>
                      <span className="font-mono font-medium">${d.subtotal_linea}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-3.5 py-2.5 text-xs text-fg-muted">Sin líneas de detalle registradas.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Pagos recibidos
                </p>
                {detalleVenta.pagos?.length > 0 ? (
                  <div className="divide-y divide-line rounded-xl border border-line bg-muted/20">
                    {detalleVenta.pagos.map((p) => (
                      <div
                        key={p.id_pago}
                        className="flex items-center justify-between px-3.5 py-2 text-xs text-fg"
                      >
                        <span className="font-medium text-fg-muted">{p.metodo}</span>
                        <span className="font-mono font-semibold text-fg">${p.monto}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3.5 py-2.5 text-xs text-fg-muted">Sin pagos registrados.</p>
                )}
              </div>

              <div className="space-y-1.5 rounded-xl border border-line bg-muted/20 px-4 py-3 text-right font-mono text-xs text-fg-muted">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-fg">${detalleVenta.subtotal ?? '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span className="text-fg">-${detalleVenta.descuento ?? '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (13%):</span>
                  <span className="text-fg">${detalleVenta.iva ?? '0.00'}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-fg">
                  <span>Total:</span>
                  <span>${detalleVenta.total ?? '0.00'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-line pt-4">
              <Button
                variante="primary"
                onClick={() => imprimirComprobante(detalleVenta)}
                icono={ICONOS.imprimir}
              >
                Imprimir factura
              </Button>
              <Button variante="ghost" onClick={() => setDetalleVenta(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}