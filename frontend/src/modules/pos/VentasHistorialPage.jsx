import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Printer, RefreshCw, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import { listarVentas, obtenerDetalleVenta } from './posApi.js';
import { abrirVentanaImpresion } from './imprimirTicket.js';

export default function VentasHistorialPage() {
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

  // Cálculo de páginas sobre el resultado filtrado
  const totalPaginas = Math.max(1, Math.ceil(ventasFiltradas.length / porPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const ventasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * porPagina;
    return ventasFiltradas.slice(inicio, inicio + porPagina);
  }, [ventasFiltradas, paginaSegura, porPagina]);

  const numerosPagina = useMemo(() => {
    const maxBotones = 5;
    let inicio = Math.max(1, paginaSegura - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginas, inicio + maxBotones - 1);
    if (fin - inicio + 1 < maxBotones) {
      inicio = Math.max(1, fin - maxBotones + 1);
    }
    const paginas = [];
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }, [paginaSegura, totalPaginas]);

  const verDetalle = async (idVenta) => {
    setCargandoDetalle(true);
    setError('');
    try {
      const data = await obtenerDetalleVenta(idVenta);
      setDetalleVenta(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener el detalle de la venta');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const imprimirComprobante = async (venta) => {
    if (venta?.detalles && venta?.pagos) {
      abrirVentanaImpresion(venta, { esReimpresion: true });
      return;
    }

    setImprimiendoId(venta.id_venta);
    setError('');
    try {
      const data = await obtenerDetalleVenta(venta.id_venta);
      abrirVentanaImpresion(data, { esReimpresion: true });
    } catch (err) {
      setError(err.message || 'No se pudo preparar la impresión de la factura');
    } finally {
      setImprimiendoId(null);
    }
  };

  const indiceInicio = ventasFiltradas.length === 0 ? 0 : (paginaSegura - 1) * porPagina + 1;
  const indiceFin = Math.min(paginaSegura * porPagina, ventasFiltradas.length);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
            Operación · POS
          </p>
          <h1 className="mt-1 text-2xl font-bold text-fg">Historial y Reimpresión de Facturas</h1>
          <p className="text-sm text-fg-muted">
            Consulta comprobantes emitidos (FCF / CCF), revisa su desglose DTE y reimprime tickets.
          </p>
        </div>

        <Button
          variante="secondary"
          onClick={cargarVentas}
          icono={RefreshCw}
          className="self-start sm:self-auto"
        >
          Actualizar
        </Button>
      </div>

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
            className="input w-full pl-9"
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Filtro por Sucursal */}
          <select
            value={sucursalFiltro}
            onChange={(e) => {
              setSucursalFiltro(e.target.value);
              setPaginaActual(1);
            }}
            aria-label="Filtrar por sucursal"
            className="input w-auto text-sm"
          >
            <option value="">Todas las sucursales</option>
            {sucursalesDisponibles.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {suc.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="EMITIDA">Emitidas</option>
            <option value="ANULADA">Anuladas</option>
          </select>

          <select
            value={porPagina}
            onChange={(e) => {
              setPorPagina(Number(e.target.value));
              setPaginaActual(1);
            }}
            aria-label="Registros por página"
            className="input w-auto text-sm"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    Cargando ventas...
                  </td>
                </tr>
              ) : ventasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    No se encontraron ventas con los criterios actuales.
                  </td>
                </tr>
              ) : (
                ventasPaginadas.map((v) => {
                  const anulada = v.estado === 'ANULADA';
                  return (
                    <tr key={v.id_venta} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono font-semibold text-fg">
                        {v.tipo_comprobante} #{v.correlativo}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {v.sucursal_nombre || '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {new Date(v.fecha_emision).toLocaleString('es-SV')}
                      </td>
                      <td className="px-4 py-3 text-fg">
                        {v.cliente_nombre || 'Consumidor Final'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
                        ${v.total}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${anulada
                            ? 'bg-danger-soft text-danger'
                            : 'bg-success-soft text-success'
                            }`}
                        >
                          {v.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={cargandoDetalle}
                            onClick={() => verDetalle(v.id_venta)}
                            title="Ver detalle de factura"
                            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-primary-text"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={imprimiendoId === v.id_venta}
                            onClick={() => imprimirComprobante(v)}
                            title="Imprimir factura"
                            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary-text disabled:opacity-40"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        {!cargando && ventasFiltradas.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-muted/40 px-4 py-3 text-xs text-fg-muted sm:flex-row">
            <span>
              Mostrando <strong className="text-fg">{indiceInicio}</strong>–<strong className="text-fg">{indiceFin}</strong> de <strong className="text-fg">{ventasFiltradas.length}</strong> ventas
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={paginaSegura <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-medium text-fg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>

              {numerosPagina.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPaginaActual(num)}
                  className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${num === paginaSegura
                    ? 'bg-primary text-primary-fg shadow-xs'
                    : 'border border-line bg-surface text-fg hover:bg-muted'
                    }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-medium text-fg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle de Venta */}
      {detalleVenta && (
        <Dialogo onCerrar={() => setDetalleVenta(null)} tamano="lg" labelledBy="titulo-detalle-venta">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Comprobante · Detalle
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
            <button
              type="button"
              onClick={() => setDetalleVenta(null)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
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
                icono={Printer}
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