import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Search, ShieldAlert, Store, Wallet, X } from 'lucide-react';
import { Select } from '../../components/ui/index.js';
import Skeleton from '../../components/feedback/Skeleton.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { traducirError } from '../../errors/traducirError.js';
import { obtenerProductos } from './posApi.js';
import { cajaApi } from '../../api/caja.api.js';
import { carritoInicial, carritoReducer } from './carritoReducer.js';
import { agruparPorCategoria } from './categorias.js';
import { calcularTotales, formatoMoneda } from './impuestos.js';
import ProductoCard from './ProductoCard.jsx';
import Carrito from './Carrito.jsx';
import ModalCobro from './ModalCobro.jsx';
import VentaExitosaModal from './VentaExitosaModal.jsx';
import { etiquetaCobro } from './etiquetaCobro.js';

export default function PosPage() {
  const { usuario, tiene } = useAuth();
  const { notificar } = useAlert();
  // El menú se arma con productos (INV_VER_STOCK) y existencias (INV_VER_STOCK): sin él la API respondería 403.
  const puedeVerMenu = tiene('INV_VER_STOCK');
  const puedeCCF = tiene('POS_EMITIR_CCF');

  const sucursales = useMemo(() => usuario?.sucursales ?? [], [usuario]);
  const [idSucursal, setIdSucursal] = useState(() => sucursales[0]?.id_sucursal ?? null);
  const [turnoActivo, setTurnoActivo] = useState(null);

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(puedeVerMenu);
  const [error, setError] = useState(null);
  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('FACTURA');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [items, dispatch] = useReducer(carritoReducer, carritoInicial);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);

  // Detecta si el cajero tiene un turno abierto para vincular la sucursal del turno
  useEffect(() => {
    let activo = true;
    cajaApi.obtenerTurnoActual()
      .then((turno) => {
        if (!activo) return;
        setTurnoActivo(turno);
        if (turno?.id_sucursal) {
          setIdSucursal(turno.id_sucursal);
        }
      })
      .catch(() => {
        if (!activo) return;
        setTurnoActivo(null);
      });
    return () => { activo = false; };
  }, []);

  // Si cambian las sucursales del usuario y aún no hay sucursal seleccionada
  useEffect(() => {
    if (!idSucursal && sucursales.length > 0) {
      setIdSucursal(sucursales[0].id_sucursal);
    }
  }, [idSucursal, sucursales]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setProductos(await obtenerProductos(idSucursal));
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, [idSucursal]);

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

  // Pantalla de cobro (T19)
  const cobrar = () => {
    if (!turnoActivo) {
      notificar.advertencia('Turno requerido', {
        mensaje: 'Debes tener un turno de caja abierto para registrar ventas. Abre un turno en el módulo de Caja.',
      });
      return;
    }
    setModalCobroAbierto(true);
  };

  const handleVentaExitosa = (venta) => {
    setModalCobroAbierto(false);
    setVentaExitosa(venta);
    dispatch({ tipo: 'vaciar' });
    setClienteSeleccionado(null);
    cargar();
  };

  const vaciarPedido = () => {
    if (!items.length) return;
    const instantanea = items.map((item) => ({ ...item }));
    dispatch({ tipo: 'vaciar' });
    notificar.exito('Pedido vaciado', {
      acciones: [{ etiqueta: 'Deshacer', onClick: () => dispatch({ tipo: 'restaurar', items: instantanea }) }],
    });
  };

  return (
    <div className={`mx-auto flex max-w-7xl flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-[34rem] ${unidades > 0 ? 'pb-20 lg:pb-0' : ''}`}>
      <EncabezadoPagina
        seccion="Operación · Punto de venta"
        titulo="Punto de venta"
        descripcion="Toca un producto del menú para agregarlo al pedido."
        className="shrink-0"
        acciones={(
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-body-sm shadow-xs">
        <div className="flex items-center gap-2">
          <Store size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden="true" />
          <span className="text-label-sm text-fg-muted">Sucursal:</span>
          {turnoActivo ? (
            <span className="text-label text-fg">{turnoActivo.sucursal}</span>
          ) : sucursales.length > 1 ? (
            <div className="w-48">
              <Select
                aria-label="Seleccionar sucursal"
                tamano="sm"
                placeholder=""
                value={idSucursal ?? ''}
                onChange={(e) => setIdSucursal(Number(e.target.value))}
                opciones={sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre }))}
              />
            </div>
          ) : (
            <span className="text-label text-fg">{sucursales[0]?.nombre || 'Sin sucursal asignada'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-body-sm">
          {turnoActivo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-label-sm text-success-text">
              <Wallet size={16} strokeWidth={1.75} aria-hidden="true" />
              Turno abierto: {turnoActivo.caja}
            </span>
          ) : (
            <div className="inline-flex items-center gap-2 text-fg-muted">
              <span>Sin turno de caja abierto</span>
              <Link to="/caja" className="text-label-sm text-primary-text hover:underline">
                Abrir turno en Caja
              </Link>
            </div>
          )}
        </div>
          </div>
        )}
      />

      {/* 4rem descuenta el padding vertical lg:p-8 de AppLayout para ocupar el alto útil. */}
      <div className="mt-4 grid min-w-0 gap-4 sm:mt-5 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Menú" className="scroll-fino lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pb-4 lg:pl-1 lg:pr-2 lg:pt-1 lg:[scrollbar-gutter:stable]">
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
                  <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                  <input className="input pl-9 pr-10" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto…" aria-label="Buscar producto" />
                  {busqueda && (
                    <button type="button" className="btn-ghost absolute right-1 top-1/2 min-h-8 -translate-y-1/2 !p-1.5" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"><X size={16} aria-hidden="true" /></button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
                  {[{ nombre: 'Todas', productos }, ...todosLosGrupos].map((g) => (
                    <button key={g.nombre} type="button" aria-pressed={categoria === g.nombre} onClick={() => setCategoria(g.nombre)}
                      className={`inline-flex h-control-sm items-center gap-1.5 rounded-full border px-3 text-label-sm transition-colors ${categoria === g.nombre ? 'bg-primary-soft text-primary-text border-primary/40' : 'border-line text-fg-muted hover:bg-muted hover:text-fg'}`}>
                      {g.nombre}
                      <span className="tabular-nums opacity-80">{g.productos.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <BannerError className="mt-4" error={error} onReintentar={cargar} />}
              {cargando ? (
                <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" role="status" aria-label="Cargando menú…">
                  {Array.from({ length: 8 }, (_, n) => <Skeleton key={n} className="h-32 rounded-lg" />)}
                </div>
              ) : !error && (
                visibles.length === 0 ? (
                  <EstadoVacio icono={PackageSearch} titulo={productos.length ? 'Sin resultados' : 'El menú está vacío'} className="mt-4">
                    {productos.length ? 'Ningún producto coincide con tu búsqueda o categoría.' : 'No hay productos activos para vender.'}
                  </EstadoVacio>
                ) : (
                  <div className="mt-5 space-y-7">
                    {visibles.map((g) => (
                      <section key={g.nombre} aria-labelledby={`cat-${g.nombre}`}>
                        <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
                          <h2 id={`cat-${g.nombre}`} className="text-label text-fg">{g.nombre}</h2>
                          <span className="text-label-sm tabular-nums text-fg-muted">{g.productos.length}</span>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
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

        <div className="flex flex-col lg:h-full lg:min-h-0">
          <Carrito
            items={items}
            tipoDocumento={documento}
            onTipoDocumento={setTipoDocumento}
            clienteSeleccionado={clienteSeleccionado}
            onSeleccionarCliente={setClienteSeleccionado}
            dispatch={dispatch}
            onCobrar={cobrar}
            onVaciar={vaciarPedido}
            etiquetaCobro={etiquetaCobro(items, total)}
          />
        </div>
      </div>

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-md lg:hidden">
          <p className="min-w-0 text-body-sm"><span className="text-fg-muted">{unidades} {unidades === 1 ? 'producto' : 'productos'} · </span><span className="text-label tabular-nums text-fg">{formatoMoneda(total)}</span></p>
          <a href="#pedido-actual" className="btn-primary">Ver pedido</a>
        </div>
      )}

      {/* Modal de cobro y pagos mixtos (T19) */}
      <ModalCobro
        abierto={modalCobroAbierto}
        onCerrar={() => setModalCobroAbierto(false)}
        items={items}
        tipoDocumento={documento}
        clienteSeleccionado={clienteSeleccionado}
        turnoActivo={turnoActivo}
        onVentaExitosa={handleVentaExitosa}
      />

      {/* Modal de venta exitosa y comprobante térmico (T19) */}
      <VentaExitosaModal
        abierto={Boolean(ventaExitosa)}
        venta={ventaExitosa}
        onNuevaVenta={() => setVentaExitosa(null)}
      />
    </div>
  );
}
