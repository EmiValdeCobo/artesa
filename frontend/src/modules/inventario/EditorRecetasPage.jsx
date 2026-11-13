import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, ChefHat, FlaskConical, Search, AlertCircle, ArrowLeft, Check, Sparkles, Package } from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Spinner } from '../../components/ui/index.js';
import { formatoDinero } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';

import {
  getProductos,
  getInsumos,
  getReceta,
  saveReceta,
  getStock,
} from './inventarioApi.js';
import {
  MOCK_PRODUCTOS,
  MOCK_INSUMOS,
  MOCK_STOCK_SUCURSAL,
  mockRecetaPorProducto,
} from './mockData.js';

// ─── Helpers Financieros Anti-Float ──────────────────────────────────────────
function calcCostoTotal(componentes) {
  return componentes.reduce((acc, c) => {
    const cant = Number(c.cantidad_requerida || 0);
    const costo = Number(c.costo_promedio || 0);
    return acc + Math.round(cant * costo * 10000) / 10000;
  }, 0);
}

// Mensaje local (validación o modo sin conexión) con la misma forma que espera
// BannerError, para no mezclar errores de servidor con texto plano.
function avisoLocal(mensaje, titulo = 'Revisa la información') {
  return { titulo, mensaje, accion: '', categoria: 'usuario' };
}

function colorMargenClass(pct) {
  if (pct >= 40) return 'bg-success-soft text-success border border-success/30';
  if (pct >= 20) return 'bg-warning-soft text-warning border border-warning/30';
  return 'bg-danger-soft text-danger border border-danger/30';
}

