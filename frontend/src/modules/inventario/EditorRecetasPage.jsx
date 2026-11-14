import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X, ChefHat, FlaskConical, Search, AlertCircle, ArrowLeft, Check, Sparkles, Package,
  AlertTriangle, Pencil,
} from 'lucide-react';

import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card } from '../../components/ui/index.js';
import { formatoDinero, formatearUnidades, enteroParaInput } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import {
  calcularCostoReceta,
  calcularMargen,
  calcularMargenDolares,
  calcularSubtotalLinea,
  calcularPrecioSugerido,
} from './costeo.js';

import {
  getProductos,
  getInsumos,
  getReceta,
  saveReceta,
  getStock,
  getUnidades,
  updateProducto,
} from './inventarioApi.js';
import InsumoDrawer from './InsumoDrawer.jsx';

// ─── Helpers Financieros Anti-Float ──────────────────────────────────────────
// Mensaje local (validación o modo sin conexión) con la misma forma que espera
// BannerError, para no mezclar errores de servidor con texto plano.
function avisoLocal(mensaje, titulo = 'Revisa la información') {
  return { titulo, mensaje, accion: '', categoria: 'usuario' };
}

function limpiarCerosCantidad(valor) {
  return enteroParaInput(valor) || '1';
}

function colorMargenClass(pct) {
  if (pct >= 40) return 'bg-success-soft text-success border border-success/30';
  if (pct >= 20) return 'bg-warning-soft text-warning border border-warning/30';
  return 'bg-danger-soft text-danger border border-danger/30';
}

