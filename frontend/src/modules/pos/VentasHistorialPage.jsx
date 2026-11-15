import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Printer, RefreshCw, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import { listarVentas, obtenerDetalleVenta } from './posApi.js';

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function abrirVentanaImpresion(venta) {
  const ventana = window.open('', '_blank', 'width=420,height=720');
  if (!ventana) return;

  const fecha = venta.fecha_emision
    ? new Date(venta.fecha_emision).toLocaleString('es-SV')
    : new Date().toLocaleString('es-SV');

  const filasItems = (venta.detalles ?? [])
    .map(
      (d) => `
        <tr>
          <td style="padding:3px 0; vertical-align:top;">
            ${escaparHtml(d.cantidad)}x ${escaparHtml(d.nombre_producto)}
            ${d.nota ? `<div style="font-size:10px;color:#555;">(${escaparHtml(d.nota)})</div>` : ''}
          </td>
          <td style="padding:3px 0; text-align:right; vertical-align:top; white-space:nowrap;">
            $${escaparHtml(d.subtotal_linea)}
          </td>
        </tr>`,
    )
    .join('');

  const filasPagos = (venta.pagos ?? [])
    .map(
      (p) => `
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span>${escaparHtml(p.metodo)}</span>
          <span>$${escaparHtml(p.monto)}</span>
        </div>`,
    )
    .join('');

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            color: #111;
            font-size: 12px;
            line-height: 1.35;
          }
          .centro { text-align: center; }
          .linea { border-top: 1px dashed #333; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .totales div { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
          .total-final { font-size: 14px !important; font-weight: bold; margin-top: 4px !important; }
        </style>
      </head>
      <body>
        <div class="centro">
          <div style="font-weight:bold;font-size:15px;">ARTESA</div>
          <div style="font-size:11px;">Cafetería &amp; Panadería Artesanal</div>
          ${venta.sucursal_nombre ? `<div style="font-size:11px;font-weight:bold;">Sucursal: ${escaparHtml(venta.sucursal_nombre)}</div>` : ''}
          ${venta.sucursal_direccion ? `<div style="font-size:10px;">${escaparHtml(venta.sucursal_direccion)}${venta.sucursal_departamento ? `, ${escaparHtml(venta.sucursal_departamento)}` : ''}</div>` : ''}
          ${venta.sucursal_telefono ? `<div style="font-size:10px;">Tel: ${escaparHtml(venta.sucursal_telefono)}</div>` : ''}
          <div style="font-size:11px;margin-top:4px;font-weight:bold;">
            ${venta.tipo_comprobante === 'CCF' ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA CONSUMIDOR FINAL'}
          </div>
          <div style="font-size:12px;font-weight:bold;">
            ${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}
          </div>
        </div>

        <div class="linea"></div>

        <div style="font-size:11px;">
          <div><strong>Fecha:</strong> ${escaparHtml(fecha)}</div>
          <div><strong>Generado por:</strong> ${escaparHtml(venta.cajero_username || 'Cajero POS')}</div>
          <div><strong>Cliente:</strong> ${escaparHtml(venta.cliente_nombre || 'Consumidor Final')}</div>
          ${venta.cliente_num_documento ? `<div><strong>${escaparHtml(venta.cliente_tipo_documento || 'Doc')}:</strong> ${escaparHtml(venta.cliente_num_documento)}</div>` : ''}
          ${venta.nrc ? `<div><strong>NRC:</strong> ${escaparHtml(venta.nrc)}</div>` : ''}
          ${venta.giro_economico ? `<div><strong>Giro:</strong> ${escaparHtml(venta.giro_economico)}</div>` : ''}
          ${venta.cliente_direccion ? `<div><strong>Dirección cliente:</strong> ${escaparHtml(venta.cliente_direccion)}</div>` : ''}
          ${venta.numero_control ? `<div style="word-break:break-all;"><strong>No. Control DTE:</strong> ${escaparHtml(venta.numero_control)}</div>` : ''}
          ${venta.codigo_generacion ? `<div style="word-break:break-all;"><strong>Cód. Generación:</strong> ${escaparHtml(venta.codigo_generacion)}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr style="border-bottom:1px solid #333;">
              <th style="text-align:left;padding-bottom:3px;">Descripción</th>
              <th style="text-align:right;padding-bottom:3px;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${filasItems || '<tr><td colspan="2">Sin detalle</td></tr>'}
          </tbody>
        </table>

        <div class="linea"></div>

        <div class="totales">
          <div><span>Subtotal:</span><span>$${escaparHtml(venta.subtotal ?? '0.00')}</span></div>
          <div><span>Descuento:</span><span>-$${escaparHtml(venta.descuento ?? '0.00')}</span></div>
          <div><span>IVA (13%):</span><span>$${escaparHtml(venta.iva ?? '0.00')}</span></div>
          <div class="total-final"><span>TOTAL:</span><span>$${escaparHtml(venta.total ?? '0.00')}</span></div>
        </div>

        ${filasPagos
      ? `<div class="linea"></div>
               <div style="font-size:11px;font-weight:bold;margin-bottom:2px;">Formas de pago</div>
               ${filasPagos}`
      : ''
    }

        <div class="linea"></div>
        <div class="centro" style="font-size:10px;">
          <div>Reimpresión de comprobante</div>
          <div>¡Gracias por su preferencia!</div>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  ventana.document.close();
}

export default function VentasHistorialPage() {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
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

  // Filtrado por buscador (correlativo, tipo FCF/CCF o cliente)
  const ventasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ventas;

    return ventas.filter((v) => {
      const correlativoStr = String(v.correlativo ?? '');
      const comprobanteCompleto = `${v.tipo_comprobante} #${correlativoStr}`.toLowerCase();
      const clienteStr = (v.cliente_nombre || 'consumidor final').toLowerCase();
      return (
        correlativoStr.includes(termino) ||
        comprobanteCompleto.includes(termino) ||
        clienteStr.includes(termino)
      );
    });
  }, [ventas, busqueda]);

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
      abrirVentanaImpresion(venta);
      return;
    }

    setImprimiendoId(venta.id_venta);
    setError('');
    try {
      const data = await obtenerDetalleVenta(venta.id_venta);
      abrirVentanaImpresion(data);
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

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="input w-auto"
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
            className="input w-auto"
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
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                    Cargando ventas...
                  </td>
                </tr>
              ) : ventasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
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

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Pagos recibidos</p>
                {detalleVenta.pagos?.length > 0 ? (
                  detalleVenta.pagos.map((p) => (
                    <div key={p.id_pago} className="flex justify-between text-xs text-fg">
                      <span className="text-fg-muted">{p.metodo}</span>
                      <span className="font-mono font-medium">${p.monto}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-fg-muted">Sin pagos registrados.</p>
                )}
              </div>
              <div className="space-y-1 text-right font-mono text-xs text-fg-muted">
                <div>Subtotal: <span className="text-fg">${detalleVenta.subtotal ?? '0.00'}</span></div>
                <div>Descuento: <span className="text-fg">-${detalleVenta.descuento ?? '0.00'}</span></div>
                <div>IVA (13%): <span className="text-fg">${detalleVenta.iva ?? '0.00'}</span></div>
                <div className="pt-1 text-base font-bold text-fg">
                  Total: ${detalleVenta.total ?? '0.00'}
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