export default function EditorRecetasPage() {
  const { tiene } = useAuth();
  const { confirm, notificar } = useAlert();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [idProductoSeleccionado, setIdProductoSeleccionado] = useState(
    () => searchParams.get('producto') ?? '',
  );
  const [recetaComponentes, setRecetaComponentes] = useState([]);
  const [recetaOriginal, setRecetaOriginal] = useState([]);
  const [stockSucursal, setStockSucursal] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorBase, setErrorBase] = useState(null);
  const [errorReceta, setErrorReceta] = useState(null);
  const [errorGuardar, setErrorGuardar] = useState(null);

  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const comboboxRef = useRef(null);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => String(p.id_producto) === String(idProductoSeleccionado));
  }, [productos, idProductoSeleccionado]);

  const hayComponentes = recetaComponentes.length > 0;
  const hayProducto = Boolean(productoSeleccionado);
  const hayCambios = useMemo(() => {
    return JSON.stringify(recetaComponentes) !== JSON.stringify(recetaOriginal);
  }, [recetaComponentes, recetaOriginal]);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function cargarDatosBase() {
      setCargando(true);
      setErrorBase(null);
      try {
        const [resProductos, resInsumos] = await Promise.allSettled([
          getProductos(),
          getInsumos(),
        ]);

        const listaProdCruda = resProductos.status === 'fulfilled'
          ? (Array.isArray(resProductos.value) ? resProductos.value : resProductos.value?.data ?? [])
          : MOCK_PRODUCTOS;

        const listaProductos = listaProdCruda
          .filter((p) => p.es_elaborado === true);

        const listaInsCruda = resInsumos.status === 'fulfilled'
          ? (Array.isArray(resInsumos.value) ? resInsumos.value : resInsumos.value?.data ?? [])
          : MOCK_INSUMOS;

        setProductos(listaProductos.length ? listaProductos : MOCK_PRODUCTOS.filter((p) => p.es_elaborado));
        setInsumos(listaInsCruda.length ? listaInsCruda : MOCK_INSUMOS);

        if (resProductos.status === 'rejected') {
          setErrorBase(avisoLocal('Usando catálogo local (sin conexión al backend).', 'Sin conexión'));
        }
      } catch {
        setProductos(MOCK_PRODUCTOS.filter((p) => p.es_elaborado));
        setInsumos(MOCK_INSUMOS);
        setErrorBase(avisoLocal('Modo demostración activo.', 'Sin conexión'));
      } finally {
        setCargando(false);
      }
    }
    cargarDatosBase();
  }, []);

  // ── Cargar stock en segundo plano para el simulador ────────────────────────
  useEffect(() => {
    async function cargarStock() {
      try {
        const res = await getStock();
        const data = Array.isArray(res) ? res : (res?.data ?? null);
        setStockSucursal(data ?? MOCK_STOCK_SUCURSAL);
      } catch {
        setStockSucursal(MOCK_STOCK_SUCURSAL);
      }
    }
    cargarStock();
  }, []);

  // ── Cargar receta al seleccionar producto ──────────────────────────────────
  const cargarReceta = useCallback(async (id) => {
    if (!id) {
      setRecetaComponentes([]);
      setRecetaOriginal([]);
      return;
    }
    setCargandoReceta(true);
    setErrorReceta(null);
    try {
      const res = await getReceta(id);
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray(res?.componentes)
        ? res.componentes
        : (res?.data?.componentes ?? (Array.isArray(res?.data) ? res.data : []));
      const componentes = rawList.map((c) => ({
        id_insumo: c.id_insumo,
        nombre_insumo: c.nombre_insumo || c.insumo || '',
        codigo_unidad: c.codigo_unidad || c.unidad || '',
        costo_promedio: String(c.costo_promedio ?? insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo))?.costo_promedio ?? '0.0000'),
        cantidad_requerida: String(c.cantidad_requerida ?? '1.0000'),
      }));
      setRecetaComponentes(componentes);
      setRecetaOriginal(JSON.parse(JSON.stringify(componentes)));
    } catch {
      const mock = mockRecetaPorProducto(Number(id));
      const componentes = mock?.componentes ?? [];
      setRecetaComponentes(componentes);
      setRecetaOriginal(JSON.parse(JSON.stringify(componentes)));
      setErrorReceta(avisoLocal('Receta cargada desde catálogo de respaldo.', 'Sin conexión'));
    } finally {
      setCargandoReceta(false);
    }
  }, []);

  useEffect(() => {
    if (idProductoSeleccionado && productos.length > 0) {
      cargarReceta(idProductoSeleccionado);
    }
  }, [idProductoSeleccionado, productos.length, cargarReceta]);

  // ── Cerrar dropdown de ingredientes al hacer clic fuera ───────────────────
  useEffect(() => {
    function handleClickFuera(e) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // ── Cambiar producto seleccionado ─────────────────────────────────────────
  async function handleCambiarProducto(nuevoId) {
    if (hayCambios) {
      const ok = await confirm(
        'Tienes modificaciones pendientes en la receta actual. ¿Deseas descartarlas y cambiar de producto?',
        {
          titulo: 'Cambios sin guardar',
          etiquetaCancelar: 'Seguir editando',
          etiquetaAceptar: 'Descartar y cambiar',
          destructivo: true,
        },
      );
      if (!ok) return;
    }

    setIdProductoSeleccionado(nuevoId);
    if (nuevoId) {
      navigate(`?producto=${nuevoId}`, { replace: true });
    } else {
      navigate('', { replace: true });
      setRecetaComponentes([]);
      setRecetaOriginal([]);
    }
  }

  // ── Combobox de insumos anti-duplicados ────────────────────────────────────
  const insumosYaEnReceta = useMemo(() => {
    return new Set(recetaComponentes.map((c) => Number(c.id_insumo)));
  }, [recetaComponentes]);

  const insumosFiltrados = useMemo(() => {
    const termino = busquedaInsumo.toLowerCase().trim();
    return insumos.filter((ins) => {
      const id = Number(ins.id_insumo);
      const yaExiste = insumosYaEnReceta.has(id);
      const coincide =
        !termino ||
        (ins.nombre ?? '').toLowerCase().includes(termino) ||
        (ins.codigo_sku && ins.codigo_sku.toLowerCase().includes(termino));
      return !yaExiste && coincide;
    });
  }, [insumos, insumosYaEnReceta, busquedaInsumo]);

  function handleSeleccionarInsumo(ins) {
    const nuevo = {
      id_insumo: ins.id_insumo,
      nombre_insumo: ins.nombre,
      codigo_unidad: ins.codigo_unidad ?? ins.unidad?.codigo ?? 'u',
      costo_promedio: String(ins.costo_promedio ?? '0.0000'),
      cantidad_requerida: '1.0000',
    };
    setRecetaComponentes((prev) => [...prev, nuevo]);
    setBusquedaInsumo('');
    setDropdownAbierto(false);
  }

  function handleCambiarCantidad(idInsumo, valor) {
    setRecetaComponentes((prev) =>
      prev.map((c) =>
        c.id_insumo === idInsumo ? { ...c, cantidad_requerida: valor } : c,
      ),
    );
  }

  function handleQuitarInsumo(idInsumo) {
    setRecetaComponentes((prev) => prev.filter((c) => c.id_insumo !== idInsumo));
  }

  // ── Guardar receta ─────────────────────────────────────────────────────────
  async function handleGuardar() {
    if (!idProductoSeleccionado) return;
    setErrorGuardar(null);

    const invalido = recetaComponentes.find((c) => !(Number(c.cantidad_requerida) > 0));
    if (invalido) {
      setErrorGuardar(avisoLocal(`La cantidad de "${invalido.nombre_insumo}" debe ser un número mayor a cero.`));
      return;
    }

    setGuardando(true);
    try {
      const componentes = recetaComponentes.map((c) => ({
        idInsumo: Number(c.id_insumo),
        cantidadRequerida: String(c.cantidad_requerida).trim(),
      }));
      await saveReceta(idProductoSeleccionado, { componentes });
      setRecetaOriginal(JSON.parse(JSON.stringify(recetaComponentes)));
      notificar.exito('Receta guardada exitosamente.', {
        mensaje: 'La explosión de insumos en POS y el simulador de costos se han actualizado.',
      });
    } catch (err) {
      setErrorGuardar(traducirError(err));
    } finally {
      setGuardando(false);
    }
  }

  // ── Descartar cambios ──────────────────────────────────────────────────────
  async function handleDescartar() {
    if (hayCambios) {
      const ok = await confirm(
        '¿Deseas restaurar la receta a su último estado guardado?',
        {
          titulo: 'Descartar cambios',
          etiquetaCancelar: 'Cancelar',
          etiquetaAceptar: 'Restaurar',
        },
      );
      if (!ok) return;
    }
    setRecetaComponentes(JSON.parse(JSON.stringify(recetaOriginal)));
  }

  // ── Simulador de disponibilidad operativa por sucursal ─────────────────────
  const { unidadesSimuladas, cuelloDeBotella, insumoEscasoDetalle } = useMemo(() => {
    if (!stockSucursal || !hayComponentes) {
      return { unidadesSimuladas: null, cuelloDeBotella: null, insumoEscasoDetalle: null };
    }

    let minUnidades = Infinity;
    let cuello = null;
    let detalle = null;

    for (const comp of recetaComponentes) {
      const cantReq = Number(comp.cantidad_requerida || 0);
      if (cantReq <= 0) continue;

      const stockItem = Array.isArray(stockSucursal)
        ? stockSucursal.find((s) => Number(s.id_insumo) === Number(comp.id_insumo))
        : null;

      const stockActual = stockItem ? Number(stockItem.stock_actual ?? stockItem.cantidad ?? 0) : 0;
      const posibles = Math.floor(stockActual / cantReq);

      if (posibles < minUnidades) {
        minUnidades = posibles;
        cuello = comp.nombre_insumo;
        detalle = {
          nombre: comp.nombre_insumo,
          stockActual,
          unidad: comp.codigo_unidad,
          cantReq,
        };
      }
    }

    return {
      unidadesSimuladas: minUnidades === Infinity ? 0 : Math.max(0, minUnidades),
      cuelloDeBotella: cuello,
      insumoEscasoDetalle: detalle,
    };
  }, [stockSucursal, hayComponentes, recetaComponentes]);

  // ── Métricas Financieras (Costeo en Tiempo Real) ───────────────────────────
  const costoTotal = useMemo(() => calcCostoTotal(recetaComponentes), [recetaComponentes]);
  const precioVentaNum = hayProducto ? Number(productoSeleccionado.precio_venta || 0) : 0;
  const margenDolares = Math.max(0, Math.round((precioVentaNum - costoTotal) * 10000) / 10000);
  const margenPorcentaje = precioVentaNum > 0 ? (margenDolares / precioVentaNum) * 100 : 0;
  const colorMargen = colorMargenClass(margenPorcentaje);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Inventario & Catálogo"
        titulo="Editor de Recetas (BOM)"
        descripcion="Configura los componentes de producción (Bill of Materials) para costeo exacto y descuento automático en POS."
        acciones={
          <Button
            variante="ghost"
            icono={ArrowLeft}
            onClick={() => navigate('/inventario/productos')}
          >
            Volver a Productos
          </Button>
        }
      />

      {errorBase && <BannerError error={errorBase} onCerrar={() => setErrorBase(null)} />}

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Spinner texto="Cargando productos elaborados e insumos…" />
        </div>
      ) : (
        /* Workspace Dividido (Split Workspace) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          {/* ══════════════ PANEL IZQUIERDO: FICHA Y SIMULADOR ══════════════ */}
          <div className="space-y-5">
            {/* 1. Selector de Producto Elaborado */}
            <Card titulo="Producto a Configurar" descripcion="Solo productos elaborados con receta activa">
              <div className="space-y-3">
                <Select
                  id="selector-producto"
                  aria-label="Seleccionar producto elaborado"
                  placeholder="— Selecciona un producto elaborado —"
                  value={idProductoSeleccionado}
                  onChange={(e) => handleCambiarProducto(e.target.value)}
                  opciones={productos.map((p) => ({
                    valor: String(p.id_producto),
                    texto: `${p.nombre} (${formatoDinero(p.precio_venta)})`,
                  }))}
                  buscable
                />

                {hayProducto && (
                  <div className="rounded-lg border border-line bg-muted/40 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Código/SKU:</span>
                      <span className="font-mono text-fg">{productoSeleccionado.codigo_barra || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Precio de venta con IVA:</span>
                      <span className="font-mono font-bold text-primary-text">
                        {formatoDinero(productoSeleccionado.precio_venta)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 2. Tarjeta de Costeo en Tiempo Real */}
            {hayProducto && hayComponentes ? (
              <Card
                titulo="Simulador Financiero"
                descripcion="Costeo teórico de producción basado en costo promedio ponderado"
              >
                <dl className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-1 border-b border-line/60">
                    <dt className="text-fg-muted">Costo teórico de producción</dt>
                    <dd className="font-mono font-bold text-fg">$ {costoTotal.toFixed(4)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1 border-b border-line/60">
                    <dt className="text-fg-muted">Precio de venta al público</dt>
                    <dd className="font-mono font-semibold text-fg">
                      {formatoDinero(productoSeleccionado.precio_venta)}
                    </dd>
                  </div>
                  <div className={`flex items-center justify-between rounded-lg p-3 text-sm font-bold ${colorMargen}`}>
                    <dt>Margen Bruto Estimado</dt>
                    <dd className="font-mono">
                      $ {margenDolares.toFixed(2)} ({margenPorcentaje.toFixed(1)}%)
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-fg-muted">
                  Margen saludable sugerido: ≥ 40% (Verde), 20–39% (Ocre), &lt; 20% (Alerta roja).
                </p>
              </Card>
            ) : null}

            {/* 3. Simulador de Disponibilidad por Sucursal */}
            {hayProducto && (
              <Card
                titulo="Disponibilidad Operativa"
                descripcion="Capacidad máxima de preparación según stock en sucursal"
              >
                {unidadesSimuladas !== null ? (
                  <div className="space-y-3 text-center py-2">
                    <p className="text-5xl font-black font-mono text-primary-text">
                      {unidadesSimuladas}
                    </p>
                    <p className="text-sm font-medium text-fg">
                      unidades máximas que se pueden preparar
                    </p>
                    {cuelloDeBotella ? (
                      <div className="rounded-lg bg-warning-soft border border-warning/30 p-2.5 text-xs text-warning text-left flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">Cuello de botella: {cuelloDeBotella}</p>
                          {insumoEscasoDetalle && (
                            <p className="mt-0.5 opacity-90">
                              Existencia: {insumoEscasoDetalle.stockActual} {insumoEscasoDetalle.unidad} (requiere {insumoEscasoDetalle.cantReq} por unidad)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-success font-semibold">
                        Inventario suficiente en todos los ingredientes.
                      </p>
                    )}
                  </div>
                ) : (
                  <EstadoVacio
                    icono={Package}
                    titulo="Sin datos de stock"
                  >
                    Asigna una sucursal con existencias activas para proyectar disponibilidad.
                  </EstadoVacio>
                )}
              </Card>
            )}
          </div>

          {/* ══════════════ PANEL DERECHO: CONSTRUCTOR INTERACTIVO ══════════════ */}
          <div className="card space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">
                  {productoSeleccionado?.nombre ?? 'Selecciona un producto'}
                </h2>
                <p className="text-xs text-fg-muted">Constructor interactivo de Bill of Materials</p>
              </div>
              {hayProducto && (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-text">
                  {recetaComponentes.length} ingrediente{recetaComponentes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {errorReceta && (
              <BannerError error={errorReceta} onCerrar={() => setErrorReceta(null)} />
            )}
            {errorGuardar && (
              <BannerError error={errorGuardar} onCerrar={() => setErrorGuardar(null)} />
            )}

            {cargandoReceta ? (
              <div className="flex items-center justify-center py-16">
                <Spinner texto="Cargando componentes de receta…" />
              </div>
            ) : hayProducto ? (
              <>
                {/* Combobox de búsqueda para agregar insumo anti-duplicados */}
                {tiene('INV_GESTIONAR_RECETAS') && (
                  <div className="relative" ref={comboboxRef}>
                    <label htmlFor="agregar-insumo-receta" className="mb-1 block text-sm font-medium text-fg">
                      Agregar ingrediente al producto
                    </label>
                    <div className="relative">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                      <input
                        id="agregar-insumo-receta"
                        type="text"
                        className="input pl-9 h-10 rounded-lg focus:ring-2 focus:ring-[#B15C3D]/30 focus:border-[#B15C3D]"
                        placeholder="Buscar insumo disponible por nombre o código…"
                        value={busquedaInsumo}
                        onChange={(e) => {
                          setBusquedaInsumo(e.target.value);
                          setDropdownAbierto(true);
                        }}
                        onFocus={() => setDropdownAbierto(true)}
                      />
                    </div>

                    {dropdownAbierto && busquedaInsumo.trim().length > 0 && (
                      <ul className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface shadow-xl scroll-fino p-1.5 space-y-0.5">
                        {insumosFiltrados.length === 0 ? (
                          <li className="p-3 text-xs text-fg-muted text-center">
                            No hay insumos disponibles que coincidan o ya están en la receta.
                          </li>
                        ) : (
                          insumosFiltrados.map((ins) => (
                            <li
                              key={ins.id_insumo}
                              className="flex cursor-pointer items-center justify-between p-2.5 rounded-lg text-sm hover:bg-espresso-100/60 dark:hover:bg-espresso-800/60 transition-colors select-none"
                              onMouseDown={() => handleSeleccionarInsumo(ins)}
                            >
                              <div>
                                <span className="font-semibold text-fg">{ins.nombre}</span>
                                {ins.codigo_sku && (
                                  <span className="ml-2 font-mono text-xs text-fg-muted">
                                    {ins.codigo_sku}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs font-semibold text-primary-text bg-primary-soft px-2.5 py-0.5 rounded-md">
                                {ins.codigo_unidad ?? 'u'} · $ {ins.costo_promedio ?? '0.0000'}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tabla editable de componentes */}
                {hayComponentes ? (
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-muted/60 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        <tr>
                          <th className="px-4 py-3">Insumo</th>
                          <th className="px-3 py-3">Unidad</th>
                          <th className="px-3 py-3 text-right">Cantidad Requerida</th>
                          <th className="px-4 py-3 text-right">Costo Subtotal</th>
                          {tiene('INV_GESTIONAR_RECETAS') && (
                            <th className="px-3 py-3 text-right" aria-label="Acciones" />
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {recetaComponentes.map((c) => {
                          const cant = Number(c.cantidad_requerida || 0);
                          const costoUnit = Number(c.costo_promedio || 0);
                          const subtotal = Math.round(cant * costoUnit * 10000) / 10000;

                          return (
                            <tr key={c.id_insumo} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium text-fg">
                                {c.nombre_insumo}
                              </td>
                              <td className="px-3 py-3 text-fg-muted font-mono text-xs">
                                {c.codigo_unidad}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {tiene('INV_GESTIONAR_RECETAS') ? (
                                  <input
                                    type="number"
                                    min="0.0001"
                                    step="0.0001"
                                    className="input w-28 text-right font-mono text-sm py-1"
                                    value={c.cantidad_requerida}
                                    onChange={(e) =>
                                      handleCambiarCantidad(c.id_insumo, e.target.value)
                                    }
                                  />
                                ) : (
                                  <span className="font-mono">{c.cantidad_requerida}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
                                $ {subtotal.toFixed(4)}
                              </td>
                              {tiene('INV_GESTIONAR_RECETAS') && (
                                <td className="px-3 py-3 text-right">
                                  <button
                                    type="button"
                                    className="btn-ghost !p-1.5 min-h-7 text-danger hover:bg-danger-soft"
                                    title="Quitar ingrediente"
                                    onClick={() => handleQuitarInsumo(c.id_insumo)}
                                  >
                                    <X size={14} aria-hidden="true" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-line bg-muted/20 font-bold">
                          <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-fg-muted">
                            Costo Teórico Total:
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary-text">
                            $ {costoTotal.toFixed(4)}
                          </td>
                          {tiene('INV_GESTIONAR_RECETAS') && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <EstadoVacio
                    icono={FlaskConical}
                    titulo="Receta sin ingredientes"
                  >
                    Utiliza el buscador superior para agregar materias primas o empaques a la fórmula de este producto.
                  </EstadoVacio>
                )}

                {/* Acciones del Constructor */}
                {tiene('INV_GESTIONAR_RECETAS') && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variante="primary"
                        cargando={guardando}
                        disabled={guardando || !hayComponentes}
                        onClick={handleGuardar}
                        icono={Check}
                      >
                        Guardar Receta
                      </Button>
                      <Button
                        variante="ghost"
                        disabled={guardando || !hayCambios}
                        onClick={handleDescartar}
                      >
                        Descartar Cambios
                      </Button>
                    </div>

                    {hayCambios && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                        <Sparkles size={13} aria-hidden="true" />
                        Cambios sin guardar
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <EstadoVacio
                icono={ChefHat}
                titulo="Ningún producto seleccionado"
              >
                Selecciona un producto elaborado en el panel izquierdo para ver, simular o modificar su receta (BOM).
              </EstadoVacio>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
