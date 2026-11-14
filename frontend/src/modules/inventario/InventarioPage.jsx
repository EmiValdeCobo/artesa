import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Boxes, PackageMinus, Scale, Search, Store, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import CampoTexto from '../../components/forms/CampoTexto.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
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
  const { notificar } = useAlert();
  const sucursales = usuario?.sucursales ?? SUCURSALES_VACIAS;
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
  const [errorMerma, setErrorMerma] = useState(null);
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
  };

  const registrarMerma = async (evento) => {
    evento.preventDefault();
    if (!puedeRegistrarMerma || !insumoSeleccionado) return;

    setEnviando(true);
    setErrorMerma(null);
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
      setErrorMerma(traducirError(error));
    } finally {
      setEnviando(false);
    }
  };

  const columnasStock = [
    { clave: 'insumo', titulo: 'Insumo' },
    { clave: 'unidad', titulo: 'Unidad' },
    { clave: 'stock_actual', titulo: 'Stock actual', alinear: 'right', render: (fila) => formatearUnidades(fila.stock_actual) },
    { clave: 'stock_minimo', titulo: 'Stock mínimo', alinear: 'right', render: (fila) => formatearUnidades(fila.stock_minimo) },
  ];

  const columnasAlertas = [
    { clave: 'insumo', titulo: 'Insumo' },
    { clave: 'unidad', titulo: 'Unidad' },
    { clave: 'nivel', titulo: 'Nivel', render: (fila) => (
      <EstadoBadge tipo={fila.nivel === 'AGOTADO' ? 'error' : 'alerta'}>{fila.nivel}</EstadoBadge>
    ) },
    { clave: 'stock_actual', titulo: 'Actual', alinear: 'right', render: (fila) => formatearUnidades(fila.stock_actual) },
    { clave: 'stock_minimo', titulo: 'Mínimo', alinear: 'right', render: (fila) => formatearUnidades(fila.stock_minimo) },
    { clave: 'faltante', titulo: 'Faltante', alinear: 'right', render: (fila) => formatearUnidades(fila.faltante) },
  ];

  const pestanas = [
    { clave: 'alertas', texto: 'Alertas', icono: AlertTriangle, total: cargandoAlertas || errorAlertas ? undefined : alertas.length },
    { clave: 'stock', texto: 'Stock', icono: Boxes, total: cargandoStock || errorStock ? undefined : stock.length },
    { clave: 'mermas', texto: 'Mermas', icono: PackageMinus },
  ];

  if (!sucursales.length) {
    return (
      <div className="space-y-6">
        <EncabezadoPagina seccion="Operación" titulo="Inventario" />
        <Card><EstadoVacio icono={Boxes} titulo="No tienes sucursales asignadas">
          Pide a una persona administradora que te asigne una sucursal para consultar el inventario.
        </EstadoVacio></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Operación" titulo="Inventario" descripcion="Consulta existencias y alertas, y registra mermas de la sucursal seleccionada." acciones={<div className="w-full sm:max-w-xs">
          <Select
            etiqueta="Sucursal"
            opciones={opcionesSucursal}
            value={idSucursal}
            onChange={cambiarSucursal}
            disabled={enviando}
          />
        </div>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metrica icono={Boxes} valor={cargandoStock ? '…' : errorStock ? '—' : stock.length} etiqueta="Insumos en sucursal" tono="primario" />
        <Metrica icono={AlertTriangle} valor={cargandoAlertas ? '…' : errorAlertas ? '—' : alertas.length} etiqueta="Alertas activas" tono={alertas.length ? 'aviso' : 'exito'} />
        <Metrica icono={Store} valor={sucursalActiva?.nombre ?? '—'} etiqueta="Sucursal activa" tono="info" />
      </div>

      <Pestanas etiqueta="Secciones de inventario" activa={pestana} onCambiar={setPestana} pestanas={pestanas} />

      {pestana === 'alertas' && (
        <section role="tabpanel" id="panel-alertas" aria-labelledby="tab-alertas" className="space-y-4">
          <Card titulo="Alertas de stock mínimo" descripcion="Niveles y cantidades informados por el backend para esta sucursal.">
            {errorAlertas && <BannerError className="mb-4" error={errorAlertas} onReintentar={() => cargarSucursal(idSucursal)} />}
            {cargandoAlertas ? <Spinner texto="Cargando alertas…" />
              : errorAlertas ? null
                : alertas.length === 0 ? <EstadoVacio icono={AlertTriangle} titulo="No hay alertas de stock">
                  El backend no reporta insumos bajo su mínimo en esta sucursal.
                </EstadoVacio>
                  : <Table columnas={columnasAlertas} filas={alertas} idFila="insumo" vacio="No hay alertas para mostrar." />}
          </Card>
        </section>
      )}

      {pestana === 'stock' && (
        <section role="tabpanel" id="panel-stock" aria-labelledby="tab-stock" className="space-y-4">
          <Card
            titulo="Existencias"
            descripcion="Stock actual y mínimo registrados por el backend."
            acciones={(
              <div className="relative w-full sm:w-72">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
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
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          >
            {errorTipos && <BannerError className="mb-4" error={errorTipos} onReintentar={cargarTiposInsumo} />}
            <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar stock por tipo de insumo">
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
                    className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${seleccionada ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg hover:bg-muted'} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {etiqueta} <span className="ml-1 text-xs" aria-label={`${total} insumos`}>{total}</span>
                  </button>
                );
              })}
              {cargandoTipos && <span role="status" className="text-xs text-fg-muted">Cargando tipos…</span>}
            </div>
            <p className="mb-3 text-sm text-fg-muted" aria-live="polite">{stockFiltrado.length} {stockFiltrado.length === 1 ? 'resultado' : 'resultados'}</p>
            {errorStock && <BannerError className="mb-4" error={errorStock} onReintentar={() => cargarSucursal(idSucursal)} />}
            {cargandoStock ? <Spinner texto="Cargando stock…" />
              : errorStock ? null
                : stock.length === 0 ? <EstadoVacio icono={Boxes} titulo="No hay stock para esta sucursal">
                  Cuando el backend devuelva existencias, aparecerán aquí.
                </EstadoVacio>
                  : stockFiltrado.length === 0 ? <EstadoVacio icono={Search} titulo="No encontramos insumos">
                    Prueba con otro nombre o limpia la búsqueda.
                  </EstadoVacio>
                    : <Table columnas={columnasStock} filas={stockFiltrado} idFila="id_insumo" vacio="No hay existencias para mostrar." />}
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
            <Card titulo="Registrar merma" descripcion="El backend validará el stock disponible y registrará el movimiento.">
              <div className="mb-5 rounded-lg border border-line bg-muted/50 px-4 py-3 text-sm">
                <span className="font-medium">Sucursal de la merma: </span>{sucursalActiva?.nombre ?? 'Sin sucursal seleccionada'}
              </div>
              {errorMerma && <BannerError className="mb-4" error={errorMerma} onCerrar={() => setErrorMerma(null)} />}
              {cargandoStock ? <Spinner texto="Cargando insumos…" />
                : errorStock ? <p className="text-sm text-fg-muted">No se puede cargar la lista de insumos hasta resolver el error de stock.</p>
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
                        <label htmlFor="inventario-cantidad-merma" className="mb-1.5 block text-sm font-medium">Cantidad</label>
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
                        <p className="mt-1 text-xs text-fg-muted">Unidades enteras sin decimales.</p>
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="inventario-motivo-merma" className="mb-1.5 block text-sm font-medium">Motivo</label>
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
                        <p className="mt-1 text-xs text-fg-muted">Describe el motivo en 3 a 500 caracteres.</p>
                      </div>
                      <div className="md:col-span-2">
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
