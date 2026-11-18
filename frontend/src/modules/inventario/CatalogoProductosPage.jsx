import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, ChefHat, ShoppingBag, Pencil, Power, PowerOff, Tag, Plus, Search, X, Trash2, AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import CampoError from '../../components/forms/CampoError.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import AccionConTooltip from '../../components/display/AccionConTooltip.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import Skeleton from '../../components/feedback/Skeleton.jsx';
import Insignia from '../../components/branding/Insignia.jsx';
import './catalogo-productos.css';
import { ICONOS } from '../../config/iconos.js';
import { formatoDinero, formatearUnidades } from '../../utils/formato.js';
import { aplicarMascara, completarDecimales, propsMascara } from '../../utils/mascaras.js';
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
            <p className="mt-1 flex items-center gap-1.5 text-body text-fg-muted">
              <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
              Categoría: <span className="font-medium text-fg">{categoriaNombre || 'Sin categoría'}</span>
            </p>
          </div>
          <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar modal" onClick={onCerrar} />
        </div>

        {/* Tarjetas de Métricas Financieras (KPI Strip) */}
        <div className="px-6 py-5">
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                ? (cargando ? <Skeleton className="mt-1 h-5 w-20" /> : formatoDinero(costoTotal))
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
                              {formatoDinero(c.costo_promedio)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                          {tienePermisoCostos ? (
                            <span className={subtotalCero ? 'text-fg-muted' : 'text-fg'}>
                              {formatoDinero(subtotal)}
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
                      {tienePermisoCostos ? formatoDinero(costoTotal) : '—'}
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

// ─── Skeleton Loader Cálido de Catálogo ──────────────────────────────────────
function CatalogoSkeleton() {
  return (
    <div className="space-y-4 p-5" role="status" aria-busy="true" aria-label="Cargando productos">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-4 w-28 rounded-md" />
      </div>
      <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-44 rounded" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24 rounded hidden sm:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded hidden md:block" />
            <Skeleton className="h-4 w-14 rounded hidden md:block" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <div className="flex gap-1.5 justify-end">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
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
    <Insignia variante="neutro" icono={ChefHat} className="whitespace-nowrap">Elaborado (Receta)</Insignia>
  ) : (
    <Insignia variante="aviso" icono={ShoppingBag} className="whitespace-nowrap">Reventa</Insignia>
  );

function AccionesProducto({ producto, tiene, navegar, editar, cambiarEstado, eliminar }) {
  const { es_elaborado: esElaborado } = producto;
  return (
    <div className="acciones-producto flex min-w-[178px] shrink-0 flex-nowrap items-center justify-end gap-1">
      {esElaborado && tiene('INV_GESTIONAR_RECETAS') ? <AccionConTooltip texto={Number(producto.n_ingredientes) === 0 ? 'Crear receta' : 'Editar receta'}>
        <BotonIcono icono={ChefHat} className="!size-10 shrink-0" etiqueta={`${Number(producto.n_ingredientes) === 0 ? 'Crear receta' : 'Editar receta'} de ${producto.nombre}`} onClick={() => navegar(`/catalogo/productos/${producto.id_producto}/receta`)} />
      </AccionConTooltip> : <span className="size-10 shrink-0" aria-hidden="true" />}
      {tiene('INV_GESTIONAR_PRODUCTOS') && <AccionConTooltip texto={`Editar producto ${producto.nombre}`}>
        <BotonIcono icono={ICONOS.editar} className="!size-10 shrink-0" etiqueta={`Editar producto ${producto.nombre}`} onClick={() => editar(producto)} />
      </AccionConTooltip>}
      {tiene('INV_GESTIONAR_PRODUCTOS') && <AccionConTooltip texto={`${producto.activo === false ? 'Reactivar' : 'Desactivar'} producto ${producto.nombre}`}>
        <BotonIcono icono={producto.activo === false ? ICONOS.activar : ICONOS.desactivar} tono={producto.activo === false ? 'exito' : 'aviso'} className="!size-10 shrink-0" etiqueta={`${producto.activo === false ? 'Reactivar' : 'Desactivar'} producto ${producto.nombre}`} onClick={() => cambiarEstado(producto)} />
      </AccionConTooltip>}
      {tiene('INV_GESTIONAR_PRODUCTOS') && <AccionConTooltip texto={`Eliminar producto ${producto.nombre}`}>
        <BotonIcono icono={ICONOS.eliminar} tono="peligro" className="!size-10 shrink-0" etiqueta={`Eliminar producto ${producto.nombre}`} onClick={() => eliminar(producto)} />
      </AccionConTooltip>}
    </div>
  );
}

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
  return <fieldset className="space-y-2">
    <legend className="mb-1.5 text-label text-fg">Tipo de producto</legend>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors hover:bg-muted ${form.es_elaborado ? 'border-primary/40 bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg'}`}>
        <input type="radio" name="tipo_producto" className="accent-primary mt-1" checked={form.es_elaborado} onChange={() => setForm((f) => ({ ...f, es_elaborado: true, id_insumo_reventa: '' }))} />
        <span className="text-label">Elaborado<small className="mt-0.5 block text-body-sm font-normal text-fg-muted">Tras guardar podrás definir su receta; sin receta no se puede vender</small></span>
      </label>
      <label className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors hover:bg-muted ${!form.es_elaborado ? 'border-primary/40 bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg'}`}>
        <input type="radio" name="tipo_producto" className="accent-primary mt-1" checked={!form.es_elaborado} onChange={() => setForm((f) => ({ ...f, es_elaborado: false }))} />
        <span className="text-label">Reventa<small className="mt-0.5 block text-body-sm font-normal text-fg-muted">Se descuenta 1 unidad del insumo por cada venta</small></span>
      </label>
    </div>
  </fieldset>;
}

export default function CatalogoProductosPage() {
  const navigate = useNavigate();
  const { tiene } = useAuth();
  const { confirm, notificar, notificarError } = useAlert();

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
  const [errorNombre, setErrorNombre] = useState(null);
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
          ? (mostrarInactivos ? true : p.activo !== false)
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
    setErrorNombre(null);
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
    setErrorNombre(null);
    setDrawerAbierto(true);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setProductoEditando(null);
    setForm(FORM_VACIO);
    setErrorNombre(null);
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
    setErrorNombre(null);

    if (!form.nombre.trim()) {
      setErrorNombre('El nombre del producto es obligatorio.');
      notificar.advertencia('Nombre requerido', { mensaje: 'El nombre del producto es obligatorio.' });
      return;
    }
    if (!form.precio_venta || Number(form.precio_venta) <= 0) {
      notificar.advertencia('Precio inválido', { mensaje: 'El precio de venta debe ser un número positivo.' });
      return;
    }
    if (!form.es_elaborado && !form.id_insumo_reventa) {
      notificar.advertencia('Insumo requerido', { mensaje: 'Para productos de reventa, debes asociar un insumo correspondiente.' });
      return;
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
          notificar.advertencia('Producto creado', { mensaje: 'Agrega ahora los ingredientes de su receta cuando tengas el permiso INV_GESTIONAR_RECETAS.' });
        } else {
          notificar.exito('Producto creado correctamente.');
        }
      }

      cerrarDrawer();
      await cargarDatos();
    } catch (err) {
      const traducido = notificarError(err);
      if (traducido?.id === 'DUPLICADO') {
        setErrorNombre(traducido.mensaje || 'Ya existe un producto con ese nombre. Cambia el nombre o el código.');
      }
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
      notificarError(err);
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
      notificarError(err);
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

  // ── Columnas de la tabla ────────────────────────────────────────────────────
  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      tipo: 'texto',
      valorOrden: (p) => p.nombre,
      render: (p) => (
        <div className="producto-tabla min-w-0">
          <span className="nombre-producto-tabla block truncate font-medium text-fg" title={p.nombre}>{p.nombre}</span>
          <div className="flex min-w-0 items-center gap-2">
            {p.codigo_barra && (
              <span className="codigo-producto-tabla truncate font-mono text-body-sm text-fg-muted">
                {p.codigo_barra}
              </span>
            )}
            {p.es_elaborado && (
              Number(p.n_ingredientes) === 0 ? (
                <span
                  title="Sin receta: no se puede vender"
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-warning-soft px-2 py-0.5 text-label-sm text-warning-text"
                >
                  <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
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
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-success-soft px-2 py-0.5 text-label-sm text-success-text transition-colors hover:bg-success/20"
                >
                  <ChefHat size={12} strokeWidth={1.75} aria-hidden="true" />
                  <span>{formatearUnidades(p.n_ingredientes)} ing.</span>
                </button>
              )
            )}
          </div>
        </div>
      ),
    },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      tipo: 'texto',
      valorOrden: (p) => p.nombre_categoria ?? categorias.find((c) => String(c.id_categoria) === String(p.id_categoria))?.nombre ?? '',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted">
          <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
          {p.nombre_categoria ?? categorias.find((c) => String(c.id_categoria) === String(p.id_categoria))?.nombre ?? 'Sin categoría'}
        </span>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      tipo: 'texto',
      valorOrden: (p) => (p.es_elaborado ? 'Elaborado' : 'Reventa'),
      render: (p) => (
        <div className="tipo-producto-tabla">
          <BadgeTipo esElaborado={p.es_elaborado} />
          {!p.es_elaborado && p.insumo_reventa && p.insumo_reventa !== p.nombre && (
            <p className="mt-0.5 truncate text-body-sm text-fg-muted" title={p.insumo_reventa}>Insumo: {p.insumo_reventa}</p>
          )}
        </div>
      ),
    },
    {
      clave: 'precio_venta',
      titulo: 'Precio',
      tipo: 'dinero',
      descripcion: 'Precio de venta con IVA',
      alinear: 'right',
      valorOrden: (p) => p.precio_venta,
      render: (p) => (
        <span className="whitespace-nowrap font-medium tabular-nums text-fg">
          {formatoDinero(p.precio_venta)}
        </span>
      ),
    },
    {
      clave: 'costo_teorico',
      titulo: 'Costo',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (p) => p.costo_teorico,
      render: (p) => (
        <span className="font-mono whitespace-nowrap tabular-nums text-fg-muted">
          {p.costo_teorico == null ? '—' : formatoDinero(p.costo_teorico)}
        </span>
      ),
    },
    {
      clave: 'margen',
      titulo: 'Margen',
      tipo: 'numero',
      descripcion: 'Margen sobre el precio sin IVA',
      alinear: 'right',
      valorOrden: (p) => calcularMargen(p.precio_venta, p.costo_teorico),
      render: (p) => (
        <span className="whitespace-nowrap tabular-nums text-fg">
          {p.costo_teorico == null ? '—' : `${calcularMargen(p.precio_venta, p.costo_teorico)?.toFixed(1) ?? '—'}%`}
        </span>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      tipo: 'booleano',
      valorOrden: (p) => p.activo !== false,
      render: (p) => (
        <EstadoBadge tipo={p.activo !== false ? 'exito' : 'error'}>
          {p.activo !== false ? 'Activo' : 'Inactivo'}
        </EstadoBadge>
      ),
    },
    {
      clave: '_acciones',
      titulo: 'Acciones',
      ordenable: false,
      alinear: 'right',
      ancho: 'acciones',
      render: (p) => <AccionesProducto producto={p} tiene={tiene} navegar={navigate} editar={abrirEditar} cambiarEstado={handleToggleEstado} eliminar={handleEliminarProducto} />,
    },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Operación · Catálogo"
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

      {pendientesReceta.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-body text-warning-text" role="status"><span className="inline-flex items-center gap-2"><AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />{pendientesReceta.length} productos elaborados aún no tienen receta y no se pueden vender</span><Button variante="ghost" tamano="sm" onClick={() => setFiltroReceta('SIN_RECETA')}>Ver pendientes</Button></div>}

      {/* Catálogo: barra de herramientas + tabla/cuadrícula */}
      <Card sinPadding icono={Tag} titulo="Productos" className="min-w-0"
        descripcion={<span className="tabular-nums" aria-live="polite">{productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}</span>}>
        <div className="flex min-w-0 flex-wrap items-end gap-3 border-b border-line px-5 py-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <label htmlFor="buscar-producto" className="mb-1.5 block text-label text-fg">
            Buscar producto
          </label>
          <div className="relative">
            <ICONOS.buscar size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input
              id="buscar-producto"
              type="search"
              className="input pl-9"
              placeholder="Buscar producto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_11rem]">
          <Select
            etiqueta="Tipo de producto"
            opciones={opcionesTipo}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>

        <div className="min-w-0 flex-[1_1_9rem]"><Select etiqueta="Receta" opciones={opcionesReceta} value={filtroReceta} onChange={(e) => setFiltroReceta(e.target.value)} /></div>

        <div className="min-w-0 flex-[1_1_11rem]">
          <Select
            etiqueta="Categoría"
            opciones={opcionesCategoria}
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          />
        </div>

        {/* Alternador de vista */}
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-muted p-0.5" role="group" aria-label="Tipo de vista">
          <button
            type="button"
            aria-pressed={vista === 'tabla'}
            className={`grid size-control-md place-items-center rounded-sm transition-colors ${vista === 'tabla' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
            title="Vista en tabla"
            onClick={() => setVista('tabla')}
            aria-label="Vista en tabla"
          >
            <List size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={vista === 'cuadricula'}
            className={`grid size-control-md place-items-center rounded-sm transition-colors ${vista === 'cuadricula' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
            title="Vista en cuadrícula"
            onClick={() => setVista('cuadricula')}
            aria-label="Vista en cuadrícula"
          >
            <LayoutGrid size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-line bg-muted p-0.5 text-label-sm" role="group" aria-label="Filtro por estado">
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'TODOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('TODOS'); setMostrarInactivos(true); }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'ACTIVOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('ACTIVOS'); setMostrarInactivos(false); }}
            >
              Activos
            </button>
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'INACTIVOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => { setFiltroEstado('INACTIVOS'); setMostrarInactivos(true); }}
              title="Mostrar inactivos"
            >
              Inactivos
            </button>
          </div>
          <span className="sr-only">Mostrar inactivos</span>
        </div>
        {(busqueda || filtroTipo !== 'TODOS' || filtroReceta !== 'TODOS' || filtroCategoria !== 'TODOS' || filtroEstado !== 'TODOS') && (
          <Button variante="ghost" tamano="sm" className="ml-auto" onClick={() => { setBusqueda(''); setFiltroTipo('TODOS'); setFiltroReceta('TODOS'); setFiltroCategoria('TODOS'); setFiltroEstado('TODOS'); setMostrarInactivos(false); }}>Limpiar filtros</Button>
        )}
      </div>

      {/* Renderizado de Catálogo */}
      {cargando ? (
        <CatalogoSkeleton />
      ) : productosFiltrados.length === 0 ? (
          <EstadoVacio
            icono={Tag}
            titulo={productos.length === 0 ? 'Aún no hay productos' : 'No se encontraron productos'}
            accion={productos.length === 0 && tiene('INV_GESTIONAR_PRODUCTOS') ? <Button onClick={abrirCrear}>Crear primer producto</Button> : null}
          >
            {productos.length === 0 ? 'Registra el primer producto elaborado o de reventa para comenzar.' : 'No hay productos que coincidan con los filtros de búsqueda o categoría seleccionados.'}
          </EstadoVacio>
      ) : vista === 'tabla' ? (
          <Table
            columnas={columnas}
            filas={productosFiltrados}
            idFila="id_producto"
            idTabla="catalogo-productos"
            vacio="Sin productos disponibles."
            scrollVertical={false}
            maxAltura=""
            className="catalogo-tabla"
          />
      ) : (
        /* Vista Cuadrícula */
        <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4 p-5">
          {productosFiltrados.map((p) => {
            const nombreCat = p.nombre_categoria ?? categorias.find((c) => String(c.id_categoria) === String(p.id_categoria))?.nombre ?? 'Sin categoría';
            return (
              <div
                key={p.id_producto}
                className={`flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong ${p.activo === false ? 'opacity-60' : ''}`}
              >
                <div>
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 title={p.nombre} className="line-clamp-2 min-h-[2.7em] break-words text-label text-fg">{p.nombre}</h3>
                      {p.es_elaborado && (
                        Number(p.n_ingredientes) === 0 ? (
                          <span
                            title="No se puede vender hasta que tenga al menos un ingrediente"
                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-label-sm text-warning-text"
                          >
                            <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
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
                            className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-label-sm text-success-text transition-colors hover:bg-success/20"
                          >
                            <ChefHat size={12} strokeWidth={1.75} aria-hidden="true" />
                            <span>{formatearUnidades(p.n_ingredientes)} ingredientes</span>
                          </button>
                        )
                      )}
                      {p.codigo_barra && (
                        <p className="mt-0.5 font-mono text-body-sm text-fg-muted">{p.codigo_barra}</p>
                      )}
                    </div>
                    <div className="shrink-0"><BadgeTipo esElaborado={p.es_elaborado} /></div>
                  </div>

                  <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <span title={nombreCat} className="inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-full bg-muted px-2.5 py-0.5 text-label-sm text-fg-muted">
                      <Tag size={12} strokeWidth={1.75} aria-hidden="true" />
                      {nombreCat}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-h3 tabular-nums text-fg">
                      {formatoDinero(p.precio_venta)}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-line flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <EstadoBadge tipo={p.activo !== false ? 'exito' : 'error'}>
                    {p.activo !== false ? 'Activo' : 'Inactivo'}
                  </EstadoBadge>

                  <AccionesProducto producto={p} tiene={tiene} navegar={navigate} editar={abrirEditar} cambiarEstado={handleToggleEstado} eliminar={handleEliminarProducto} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </Card>

      {/* Drawer Crear / Editar Producto */}
      {drawerAbierto &&
        createPortal(
          <>
            {/* Backdrop con cobertura 100% de pantalla (w-screen, h-dvh) y oscurecimiento uniforme sin desfase */}
            <div
              className="anim-scrim fixed inset-0 w-screen h-dvh z-40 bg-overlay"
              onClick={cerrarDrawer}
              aria-hidden="true"
            />

            {/* Panel lateral (Drawer) en Alabastro cálido, estructura Flex vertical completa */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
              className="fixed right-0 top-0 bottom-0 h-dvh w-full max-w-lg bg-surface shadow-lg z-50 flex flex-col border-l border-line"
            >
              {/* Cabecera fija */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface px-6 pb-4 pt-6">
                <div>
                  <h2 className="text-h3 text-fg">
                    {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                  </h2>
                  <p className="mt-1 text-body text-fg-muted">
                    {productoEditando
                      ? 'Modifica los datos comerciales y de inventario del producto'
                      : 'Registra un nuevo producto para venta en catálogo y POS'}
                  </p>
                </div>
                <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar formulario" onClick={cerrarDrawer} />
              </div>

              {/* Formulario con scroll interno */}
              <form
                id="form-producto"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 flex-1 overflow-y-auto px-6 py-5 scroll-fino"
              >
                <SelectorTipoProducto form={form} setForm={setForm} />
                <div>
                  <label htmlFor="producto-nombre" className="mb-1.5 block text-label text-fg">
                    Nombre del Producto <span className="text-danger-text">*</span>
                  </label>
                  <input
                    id="producto-nombre"
                    type="text"
                    className="input"
                    placeholder="Ej. Latte Grande, Croissant de Mantequilla"
                    maxLength={150}
                    required
                    value={form.nombre}
                    onChange={(e) => {
                      setErrorNombre(null);
                      setForm((f) => ({ ...f, nombre: e.target.value }));
                    }}
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
                  <label htmlFor="producto-codigo-barra" className="mb-1.5 block text-label text-fg">
                    Código de barras o SKU
                  </label>
                  <input
                    id="producto-codigo-barra"
                    type="text"
                    className="input font-mono"
                    placeholder="Ej. 7400001000011 (opcional)"
                    maxLength={50}
                    value={form.codigo_barra}
                    onChange={(e) => setForm((f) => ({ ...f, codigo_barra: aplicarMascara('identificador', e.target.value) }))}
                    spellCheck={false}
                  />
                </div>

                <div>
                  <label htmlFor="producto-precio-venta" className="mb-1.5 block text-label text-fg">
                    Precio de venta al público (incluye IVA 13%) <span className="text-danger-text">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
                      $
                    </span>
                    <input
                      id="producto-precio-venta"
                      {...propsMascara('monto')}
                      className="input pl-7 text-right tabular-nums"
                      required
                      value={form.precio_venta}
                      onChange={(e) => setForm((f) => ({ ...f, precio_venta: aplicarMascara('monto', e.target.value) }))}
                      onBlur={() => setForm((f) => ({ ...f, precio_venta: completarDecimales(f.precio_venta) }))}
                    />
                  </div>
                  <p className="mt-1 text-body-sm text-fg-muted">
                    Conforme a la normativa tributaria de El Salvador, el precio ya incorpora el débito fiscal.
                  </p>
                </div>

                {!form.es_elaborado && <div className="space-y-3 border-t border-line pt-4">
                  <Select etiqueta="Insumo de reventa" requerido opciones={opcionesInsumosReventa} value={String(form.id_insumo_reventa)} onChange={(e) => setForm((f) => ({ ...f, id_insumo_reventa: e.target.value }))} placeholder="Selecciona un insumo de reventa…" buscable />
                  {tiene('INV_GESTIONAR_INSUMOS') && <Button type="button" variante="ghost" icono={Plus} onClick={() => { setValoresInsumo({ tipo_insumo: 'REVENTA', id_unidad_base: String(unidades.find((u) => u.codigo === 'UND')?.id_unidad ?? '') }); setDrawerInsumoAbierto(true); }}>Crear insumo de reventa</Button>}
                  {insumoReventaSeleccionado && <p className="text-body-sm text-fg-muted">Unidad: {insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad ?? 'UND'}{String(insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad ?? 'UND').toUpperCase() !== 'UND' && <span className="ml-1 text-warning-text">Cada venta descontará 1 {insumoReventaSeleccionado.unidad ?? insumoReventaSeleccionado.codigo_unidad}</span>}</p>}
                </div>}
                <div className="flex items-center gap-3 border-t border-line pt-4">
                  <input
                    id="producto-activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="h-4 w-4 rounded border-line accent-primary"
                  />
                  <label htmlFor="producto-activo" className="select-none text-body text-fg">
                    Producto activo para venta en POS y catálogos
                  </label>
                </div>
              </form>

              {/* Pie de acciones fijo */}
              <div className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end">
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

