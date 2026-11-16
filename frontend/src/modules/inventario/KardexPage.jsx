import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, PackageSearch, Search, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { ZONA_NEGOCIO } from '../../config/negocio.js';
import { formatoDinero, formatearUnidades } from '../../utils/formato.js';

const TOPE_API = 500; // el endpoint devuelve como máximo los 500 movimientos más recientes

// Tipos posibles en inventario.movimientos_inventario (CHECK de la base de datos).
const TIPOS_MOVIMIENTO = [
  { valor: 'VENTA', etiqueta: 'Venta' },
  { valor: 'ANULACION_VENTA', etiqueta: 'Anulación de venta' },
  { valor: 'COMPRA', etiqueta: 'Compra' },
  { valor: 'MERMA', etiqueta: 'Merma' },
  { valor: 'AJUSTE', etiqueta: 'Ajuste' },
  { valor: 'INVENTARIO_INICIAL', etiqueta: 'Inventario inicial' },
  { valor: 'TRASLADO_ENTRADA', etiqueta: 'Traslado (entrada)' },
  { valor: 'TRASLADO_SALIDA', etiqueta: 'Traslado (salida)' },
];
const ETIQUETA_TIPO = Object.fromEntries(TIPOS_MOVIMIENTO.map((t) => [t.valor, t.etiqueta]));

const ATAJOS_FECHA = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: '7d', texto: '7 días' },
  { clave: '30d', texto: '30 días' },
  { clave: 'mes', texto: 'Este mes' },
];

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-SV', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hour12: false, timeZone: ZONA_NEGOCIO,
});

const hoyISO = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
};
const restarDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};
const inicioDeMes = () => hoyISO().slice(0, 8) + '01';

const esEntrada = (fila) => Number(fila.cantidad) >= 0;
const esSalida = (fila) => Number(fila.cantidad) < 0;

function BadgeMovimiento({ tipo }) {
  const salida = tipo === 'VENTA' || tipo === 'MERMA' || tipo === 'TRASLADO_SALIDA';
  const entrada = tipo === 'COMPRA' || tipo === 'ANULACION_VENTA' || tipo === 'TRASLADO_ENTRADA' || tipo === 'INVENTARIO_INICIAL';
  const Icono = salida ? ArrowDown : entrada ? ArrowUp : ArrowUpDown;
  const clase = salida
    ? 'bg-danger-soft text-danger'
    : tipo === 'ANULACION_VENTA'
      ? 'bg-warning-soft text-warning'
      : 'bg-success-soft text-success';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      <Icono size={13} aria-hidden="true" />
      {ETIQUETA_TIPO[tipo] ?? tipo}
    </span>
  );
}

