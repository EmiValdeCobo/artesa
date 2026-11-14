import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, ChefHat, ShoppingBag, Pencil, Layers, Power, PowerOff, Tag, Plus, Search, X, Trash2, AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import CampoError from '../../components/forms/CampoError.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import { formatoDinero, formatearUnidades } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import { calcularMargen, calcularCostoReceta, calcularSubtotalLinea } from './costeo.js';
import InsumoDrawer from './InsumoDrawer.jsx';
import {
  getProductos, createProducto, updateProducto, deleteProducto, cambiarEstadoProducto,
  getCategorias, getInsumos, getUnidades, getReceta,
} from './inventarioApi.js';

// ─── Modal Previsualización de Receta ─────────────────────────────────────────
function ModalPrevisualizacionReceta({ producto, categoriaNombre, onCerrar, onEditarReceta, tienePermisoRecetas, tienePermisoCostos }) {
  const [componentes, setComponentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

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
    if (pct == null) return 'bg-[#F3EFE8] text-[#8C7A72] border border-[#E6DFD5]';
    if (pct >= 40) return 'bg-[#EAF5ED] text-[#2D6A4F] border border-[#B7E4C7]';
    if (pct >= 20) return 'bg-[#FDF6E9] text-[#B57614] border border-[#F7DCB4]';
    return 'bg-[#FDF0ED] text-[#BA3C2A] border border-[#F5C2B8]';
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-[#1C110D]/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-receta-titulo"
        className="relative w-full max-w-2xl bg-[#FAF8F5] border border-[#E6DFD5] rounded-2xl shadow-2xl p-6 sm:p-7 text-[#321F19] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Cabecera Limpia y Botón de Cierre Alineado */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EAE3D9]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-[#B15C3D]/10 text-[#B15C3D] mb-2">
              <ChefHat size={14} aria-hidden="true" />
              Receta de producto elaborado
            </span>
            <h2 id="modal-receta-titulo" className="text-2xl font-bold text-[#321F19] leading-tight">
              {producto.nombre}
            </h2>
            <p className="text-sm text-[#6E5A52] mt-1 flex items-center gap-1.5">
              <Tag size={14} aria-hidden="true" />
              Categoría: <span className="font-medium text-[#321F19]">{categoriaNombre || 'Sin categoría'}</span>
            </p>
          </div>
          <button
            type="button"
            className="text-[#6E5A52] hover:bg-[#EFEAE2] hover:text-[#321F19] rounded-lg p-2 transition-colors cursor-pointer"
            onClick={onCerrar}
            title="Cerrar previsualización"
            aria-label="Cerrar modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Tarjetas de Métricas Financieras (KPI Strip) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          {/* 1. Precio Venta (con IVA) */}
          <div className="bg-white border border-[#EAE3D9] rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5A52] block mb-1">
              Precio Venta (con IVA)
            </span>
            <span className="text-xl font-bold font-mono text-[#B15C3D] tabular-nums">
              {formatoDinero(producto.precio_venta)}
            </span>
          </div>

          {/* 2. Costo Teórico Total */}
          <div className="bg-white border border-[#EAE3D9] rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5A52] block mb-1">
              Costo Teórico Total
            </span>
            <span className="text-xl font-bold font-mono text-[#321F19] tabular-nums">
              {tienePermisoCostos ? (cargando ? '…' : formatoDinero(costoTotal)) : '—'}
            </span>
          </div>

          {/* 3. Margen s/Neto */}
          <div className="bg-white border border-[#EAE3D9] rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5A52] block mb-1">
              Margen s/Neto
            </span>
            <div className="flex items-center">
              {tienePermisoCostos ? (
                cargando ? (
                  <span className="text-sm text-[#8C7A72]">…</span>
                ) : margen != null ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${badgeMargenClass(
                      margen,
                    )}`}
                  >
                    {margen.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-sm font-mono text-[#8C7A72]">—</span>
                )
              ) : (
                <span className="text-xs font-medium text-[#8C7A72]">Protegido</span>
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
          <div className="space-y-3 py-4 animate-pulse" aria-busy="true">
            <div className="h-4 w-44 rounded bg-espresso-200/50" />
            <div className="divide-y divide-[#EAE3D9] rounded-xl border border-[#EAE3D9] bg-white overflow-hidden">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between p-3.5">
                  <div className="h-4 w-36 rounded bg-espresso-200/40" />
                  <div className="h-4 w-16 rounded bg-espresso-100/60" />
                  <div className="h-4 w-14 rounded bg-espresso-100/60" />
                  <div className="h-4 w-16 rounded bg-espresso-200/40" />
                </div>
              ))}
            </div>
          </div>
        ) : componentes.length === 0 ? (
          <div className="py-8 px-4 text-center text-sm text-[#6E5A52] bg-white rounded-xl border border-[#EAE3D9]">
            Este producto aún no tiene ingredientes registrados en su receta.
          </div>
        ) : (
          <div className="bg-white border border-[#EAE3D9] rounded-xl overflow-hidden shadow-xs">
            <div className="max-h-72 overflow-y-auto scroll-fino">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F3EFE8] text-[11px] font-semibold uppercase tracking-wider text-[#6E5A52] sticky top-0 z-10 border-b border-[#EAE3D9]">
                  <tr>
                    <th className="py-3 px-4">Ingrediente</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Costo Unit.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE3D9] text-[#321F19]">
                  {componentes.map((c) => {
                    const subtotal = calcularSubtotalLinea(c.cantidad_requerida, c.costo_promedio);
                    const costoUnitarioCero = !c.costo_promedio || Number(c.costo_promedio) === 0;
                    const subtotalCero = !subtotal || Number(subtotal) === 0;

                    return (
                      <tr key={c.id_insumo} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-[#321F19]">
                          {c.nombre_insumo || c.insumo}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-[#F3EFE8] text-[#5C4942] px-2 py-0.5 rounded text-xs font-medium font-mono">
                            <span>{formatearUnidades(c.cantidad_requerida)}</span>
                            <span className="uppercase text-[11px] text-[#8C7A72]">
                              {c.codigo_unidad || c.unidad || 'UND'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                          {tienePermisoCostos ? (
                            <span className={costoUnitarioCero ? 'text-[#8C7A72]' : 'text-[#321F19]'}>
                              {formatoDinero(c.costo_promedio)}
                            </span>
                          ) : (
                            <span className="text-[#8C7A72]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-xs whitespace-nowrap tabular-nums">
                          {tienePermisoCostos ? (
                            <span className={subtotalCero ? 'text-[#8C7A72]' : 'text-[#321F19]'}>
                              {formatoDinero(subtotal)}
                            </span>
                          ) : (
                            <span className="text-[#8C7A72]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F7F5F0] border-t border-[#E6DFD5]">
                    <td colSpan={3} className="py-3 px-4 text-right text-xs font-bold uppercase text-[#6E5A52]">
                      COSTO TEÓRICO TOTAL:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base font-bold text-[#B15C3D] whitespace-nowrap tabular-nums">
                      {tienePermisoCostos ? formatoDinero(costoTotal) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pie de Acciones Equilibrado */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-[#EAE3D9]">
          <button
            type="button"
            onClick={onCerrar}
            className="border border-[#D8CFC4] bg-white text-[#321F19] hover:bg-[#F3EFE8] px-4 py-2.5 rounded-xl font-medium transition-colors cursor-pointer text-sm"
          >
            Cerrar
          </button>
          {tienePermisoRecetas && (
            <button
              type="button"
              onClick={() => onEditarReceta(producto.id_producto)}
              className="bg-[#B15C3D] hover:bg-[#9A4E32] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors cursor-pointer text-sm"
            >
              <Layers size={16} aria-hidden="true" />
              Editar receta completa
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Skeleton Loader Cálido de Catálogo ──────────────────────────────────────
function CatalogoSkeleton() {
  return (
    <div className="card space-y-4 p-5 animate-pulse" aria-busy="true" aria-label="Cargando productos">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="h-5 w-44 rounded-md bg-espresso-200/50 dark:bg-espresso-800/40" />
        <div className="h-4 w-28 rounded-md bg-espresso-100/50 dark:bg-espresso-900/40" />
      </div>
      <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-44 rounded bg-espresso-200/60 dark:bg-espresso-800/50" />
              <div className="h-3 w-28 rounded-full bg-espresso-100/60 dark:bg-espresso-900/40" />
            </div>
            <div className="h-4 w-24 rounded bg-espresso-100/50 dark:bg-espresso-900/40 hidden sm:block" />
            <div className="h-6 w-24 rounded-full bg-espresso-100/60 dark:bg-espresso-900/40" />
            <div className="h-5 w-20 rounded bg-espresso-200/50 dark:bg-espresso-800/40 text-right" />
            <div className="h-4 w-16 rounded bg-espresso-100/50 dark:bg-espresso-900/40 text-right hidden md:block" />
            <div className="h-4 w-14 rounded bg-espresso-100/50 dark:bg-espresso-900/40 text-right hidden md:block" />
            <div className="h-6 w-16 rounded-full bg-espresso-100/60 dark:bg-espresso-900/40" />
            <div className="flex gap-1.5 justify-end">
              <div className="h-9 w-24 rounded-md bg-espresso-200/50 dark:bg-espresso-800/40" />
              <div className="h-9 w-9 rounded-md bg-espresso-100/50 dark:bg-espresso-900/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const BadgeTipo = ({ esElaborado }) =>
  esElaborado ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary-soft text-primary-text">
      <ChefHat size={12} aria-hidden="true" />
      Elaborado (Receta)
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary-soft text-secondary-text">
      <ShoppingBag size={12} aria-hidden="true" />
      Reventa
    </span>
  );

// Mensaje local (validación de formulario o de conexión) con la misma forma que
// espera BannerError, para no mezclar errores de servidor con texto plano.
const avisoLocal = (mensaje, titulo = 'Revisa la información') => ({
  titulo,
  mensaje,
  accion: '',
  categoria: 'usuario',
});

const FORM_VACIO = {
  nombre: '',
  id_categoria: '',
  codigo_barra: '',
  precio_venta: '',
  es_elaborado: true,
  id_insumo_reventa: '',
  activo: true,
};

function SelectorTipoProducto({ form, setForm }) {
  return <fieldset className="rounded-xl border border-line bg-surface p-4 space-y-3">
    <legend className="px-1 text-sm font-semibold text-fg">Tipo de producto</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${form.es_elaborado ? 'border-primary bg-primary-soft text-primary-text font-semibold' : 'border-line bg-surface text-fg'}`}>
        <input type="radio" name="tipo_producto" className="accent-primary mt-1" checked={form.es_elaborado} onChange={() => setForm((f) => ({ ...f, es_elaborado: true, id_insumo_reventa: '' }))} />
        <span className="text-xs sm:text-sm">Elaborado<small className="block font-normal text-fg-muted">Tras guardar podrás definir su receta; sin receta no se puede vender</small></span>
      </label>
      <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${!form.es_elaborado ? 'border-secondary bg-secondary-soft text-secondary-text font-semibold' : 'border-line bg-surface text-fg'}`}>
        <input type="radio" name="tipo_producto" className="accent-secondary mt-1" checked={!form.es_elaborado} onChange={() => setForm((f) => ({ ...f, es_elaborado: false }))} />
        <span className="text-xs sm:text-sm">Reventa<small className="block font-normal text-fg-muted">Se descuenta 1 unidad del insumo por cada venta</small></span>
      </label>
    </div>
  </fieldset>;
}

export default function CatalogoProductosPage() {
  const navigate = useNavigate();
  const { tiene } = useAuth();
  const { confirm, notificar } = useAlert();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorCategorias, setErrorCategorias] = useState(null);
  const [errorInsumos, setErrorInsumos] = useState(null);
  const [vista, setVista] = useState('tabla'); // 'tabla' | 'cuadricula'

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroReceta, setFiltroReceta] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [productoPrevisualizar, setProductoPrevisualizar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [formError, setFormError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [drawerInsumoAbierto, setDrawerInsumoAbierto] = useState(false);
  const [valoresInsumo, setValoresInsumo] = useState({});

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resProductos, resCategorias, resInsumos, resUnidades] = await Promise.allSettled([
        getProductos(),
        getCategorias(),
        getInsumos(),
        getUnidades(),
      ]);

      const lista = (resultado) => resultado.status === 'fulfilled'
        ? (Array.isArray(resultado.value) ? resultado.value : resultado.value?.data ?? [])
        : [];
      const listaProd = lista(resProductos);
      setProductos(listaProd);
      setCategorias(lista(resCategorias));
      setInsumos(lista(resInsumos));
      setUnidades(lista(resUnidades));
      setError(resProductos.status === 'rejected' ? traducirError(resProductos.reason) : null);
      setErrorCategorias(resCategorias.status === 'rejected' ? traducirError(resCategorias.reason) : null);
      setErrorInsumos(resInsumos.status === 'rejected' ? traducirError(resInsumos.reason) : null);
    } catch (err) {
      setProductos([]);
      setCategorias([]);
      setInsumos([]);
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    return productos.filter((p) => {
      const coincideBusqueda =
        !texto ||
        p.nombre?.toLowerCase().includes(texto) ||
        p.codigo_barra?.toLowerCase().includes(texto);

      const coincideTipo =
        filtroTipo === 'TODOS' ||
        (filtroTipo === 'ELABORADO' && p.es_elaborado) ||
        (filtroTipo === 'REVENTA' && !p.es_elaborado);

      const coincideCategoria =
        filtroCategoria === 'TODOS' ||
        String(p.id_categoria) === String(filtroCategoria);

      const coincideReceta = filtroReceta === 'TODOS' || (filtroReceta === 'SIN_RECETA' ? p.es_elaborado && Number(p.n_ingredientes) === 0 : p.es_elaborado && Number(p.n_ingredientes) > 0);

      const coincideEstado =
        filtroEstado === 'TODOS'
          ? (mostrarInactivos || true)
          : filtroEstado === 'ACTIVOS'
            ? p.activo !== false
            : p.activo === false;

      return coincideBusqueda && coincideTipo && coincideCategoria && coincideReceta && coincideEstado;
    });
  }, [productos, busqueda, filtroTipo, filtroCategoria, filtroReceta, filtroEstado, mostrarInactivos]);
  const pendientesReceta = productos.filter((p) => p.es_elaborado && Number(p.n_ingredientes) === 0);

  // ── Drawer Crear / Editar ───────────────────────────────────────────────────
  const abrirCrear = () => {
    setProductoEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setDrawerAbierto(true);
  };

  const abrirEditar = (p) => {
    setProductoEditando(p);
    setForm({
      nombre: p.nombre ?? '',
      id_categoria: p.id_categoria != null ? String(p.id_categoria) : '',
      codigo_barra: p.codigo_barra ?? '',
      precio_venta: p.precio_venta != null ? (typeof p.precio_venta === 'number' ? p.precio_venta.toFixed(2) : String(p.precio_venta).includes('.') ? Number(p.precio_venta).toFixed(2) : String(p.precio_venta)) : '',
      es_elaborado: p.es_elaborado ?? true,
      id_insumo_reventa: p.id_insumo_reventa != null ? String(p.id_insumo_reventa) : '',
      activo: p.activo ?? true,
    });
    setFormError(null);
    setDrawerAbierto(true);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setProductoEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
  };

  useEffect(() => {
    if (!drawerAbierto) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cerrarDrawer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerAbierto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.nombre.trim()) return setFormError(avisoLocal('El nombre del producto es obligatorio.'));
    if (!form.precio_venta || Number(form.precio_venta) <= 0) {
      return setFormError(avisoLocal('El precio de venta debe ser un número positivo.'));
    }
    if (!form.es_elaborado && !form.id_insumo_reventa) {
      return setFormError(avisoLocal('Para productos de reventa, debes asociar un insumo correspondiente.'));
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        codigo_barra: form.codigo_barra?.trim() || null,
        precio_venta: String(form.precio_venta).trim(),
        es_elaborado: form.es_elaborado,
        id_insumo_reventa: !form.es_elaborado && form.id_insumo_reventa ? Number(form.id_insumo_reventa) : null,
        activo: form.activo,
      };

      if (productoEditando) {
        await updateProducto(productoEditando.id_producto, payload);
        notificar.exito('Producto actualizado correctamente.');
      } else {
        const creado = await createProducto(payload);
        const idCreado = creado?.id_producto ?? creado?.data?.id_producto;
        if (form.es_elaborado && tiene('INV_GESTIONAR_RECETAS') && idCreado) {
          notificar.exito('Producto creado. Agrega ahora los ingredientes de su receta.');
          cerrarDrawer();
          navigate(`/catalogo/productos/${idCreado}/receta`);
          return;
        } else if (form.es_elaborado) {
          notificar.advertencia('Producto creado. Agrega ahora los ingredientes de su receta cuando tengas el permiso INV_GESTIONAR_RECETAS.');
        } else {
          notificar.exito('Producto creado correctamente.');
        }
      }

      cerrarDrawer();
      await cargarDatos();
    } catch (err) {
      const traducido = traducirError(err);
      if (traducido.id === 'DUPLICADO') traducido.campos = { nombre: traducido.mensaje };
      setFormError(traducido);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (p) => {
    const nuevoEstado = p.activo === false;
    if (!nuevoEstado) {
      const confirmado = await confirm(
        `¿Desactivar "${p.nombre}"? Dejará de aparecer en ventas y selectores del POS. Sus órdenes y ventas históricas se conservarán.`,
        {
          titulo: 'Desactivar producto',
          destructivo: true,
          etiquetaCancelar: 'Cancelar',
          etiquetaAceptar: 'Desactivar producto',
        },
      );
      if (!confirmado) return;
    }

    try {
      const res = await cambiarEstadoProducto(p.id_producto, nuevoEstado);
      const actualizado = res?.data ?? res ?? { ...p, activo: nuevoEstado };
      setProductos((prev) =>
        prev.map((item) =>
          item.id_producto === p.id_producto ? { ...item, ...actualizado, activo: nuevoEstado } : item,
        ),
      );
      notificar.exito(nuevoEstado ? 'Producto habilitado correctamente.' : 'Producto desactivado correctamente.');
    } catch (err) {
      notificar.error(traducirError(err));
    }
  };

  // Mantener handleDesactivar y reactivarProducto para compatibilidad de tests y llamadas
  const handleDesactivar = (p) => handleToggleEstado(p);
  const reactivarProducto = (p) => handleToggleEstado(p);

  const handleEliminarProducto = async (p) => {
    const confirmado = await confirm(
      `¿Eliminar definitivamente el producto "${p.nombre}"? El producto se removerá por completo de todos los catálogos y ventas del sistema. Sus ventas pasadas conservarán el historial.`,
      {
        titulo: 'Eliminar producto',
        destructivo: true,
        etiquetaCancelar: 'Cancelar',
        etiquetaAceptar: 'Eliminar producto',
      },
    );
    if (!confirmado) return;

    try {
      await deleteProducto(p.id_producto);
      setProductos((prev) => prev.filter((item) => item.id_producto !== p.id_producto));
      notificar.exito('Producto eliminado del catálogo.');
    } catch (err) {
      notificar.error(traducirError(err));
    }
  };

  // ── Opciones para selectores ────────────────────────────────────────────────
  const opcionesCategoria = [
    { valor: 'TODOS', texto: 'Todas las categorías' },
    ...categorias.map((c) => ({ valor: String(c.id_categoria), texto: c.nombre })),
  ];

  const opcionesCategoriaForm = [
    { valor: '', texto: 'Sin categoría' },
    ...categorias.map((c) => ({ valor: String(c.id_categoria), texto: c.nombre })),
  ];
  const categoriasForm = errorCategorias ? [{ valor: '', texto: 'Categoría no disponible' }] : opcionesCategoriaForm;

  const opcionesTipo = [
    { valor: 'TODOS', texto: 'Todos los tipos' },
    { valor: 'ELABORADO', texto: 'Elaborados con receta' },
    { valor: 'REVENTA', texto: 'Reventa / Empacados' },
  ];
  const opcionesReceta = [
    { valor: 'TODOS', texto: 'Todos' },
    { valor: 'SIN_RECETA', texto: 'Sin receta' },
    { valor: 'CON_RECETA', texto: 'Con receta' },
  ];

  const insumosVinculados = new Set(productos.filter((p) => p.activo !== false && p.id_producto !== productoEditando?.id_producto && p.id_insumo_reventa != null).map((p) => String(p.id_insumo_reventa)));
  const insumosReventa = insumos.filter((i) => String(i.tipo_insumo).toUpperCase() === 'REVENTA' && (!insumosVinculados.has(String(i.id_insumo)) || String(i.id_insumo) === String(productoEditando?.id_insumo_reventa)));
  const insumoReventaSeleccionado = insumosReventa.find((i) => String(i.id_insumo) === String(form.id_insumo_reventa));
  const opcionesInsumosReventa = [
    { valor: '', texto: 'Selecciona un insumo de reventa…' },
    ...insumosReventa.map((i) => ({ valor: String(i.id_insumo), texto: i.nombre })),
  ];
  const errorNombre = formError?.campos?.nombre || (formError?.id === 'DUPLICADO' ? 'Ya existe un producto con ese nombre. Cambia el nombre o el código.' : null);

  // ── Columnas de la tabla ────────────────────────────────────────────────────
  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Nombre del producto',
      render: (p) => (
        <div className="space-y-1">
          <span className="font-semibold text-fg block leading-tight">{p.nombre}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {p.es_elaborado ? (
              Number(p.n_ingredientes) === 0 ? (
                <span
                  title="No se puede vender hasta que tenga al menos un ingrediente"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-warning-soft text-warning"
                >
                  <AlertTriangle size={11} aria-hidden="true" />
                  Sin receta
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductoPrevisualizar(p);
                  }}
                  title="Clic para previsualizar ingredientes de la receta"
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-soft text-success hover:bg-success/20 transition-colors cursor-pointer border border-success/30 shadow-xs"
                >
                  <ChefHat size={12} aria-hidden="true" />
                  <span>{formatearUnidades(p.n_ingredientes)} ingredientes</span>
                </button>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                <ShoppingBag size={11} aria-hidden="true" />
                Insumo: {p.insumo_reventa ?? '—'}
              </span>
            )}
            {p.codigo_barra && (
              <span className="font-mono text-xs text-fg-muted">
                {p.codigo_barra}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      render: (p) => (
        <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
          <Tag size={13} aria-hidden="true" />
          {p.nombre_categoria ?? categorias.find((c) => String(c.id_categoria) === String(p.id_categoria))?.nombre ?? 'Sin categoría'}
        </span>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (p) => <div><BadgeTipo esElaborado={p.es_elaborado} />{!p.es_elaborado && <p className="mt-1 text-xs text-fg-muted">{p.insumo_reventa ?? '—'}</p>}</div>,
    },
    {
      clave: 'precio_venta',
      titulo: 'Precio venta (con IVA)',
      alinear: 'right',
      render: (p) => (
        <span className="font-mono font-bold whitespace-nowrap text-primary-text">
          {formatoDinero(p.precio_venta)}
        </span>
      ),
    },
    {
      clave: 'costo_teorico',
      titulo: 'Costo',
      alinear: 'right',
      render: (p) => (
        <span className="font-mono whitespace-nowrap text-fg">
          {p.costo_teorico == null ? '—' : formatoDinero(p.costo_teorico)}
        </span>
      ),
    },
    {
      clave: 'margen',
      titulo: 'Margen sobre precio sin IVA',
      alinear: 'right',
      render: (p) => (
        <span className="font-mono whitespace-nowrap text-fg">
          {p.costo_teorico == null ? '—' : `${calcularMargen(p.precio_venta, p.costo_teorico)?.toFixed(1) ?? '—'}%`}
        </span>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (p) => (
        <EstadoBadge tipo={p.activo !== false ? 'exito' : 'error'}>
          {p.activo !== false ? 'Activo' : 'Inactivo'}
        </EstadoBadge>
      ),
    },
    {
      clave: '_acciones',
      titulo: 'Acciones',
      alinear: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {p.es_elaborado && tiene('INV_GESTIONAR_RECETAS') && (
            <button
              type="button"
              className="btn-ghost !px-2.5 text-xs font-semibold text-primary-text hover:bg-primary-soft h-9 inline-flex items-center whitespace-nowrap"
              title={Number(p.n_ingredientes) === 0 ? 'Crear receta' : 'Editar receta'}
              onClick={() => navigate(`/catalogo/productos/${p.id_producto}/receta`)}
            >
              <Layers size={14} className="mr-1.5 shrink-0" aria-hidden="true" />
              <span>{Number(p.n_ingredientes) === 0 ? 'Crear receta' : 'Editar receta'}</span>
            </button>
          )}
          {tiene('INV_GESTIONAR_PRODUCTOS') && (
            <button
              type="button"
              className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center"
              title="Editar producto"
              onClick={() => abrirEditar(p)}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
          )}
          {tiene('INV_GESTIONAR_PRODUCTOS') && (
            <button
              type="button"
              className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center text-danger"
              title={p.activo === false ? 'Reactivar producto' : 'Desactivar producto'}
              onClick={() => handleToggleEstado(p)}
            >
              {p.activo === false ? <Power size={15} aria-hidden="true" /> : <PowerOff size={15} aria-hidden="true" />}
            </button>
          )}
          {tiene('INV_GESTIONAR_PRODUCTOS') && (
            <button
              type="button"
              className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center text-danger hover:bg-danger-soft"
              title="Eliminar producto"
              onClick={() => handleEliminarProducto(p)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Inventario & Catálogo"
        titulo="Catálogo de Productos"
        descripcion="Administración de productos elaborados con receta y artículos de reventa empaquetados"
        acciones={
          tiene('INV_GESTIONAR_PRODUCTOS') && (
            <Button variante="primary" icono={Plus} onClick={abrirCrear}>
              Nuevo producto
            </Button>
          )
        }
      />

      {error && <BannerError error={error} onCerrar={() => setError(null)} />}

      {errorCategorias && <BannerError error={errorCategorias} onReintentar={cargarDatos} />}
      {errorInsumos && <BannerError error={errorInsumos} onReintentar={cargarDatos} />}

      {pendientesReceta.length > 0 && <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm"><span>{pendientesReceta.length} productos elaborados aún no tienen receta y no se pueden vender</span><Button variante="ghost" onClick={() => setFiltroReceta('SIN_RECETA')}>Ver pendientes</Button></div>}

      {/* Barra de Filtros y Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-56">
          <label htmlFor="buscar-producto" className="mb-1 block text-sm font-medium text-fg">
            Buscar producto
          </label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <input
              id="buscar-producto"
              type="search"
              className="input pl-9"
              placeholder="Buscar por nombre o código de barras…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-48">
          <Select
            etiqueta="Tipo de producto"
            opciones={opcionesTipo}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>

        <div className="min-w-48"><Select etiqueta="Receta" opciones={opcionesReceta} value={filtroReceta} onChange={(e) => setFiltroReceta(e.target.value)} /></div>

        <div className="min-w-48">
          <Select
            etiqueta="Categoría"
            opciones={opcionesCategoria}
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          />
        </div>

        {/* Alternador de vista */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
          <button
            type="button"
            className={`btn-ghost !p-2 min-h-8 rounded ${vista === 'tabla' ? 'bg-primary-soft text-primary-text' : 'text-fg-muted'}`}
            title="Vista en tabla"
            onClick={() => setVista('tabla')}
            aria-label="Vista en tabla"
          >
            <List size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`btn-ghost !p-2 min-h-8 rounded ${vista === 'cuadricula' ? 'bg-primary-soft text-primary-text' : 'text-fg-muted'}`}
            title="Vista en cuadrícula"
            onClick={() => setVista('cuadricula')}
            aria-label="Vista en cuadrícula"
          >
            <LayoutGrid size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}
        </p>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-line bg-muted/30 p-0.5 text-xs font-medium" role="group" aria-label="Filtro por estado">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 transition-colors ${filtroEstado === 'TODOS' ? 'bg-surface text-fg shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('TODOS'); setMostrarInactivos(true); }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 transition-colors ${filtroEstado === 'ACTIVOS' ? 'bg-surface text-fg shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('ACTIVOS'); setMostrarInactivos(false); }}
            >
              Activos
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 transition-colors ${filtroEstado === 'INACTIVOS' ? 'bg-surface text-fg shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('INACTIVOS'); setMostrarInactivos(true); }}
              title="Mostrar inactivos"
            >
              Inactivos
            </button>
          </div>
          <span className="sr-only">Mostrar inactivos</span>
        </div>
      </div>

      {/* Renderizado de Catálogo */}
      {cargando ? (
        <CatalogoSkeleton />
      ) : productosFiltrados.length === 0 ? (
        <Card>
          <EstadoVacio
            icono={Tag}
            titulo={productos.length === 0 ? 'Aún no hay productos' : 'No se encontraron productos'}
            accion={productos.length === 0 && tiene('INV_GESTIONAR_PRODUCTOS') ? <Button onClick={abrirCrear}>Crear primer producto</Button> : null}
          >
            {productos.length === 0 ? 'Registra el primer producto elaborado o de reventa para comenzar.' : 'No hay productos que coincidan con los filtros de búsqueda o categoría seleccionados.'}
          </EstadoVacio>
        </Card>
      ) : vista === 'tabla' ? (
        <Card sinPadding>
          <Table
            columnas={columnas}
            filas={productosFiltrados}
            idFila="id_producto"
            vacio="Sin productos disponibles."
          />
        </Card>
      ) : (
        /* Vista Cuadrícula */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.map((p) => {
            const nombreCat = p.nombre_categoria ?? categorias.find((c) => String(c.id_categoria) === String(p.id_categoria))?.nombre ?? 'Sin categoría';
            return (
              <div
                key={p.id_producto}
                className={`card flex flex-col justify-between transition-shadow hover:shadow-md ${p.activo === false ? 'opacity-60 bg-muted/40' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-fg text-base leading-snug">{p.nombre}</h3>
                      {!p.es_elaborado && <p className="text-xs text-fg-muted">Insumo: {p.insumo_reventa ?? '—'}</p>}
                      {p.es_elaborado && (
                        Number(p.n_ingredientes) === 0 ? (
                          <span
                            title="No se puede vender hasta que tenga al menos un ingrediente"
                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-warning-soft text-warning"
                          >
                            <AlertTriangle size={11} aria-hidden="true" />
                            Sin receta
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductoPrevisualizar(p);
                            }}
                            title="Clic para previsualizar ingredientes de la receta"
                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-soft text-success hover:bg-success/20 transition-colors cursor-pointer border border-success/30 shadow-xs"
                          >
                            <ChefHat size={12} aria-hidden="true" />
                            <span>{formatearUnidades(p.n_ingredientes)} ingredientes</span>
                          </button>
                        )
                      )}
                      {p.codigo_barra && (
                        <p className="font-mono text-xs text-fg-muted mt-0.5">{p.codigo_barra}</p>
                      )}
                    </div>
                    <BadgeTipo esElaborado={p.es_elaborado} />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted bg-muted px-2.5 py-1 rounded-md">
                      <Tag size={12} aria-hidden="true" />
                      {nombreCat}
                    </span>
                    <span className="text-xl font-bold font-mono text-primary-text">
                      {formatoDinero(p.precio_venta)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <EstadoBadge tipo={p.activo !== false ? 'exito' : 'error'}>
                    {p.activo !== false ? 'Activo' : 'Inactivo'}
                  </EstadoBadge>

                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {p.es_elaborado && tiene('INV_GESTIONAR_RECETAS') && (
                      <Button
                        variante="ghost"
                        className="!px-2.5 text-xs text-primary-text font-semibold hover:bg-primary-soft h-9 inline-flex items-center whitespace-nowrap"
                        onClick={() => navigate(`/catalogo/productos/${p.id_producto}/receta`)}
                        icono={Layers}
                      >
                        {Number(p.n_ingredientes) === 0 ? 'Crear receta' : 'Editar receta'}
                      </Button>
                    )}
                    {tiene('INV_GESTIONAR_PRODUCTOS') && (
                      <button
                        type="button"
                        className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center"
                        title="Editar producto"
                        onClick={() => abrirEditar(p)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                    )}
                    {tiene('INV_GESTIONAR_PRODUCTOS') && (
                      <button
                        type="button"
                        className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center text-danger"
                        title={p.activo === false ? 'Reactivar producto' : 'Desactivar producto'}
                        onClick={() => handleToggleEstado(p)}
                      >
                        {p.activo === false ? <Power size={15} aria-hidden="true" /> : <PowerOff size={15} aria-hidden="true" />}
                      </button>
                    )}
                    {tiene('INV_GESTIONAR_PRODUCTOS') && (
                      <button
                        type="button"
                        className="btn-ghost !p-2 h-9 w-9 inline-flex items-center justify-center text-danger hover:bg-danger-soft"
                        title="Eliminar producto"
                        onClick={() => handleEliminarProducto(p)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer Crear / Editar Producto */}
      {drawerAbierto &&
        createPortal(
          <>
            {/* Backdrop con cobertura 100% de pantalla (w-screen, h-dvh) y oscurecimiento uniforme sin desfase */}
            <div
              className="fixed inset-0 w-screen h-dvh z-40 bg-[#1C110D]/75 backdrop-blur-[2px] transition-opacity"
              onClick={cerrarDrawer}
              aria-hidden="true"
            />

            {/* Panel lateral (Drawer) en Alabastro cálido, estructura Flex vertical completa */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
              className="fixed right-0 top-0 bottom-0 h-dvh w-full max-w-lg bg-[#FAF8F5] dark:bg-[#2A1A14] shadow-2xl z-50 flex flex-col border-l border-line"
            >
              {/* Cabecera fija */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-[#FAF8F5] dark:bg-[#2A1A14] shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-fg">
                    {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {productoEditando
                      ? 'Modifica los datos comerciales y de inventario del producto'
                      : 'Registra un nuevo producto para venta en catálogo y POS'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-espresso-100 dark:hover:bg-espresso-800 transition-colors"
                  onClick={cerrarDrawer}
                  aria-label="Cerrar formulario"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Formulario con scroll interno */}
              <form
                id="form-producto"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 flex-1 overflow-y-auto px-6 py-5 scroll-fino"
              >
                {formError && <BannerError error={formError} onCerrar={() => setFormError(null)} />}
                <SelectorTipoProducto form={form} setForm={setForm} />
                <div>
                  <label htmlFor="producto-nombre" className="mb-1 block text-sm font-medium text-fg">
                    Nombre del Producto <span className="text-danger ml-0.5 font-semibold">*</span>
                  </label>
                  <input
                    id="producto-nombre"
                    type="text"
                    className="input focus:ring-2 focus:ring-[#B15C3D]/30 focus:border-[#B15C3D]"
                    placeholder="Ej. Latte Grande, Croissant de Mantequilla"
                    maxLength={150}
                    required
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                  <CampoError id="producto-nombre" mensaje={errorNombre} />
                </div>

                <Select
                  etiqueta="Categoría del producto"
                  opciones={categoriasForm}
                  value={String(form.id_categoria)}
                  onChange={(e) => setForm((f) => ({ ...f, id_categoria: e.target.value }))}
                  disabled={Boolean(errorCategorias)}
                  buscable
                />

                <div>
                  <label htmlFor="producto-codigo-barra" className="mb-1 block text-sm font-medium text-fg">
                    Código de barras o SKU
                  </label>
                  <input
                    id="producto-codigo-barra"
                    type="text"
                    className="input focus:ring-2 focus:ring-[#B15C3D]/30 focus:border-[#B15C3D]"
                    placeholder="Ej. 7400001000011 (opcional)"
                    maxLength={50}
                    value={form.codigo_barra}
                    onChange={(e) => setForm((f) => ({ ...f, codigo_barra: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="producto-precio-venta" className="mb-1 block text-sm font-medium text-fg">
                    Precio de venta al público (incluye IVA 13%) <span className="text-danger ml-0.5 font-semibold">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-fg-muted">
                      $
                    </span>
                    <input
                      id="producto-precio-venta"
                      type="number"
                      className="input pl-7 font-mono font-medium focus:ring-2 focus:ring-[#B15C3D]/30 focus:border-[#B15C3D]"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.precio_venta}
                      onChange={(e) => setForm((f) => ({ ...f, precio_venta: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    Conforme a la normativa tributaria de El Salvador, el precio ya incorpora el débito fiscal.
                  </p>
                </div>

                {!form.es_elaborado && <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <Select etiqueta="Insumo de reventa" requerido opciones={opcionesInsumosReventa} value={String(form.id_insumo_reventa)} onChange={(e) => setForm((f) => ({ ...f, id_insumo_reventa: e.target.value }))} placeholder="Selecciona un insumo de reventa…" buscable />
                  {tiene('INV_GESTIONAR_INSUMOS') && <Button type="button" variante="ghost" icono={Plus} onClick={() => { setValoresInsumo({ tipo_insumo: 'REVENTA', id_unidad_base: String(unidades.find((u) => u.codigo === 'UND')?.id_unidad ?? '') }); setDrawerInsumoAbierto(true); }}>+ Crear insumo de reventa</Button>}
                  {insumoReventaSeleccionado && <p className="text-xs text-fg-muted">Unidad: {insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad ?? 'UND'}{String(insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad ?? 'UND').toUpperCase() !== 'UND' && <span className="ml-1 text-warning">Cada venta descontará 1 {insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad}</span>}</p>}
                </div>}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="producto-activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="h-4 w-4 rounded border-line accent-primary"
                  />
                  <label htmlFor="producto-activo" className="text-sm text-fg select-none">
                    Producto activo para venta en POS y catálogos
                  </label>
                </div>
              </form>

              {/* Pie de acciones fijo */}
              <div className="sticky bottom-0 border-t border-line bg-[#FAF8F5] dark:bg-[#2A1A14] px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variante="ghost" onClick={cerrarDrawer} disabled={guardando}>
                  Cancelar
                </Button>
                <Button
                  variante="primary"
                  type="submit"
                  form="form-producto"
                  cargando={guardando}
                  disabled={guardando}
                >
                  {productoEditando ? 'Guardar cambios' : 'Crear producto'}
                </Button>
              </div>
            </div>
          </>,
          document.body
        )}
      <InsumoDrawer
        abierto={drawerInsumoAbierto}
        insumo={null}
        unidades={unidades}
        valoresIniciales={valoresInsumo}
        onCerrar={() => setDrawerInsumoAbierto(false)}
        onGuardado={async (guardado) => {
          setDrawerInsumoAbierto(false);
          try {
            const resultado = await getInsumos();
            const lista = Array.isArray(resultado) ? resultado : (resultado?.data ?? []);
            setInsumos(lista);
            const id = guardado?.id_insumo ?? guardado?.data?.id_insumo;
            if (id) setForm((actual) => ({ ...actual, id_insumo_reventa: String(id) }));
          } catch (err) { setErrorInsumos(traducirError(err)); }
        }}
      />

      {productoPrevisualizar && (
        <ModalPrevisualizacionReceta
          producto={productoPrevisualizar}
          categoriaNombre={
            productoPrevisualizar.nombre_categoria ??
            categorias.find((c) => String(c.id_categoria) === String(productoPrevisualizar.id_categoria))?.nombre ??
            'Sin categoría'
          }
          onCerrar={() => setProductoPrevisualizar(null)}
          onEditarReceta={(id) => {
            setProductoPrevisualizar(null);
            navigate(`/catalogo/productos/${id}/receta`);
          }}
          tienePermisoRecetas={tiene('INV_GESTIONAR_RECETAS')}
          tienePermisoCostos={tiene('INV_VER_COSTOS')}
        />
      )}
    </div>
  );
}