// ─── Skeletons Cálidos (Reemplazo de Spinners Circulares) ─────────────────────
function RecetaWorkspaceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] animate-pulse" aria-busy="true" aria-label="Cargando receta">
      {/* Panel Izquierdo Skeleton */}
      <div className="space-y-5">
        {/* Ficha producto */}
        <div className="card space-y-3 p-5">
          <div className="h-5 w-44 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
          <div className="h-3 w-56 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
          <div className="rounded-lg border border-line bg-muted/40 p-3 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
              <div className="h-3 w-24 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-28 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
              <div className="h-4 w-16 rounded bg-espresso-200/60 dark:bg-espresso-800/50" />
            </div>
          </div>
        </div>

        {/* Simulador financiero skeleton */}
        <div className="card space-y-3 p-5">
          <div className="h-5 w-40 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
          <div className="h-3 w-48 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
          <div className="space-y-3 pt-2">
            <div className="flex justify-between py-1 border-b border-line/60">
              <div className="h-4 w-32 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
              <div className="h-4 w-16 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
            </div>
            <div className="flex justify-between py-1 border-b border-line/60">
              <div className="h-4 w-36 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
              <div className="h-4 w-16 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
            </div>
            <div className="h-10 rounded-lg bg-espresso-200/40 dark:bg-espresso-800/30" />
          </div>
        </div>

        {/* Disponibilidad operativa skeleton */}
        <div className="card space-y-3 p-5">
          <div className="flex justify-between items-center">
            <div className="h-5 w-44 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
            <div className="h-7 w-32 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
          </div>
          <div className="py-4 text-center space-y-2">
            <div className="h-12 w-24 mx-auto rounded bg-espresso-200/60 dark:bg-espresso-800/50" />
            <div className="h-4 w-48 mx-auto rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
          </div>
        </div>
      </div>

      {/* Panel Derecho Skeleton */}
      <div className="card space-y-5 p-5">
        <div className="flex justify-between items-center border-b border-line pb-4">
          <div className="space-y-1.5">
            <div className="h-6 w-52 rounded bg-espresso-200/60 dark:bg-espresso-800/50" />
            <div className="h-3 w-40 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
          </div>
          <div className="h-6 w-24 rounded-full bg-espresso-100/60 dark:bg-espresso-900/40" />
        </div>
        <div className="h-10 rounded-lg bg-espresso-100/50 dark:bg-espresso-900/40" />
        <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center p-3.5">
              <div className="h-4 w-36 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
              <div className="h-4 w-12 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
              <div className="h-7 w-20 rounded bg-espresso-100/60 dark:bg-espresso-900/40" />
              <div className="h-4 w-16 rounded bg-espresso-200/50 dark:bg-espresso-800/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TablaRecetaSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-pulse" aria-busy="true" aria-label="Cargando componentes de receta">
      <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center p-3.5">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 rounded bg-espresso-200/60 dark:bg-espresso-800/50" />
              <div className="h-3 w-20 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
            </div>
            <div className="h-4 w-12 rounded bg-espresso-100/50 dark:bg-espresso-900/40" />
            <div className="h-7 w-20 rounded bg-espresso-100/60 dark:bg-espresso-900/40" />
            <div className="h-4 w-16 rounded bg-espresso-200/50 dark:bg-espresso-800/40 text-right" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditorRecetasPage() {
  const { tiene, usuario } = useAuth();
  const verCostos = tiene('INV_VER_COSTOS');
  const { confirm, notificar } = useAlert();
  const { idProducto } = useParams();
  const navigate = useNavigate();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [drawerInsumoAbierto, setDrawerInsumoAbierto] = useState(false);
  const [valoresInsumo, setValoresInsumo] = useState({});
  const idProductoSeleccionado = idProducto ?? '';
  const [recetaComponentes, setRecetaComponentes] = useState([]);
  const [recetaOriginal, setRecetaOriginal] = useState([]);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Disponibilidad por sucursal
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [stockSucursal, setStockSucursal] = useState(null);
  const [errorStock, setErrorStock] = useState(false);

  // Ajuste rápido de precio
  const [panelAjustePrecioAbierto, setPanelAjustePrecioAbierto] = useState(false);
  const [precioAjuste, setPrecioAjuste] = useState('');
  const [actualizandoPrecio, setActualizandoPrecio] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorBase, setErrorBase] = useState(null);
  const [errorInsumos, setErrorInsumos] = useState(null);
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

  // ── Carga inicial de datos base ────────────────────────────────────────────
  useEffect(() => {
    async function cargarDatosBase() {
      setCargando(true);
      setErrorBase(null);
      try {
        const [resProductos, resInsumos, resUnidades] = await Promise.allSettled([
          getProductos(),
          getInsumos(),
          getUnidades(),
        ]);

        const listaProdCruda = resProductos.status === 'fulfilled'
          ? (Array.isArray(resProductos.value) ? resProductos.value : resProductos.value?.data ?? [])
          : [];

        const listaProductos = listaProdCruda
          .filter((p) => p.es_elaborado === true)
          .sort((a, b) => Number(a.n_ingredientes) - Number(b.n_ingredientes));

        const listaInsCruda = resInsumos.status === 'fulfilled'
          ? (Array.isArray(resInsumos.value) ? resInsumos.value : resInsumos.value?.data ?? [])
          : [];

        setProductos(listaProductos);
        setInsumos(listaInsCruda);
        if (resUnidades.status === 'fulfilled') setUnidades(Array.isArray(resUnidades.value) ? resUnidades.value : (resUnidades.value?.data ?? []));
        if (resProductos.status === 'rejected') setErrorBase(traducirError(resProductos.reason));
        if (resInsumos.status === 'rejected') setErrorInsumos(traducirError(resInsumos.reason));
      } catch (err) {
        setProductos([]);
        setInsumos([]);
        setErrorBase(traducirError(err));
      } finally {
        setCargando(false);
      }
    }
    cargarDatosBase();
  }, []);

  // ── Cargar sucursales para el selector de disponibilidad ───────────────────
  useEffect(() => {
    let cancelado = false;
    async function cargarSucursales() {
      try {
        const res = await api.get('/empresa/sucursales');
        const lista = (Array.isArray(res) ? res : res?.data ?? []).filter((s) => s.activa !== false);
        if (!cancelado) {
          if (lista.length > 0) setSucursales(lista);
          else setSucursales(usuario?.sucursales ?? []);
        }
      } catch {
        if (!cancelado) setSucursales(usuario?.sucursales ?? []);
      }
    }
    cargarSucursales();
    return () => { cancelado = true; };
  }, [usuario]);

  // ── Cargar stock por sucursal o global en segundo plano ─────────────────────
  const cargarStock = useCallback(async (idSuc) => {
    try {
      const res = await getStock(idSuc || null);
      const data = Array.isArray(res) ? res : (res?.data ?? null);
      setStockSucursal(data ?? []);
      setErrorStock(false);
    } catch {
      setStockSucursal(null);
      setErrorStock(true);
    }
  }, []);

  useEffect(() => {
    cargarStock(sucursalSeleccionada);
  }, [sucursalSeleccionada, cargarStock]);

  // ── Cargar receta al seleccionar producto ──────────────────────────────────
  const cargarReceta = useCallback(async (id) => {
    if (!id) {
      setRecetaComponentes([]);
      setRecetaOriginal([]);
      setModoEdicion(false);
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
      const componentes = rawList.map((c) => {
        const insumoCat = insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo));
        const activo = c.insumo_activo !== undefined ? c.insumo_activo : (insumoCat ? insumoCat.activo !== false : true);
        const costoUnit = c.costo_promedio ?? c.costo_unitario ?? c.costo ?? c.precio_unitario ?? insumoCat?.costo_promedio ?? insumoCat?.costo_unitario ?? insumoCat?.costo ?? insumoCat?.precio_unitario ?? '0.0000';
        return {
          id_insumo: c.id_insumo,
          nombre_insumo: c.nombre_insumo || c.insumo || '',
          codigo_unidad: c.codigo_unidad || c.unidad || '',
          costo_promedio: String(costoUnit),
          cantidad_requerida: limpiarCerosCantidad(c.cantidad_requerida ?? '1'),
          activo,
        };
      });
      setRecetaComponentes(componentes);
      setRecetaOriginal(JSON.parse(JSON.stringify(componentes)));
      // Si el producto no tiene ingredientes guardados, abrir en constructor interactivo; si tiene, en ficha técnica
      if (componentes.length === 0) {
        setModoEdicion(true);
      } else {
        setModoEdicion(false);
      }
    } catch (err) {
      setRecetaComponentes([]);
      setRecetaOriginal([]);
      setErrorReceta(traducirError(err));
    } finally {
      setCargandoReceta(false);
    }
  }, [insumos]);

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

  useEffect(() => {
    const salir = (evento) => {
      if (hayCambios) evento.returnValue = 'Tienes cambios sin guardar.';
    };
    window.addEventListener('beforeunload', salir);
    return () => window.removeEventListener('beforeunload', salir);
  }, [hayCambios]);

  // ── Combobox de insumos anti-duplicados ────────────────────────────────────
  const insumosYaEnReceta = useMemo(() => {
    return new Set(recetaComponentes.map((c) => Number(c.id_insumo)));
  }, [recetaComponentes]);

  const insumosFiltrados = useMemo(() => {
    const termino = busquedaInsumo.toLowerCase().trim();
    return insumos.filter((ins) => {
      const id = Number(ins.id_insumo);
      const yaExiste = insumosYaEnReceta.has(id);
      const disponible = ins.activo !== false && String(ins.tipo_insumo ?? '').toUpperCase() !== 'REVENTA';
      const coincide =
        !termino ||
        (ins.nombre ?? '').toLowerCase().includes(termino) ||
        false;
      return disponible && !yaExiste && coincide;
    });
  }, [insumos, insumosYaEnReceta, busquedaInsumo]);

  function handleSeleccionarInsumo(ins, cantidadRequerida = '1') {
    const costoUnit = ins.costo_promedio ?? ins.costo_unitario ?? ins.costo ?? ins.precio_unitario ?? '0.0000';
    const nuevo = {
      id_insumo: ins.id_insumo,
      nombre_insumo: ins.nombre,
      codigo_unidad: ins.codigo_unidad ?? ins.unidad?.codigo ?? 'u',
      costo_promedio: String(costoUnit),
      cantidad_requerida: limpiarCerosCantidad(cantidadRequerida),
      activo: ins.activo !== false,
    };
    setRecetaComponentes((prev) => [...prev, nuevo]);
    setBusquedaInsumo('');
    setDropdownAbierto(false);
    return nuevo;
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
      setProductos((actuales) => actuales.map((p) => String(p.id_producto) === String(idProductoSeleccionado) ? { ...p, n_ingredientes: recetaComponentes.length } : p));
      setModoEdicion(false); // Retorna a modo visualización de ficha técnica
      notificar.exito('Receta guardada exitosamente.', {
        mensaje: 'La receta en POS y el simulador de costos se han actualizado.',
      });
      const siguiente = productos.find((p) => String(p.id_producto) !== String(idProductoSeleccionado) && Number(p.n_ingredientes) === 0);
      if (siguiente) {
        const irSiguiente = await confirm({ titulo: 'Receta guardada', mensaje: 'Receta guardada. ¿Ir al siguiente producto sin receta?', etiquetaCancelar: 'Quedarme aquí', etiquetaAceptar: 'Siguiente pendiente' });
        if (irSiguiente) {
          navigate(`/catalogo/productos/${siguiente.id_producto}/receta`, { replace: true });
        }
      }
    } catch (err) {
      setErrorGuardar(traducirError(err));
    } finally {
      setGuardando(false);
    }
  }

  // ── Cancelar cambios ───────────────────────────────────────────────────────
  async function handleDescartar() {
    if (hayCambios) {
      const ok = await confirm(
        '¿Deseas restaurar la receta a su último estado guardado y descartar las modificaciones?',
        {
          titulo: 'Descartar cambios',
          etiquetaCancelar: 'Continuar editando',
          etiquetaAceptar: 'Descartar y volver',
        },
      );
      if (!ok) return false;
    }
    setRecetaComponentes(JSON.parse(JSON.stringify(recetaOriginal)));
    if (recetaOriginal.length > 0) {
      setModoEdicion(false);
    }
    return true;
  }

  // ── Simulador de disponibilidad operativa por sucursal ─────────────────────
  const nombreSucursalSeleccionada = useMemo(() => {
    if (!sucursalSeleccionada) return '';
    return sucursales.find((s) => String(s.id_sucursal) === String(sucursalSeleccionada))?.nombre ?? '';
  }, [sucursalSeleccionada, sucursales]);

  const subtituloDisponibilidad = sucursalSeleccionada
    ? `Proyección según existencias en ${nombreSucursalSeleccionada}`
    : 'Proyección informativa según stock actual en todas las sucursales';

  const { unidadesSimuladas, cuelloDeBotella, insumoEscasoDetalle, insumoAgotado } = useMemo(() => {
    if (!stockSucursal || !hayComponentes) {
      return { unidadesSimuladas: null, cuelloDeBotella: null, insumoEscasoDetalle: null, insumoAgotado: null };
    }

    let minUnidades = Infinity;
    let cuello = null;
    let detalle = null;
    let agotado = null;

    for (const comp of recetaComponentes) {
      const cantReq = Number(comp.cantidad_requerida || 0);
      if (cantReq <= 0) continue;

      let stockActual = 0;
      if (sucursalSeleccionada) {
        const fila = Array.isArray(stockSucursal)
          ? stockSucursal.find((s) => Number(s.id_insumo) === Number(comp.id_insumo))
          : null;
        stockActual = fila ? Number(fila.stock_actual ?? fila.cantidad ?? 0) : 0;
      } else {
        // Global: acumular existencias de todas las sucursales asignadas
        const filas = Array.isArray(stockSucursal)
          ? stockSucursal.filter((s) => Number(s.id_insumo) === Number(comp.id_insumo))
          : [];
        stockActual = filas.reduce((acc, r) => acc + Number(r.stock_actual ?? r.cantidad ?? 0), 0);
      }

      if (stockActual <= 0 && !agotado) {
        agotado = {
          nombre: comp.nombre_insumo,
          unidad: comp.codigo_unidad,
        };
      }

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
      insumoAgotado: agotado,
    };
  }, [stockSucursal, hayComponentes, recetaComponentes, sucursalSeleccionada]);

  // ── Métricas Financieras (Costeo en Tiempo Real) ───────────────────────────
  const costoTotal = useMemo(() => calcularCostoReceta(recetaComponentes), [recetaComponentes]);
  const margenDolares = calcularMargenDolares(productoSeleccionado?.precio_venta ?? '0', costoTotal);
  const margenPorcentaje = calcularMargen(productoSeleccionado?.precio_venta ?? '0', costoTotal) ?? 0;
  const colorMargen = colorMargenClass(margenPorcentaje);
  const hayInsumosSinCosto = useMemo(() => {
    return recetaComponentes.some((c) => Number(c.costo_promedio || 0) === 0);
  }, [recetaComponentes]);

  // ── Ajuste Rápido de Precio (Margen Saludable 40%) ─────────────────────────
  const precioSugerido40 = useMemo(() => {
    return calcularPrecioSugerido(costoTotal, 0.40);
  }, [costoTotal]);

  const margenProyectado = useMemo(() => {
    if (!precioAjuste || Number(precioAjuste) <= 0) return 0;
    return calcularMargen(precioAjuste, costoTotal) ?? 0;
  }, [precioAjuste, costoTotal]);

  const margenDolaresProyectado = useMemo(() => {
    if (!precioAjuste || Number(precioAjuste) <= 0) return '0.0000';
    return calcularMargenDolares(precioAjuste, costoTotal);
  }, [precioAjuste, costoTotal]);

  const colorMargenProyectado = colorMargenClass(margenProyectado);

  async function handleActualizarPrecio() {
    if (!productoSeleccionado || !precioAjuste || Number(precioAjuste) <= 0) return;
    setActualizandoPrecio(true);
    try {
      const nuevoPrecioStr = Number(precioAjuste).toFixed(2);
      const payload = {
        nombre: productoSeleccionado.nombre,
        id_categoria: productoSeleccionado.id_categoria,
        codigo_barra: productoSeleccionado.codigo_barra,
        precio_venta: nuevoPrecioStr,
        es_elaborado: productoSeleccionado.es_elaborado,
        id_insumo_reventa: productoSeleccionado.id_insumo_reventa,
        activo: productoSeleccionado.activo !== false,
      };
      await updateProducto(productoSeleccionado.id_producto, payload);
      setProductos((prev) =>
        prev.map((p) =>
          String(p.id_producto) === String(productoSeleccionado.id_producto)
            ? { ...p, precio_venta: nuevoPrecioStr }
            : p
        )
      );
      notificar.exito(`Precio actualizado a ${formatoDinero(nuevoPrecioStr)}.`);
      setPanelAjustePrecioAbierto(false);
    } catch (err) {
      notificar.error(traducirError(err));
    } finally {
      setActualizandoPrecio(false);
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Catálogo › Productos"
        titulo={`${productoSeleccionado?.nombre ?? 'Producto'} › Receta`}
        descripcion="Fórmula estándar de producción (global por producto). Define los insumos y cantidades; el sistema descuenta stock automáticamente en el POS según esta receta."
        acciones={
          <Button
            variante="ghost"
            icono={ArrowLeft}
            onClick={() => navigate('/catalogo/productos')}
          >
            Volver a Productos
          </Button>
        }
      />

      {errorBase && <BannerError error={errorBase} onReintentar={() => globalThis.location?.reload()} onCerrar={() => setErrorBase(null)} />}

      {cargando ? (
        <RecetaWorkspaceSkeleton />
      ) : (
        /* Workspace Dividido (Split Workspace) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          {/* ══════════════ PANEL IZQUIERDO: FICHA Y SIMULADOR ══════════════ */}
          <div className="space-y-5">
            {/* 1. Selector de Producto Elaborado */}
            <Card titulo="Producto a Configurar" descripcion="Producto elaborado seleccionado desde el catálogo">
              <div className="space-y-3">
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
            {verCostos && hayProducto && hayComponentes ? (
              <Card
                titulo="Simulador Financiero"
                descripcion="Costeo teórico de producción basado en costo promedio"
              >
                <dl className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-1 border-b border-line/60">
                    <dt className="text-fg-muted">Costo teórico de producción</dt>
                    <dd className="font-mono font-bold text-fg">{formatoDinero(costoTotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1 border-b border-line/60">
                    <dt className="text-fg-muted">Precio de venta al público</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-fg">
                        {formatoDinero(productoSeleccionado.precio_venta)}
                      </span>
                      {tiene('INV_GESTIONAR_PRODUCTOS') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPrecioAjuste(productoSeleccionado.precio_venta);
                            setPanelAjustePrecioAbierto((prev) => !prev);
                          }}
                          className="text-xs text-primary-text font-semibold hover:underline"
                        >
                          {panelAjustePrecioAbierto ? 'Ocultar' : 'Ajustar precio'}
                        </button>
                      )}
                    </dd>
                  </div>
                  <div className={`flex items-center justify-between rounded-lg p-3 text-sm font-bold ${colorMargen} ${margenPorcentaje < 0 ? 'text-danger' : ''}`}>
                    <dt>Margen sobre precio sin IVA</dt>
                    <dd className="font-mono text-right">
                      {formatoDinero(margenDolares)} ({Number(margenPorcentaje).toFixed(1)}%)
                    </dd>
                  </div>
                </dl>

                {/* Alerta de margen ocre / rojo y panel de ajuste rápido */}
                {margenPorcentaje < 40 && !panelAjustePrecioAbierto && tiene('INV_GESTIONAR_PRODUCTOS') && (
                  <div className="mt-3 rounded-lg bg-warning-soft border border-warning/30 p-2.5 text-xs text-warning flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {margenPorcentaje < 20 ? 'Alerta: Margen crítico (< 20%)' : 'Margen bajo (20–39%)'}
                      </p>
                      <p className="opacity-90">Precio sugerido con IVA (40% margen): <strong>{formatoDinero(precioSugerido40)}</strong></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrecioAjuste(precioSugerido40);
                        setPanelAjustePrecioAbierto(true);
                      }}
                      className="px-2.5 py-1 rounded bg-warning text-white dark:text-espresso-950 font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Ajustar precio
                    </button>
                  </div>
                )}

                {/* Panel expandible de ajuste rápido de precio */}
                {panelAjustePrecioAbierto && tiene('INV_GESTIONAR_PRODUCTOS') && (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary-soft/30 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary-text">
                        Ajuste rápido de precio
                      </h4>
                      <button
                        type="button"
                        onClick={() => setPanelAjustePrecioAbierto(false)}
                        className="text-fg-muted hover:text-fg text-xs"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-surface/80 p-2.5 rounded-lg border border-line gap-2">
                      <div>
                        <span className="text-fg-muted block">Precio sugerido (40% margen con IVA):</span>
                        <span className="font-mono font-bold text-sm text-fg">{formatoDinero(precioSugerido40)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrecioAjuste(precioSugerido40)}
                        className="btn-ghost !py-1 !px-2.5 text-xs font-semibold text-primary-text border border-primary/30 hover:bg-primary-soft whitespace-nowrap"
                      >
                        Aplicar sugerido
                      </button>
                    </div>

                    <div>
                      <label htmlFor="nuevo-precio-producto" className="block text-xs font-medium text-fg mb-1">
                        Nuevo precio con IVA ($):
                      </label>
                      <input
                        id="nuevo-precio-producto"
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input font-mono text-sm py-1.5"
                        value={precioAjuste}
                        onChange={(e) => setPrecioAjuste(e.target.value)}
                        placeholder="Ej. 3.50"
                      />
                    </div>

                    {Number(precioAjuste) > 0 && (
                      <div className={`flex items-center justify-between rounded-lg p-2 text-xs font-bold ${colorMargenProyectado}`}>
                        <span>Margen proyectado:</span>
                        <span className="font-mono">
                          {formatoDinero(margenDolaresProyectado)} ({Number(margenProyectado).toFixed(1)}%)
                        </span>
                      </div>
                    )}

                    <Button
                      variante="primary"
                      className="w-full justify-center !py-2 text-xs"
                      disabled={actualizandoPrecio || !precioAjuste || Number(precioAjuste) <= 0 || precioAjuste === String(productoSeleccionado.precio_venta)}
                      cargando={actualizandoPrecio}
                      onClick={handleActualizarPrecio}
                    >
                      Actualizar precio del producto
                    </Button>
                  </div>
                )}

                {hayInsumosSinCosto && (
                  <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <p>
                      Uno o más ingredientes no tienen costo base registrado ($0.00) por falta de compras. El costo teórico y margen se actualizarán al registrar compras en el sistema.
                    </p>
                  </div>
                )}
                <p className="mt-3 text-xs text-fg-muted">
                  Margen saludable sugerido: ≥ 40% (Verde), 20–39% (Ocre), &lt; 20% (Alerta roja).
                </p>
              </Card>
            ) : null}

            {/* 3. Simulador de Disponibilidad Operativa — panel informativo por sucursal */}
            {/* La receta es global; este panel solo proyecta stock actual para referencia */}
            {hayProducto && (
              <Card
                titulo="Disponibilidad Operativa"
                descripcion={subtituloDisponibilidad}
                acciones={
                  sucursales.length > 0 && (
                    <select
                      id="selector-sucursal-disponibilidad"
                      className="input text-xs py-1 px-2.5 h-8 bg-surface rounded-lg border-line max-w-48 font-medium"
                      value={sucursalSeleccionada}
                      onChange={(e) => setSucursalSeleccionada(e.target.value)}
                      aria-label="Seleccionar sucursal para consultar disponibilidad"
                    >
                      <option value="">Todas las sucursales (Global)</option>
                      {sucursales.map((s) => (
                        <option key={s.id_sucursal} value={String(s.id_sucursal)}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  )
                }
              >
              {errorStock ? (
                <p className="py-6 text-center text-sm text-fg-muted">No se pudo consultar existencias en este momento</p>
              ) : unidadesSimuladas !== null ? (
                  <div className="space-y-3 text-center py-2">
                    <p className="text-5xl font-black font-mono text-primary-text">
                      {formatearUnidades(unidadesSimuladas)}
                    </p>
                    <p className="text-sm font-medium text-fg">
                      unidades preparables {sucursalSeleccionada ? `en ${nombreSucursalSeleccionada}` : 'según stock actual'}
                    </p>
                    {insumoAgotado ? (
                      <div className="rounded-lg bg-danger-soft border border-danger/30 p-2.5 text-xs text-danger text-left flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">Insumo agotado: {insumoAgotado.nombre}</p>
                          <p className="mt-0.5 opacity-90">
                            Tiene 0 existencias en {sucursalSeleccionada ? nombreSucursalSeleccionada : 'el sistema'}, impidiendo preparar este producto.
                          </p>
                        </div>
                      </div>
                    ) : cuelloDeBotella ? (
                      <div className="rounded-lg bg-warning-soft border border-warning/30 p-2.5 text-xs text-warning text-left flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">Cuello de botella: {cuelloDeBotella}</p>
                          {insumoEscasoDetalle && (
                            <p className="mt-0.5 opacity-90">
                              Existencia: {formatearUnidades(insumoEscasoDetalle.stockActual)} {insumoEscasoDetalle.unidad} (requiere {formatearUnidades(insumoEscasoDetalle.cantReq)} por unidad)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-success font-semibold">
                        Inventario suficiente en todos los ingredientes.
                      </p>
                    )}
                    <p className="text-xs text-fg-muted border-t border-line pt-2">
                      Referencia informativa. La receta es global e independiente del stock.
                    </p>
                  </div>
                ) : (
                  <EstadoVacio
                    icono={Package}
                    titulo={hayComponentes ? 'Sin datos de stock disponibles' : 'Agrega ingredientes a la receta'}
                  >
                    {hayComponentes
                      ? 'No hay registros de existencias para proyectar disponibilidad en este momento.'
                      : 'Una vez que definas los ingredientes de la receta global, aquí verás cuántas unidades se pueden preparar según el stock actual de las sucursales.'}
                  </EstadoVacio>
                )}
              </Card>
            )}
          </div>

          {/* ══════════════ PANEL DERECHO: FLUJO DUAL (FICHA / EDICIÓN) ══════════════ */}
          <div className="card space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">
                  {productoSeleccionado?.nombre ?? 'Selecciona un producto'}
                </h2>
                <p className="text-xs text-fg-muted">
                  {modoEdicion ? 'Constructor interactivo de receta' : 'Ficha técnica de receta (Solo lectura)'}
                </p>
              </div>
              {hayProducto && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-text">
                    {recetaComponentes.length} ingrediente{recetaComponentes.length !== 1 ? 's' : ''}
                  </span>
                  {!modoEdicion && tiene('INV_GESTIONAR_RECETAS') && (
                    <Button
                      variante="primary"
                      icono={Pencil}
                      size="sm"
                      onClick={() => setModoEdicion(true)}
                    >
                      Editar receta
                    </Button>
                  )}
                  {modoEdicion && recetaOriginal.length > 0 && (
                    <Button
                      variante="ghost"
                      size="sm"
                      onClick={() => {
                        if (!hayCambios) {
                          setModoEdicion(false);
                        } else {
                          handleDescartar().then((ok) => {
                            if (ok !== false) setModoEdicion(false);
                          });
                        }
                      }}
                    >
                      Ver ficha técnica
                    </Button>
                  )}
                </div>
              )}
            </div>

            {errorReceta && (
              <BannerError error={errorReceta} onReintentar={() => idProductoSeleccionado && cargarReceta(idProductoSeleccionado)} onCerrar={() => setErrorReceta(null)} />
            )}
            {errorGuardar && (
              <BannerError error={errorGuardar} onCerrar={() => setErrorGuardar(null)} />
            )}

            {cargandoReceta ? (
              <TablaRecetaSkeleton />
            ) : hayProducto ? (
              !modoEdicion && hayComponentes ? (
                /* ─── Modo 1: Vista de Ficha Técnica (Visualizar Receta) ─── */
                <>
                  {/* Alerta de ingredientes inactivos */}
                  {recetaComponentes.some((c) => c.activo === false || insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo))?.activo === false) && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">Esta receta contiene ingredientes temporalmente inactivos</p>
                        <p className="mt-0.5 text-amber-700 dark:text-amber-300">Se conserva la formulación histórica en la receta, pero los productos con ingredientes desactivados no estarán disponibles para la venta ni preparación operativa.</p>
                      </div>
                    </div>
                  )}

                  {/* Tabla de Ficha Técnica (Solo lectura con proporciones) */}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-muted/60 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        <tr>
                          <th className="px-4 py-3">Insumo</th>
                          <th className="px-3 py-3">Unidad</th>
                          <th className="px-3 py-3 text-right">Cantidad Requerida</th>
                          <th className="px-4 py-3 text-right">Costo Unit.</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-right">Proporción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {recetaComponentes.map((c) => {
                          const subtotal = calcularSubtotalLinea(c.cantidad_requerida, c.costo_promedio);
                          const insumoCat = insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo));
                          const isInactivo = c.activo === false || (insumoCat && insumoCat.activo === false);
                          const costoTotalNum = Number(costoTotal);
                          const subtotalNum = Number(subtotal);
                          const pctCosto = (costoTotalNum > 0 && subtotalNum > 0)
                            ? ((subtotalNum / costoTotalNum) * 100).toFixed(1)
                            : '0.0';

                          return (
                            <tr key={c.id_insumo} className={`hover:bg-muted/30 ${isInactivo ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                              <td className="px-4 py-3 font-medium text-fg">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{c.nombre_insumo}</span>
                                  {isInactivo && (
                                    <span
                                      title="Insumo inactivo en el catálogo. Se conserva en la receta pero requiere reactivarse para operar."
                                      className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 font-medium border border-amber-300 dark:border-amber-800"
                                    >
                                      <AlertTriangle size={12} aria-hidden="true" />
                                      Insumo inactivo
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-fg-muted font-mono text-xs">
                                {c.codigo_unidad}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-fg font-medium">
                                {formatearUnidades(c.cantidad_requerida)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted whitespace-nowrap">
                                {verCostos ? formatoDinero(c.costo_promedio) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-fg whitespace-nowrap">
                                {verCostos ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {Number(c.costo_promedio || 0) === 0 && (
                                      <span
                                        title="Insumo sin compras registradas (costo $0.00)"
                                        className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5 font-medium border border-amber-300 dark:border-amber-800"
                                      >
                                        Sin costo base
                                      </span>
                                    )}
                                    <span>{formatoDinero(subtotal)}</span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted whitespace-nowrap">
                                {verCostos ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-12 h-1.5 rounded-full bg-line overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${Math.min(100, Number(pctCosto))}%` }}
                                      />
                                    </div>
                                    <span>{pctCosto}%</span>
                                  </div>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-line bg-muted/20 font-bold">
                          <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-fg-muted">
                            Costo Teórico Total:
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary-text whitespace-nowrap">
                            {verCostos ? formatoDinero(costoTotal) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pie Ficha Técnica */}
                  {tiene('INV_GESTIONAR_RECETAS') && (
                    <div className="flex items-center justify-between border-t border-line pt-4">
                      <p className="text-xs text-fg-muted">
                        Modo de lectura de la fórmula corporativa. Haz clic en «Editar receta» para agregar o modificar componentes.
                      </p>
                      <Button
                        variante="primary"
                        icono={Pencil}
                        onClick={() => setModoEdicion(true)}
                      >
                        Editar receta
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                /* ─── Modo 2: Constructor Interactivo (Modo Edición) ─── */
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
                          className="input pl-9"
                          placeholder="Buscar insumo global por nombre…"
                          disabled={Boolean(errorInsumos)}
                          value={busquedaInsumo}
                          onChange={(e) => {
                            setBusquedaInsumo(e.target.value);
                            setDropdownAbierto(true);
                          }}
                          onFocus={() => setDropdownAbierto(true)}
                        />
                      </div>

                      {errorInsumos && <BannerError error={errorInsumos} onReintentar={() => globalThis.location?.reload()} />}
                      {dropdownAbierto && (
                        <ul className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface shadow-xl scroll-fino p-1.5 space-y-0.5">
                          {insumosFiltrados.length === 0 ? (
                            tiene('INV_GESTIONAR_INSUMOS') ? (
                              <li role="button" tabIndex={0} className="p-3 text-sm text-primary-text cursor-pointer hover:bg-primary-soft" onMouseDown={() => { setValoresInsumo({ nombre: busquedaInsumo.trim(), tipo_insumo: 'INGREDIENTE', id_unidad_base: String(unidades.find((u) => u.codigo === 'UND')?.id_unidad ?? '') }); setDrawerInsumoAbierto(true); }}>+ Crear insumo «{busquedaInsumo.trim()}»</li>
                            ) : (
                              <li className="p-3 text-xs text-fg-muted text-center">Pide a quien administra insumos que cree «{busquedaInsumo.trim()}»</li>
                            )
                          ) : (
                            insumosFiltrados.map((ins) => (
                              <li
                                key={ins.id_insumo}
                                className="flex cursor-pointer items-center justify-between p-2.5 rounded-lg text-sm hover:bg-espresso-100/60 dark:hover:bg-espresso-800/60 transition-colors select-none"
                                onMouseDown={() => handleSeleccionarInsumo(ins)}
                              >
                                <div>
                                  <span className="font-semibold text-fg">{ins.nombre}</span>
                                </div>
                                <span className="font-mono text-xs font-semibold text-primary-text bg-primary-soft px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                                  {verCostos ? (
                                    <>
                                      <span>{ins.codigo_unidad ?? 'u'} · {formatoDinero(ins.costo_promedio)}</span>
                                      {Number(ins.costo_promedio || 0) === 0 && (
                                        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded font-normal">
                                          Sin costo base
                                        </span>
                                      )}
                                    </>
                                  ) : (ins.codigo_unidad ?? 'u')}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Alerta de ingredientes inactivos */}
                  {recetaComponentes.some((c) => c.activo === false || insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo))?.activo === false) && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">Esta receta contiene ingredientes temporalmente inactivos</p>
                        <p className="mt-0.5 text-amber-700 dark:text-amber-300">Se conserva la formulación histórica en la receta, pero los productos con ingredientes desactivados no estarán disponibles para la venta ni preparación operativa.</p>
                      </div>
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
                            const subtotal = calcularSubtotalLinea(c.cantidad_requerida, c.costo_promedio);
                            const insumoCat = insumos.find((i) => Number(i.id_insumo) === Number(c.id_insumo));
                            const isInactivo = c.activo === false || (insumoCat && insumoCat.activo === false);

                            return (
                              <tr key={c.id_insumo} className={`hover:bg-muted/30 ${isInactivo ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                                <td className="px-4 py-3 font-medium text-fg">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>{c.nombre_insumo}</span>
                                    {isInactivo && (
                                      <span
                                        title="Insumo inactivo en el catálogo. Se conserva en la receta pero requiere reactivarse para operar."
                                        className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 font-medium border border-amber-300 dark:border-amber-800"
                                      >
                                        <AlertTriangle size={12} aria-hidden="true" />
                                        Insumo inactivo
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-fg-muted font-mono text-xs">
                                  {c.codigo_unidad}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {tiene('INV_GESTIONAR_RECETAS') ? (
                                    <input
                                      id={`cantidad-receta-${c.id_insumo}`}
                                      type="number"
                                      min="1"
                                      step="1"
                                      className="input w-28 text-right font-mono text-sm py-1"
                                      value={c.cantidad_requerida}
                                      onChange={(e) =>
                                        handleCambiarCantidad(c.id_insumo, e.target.value)
                                      }
                                    />
                                  ) : (
                                    <span className="font-mono">{formatearUnidades(c.cantidad_requerida)}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
                                  {verCostos ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      {Number(c.costo_promedio || 0) === 0 && (
                                        <span
                                          title="Insumo sin compras registradas (costo $0.00)"
                                          className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5 font-medium border border-amber-300 dark:border-amber-800"
                                        >
                                          Sin costo base
                                        </span>
                                      )}
                                      <span>{formatoDinero(subtotal)}</span>
                                    </div>
                                  ) : '—'}
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
                              {verCostos ? formatoDinero(costoTotal) : '—'}
                            </td>
                            {tiene('INV_GESTIONAR_RECETAS') && <td />}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <EstadoVacio
                      icono={FlaskConical}
                      titulo="Receta global sin ingredientes"
                    >
                      Usa el buscador de arriba para agregar materias primas o empaques a la fórmula de este producto. La receta es corporativa: aplica igual en todas las sucursales.
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
                          Guardar receta
                        </Button>
                        <Button
                          variante="ghost"
                          disabled={guardando}
                          onClick={handleDescartar}
                        >
                          Cancelar cambios
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
              )
            ) : (
              <EstadoVacio
                icono={ChefHat}
                titulo="Ningún producto seleccionado"
              >
                Accede desde el Catálogo de Productos y pulsa «Configurar receta» en cualquier producto elaborado. Las recetas son globales: se definen una vez y aplican en todas las sucursales.
              </EstadoVacio>
            )}
          </div>
        </div>
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
            const nuevo = lista.find((i) => String(i.id_insumo) === String(id)) || lista.find((i) => i.nombre === valoresInsumo.nombre);
            if (nuevo) {
              handleSeleccionarInsumo(nuevo, '');
              window.setTimeout(() => document.getElementById(`cantidad-receta-${nuevo.id_insumo}`)?.focus(), 0);
            }
          } catch (err) { setErrorInsumos(traducirError(err)); }
        }}
      />
    </div>
  );
}
