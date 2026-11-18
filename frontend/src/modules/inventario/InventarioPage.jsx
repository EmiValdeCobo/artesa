import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, PackageMinus, Scale, Search, Store, X } from 'lucide-react';
import { ICONOS } from '../../config/iconos.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import Skeleton, { SkeletonTexto } from '../../components/feedback/Skeleton.jsx';
import CampoTexto from '../../components/forms/CampoTexto.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import Metrica from '../../components/display/Metrica.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { traducirError } from '../../errors/traducirError.js';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { formatearUnidades } from '../../utils/formato.js';

const CANTIDAD_VALIDA = /^[1-9]\d*$/;
const SUCURSALES_VACIAS = [];
const FILTROS_TIPO_INSUMO = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'INGREDIENTE', etiqueta: 'Ingredientes' },
  { valor: 'EMPAQUE', etiqueta: 'Empaques' },
  { valor: 'REVENTA', etiqueta: 'Reventa' },
];

function esCantidadPositiva(valor) {
  return CANTIDAD_VALIDA.test(valor.trim());
}

export default function InventarioPage() {
  const { usuario, tiene } = useAuth();
  const { notificar, notificarError } = useAlert();
  const navigate = useNavigate();
  const sucursales = usuario?.sucursales ?? SUCURSALES_VACIAS;
  const puedeComprar = tiene('COM_REGISTRAR_COMPRA');
  const [insumosPorNombre, setInsumosPorNombre] = useState({});
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [idSucursal, setIdSucursal] = useState(() => String(sucursales[0]?.id_sucursal ?? ''));
  const [stock, setStock] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [tiposPorInsumo, setTiposPorInsumo] = useState({});
  const [cargandoTipos, setCargandoTipos] = useState(false);
  const [tiposListos, setTiposListos] = useState(false);
  const [errorTipos, setErrorTipos] = useState(null);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [errorStock, setErrorStock] = useState(null);
  const [errorAlertas, setErrorAlertas] = useState(null);
  const [idInsumo, setIdInsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pestana, setPestana] = useState('alertas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [enviando, setEnviando] = useState(false);
  const ultimaSucursalIniciada = useRef(null);
  const tiposIniciados = useRef(false);
  const numeroCarga = useRef(0);

  const cargarSucursal = useCallback(async (sucursal) => {
    if (!sucursal) return;
    const cargaActual = ++numeroCarga.current;
    const query = `?idSucursal=${encodeURIComponent(sucursal)}`;

    setCargandoStock(true);
    setCargandoAlertas(true);
    setStock([]);
    setAlertas([]);
    setErrorStock(null);
    setErrorAlertas(null);

    const cargarStock = async () => {
      try {
        const filas = await api.get(`/inventario/stock${query}`);
        if (cargaActual === numeroCarga.current) setStock(filas);
      } catch (error) {
        if (cargaActual === numeroCarga.current) setErrorStock(traducirError(error));
      } finally {
        if (cargaActual === numeroCarga.current) setCargandoStock(false);
      }
    };

    const cargarAlertas = async () => {
      try {
        const filas = await api.get(`/inventario/alertas${query}`);
        if (cargaActual === numeroCarga.current) setAlertas(filas);
      } catch (error) {
        if (cargaActual === numeroCarga.current) setErrorAlertas(traducirError(error));
      } finally {
        if (cargaActual === numeroCarga.current) setCargandoAlertas(false);
      }
    };

    await Promise.all([cargarStock(), cargarAlertas()]);
  }, []);

  const cargarTiposInsumo = useCallback(async () => {
    setCargandoTipos(true);
    setErrorTipos(null);
    try {
      const insumos = await api.get('/inventario/insumos');
      if (!Array.isArray(insumos)) throw new Error('La respuesta de insumos no tiene un formato válido');
      setTiposPorInsumo(Object.fromEntries(insumos.map((insumo) => [String(insumo.id_insumo), insumo.tipo_insumo])));
      setInsumosPorNombre(Object.fromEntries(insumos.map((insumo) => [insumo.nombre, insumo])));
      setTiposListos(true);
    } catch (error) {
      setTiposListos(false);
      setErrorTipos(traducirError(error));
    } finally {
      setCargandoTipos(false);
    }
  }, []);

  useEffect(() => {
    if (!idSucursal) {
      setStock([]);
      setAlertas([]);
      return;
    }
    if (ultimaSucursalIniciada.current === idSucursal) return;
    ultimaSucursalIniciada.current = idSucursal;
    void cargarSucursal(idSucursal);
  }, [idSucursal, cargarSucursal]);

  useEffect(() => {
    if (tiposIniciados.current) return;
    tiposIniciados.current = true;
    void cargarTiposInsumo();
  }, [cargarTiposInsumo]);

  const sucursalValida = sucursales.some((sucursal) => String(sucursal.id_sucursal) === idSucursal);
  const sucursalActiva = sucursales.find((sucursal) => String(sucursal.id_sucursal) === idSucursal);
  const insumoSeleccionado = stock.find((fila) => String(fila.id_insumo) === idInsumo);
  const cantidadValida = esCantidadPositiva(cantidad);
  const motivoValido = motivo.trim().length >= 3 && motivo.trim().length <= 500;
  const puedeRegistrarMerma = Boolean(sucursalValida && insumoSeleccionado && cantidadValida && motivoValido && !enviando);

  const opcionesSucursal = useMemo(() => sucursales.map((sucursal) => ({
    valor: String(sucursal.id_sucursal),
    texto: sucursal.nombre,
  })), [sucursales]);

  const stockFiltrado = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return stock.filter((fila) => {
      const coincideTipo = filtroTipo === 'TODOS' || tiposPorInsumo[String(fila.id_insumo)] === filtroTipo;
      const coincideBusqueda = !termino || String(fila.insumo ?? '').toLocaleLowerCase('es').includes(termino);
      return coincideTipo && coincideBusqueda;
    });
  }, [busqueda, filtroTipo, stock, tiposPorInsumo]);

  const resultadosPorTipo = useMemo(() => stock.reduce((conteos, fila) => {
    const tipo = tiposPorInsumo[String(fila.id_insumo)];
    if (Object.hasOwn(conteos, tipo)) conteos[tipo] += 1;
    return conteos;
  }, { INGREDIENTE: 0, EMPAQUE: 0, REVENTA: 0 }), [stock, tiposPorInsumo]);

  const opcionesInsumo = useMemo(() => stock.map((fila) => ({
    valor: String(fila.id_insumo),
    texto: `${fila.insumo} · ${fila.unidad}`,
  })), [stock]);

  const cambiarSucursal = (evento) => {
    setIdSucursal(evento.target.value);
    setIdInsumo('');
    setErrorMerma(null);
    setSeleccion(new Set());
  };

  // Las alertas no traen id_insumo: se resuelve por nombre contra el catálogo (mismo criterio del backend).
  const insumoDeAlerta = useCallback((fila) => insumosPorNombre[fila.insumo] ?? null, [insumosPorNombre]);

  const alternarSeleccion = (fila) => {
    const insumo = insumoDeAlerta(fila);
    if (!insumo) return;
    setSeleccion((actual) => {
      const siguiente = new Set(actual);
      const clave = String(insumo.id_insumo);
      if (!siguiente.delete(clave)) siguiente.add(clave);
      return siguiente;
    });
  };

  // Abre el formulario de compra como borrador: nada se envía hasta que el usuario guarde la factura.
  // El sistema no registra proveedor habitual ni último costo por insumo; se prellena el costo promedio
  // cuando el usuario tiene permiso de ver costos y el proveedor queda por elegir.
  const crearBorradorCompra = (filas) => {
    const items = filas
      .map((fila) => ({ fila, insumo: insumoDeAlerta(fila) }))
      .filter(({ insumo }) => insumo && insumo.activo !== false)
      .map(({ fila, insumo }) => ({
        idInsumo: String(insumo.id_insumo),
        cantidad: String(Math.max(1, Math.ceil(Number(fila.faltante) || 0))),
        costoUnitario: insumo.costo_promedio != null ? String(insumo.costo_promedio) : '',
        origen: 'faltante',
        unidad: String(insumo.unidad_codigo ?? fila.unidad ?? '').toLowerCase(),
      }));
    if (!items.length) return;
    navigate('/compras/registrar', { state: { borrador: { idSucursal, items, desdeAlertas: true } } });
  };

  const registrarMerma = async (evento) => {
    evento.preventDefault();
    if (!puedeRegistrarMerma || !insumoSeleccionado) {
      if (!idInsumo) {
        notificar.advertencia('Insumo requerido', { mensaje: 'Selecciona un insumo para registrar la merma.' });
        return;
      }
      if (!cantidad.trim() || Number(cantidad) <= 0) {
        notificar.advertencia('Cantidad inválida', { mensaje: 'Ingresa una cantidad mayor a cero.' });
        return;
      }
      if (motivo.trim().length < 3) {
        notificar.advertencia('Motivo requerido', { mensaje: 'Describe el motivo de la merma (mínimo 3 caracteres).' });
        return;
      }
      return;
    }

    setEnviando(true);
    try {
      await api.post(`/inventario/insumos/${insumoSeleccionado.id_insumo}/mermas`, {
        idSucursal: Number(idSucursal),
        cantidad: cantidad.trim(),
        motivo: motivo.trim(),
      });
      notificar.exito('Merma registrada', { mensaje: 'Se actualizó el inventario de la sucursal.' });
      setCantidad('');
      setMotivo('');
      await cargarSucursal(idSucursal);
    } catch (error) {
      notificarError(error);
    } finally {
      setEnviando(false);
    }
  };

  const unidadCorta = (codigo) => String(codigo ?? '').toLowerCase();

  const columnasStock = [
    { clave: 'insumo', titulo: 'Insumo', tipo: 'texto' },
    { clave: 'unidad', titulo: 'Unidad', tipo: 'texto', valorOrden: (fila) => unidadCorta(fila.unidad), render: (fila) => unidadCorta(fila.unidad) },
    { clave: 'stock_actual', titulo: 'Stock actual', tipo: 'numero', alinear: 'right', valorOrden: (fila) => fila.stock_actual, render: (fila) => formatearUnidades(fila.stock_actual) },
    { clave: 'stock_minimo', titulo: 'Stock mínimo', tipo: 'numero', alinear: 'right', clase: 'hidden md:table-cell', valorOrden: (fila) => fila.stock_minimo, render: (fila) => formatearUnidades(fila.stock_minimo) },
    {
      clave: '_nivel',
      titulo: 'Nivel',
      ordenable: false,
      render: (fila) => {
        const actual = Number(fila.stock_actual) || 0;
        const minimo = Number(fila.stock_minimo) || 0;
        const bajo = minimo > 0 && actual < minimo;
        const tope = Math.max(minimo * 2, actual, 1);
        const porcentaje = Math.min(100, Math.round((actual / tope) * 100));
        return (
          <div className="flex min-w-24 items-center gap-2" title={bajo ? 'Bajo mínimo' : 'Nivel de existencias'}>
            <div className="h-1 w-full rounded-full bg-muted" role="presentation">
              <div className={`h-1 rounded-full ${bajo ? 'bg-danger' : 'bg-chart-neutral'}`} style={{ width: `${porcentaje}%` }} />
            </div>
            {bajo && <span className="sr-only">Bajo mínimo</span>}
          </div>
        );
      },
    },
  ];

  const seleccionables = alertas.filter((fila) => insumoDeAlerta(fila));
  const todasSeleccionadas = seleccionables.length > 0 && seleccionables.every((fila) => seleccion.has(String(insumoDeAlerta(fila).id_insumo)));
  const alternarTodas = () => setSeleccion(
    todasSeleccionadas ? new Set() : new Set(seleccionables.map((fila) => String(insumoDeAlerta(fila).id_insumo))),
  );

  const columnasAlertas = [
    ...(puedeComprar ? [{
      clave: '_sel', titulo: 'Seleccionar',
      ordenable: false,
      encabezado: (
        <input type="checkbox" className="h-4 w-4 align-middle accent-primary" checked={todasSeleccionadas}
          onChange={alternarTodas} aria-label="Seleccionar todos los insumos en alerta" />
      ),
      render: (fila) => {
        const insumo = insumoDeAlerta(fila);
        if (!insumo) return null;
        const clave = String(insumo.id_insumo);
        return <input type="checkbox" className="h-4 w-4 accent-primary" checked={seleccion.has(clave)}
          onChange={() => alternarSeleccion(fila)} aria-label={`Seleccionar ${fila.insumo}`} />;
      },
    }] : []),
    { clave: 'insumo', titulo: 'Insumo', tipo: 'texto' },
    { clave: 'unidad', titulo: 'Unidad', tipo: 'texto', valorOrden: (fila) => unidadCorta(fila.unidad), render: (fila) => unidadCorta(fila.unidad) },
    {
      clave: 'nivel',
      titulo: 'Nivel',
      tipo: 'texto',
      valorOrden: (fila) => (fila.nivel === 'AGOTADO' ? 'Agotado' : 'Bajo mínimo'),
      render: (fila) => (
        <EstadoBadge tipo={fila.nivel === 'AGOTADO' ? 'error' : 'alerta'}>
          {fila.nivel === 'AGOTADO' ? 'Agotado' : 'Bajo mínimo'}
        </EstadoBadge>
      ),
    },
    { clave: 'stock_actual', titulo: 'Actual', tipo: 'numero', alinear: 'right', valorOrden: (fila) => fila.stock_actual, render: (fila) => formatearUnidades(fila.stock_actual) },
    { clave: 'stock_minimo', titulo: 'Mínimo', tipo: 'numero', alinear: 'right', valorOrden: (fila) => fila.stock_minimo, render: (fila) => formatearUnidades(fila.stock_minimo) },
    { clave: 'faltante', titulo: 'Faltante', tipo: 'numero', alinear: 'right', valorOrden: (fila) => fila.faltante, render: (fila) => formatearUnidades(fila.faltante) },
    ...(puedeComprar ? [{
      clave: '_comprar', titulo: 'Acciones',
      ordenable: false,
      render: (fila) => (
        <BotonIcono
          icono={ICONOS.comprar}
          etiqueta={`Comprar a proveedor: ${fila.insumo}`}
          disabled={!insumoDeAlerta(fila)}
          onClick={() => crearBorradorCompra([fila])}
        />
      ),
    }] : []),
  ];

  const pestanas = [
    { clave: 'alertas', texto: 'Alertas', icono: AlertTriangle, total: cargandoAlertas || errorAlertas ? undefined : alertas.length },
    { clave: 'stock', texto: 'Stock', icono: Boxes, total: cargandoStock || errorStock ? undefined : stock.length },
    { clave: 'mermas', texto: 'Mermas', icono: PackageMinus },
  ];

  if (!sucursales.length) {
    return (
      <div className="space-y-6">
        <EncabezadoPagina seccion="Operación · Inventario" titulo="Inventario" />
        <Card><EstadoVacio icono={Boxes} titulo="No tienes sucursales asignadas">
          Pide a una persona administradora que te asigne una sucursal para consultar el inventario.
        </EstadoVacio></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Operación · Inventario" titulo="Inventario" descripcion="Consulta existencias y alertas, y registra mermas de la sucursal seleccionada." acciones={<div className="w-full sm:max-w-xs">
          <Select
            etiqueta="Sucursal"
            opciones={opcionesSucursal}
            value={idSucursal}
            onChange={cambiarSucursal}
            disabled={enviando}
          />
        </div>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icono={Boxes} cargando={cargandoStock} valor={cargandoStock ? null : errorStock ? '—' : stock.length} etiqueta="Insumos en sucursal" tono="neutro" />
        <Metrica icono={AlertTriangle} cargando={cargandoAlertas} valor={cargandoAlertas ? null : errorAlertas ? '—' : alertas.length} etiqueta="Alertas activas" tono={alertas.length ? 'aviso' : 'neutro'} />
        <Metrica icono={Store} valor={<span className="block truncate text-h3">{sucursalActiva?.nombre ?? '—'}</span>} etiqueta="Sucursal activa" tono="neutro" />
      </div>

      <Pestanas etiqueta="Secciones de inventario" activa={pestana} onCambiar={setPestana} pestanas={pestanas} />

      {pestana === 'alertas' && (
        <section role="tabpanel" id="panel-alertas" aria-labelledby="tab-alertas" className="space-y-4">
          <Card
            sinPadding
            icono={AlertTriangle}
            titulo="Alertas de stock mínimo"
            descripcion="Insumos que están agotados o por debajo de su mínimo en esta sucursal."
            acciones={puedeComprar && seleccion.size > 0 ? (
              <Button variante="secondary" tamano="sm" icono={ICONOS.comprar} onClick={() => crearBorradorCompra(seleccionables.filter((fila) => seleccion.has(String(insumoDeAlerta(fila).id_insumo))))}>
                Crear compra con seleccionados ({seleccion.size})
              </Button>
            ) : null}
          >
            {errorAlertas && <BannerError className="m-5" error={errorAlertas} onReintentar={() => cargarSucursal(idSucursal)} />}
            {cargandoAlertas ? <Table cargando columnas={columnasAlertas} filas={[]} idFila="insumo" />
              : errorAlertas ? null
                : alertas.length === 0 ? <EstadoVacio icono={AlertTriangle} titulo="No hay alertas de stock">
                  Ningún insumo está por debajo de su mínimo en esta sucursal.
                </EstadoVacio>
                  : <Table columnas={columnasAlertas} filas={alertas} idFila="insumo" vacio="No hay alertas para mostrar." scrollVertical={false} idTabla="inventario-alertas" />}
          </Card>
        </section>
      )}

      {pestana === 'stock' && (
        <section role="tabpanel" id="panel-stock" aria-labelledby="tab-stock" className="space-y-4">
          <Card
            sinPadding
            icono={Boxes}
            titulo="Existencias"
            descripcion={<span className="tabular-nums" aria-live="polite">{stockFiltrado.length} {stockFiltrado.length === 1 ? 'resultado' : 'resultados'}</span>}
          >
            {errorTipos && <BannerError className="mx-5 mt-4" error={errorTipos} onReintentar={cargarTiposInsumo} />}
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
              <div className="relative w-full max-w-xs">
                <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <label htmlFor="buscar-insumo-stock" className="sr-only">Buscar insumo por nombre</label>
                <input
                  id="buscar-insumo-stock"
                  className="input pl-9 pr-10"
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar insumo…"
                  aria-label="Buscar insumo por nombre"
                />
                {busqueda && (
                  <button type="button" className="btn-ghost absolute right-1 top-1/2 min-h-8 -translate-y-1/2 !p-1.5" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                    <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                )}
              </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar stock por tipo de insumo">
              {FILTROS_TIPO_INSUMO.map(({ valor, etiqueta }) => {
                const seleccionada = filtroTipo === valor;
                const total = cargandoStock || errorStock || (valor !== 'TODOS' && !tiposListos)
                  ? '—'
                  : valor === 'TODOS' ? stock.length : resultadosPorTipo[valor];
                return (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={seleccionada}
                    disabled={valor !== 'TODOS' && (cargandoTipos || !tiposListos)}
                    onClick={() => setFiltroTipo(valor)}
                    className={`h-control-sm rounded-full border px-3 text-label-sm transition-colors ${seleccionada ? 'border-primary/40 bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg-muted hover:bg-muted hover:text-fg'} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {etiqueta} <span className="ml-1 tabular-nums" aria-label={`${total} insumos`}>{total}</span>
                  </button>
                );
              })}
              {cargandoTipos && (
                <span role="status" className="flex items-center gap-2">
                  <span className="sr-only">Cargando tipos…</span>
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-control-sm w-24 rounded-full" />)}
                </span>
              )}
            </div>
            {(busqueda || filtroTipo !== 'TODOS') && (
              <Button variante="ghost" tamano="sm" className="ml-auto" onClick={() => { setBusqueda(''); setFiltroTipo('TODOS'); }}>Limpiar filtros</Button>
            )}
            </div>
            {errorStock && <BannerError className="m-5" error={errorStock} onReintentar={() => cargarSucursal(idSucursal)} />}
            {cargandoStock ? <Table cargando columnas={columnasStock} filas={[]} idFila="id_insumo" />
              : errorStock ? null
                : stock.length === 0 ? <EstadoVacio icono={Boxes} titulo="No hay stock para esta sucursal">
                  Cuando el backend devuelva existencias, aparecerán aquí.
                </EstadoVacio>
                  : stockFiltrado.length === 0 ? <EstadoVacio icono={Search} titulo="No encontramos insumos">
                    Prueba con otro nombre o limpia la búsqueda.
                  </EstadoVacio>
                    : <Table columnas={columnasStock} filas={stockFiltrado} idFila="id_insumo" vacio="No hay existencias para mostrar." idTabla="inventario-stock" />}
          </Card>
        </section>
      )}

      {pestana === 'mermas' && (
        <section role="tabpanel" id="panel-mermas" aria-labelledby="tab-mermas" className="space-y-4">
          {!tiene('INV_REGISTRAR_MERMA') ? (
            <Card><EstadoVacio icono={PackageMinus} titulo="No tienes permiso para registrar mermas">
              Puedes consultar stock y alertas. Solicita el permiso INV_REGISTRAR_MERMA a una persona administradora.
            </EstadoVacio></Card>
          ) : (
            <Card icono={PackageMinus} titulo="Registrar merma" descripcion="El backend validará el stock disponible y registrará el movimiento.">
              <div className="mb-4 rounded-md bg-muted px-4 py-3 text-body">
                <span className="font-medium">Sucursal de la merma: </span>{sucursalActiva?.nombre ?? 'Sin sucursal seleccionada'}
              </div>
              {cargandoStock ? <SkeletonTexto lineas={3} texto="Cargando insumos…" />
                : errorStock ? <p className="text-body text-fg-muted">No se puede cargar la lista de insumos hasta resolver el error de stock.</p>
                  : !stock.length ? <EstadoVacio icono={PackageMinus} titulo="No hay insumos disponibles para seleccionar">
                    Selecciona una sucursal con stock cargado antes de registrar una merma.
                  </EstadoVacio> : (
                    <form className="grid gap-4 md:grid-cols-2" onSubmit={registrarMerma}>
                      <Select
                        etiqueta="Insumo"
                        opciones={opcionesInsumo}
                        placeholder="Selecciona un insumo"
                        value={idInsumo}
                        onChange={(evento) => setIdInsumo(evento.target.value)}
                        disabled={enviando || cargandoStock}
                      />
                      <div>
                        <label htmlFor="inventario-cantidad-merma" className="mb-1.5 block text-label">Cantidad <span className="text-danger-text">*</span></label>
                        <CampoTexto
                          id="inventario-cantidad-merma"
                          icono={Scale}
                          type="number"
                          min="1"
                          max="9999999999"
                          step="1"
                          inputMode="numeric"
                          placeholder="Ej.: 1"
                          value={cantidad}
                          onChange={(evento) => setCantidad(evento.target.value)}
                          disabled={enviando}
                          required
                        />
                        <p className="mt-1 text-body-sm text-fg-muted">Unidades enteras sin decimales.</p>
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="inventario-motivo-merma" className="mb-1.5 block text-label">Motivo <span className="text-danger-text">*</span></label>
                        <CampoTexto
                          id="inventario-motivo-merma"
                          icono={PackageMinus}
                          type="text"
                          maxLength={500}
                          placeholder="Ej.: Producto vencido"
                          value={motivo}
                          onChange={(evento) => setMotivo(evento.target.value)}
                          disabled={enviando}
                          required
                        />
                        <p className="mt-1 text-body-sm text-fg-muted">Describe el motivo en 3 a 500 caracteres.</p>
                      </div>
                      <div className="flex justify-end border-t border-line pt-4 md:col-span-2">
                        <Button type="submit" icono={PackageMinus} cargando={enviando} disabled={!puedeRegistrarMerma}>
                          Registrar merma
                        </Button>
                      </div>
                    </form>
                  )}
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
