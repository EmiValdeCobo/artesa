import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, ChefHat, ShoppingBag, Pencil, Layers, Trash2, Tag, Plus, Search, X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { formatoDinero } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import {
  getProductos, createProducto, updateProducto, deleteProducto,
  getCategorias, getInsumos,
} from './inventarioApi.js';
import {
  MOCK_PRODUCTOS, MOCK_CATEGORIAS, MOCK_INSUMOS,
} from './mockData.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BadgeTipo = ({ esElaborado }) =>
  esElaborado ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary-soft text-primary-text">
      <ChefHat size={12} aria-hidden="true" />
      Elaborado (BOM)
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

export default function CatalogoProductosPage() {
  const navigate = useNavigate();
  const { tiene } = useAuth();
  const { confirm, notificar } = useAlert();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [insumos, setInsumos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState('tabla'); // 'tabla' | 'cuadricula'

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [formError, setFormError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resProductos, resCategorias, resInsumos] = await Promise.allSettled([
        getProductos(),
        getCategorias(),
        getInsumos(),
      ]);

      const listaProd = resProductos.status === 'fulfilled'
        ? (Array.isArray(resProductos.value) ? resProductos.value : resProductos.value?.data ?? [])
        : MOCK_PRODUCTOS;
      const listaCat = resCategorias.status === 'fulfilled'
        ? (Array.isArray(resCategorias.value) ? resCategorias.value : resCategorias.value?.data ?? [])
        : MOCK_CATEGORIAS;
      const listaIns = resInsumos.status === 'fulfilled'
        ? (Array.isArray(resInsumos.value) ? resInsumos.value : resInsumos.value?.data ?? [])
        : MOCK_INSUMOS;

      setProductos(listaProd.length ? listaProd : MOCK_PRODUCTOS);
      setCategorias(listaCat.length ? listaCat : MOCK_CATEGORIAS);
      setInsumos(listaIns.length ? listaIns : MOCK_INSUMOS);

      if (resProductos.status === 'rejected') {
        setError(avisoLocal('No se pudo conectar con el servidor. Mostrando catálogo de demostración.', 'Sin conexión'));
      }
    } catch {
      setProductos(MOCK_PRODUCTOS);
      setCategorias(MOCK_CATEGORIAS);
      setInsumos(MOCK_INSUMOS);
      setError(avisoLocal('Mostrando catálogo de demostración (modo sin conexión).', 'Sin conexión'));
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

      return coincideBusqueda && coincideTipo && coincideCategoria;
    });
  }, [productos, busqueda, filtroTipo, filtroCategoria]);

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
      precio_venta: p.precio_venta != null ? String(p.precio_venta) : '',
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
        await createProducto(payload);
        notificar.exito('Producto creado correctamente.');
      }

      cerrarDrawer();
      await cargarDatos();
    } catch (err) {
      setFormError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (p) => {
    const confirmado = await confirm(
      `¿Deseas dar de baja el producto "${p.nombre}"? Si ya cuenta con órdenes o ventas históricas, el sistema aplicará borrado lógico.`,
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
      notificar.exito('Producto eliminado correctamente.');
      setProductos((prev) => prev.filter((item) => item.id_producto !== p.id_producto));
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

  const opcionesTipo = [
    { valor: 'TODOS', texto: 'Todos los tipos' },
    { valor: 'ELABORADO', texto: 'Elaborados con Receta (BOM)' },
    { valor: 'REVENTA', texto: 'Reventa / Empacados' },
  ];

  const insumosReventa = insumos.filter(
    (i) => String(i.tipo_insumo).toUpperCase() === 'REVENTA' || String(i.tipo_insumo).toUpperCase() === 'EMPAQUE',
  );
  const opcionesInsumosReventa = [
    { valor: '', texto: 'Selecciona un insumo de reventa…' },
    ...insumosReventa.map((i) => ({ valor: String(i.id_insumo), texto: `${i.nombre} (${i.codigo_unidad ?? 'u'})` })),
  ];

  // ── Columnas de la tabla ────────────────────────────────────────────────────
  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Nombre del producto',
      render: (p) => (
        <div>
          <span className="font-semibold text-fg">{p.nombre}</span>
          {p.codigo_barra && (
            <p className="font-mono text-xs text-fg-muted">{p.codigo_barra}</p>
          )}
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
      render: (p) => <BadgeTipo esElaborado={p.es_elaborado} />,
    },
    {
      clave: 'precio_venta',
      titulo: 'Precio venta (con IVA)',
      alinear: 'right',
      render: (p) => (
        <span className="font-mono font-bold text-primary-text">
          {formatoDinero(p.precio_venta)}
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
        <div className="flex items-center justify-end gap-1.5">
          {p.es_elaborado && tiene('INV_GESTIONAR_RECETAS') && (
            <button
              type="button"
              className="btn-ghost !px-2.5 !py-1 text-xs font-semibold text-primary-text hover:bg-primary-soft"
              title="Configurar Receta (BOM)"
              onClick={() => navigate(`/inventario/recetas?producto=${p.id_producto}`)}
            >
              <Layers size={14} className="mr-1 inline" aria-hidden="true" />
              Receta BOM
            </button>
          )}
          {tiene('INV_GESTIONAR_PRODUCTOS') && (
            <button
              type="button"
              className="btn-ghost !p-1.5 min-h-8"
              title="Editar producto"
              onClick={() => abrirEditar(p)}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
          )}
          {tiene('INV_GESTIONAR_PRODUCTOS') && (
            <button
              type="button"
              className="btn-ghost !p-1.5 min-h-8 text-danger"
              title="Eliminar producto"
              onClick={() => handleEliminar(p)}
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
        descripcion="Administración de productos elaborados (con receta BOM) y artículos de reventa empaquetados"
        acciones={
          tiene('INV_GESTIONAR_PRODUCTOS') && (
            <Button variante="primary" icono={Plus} onClick={abrirCrear}>
              Nuevo Producto
            </Button>
          )
        }
      />

      {error && <BannerError error={error} onCerrar={() => setError(null)} />}

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

      <p className="text-sm text-fg-muted" aria-live="polite">
        {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}
      </p>

      {/* Renderizado de Catálogo */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner texto="Cargando catálogo de productos…" />
        </div>
      ) : productosFiltrados.length === 0 ? (
        <Card>
          <EstadoVacio
            icono={Tag}
            titulo="No se encontraron productos"
          >
            No hay productos que coincidan con los filtros de búsqueda o categoría seleccionados.
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

                  <div className="flex items-center gap-1.5">
                    {p.es_elaborado && tiene('INV_GESTIONAR_RECETAS') && (
                      <Button
                        variante="ghost"
                        className="!px-2.5 !py-1 text-xs text-primary-text font-semibold hover:bg-primary-soft"
                        onClick={() => navigate(`/inventario/recetas?producto=${p.id_producto}`)}
                        icono={Layers}
                      >
                        Receta BOM
                      </Button>
                    )}
                    {tiene('INV_GESTIONAR_PRODUCTOS') && (
                      <button
                        type="button"
                        className="btn-ghost !p-1.5 min-h-8"
                        title="Editar producto"
                        onClick={() => abrirEditar(p)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                    )}
                    {tiene('INV_GESTIONAR_PRODUCTOS') && (
                      <button
                        type="button"
                        className="btn-ghost !p-1.5 min-h-8 text-danger"
                        title="Eliminar producto"
                        onClick={() => handleEliminar(p)}
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
                </div>

                <Select
                  etiqueta="Categoría del producto"
                  opciones={opcionesCategoriaForm}
                  value={String(form.id_categoria)}
                  onChange={(e) => setForm((f) => ({ ...f, id_categoria: e.target.value }))}
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

                {/* Selección de Tipo: Elaborado vs Reventa */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-sm font-semibold text-fg">Tipo de Producto</span>
                    <span className="text-xs text-fg-muted">Manejo de inventario</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${form.es_elaborado ? 'border-primary bg-primary-soft text-primary-text font-semibold' : 'border-line bg-surface text-fg'}`}
                    >
                      <input
                        type="radio"
                        name="tipo_producto"
                        className="accent-primary"
                        checked={form.es_elaborado === true}
                        onChange={() => setForm((f) => ({ ...f, es_elaborado: true, id_insumo_reventa: '' }))}
                      />
                      <ChefHat size={16} aria-hidden="true" />
                      <span className="text-xs sm:text-sm">Elaborado con receta</span>
                    </label>

                    <label
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${!form.es_elaborado ? 'border-secondary bg-secondary-soft text-secondary-text font-semibold' : 'border-line bg-surface text-fg'}`}
                    >
                      <input
                        type="radio"
                        name="tipo_producto"
                        className="accent-secondary"
                        checked={form.es_elaborado === false}
                        onChange={() => setForm((f) => ({ ...f, es_elaborado: false }))}
                      />
                      <ShoppingBag size={16} aria-hidden="true" />
                      <span className="text-xs sm:text-sm">Reventa / Empacado</span>
                    </label>
                  </div>

                  {/* Si es reventa: asociar insumo */}
                  {!form.es_elaborado && (
                    <div className="pt-2">
                      <Select
                        etiqueta="Insumo asociado para descuento 1:1 en POS"
                        requerido
                        opciones={opcionesInsumosReventa}
                        value={String(form.id_insumo_reventa)}
                        onChange={(e) => setForm((f) => ({ ...f, id_insumo_reventa: e.target.value }))}
                        placeholder="Seleccionar insumo de reventa…"
                        buscable
                      />
                      <p className="mt-1 text-xs text-fg-muted">
                        Al vender este producto en POS, se descontará automáticamente 1 unidad del insumo seleccionado.
                      </p>
                    </div>
                  )}
                </div>

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
    </div>
  );
}
