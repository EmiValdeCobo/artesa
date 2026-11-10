import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { PackageSearch, Search, ShieldAlert, X } from 'lucide-react';
import { Spinner } from '../../components/ui/index.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { traducirError } from '../../errors/traducirError.js';
import { obtenerProductos } from './posApi.js';
import { carritoInicial, carritoReducer } from './carritoReducer.js';
import { agruparPorCategoria } from './categorias.js';
import { calcularTotales, formatoMoneda } from './impuestos.js';
import ProductoCard from './ProductoCard.jsx';
import Carrito from './Carrito.jsx';

export default function PosPage() {
  const { tiene } = useAuth();
  // El menú se arma con productos (INV_VER_STOCK) y existencias (INV_VER_STOCK): sin él la API respondería 403.
  const puedeVerMenu = tiene('INV_VER_STOCK');
  const puedeCCF = tiene('POS_EMITIR_CCF');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(puedeVerMenu);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('FACTURA');
  const [items, dispatch] = useReducer(carritoReducer, carritoInicial);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setProductos(await obtenerProductos());
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (puedeVerMenu) cargar(); }, [puedeVerMenu, cargar]);

  const texto = busqueda.trim().toLowerCase();
  const coincidentes = useMemo(() => productos.filter((p) => p.nombre.toLowerCase().includes(texto)), [productos, texto]);
  const grupos = useMemo(() => agruparPorCategoria(coincidentes), [coincidentes]);
  const todosLosGrupos = useMemo(() => agruparPorCategoria(productos), [productos]);
  const visibles = categoria === 'Todas' ? grupos : grupos.filter((g) => g.nombre === categoria);

  const cantidadEnCarrito = (id) => items.find((i) => i.id_producto === id)?.cantidad ?? 0;
  const unidades = items.reduce((n, i) => n + i.cantidad, 0);
  const { total } = calcularTotales(items);
  // Sin POS_EMITIR_CCF el documento siempre es consumidor final, aunque el estado local diga otra cosa.
  const documento = puedeCCF ? tipoDocumento : 'FACTURA';

  // Aquí se conectará POST /api/pos/ordenes con { tipoDocumento, items }.
  const cobrar = () => setAviso('El cobro se conecta en la semana 2 (modal de pago).');

  return (
    <div className={`mx-auto max-w-7xl ${unidades > 0 ? 'pb-20 lg:pb-0' : ''}`}>
      <EncabezadoPagina seccion="Operación" titulo="Punto de venta" descripcion="Toca un producto del menú para agregarlo al pedido." />

      {aviso && <p className="mt-5 rounded-md bg-info-soft px-3 py-2 text-sm text-info" role="status">{aviso}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section aria-label="Menú">
          {!puedeVerMenu ? (
            <div className="card">
              <EstadoVacio icono={ShieldAlert} titulo="Tu rol no puede consultar el menú">
                Para ver productos y existencias se necesita el permiso INV_VER_STOCK. Pídelo a un administrador.
              </EstadoVacio>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                  <input className="input pl-9 pr-10" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto…" aria-label="Buscar producto" />
                  {busqueda && (
                    <button type="button" className="btn-ghost absolute right-1 top-1/2 min-h-8 -translate-y-1/2 !p-1.5" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"><X size={16} aria-hidden="true" /></button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
                  {[{ nombre: 'Todas', productos }, ...todosLosGrupos].map((g) => (
                    <button key={g.nombre} type="button" aria-pressed={categoria === g.nombre} onClick={() => setCategoria(g.nombre)}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors sm:text-xs ${categoria === g.nombre ? 'bg-primary text-on-accent' : 'border border-line hover:bg-muted'}`}>
                      {g.nombre}
                      <span className={`rounded-full px-1.5 text-xs ${categoria === g.nombre ? 'bg-on-accent/20' : 'bg-muted text-fg-muted'}`}>{g.productos.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <BannerError className="mt-4" error={error} onReintentar={cargar} />}
              {cargando ? <Spinner texto="Cargando menú…" /> : !error && (
                visibles.length === 0 ? (
                  <EstadoVacio icono={PackageSearch} titulo={productos.length ? 'Sin resultados' : 'El menú está vacío'} className="mt-4">
                    {productos.length ? 'Ningún producto coincide con tu búsqueda o categoría.' : 'No hay productos activos para vender.'}
                  </EstadoVacio>
                ) : (
                  <div className="mt-5 space-y-7">
                    {visibles.map((g) => (
                      <section key={g.nombre} aria-labelledby={`cat-${g.nombre}`}>
                        <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
                          <h2 id={`cat-${g.nombre}`} className="text-sm font-semibold">{g.nombre}</h2>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-fg-muted">{g.productos.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                          {g.productos.map((p) => (
                            <ProductoCard key={p.id_producto} producto={p} enCarrito={cantidadEnCarrito(p.id_producto)}
                              onAgregar={(prod) => dispatch({ tipo: 'agregar', producto: prod })} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </section>

        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
          <Carrito items={items} tipoDocumento={documento} onTipoDocumento={setTipoDocumento} dispatch={dispatch} onCobrar={cobrar} />
        </div>
      </div>

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur lg:hidden">
          <p className="min-w-0 text-sm"><span className="text-fg-muted">{unidades} {unidades === 1 ? 'producto' : 'productos'} · </span><span className="font-bold tabular-nums">{formatoMoneda(total)}</span></p>
          <a href="#pedido-actual" className="btn-primary">Ver pedido</a>
        </div>
      )}
    </div>
  );
}
