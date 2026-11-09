import { useEffect, useMemo, useReducer, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { Spinner } from '../../components/ui/index.js';
import { obtenerProductos } from './posApi.js';
import { carritoInicial, carritoReducer } from './carritoReducer.js';
import ProductoCard from './ProductoCard.jsx';
import Carrito from './Carrito.jsx';

export default function PosPage() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('FACTURA');
  const [items, dispatch] = useReducer(carritoReducer, carritoInicial);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await obtenerProductos();
        if (activo) setProductos(data);
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const categorias = useMemo(() => ['Todas', ...new Set(productos.map((p) => p.categoria))], [productos]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos
      .filter((p) => categoria === 'Todas' || p.categoria === categoria)
      .filter((p) => p.nombre.toLowerCase().includes(texto));
  }, [productos, categoria, busqueda]);

  const cantidadEnCarrito = (id) => items.find((i) => i.id_producto === id)?.cantidad ?? 0;

  // Aquí Ortiz conectará POST /api/ordenes con { tipoDocumento, items }.
  const cobrar = () => setAviso('El cobro se conecta en la semana 2 (modal de pago).');

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-text"><ShoppingBag size={17} aria-hidden="true" /> Operación</div>
      <h1 className="text-2xl font-bold tracking-tight">Punto de venta</h1>

      {error && <p className="mt-5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      {aviso && <p className="mt-5 rounded-md bg-info-soft px-3 py-2 text-sm text-info" role="status">{aviso}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section aria-label="Catálogo">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
              <input className="input pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto…" aria-label="Buscar producto" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
              {categorias.map((c) => (
                <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoria === c ? 'bg-primary text-on-accent' : 'border border-line hover:bg-muted'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {cargando ? <Spinner texto="Cargando catálogo…" /> : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {visibles.map((p) => (
                  <ProductoCard key={p.id_producto} producto={p} enCarrito={cantidadEnCarrito(p.id_producto)}
                    onAgregar={(prod) => dispatch({ tipo: 'agregar', producto: prod })} />
                ))}
              </div>
              {!visibles.length && <p className="p-8 text-center text-sm text-fg-muted">Ningún producto coincide con tu búsqueda.</p>}
            </>
          )}
        </section>

        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
          <Carrito items={items} tipoDocumento={tipoDocumento} onTipoDocumento={setTipoDocumento} dispatch={dispatch} onCobrar={cobrar} />
        </div>
      </div>
    </div>
  );
}