function EncabezadoOrdenable({ clave, titulo, orden, dirOrden, onOrdenar, className = '' }) {
  const activo = orden === clave;
  return (
    <button
      type="button"
      onClick={() => onOrdenar(clave)}
      className={`inline-flex items-center gap-1 uppercase tracking-wide ${activo ? 'text-fg' : ''} ${className}`}
      aria-sort={activo ? (dirOrden === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {titulo}
      {activo
        ? (dirOrden === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)
        : <ArrowUpDown size={12} aria-hidden="true" className="opacity-50" />}
    </button>
  );
}

function comparar(a, b, clave) {
  if (clave === 'creado_en') return new Date(a.creado_en) - new Date(b.creado_en);
  if (['cantidad', 'stock_resultante', 'costo_unitario'].includes(clave)) return Number(a[clave] ?? 0) - Number(b[clave] ?? 0);
  return String(a[clave] ?? '').localeCompare(String(b[clave] ?? ''), 'es');
}

export default function KardexPage() {
  const { usuario, tiene } = useAuth();
  const verCostos = tiene('INV_VER_COSTOS');
  const sucursales = useMemo(() => usuario?.sucursales ?? [], [usuario?.sucursales]);
  const [parametros, setParametros] = useSearchParams();

  const sucursal = parametros.get('sucursal') || '';
  const insumo = parametros.get('insumo') || '';
  const desde = parametros.get('desde') || '';
  const hasta = parametros.get('hasta') || '';
  const tiposSel = useMemo(() => new Set((parametros.get('tipos') || '').split(',').filter(Boolean)), [parametros]);
  const direccion = parametros.get('direccion') || 'todos';
  const buscar = parametros.get('q') || '';
  const orden = parametros.get('orden') || 'creado_en';
  const dirOrden = parametros.get('dir') === 'asc' ? 'asc' : 'desc';
  const tamanoPagina = [25, 50, 100].includes(Number(parametros.get('tam'))) ? Number(parametros.get('tam')) : 25;
  const pagina = Math.max(0, Number(parametros.get('pagina') || 0) || 0);

  const [insumos, setInsumos] = useState([]);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [textoBusqueda, setTextoBusqueda] = useState(buscar);
  const debounce = useRef(null);

  const fijar = useCallback((cambios) => {
    setParametros((actual) => {
      const siguiente = new URLSearchParams(actual);
      Object.entries(cambios).forEach(([clave, valor]) => {
        if (valor === '' || valor === null || valor === undefined) siguiente.delete(clave);
        else siguiente.set(clave, String(valor));
      });
      // Cualquier cambio de filtro vuelve a la primera página.
      if (!('pagina' in cambios)) siguiente.delete('pagina');
      return siguiente;
    }, { replace: true });
  }, [setParametros]);

  // Sucursal por defecto: la primera asignada, si la URL no trae una.
  useEffect(() => {
    if (!sucursal && sucursales.length) fijar({ sucursal: String(sucursales[0].id_sucursal) });
  }, [sucursales, sucursal, fijar]);

  useEffect(() => {
    api.get('/inventario/insumos').then(setInsumos).catch((e) => setError(e.message));
  }, []);

  const cargar = useCallback(async () => {
    if (!sucursal) return;
    setCargando(true);
    setError(null);
    try {
      const q = new URLSearchParams({ idSucursal: sucursal });
      if (insumo) q.set('idInsumo', insumo);
      setFilas(await api.get(`/inventario/movimientos?${q}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [sucursal, insumo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Búsqueda de texto con debounce: se escribe local y se publica en la URL a los 300 ms.
  const cambiarBusqueda = (valor) => {
    setTextoBusqueda(valor);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fijar({ q: valor.trim() || null }), 300);
  };
  useEffect(() => () => clearTimeout(debounce.current), []);
  // Si la URL cambió por fuera (enlace compartido), sincroniza el campo.
  useEffect(() => { setTextoBusqueda(buscar); }, [buscar]);

  const aplicarAtajo = (clave) => {
    if (clave === 'hoy') fijar({ desde: hoyISO(), hasta: hoyISO() });
    else if (clave === '7d') fijar({ desde: restarDias(6), hasta: hoyISO() });
    else if (clave === '30d') fijar({ desde: restarDias(29), hasta: hoyISO() });
    else if (clave === 'mes') fijar({ desde: inicioDeMes(), hasta: hoyISO() });
  };

  const alternarTipo = useCallback((valor) => {
    setParametros((actual) => {
      const siguiente = new URLSearchParams(actual);
      const actuales = new Set((siguiente.get('tipos') || '').split(',').filter(Boolean));
      if (!actuales.delete(valor)) actuales.add(valor);
      if (actuales.size) siguiente.set('tipos', [...actuales].join(','));
      else siguiente.delete('tipos');
      siguiente.delete('pagina');
      return siguiente;
    }, { replace: true });
  }, [setParametros]);

  const onOrdenar = (clave) => fijar(
    orden === clave ? { dir: dirOrden === 'desc' ? 'asc' : 'desc' } : { orden: clave, dir: null },
  );

  const filtradas = useMemo(() => {
    const termino = buscar.trim().toLocaleLowerCase('es');
    const inicio = desde ? Date.parse(`${desde}T00:00:00`) : null;
    const fin = hasta ? Date.parse(`${hasta}T23:59:59.999`) : null;
    return filas.filter((fila) => {
      const instante = new Date(fila.creado_en).getTime();
      if (inicio !== null && instante < inicio) return false;
      if (fin !== null && instante > fin) return false;
      if (tiposSel.size && !tiposSel.has(fila.tipo)) return false;
      if (direccion === 'entradas' && !esEntrada(fila)) return false;
      if (direccion === 'salidas' && !esSalida(fila)) return false;
      if (termino) {
        const texto = `${fila.motivo ?? ''} ${fila.referencia_tipo ?? ''} ${fila.referencia_id ?? ''}`.toLocaleLowerCase('es');
        if (!texto.includes(termino)) return false;
      }
      return true;
    });
  }, [filas, desde, hasta, tiposSel, direccion, buscar]);

  const ordenadas = useMemo(() => {
    const lista = [...filtradas].sort((a, b) => comparar(a, b, orden));
    if (dirOrden === 'desc') lista.reverse();
    return lista;
  }, [filtradas, orden, dirOrden]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / tamanoPagina));
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = ordenadas.slice(paginaActual * tamanoPagina, (paginaActual + 1) * tamanoPagina);

  const chips = useMemo(() => {
    const lista = [];
    if (insumo) lista.push({ clave: 'insumo', texto: `Insumo: ${insumos.find((i) => String(i.id_insumo) === insumo)?.nombre ?? insumo}`, quitar: () => fijar({ insumo: null }) });
    if (desde || hasta) lista.push({ clave: 'fechas', texto: `Fechas: ${desde || '…'} a ${hasta || '…'}`, quitar: () => fijar({ desde: null, hasta: null }) });
    tiposSel.forEach((tipo) => lista.push({ clave: `tipo-${tipo}`, texto: ETIQUETA_TIPO[tipo] ?? tipo, quitar: () => alternarTipo(tipo) }));
    if (direccion !== 'todos') lista.push({ clave: 'direccion', texto: direccion === 'entradas' ? 'Solo entradas' : 'Solo salidas', quitar: () => fijar({ direccion: null }) });
    if (buscar) lista.push({ clave: 'q', texto: `Buscar: “${buscar}”`, quitar: () => { setTextoBusqueda(''); fijar({ q: null }); } });
    return lista;
  }, [insumo, insumos, desde, hasta, tiposSel, direccion, buscar, fijar, alternarTipo]);

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    fijar({ insumo: null, desde: null, hasta: null, tipos: null, direccion: null, q: null });
  };

  const encabezado = (clave, titulo) => (
    <EncabezadoOrdenable clave={clave} titulo={titulo} orden={orden} dirOrden={dirOrden} onOrdenar={onOrdenar} />
  );

  const columnas = [
    {
      clave: 'creado_en', titulo: 'Fecha', encabezado: encabezado('creado_en', 'Fecha'),
      render: (f) => {
        const fecha = new Date(f.creado_en);
        return Number.isNaN(fecha.getTime())
          ? f.creado_en
          : <span className="whitespace-nowrap" title={f.creado_en}>{FORMATO_FECHA_HORA.format(fecha).replaceAll('.', '')}</span>;
      },
    },
    { clave: 'sucursal', titulo: 'Sucursal', clase: 'hidden xl:table-cell' },
    {
      clave: 'insumo', titulo: 'Insumo', encabezado: encabezado('insumo', 'Insumo'),
      render: (f) => <span className="block max-w-56 truncate" title={f.insumo}>{f.insumo}</span>,
    },
    { clave: 'tipo', titulo: 'Movimiento', encabezado: encabezado('tipo', 'Movimiento'), render: (f) => <BadgeMovimiento tipo={f.tipo} /> },
    {
      clave: 'cantidad', titulo: 'Cantidad', alinear: 'right', encabezado: encabezado('cantidad', 'Cantidad'),
      render: (f) => {
        const n = Number(f.cantidad);
        const signo = n > 0 ? '+' : n < 0 ? '−' : '';
        return <span className={`whitespace-nowrap font-semibold ${n > 0 ? 'text-success' : n < 0 ? 'text-danger' : ''}`}>{signo}{formatearUnidades(Math.abs(n))}</span>;
      },
    },
    { clave: 'stock_resultante', titulo: 'Saldo', alinear: 'right', clase: 'hidden md:table-cell', encabezado: encabezado('stock_resultante', 'Saldo'), render: (f) => formatearUnidades(f.stock_resultante) },
    ...(verCostos ? [{
      clave: 'costo_unitario', titulo: 'Costo unitario (USD)', encabezado: encabezado('costo_unitario', 'Costo unit.'),
      descripcion: 'Costo unitario en USD', alinear: 'right', clase: 'hidden lg:table-cell',
      render: (f) => (f.costo_unitario == null ? '—' : formatoDinero(f.costo_unitario)),
    }] : []),
    { clave: 'motivo', titulo: 'Motivo', clase: 'hidden lg:table-cell', render: (f) => <span className="block max-w-72 whitespace-normal break-words">{f.motivo || '—'}</span> },
    { clave: 'usuario', titulo: 'Usuario', clase: 'hidden xl:table-cell' },
  ];

  const exportarCsv = () => {
    if (!ordenadas.length) return;
    const escapar = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const cabecera = ['fecha', 'sucursal', 'insumo', 'tipo', 'cantidad', 'saldo', 'costo_unitario', 'motivo', 'usuario'];
    const contenido = [
      `# Kárdex exportado. La API entrega como máximo los ${TOPE_API} movimientos más recientes; este archivo contiene solo lo filtrado.`,
      cabecera.map(escapar).join(','),
      ...ordenadas.map((f) => cabecera.map((c) => escapar(c === 'fecha' ? f.creado_en : c === 'tipo' ? (ETIQUETA_TIPO[f.tipo] ?? f.tipo) : f[c])).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `artesa-kardex-${hoyISO()}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Inventario"
        titulo="Kárdex"
        descripcion="Auditoría cronológica de entradas, salidas y ajustes de existencias."
        acciones={<Button variante="secondary" icono={Download} disabled={!ordenadas.length || cargando} onClick={exportarCsv}>Exportar CSV</Button>}
      />
      {error && (
        <BannerError
          error={{ titulo: 'No se pudieron cargar los movimientos', mensaje: error, accion: '' }}
        />
      )}
      <Card titulo="Filtrar movimientos" descripcion="Combina los filtros; se guardan en la dirección de la página para compartir la vista.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            etiqueta="Sucursal"
            value={sucursal}
            onChange={(e) => fijar({ sucursal: e.target.value })}
            opciones={sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre }))}
            placeholder="Selecciona sucursal"
          />
          <Select
            etiqueta="Insumo"
            buscable
            value={insumo}
            onChange={(e) => fijar({ insumo: e.target.value })}
            opciones={insumos.map((i) => ({ valor: String(i.id_insumo), texto: i.nombre }))}
            placeholder="Todos los insumos"
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium">Rango de fechas</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atajos de rango de fechas">
              {ATAJOS_FECHA.map((a) => (
                <button key={a.clave} type="button" onClick={() => aplicarAtajo(a.clave)}
                  className="min-h-9 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {a.texto}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-fg-muted">Desde
                <input className="input mt-1 h-9 py-0 text-xs" type="date" value={desde} max={hasta || undefined} onChange={(e) => fijar({ desde: e.target.value || null })} aria-label="Fecha desde" />
              </label>
              <label className="text-xs font-medium text-fg-muted">Hasta
                <input className="input mt-1 h-9 py-0 text-xs" type="date" value={hasta} min={desde || undefined} onChange={(e) => fijar({ hasta: e.target.value || null })} aria-label="Fecha hasta" />
              </label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Select
              etiqueta="Sentido"
              value={direccion}
              onChange={(e) => fijar({ direccion: e.target.value === 'todos' ? null : e.target.value })}
              opciones={[{ valor: 'todos', texto: 'Entradas y salidas' }, { valor: 'entradas', texto: 'Solo entradas' }, { valor: 'salidas', texto: 'Solo salidas' }]}
              placeholder="Entradas y salidas"
            />
            <div>
              <label htmlFor="kardex-buscar" className="mb-1.5 block text-sm font-medium">Buscar en motivo o referencia</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <input id="kardex-buscar" type="search" className="input h-10 pl-9 pr-9" placeholder="Ej. anulación, faltante…"
                  value={textoBusqueda} onChange={(e) => cambiarBusqueda(e.target.value)} />
                {textoBusqueda && (
                  <button type="button" className="btn-ghost absolute right-1 top-1/2 min-h-8 -translate-y-1/2 !p-1.5" onClick={() => cambiarBusqueda('')} aria-label="Limpiar búsqueda">
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-medium">Tipo de movimiento</legend>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_MOVIMIENTO.map((t) => {
              const activo = tiposSel.has(t.valor);
              return (
                <button key={t.valor} type="button" aria-pressed={activo} onClick={() => alternarTipo(t.valor)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activo ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg hover:bg-muted'}`}>
                  {t.etiqueta}
                </button>
              );
            })}
          </div>
        </fieldset>

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3" aria-label="Filtros aplicados">
            {chips.map((chip) => (
              <span key={chip.clave} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-text">
                {chip.texto}
                <button type="button" onClick={chip.quitar} aria-label={`Quitar filtro ${chip.texto}`} className="rounded-full p-0.5 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
            <button type="button" onClick={limpiarFiltros} className="text-xs font-semibold text-primary-text underline-offset-2 hover:underline">Limpiar filtros</button>
          </div>
        )}
      </Card>

      <Card
        titulo="Movimientos registrados"
        descripcion={`${filtradas.length} de ${filas.length} movimientos${filas.length >= TOPE_API ? ` · se muestran solo los ${TOPE_API} más recientes que entrega el sistema` : ''}`}
        acciones={<Button variante="ghost" onClick={cargar} cargando={cargando}>Recargar</Button>}
      >
        {filas.length >= TOPE_API && (
          <p className="mb-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs text-warning" role="status">
            La consulta llegó al máximo de {TOPE_API} movimientos: estás viendo los más recientes. Afina los filtros de sucursal o insumo para ver otros.
          </p>
        )}
        {!cargando && !error && !filtradas.length ? (
          <EstadoVacio icono={PackageSearch} titulo={filas.length ? 'Ningún movimiento coincide con los filtros' : 'No hay movimientos para esta sucursal'}>
            {filas.length ? 'Ajusta o limpia los filtros para ver más resultados.' : 'Cuando se registre actividad de inventario aparecerá aquí.'}
          </EstadoVacio>
        ) : (
          <>
            <Table
              cargando={cargando}
              filas={visibles}
              idFila="id_movimiento"
              vacio="No hay movimientos para estos filtros."
              columnas={columnas}
              scrollVertical={false}
              horizontal={false}
              minAncho="min-w-0"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-fg-muted">
              <span aria-live="polite">
                {ordenadas.length
                  ? `Mostrando ${paginaActual * tamanoPagina + 1}–${Math.min((paginaActual + 1) * tamanoPagina, ordenadas.length)} de ${ordenadas.length}`
                  : 'Sin resultados'}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  aria-label="Movimientos por página"
                  tamano="sm"
                  value={String(tamanoPagina)}
                  onChange={(e) => fijar({ tam: e.target.value === '25' ? null : e.target.value })}
                  opciones={[25, 50, 100].map((n) => ({ valor: String(n), texto: `${n} por página` }))}
                />
                <Button variante="ghost" className="px-3 py-1.5" disabled={paginaActual === 0} onClick={() => fijar({ pagina: paginaActual - 1 || null })}>Anterior</Button>
                <Button variante="ghost" className="px-3 py-1.5" disabled={paginaActual >= paginas - 1} onClick={() => fijar({ pagina: paginaActual + 1 })}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
