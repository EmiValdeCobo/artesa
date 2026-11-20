import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Tag } from 'lucide-react';
import { useTrampaFoco } from '../../hooks/useTrampaFoco.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import Skeleton from '../../components/feedback/Skeleton.jsx';
import Insignia from '../../components/branding/Insignia.jsx';
import AccionConTooltip from '../../components/display/AccionConTooltip.jsx';
import { BotonIcono, Button } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { formatoDinero, formatoDineroPreciso, formatearUnidades } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import { calcularMargen, calcularCostoReceta, calcularSubtotalLinea } from './costeo.js';
import { getReceta } from './inventarioApi.js';

// Modal de solo lectura con la receta. Lo usan el Catálogo y la cola de Preparación (barista):
// sin INV_VER_COSTOS oculta costos/margen y sin INV_GESTIONAR_RECETAS no ofrece editar.
export default function ModalPrevisualizacionReceta({ producto, categoriaNombre, onCerrar, onEditarReceta, tienePermisoRecetas, tienePermisoCostos, soloPreparacion = false }) {
  const [componentes, setComponentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  useTrampaFoco(modalRef);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await getReceta(producto.id_producto);
        const lista = Array.isArray(res)
          ? res
          : Array.isArray(res?.componentes)
          ? res.componentes
          : (res?.data?.componentes ?? (Array.isArray(res?.data) ? res.data : []));
        if (!cancelado) {
          setComponentes(lista);
        }
      } catch (err) {
        if (!cancelado) setError(traducirError(err));
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [producto.id_producto]);

  // Bloquear scroll del body y gestionar Escape para accesibilidad
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCerrar]);

  const costoTotal = useMemo(() => calcularCostoReceta(componentes), [componentes]);
  const margen = useMemo(() => calcularMargen(producto.precio_venta, costoTotal), [producto.precio_venta, costoTotal]);

  const badgeMargenClass = (pct) => {
    if (pct == null) return 'bg-muted text-fg-muted';
    if (pct >= 40) return 'bg-success-soft text-success-text';
    if (pct >= 20) return 'bg-warning-soft text-warning-text';
    return 'bg-danger-soft text-danger-text';
  };

  return createPortal(
    <div
      className="anim-scrim fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-overlay sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-receta-titulo"
        className="relative my-auto w-full overflow-hidden rounded-t-xl border border-line bg-surface text-fg shadow-lg sm:max-w-3xl sm:rounded-xl"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <Insignia variante="primario" icono={ChefHat} className="mb-2">Receta de producto elaborado</Insignia>
            <h2 id="modal-receta-titulo" className="text-h3 text-fg">
              {producto.nombre}
            </h2>
            {!soloPreparacion && <p className="mt-1 flex items-center gap-1.5 text-body text-fg-muted">
              <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
              Categoría: <span className="font-medium text-fg">{categoriaNombre || 'Sin categoría'}</span>
            </p>}
          </div>
          <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar modal" onClick={onCerrar} />
        </div>

        {/* Tarjetas de Métricas Financieras (KPI Strip) */}
        <div className="px-6 py-5">
        {/* soloPreparacion (cola del barista): sin precio, costo ni margen, solo ingredientes y cantidades */}
        <div className={`mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 ${soloPreparacion ? 'hidden' : ''}`}>
          {/* 1. Precio Venta (con IVA) */}
          <div className="flex flex-col justify-between rounded-md bg-muted p-4">
            <span className="mb-1 block text-label-sm text-fg-muted">
              Precio Venta (con IVA)
            </span>
            <span className="text-h3 tabular-nums text-fg">
              {formatoDinero(producto.precio_venta)}
            </span>
          </div>

          {/* 2. Costo Teórico Total */}
          <div className="flex flex-col justify-between rounded-md bg-muted p-4">
            <span className="mb-1 block text-label-sm text-fg-muted">
              Costo Teórico Total
            </span>
            <span className="text-h3 tabular-nums text-fg">
              {tienePermisoCostos
                ? (cargando ? <Skeleton className="mt-1 h-5 w-20" /> : formatoDineroPreciso(costoTotal))
                : '—'}
            </span>
          </div>

          {/* 3. Margen s/Neto */}
          <div className="flex flex-col justify-between rounded-md bg-muted p-4">
            <span className="mb-1 block text-label-sm text-fg-muted">
              Margen s/Neto
            </span>
            <div className="flex items-center">
              {tienePermisoCostos ? (
                cargando ? (
                  <Skeleton className="h-6 w-16" />
                ) : margen != null ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label tabular-nums ${badgeMargenClass(
                      margen,
                    )}`}
                  >
                    {margen.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-body text-fg-muted">—</span>
                )
              ) : (
                <span className="text-label-sm text-fg-muted">Protegido</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Ingredientes Estilizada y Fácil de Leer */}
        {error ? (
          <div className="my-2">
            <BannerError error={error} />
          </div>
        ) : cargando ? (
          <div className="space-y-3 py-4" aria-busy="true">
            <Skeleton className="h-4 w-44 rounded" />
            <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between p-3.5">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : componentes.length === 0 ? (
          <div className="rounded-md border border-line px-4 py-8 text-center text-body text-fg-muted">
            Este producto aún no tiene ingredientes registrados en su receta.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="max-h-72 overflow-y-auto scroll-fino">
              <table className="w-full border-collapse text-left text-body">
                <thead className="sticky top-0 z-10 border-b border-line bg-surface text-label-sm text-fg-muted">
                  <tr>
                    <th className="py-3 px-4">Ingrediente</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Costo Unit.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-fg">
                  {componentes.map((c) => {
                    const subtotal = calcularSubtotalLinea(c.cantidad_requerida, c.costo_promedio);
                    const costoUnitarioCero = !c.costo_promedio || Number(c.costo_promedio) === 0;
                    const subtotalCero = !subtotal || Number(subtotal) === 0;

                    return (
                      <tr key={c.id_insumo} className="transition-colors hover:bg-muted">
                        <td className="py-3 px-4 font-medium text-fg">
                          {c.nombre_insumo || c.insumo}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 tabular-nums text-fg">
                            <span>{formatearUnidades(c.cantidad_requerida)}</span>
                            <span className="text-label-sm uppercase text-fg-muted">
                              {c.codigo_unidad || c.unidad || 'UND'}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {tienePermisoCostos ? (
                            <span className={costoUnitarioCero ? 'text-fg-muted' : 'text-fg'}>
                              {formatoDineroPreciso(c.costo_promedio)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                          {tienePermisoCostos ? (
                            <span className={subtotalCero ? 'text-fg-muted' : 'text-fg'}>
                              {formatoDineroPreciso(subtotal)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-strong bg-surface">
                    <td colSpan={3} className="px-4 py-3 text-right text-label text-fg-muted">
                      COSTO TEÓRICO TOTAL:
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-fg">
                      {tienePermisoCostos ? formatoDineroPreciso(costoTotal) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        </div>
        {/* Pie de acciones */}
        <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <Button variante="ghost" onClick={onCerrar}>
            Cerrar
          </Button>
          {tienePermisoRecetas && (
            <AccionConTooltip texto="Editar receta completa">
              <BotonIcono icono={ChefHat} className="!size-10" etiqueta={`Editar receta de ${producto.nombre}`} onClick={() => onEditarReceta(producto.id_producto)} />
            </AccionConTooltip>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
