import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  Boxes,
  ClipboardCheck,
  Download,
  Package,
  Printer,
  ReceiptText,
  Store,
  TrendingUp,
  WalletCards,
  Wallet,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';

function fechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

const HOY = fechaLocal();
const fechaInicio = new Date();
fechaInicio.setDate(fechaInicio.getDate() - 29);
const INICIO = fechaLocal(fechaInicio);
const FORMATO_FECHA = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-SV', { dateStyle: 'short', timeStyle: 'short' });
const FORMATO_NUMERO = new Intl.NumberFormat('es-SV');
const ETIQUETAS_PAGO = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', BITCOIN_CHIVO: 'Bitcoin / Chivo', TRANSFERENCIA: 'Transferencia' };

// PostgreSQL entrega NUMERIC como string. Los importes se agregan en centavos BigInt;
// Number se reserva para presentar valores y dimensionar elementos gráficos.
function aCentavos(valor) {
  const texto = String(valor ?? '0').trim();
  const negativo = texto.startsWith('-');
  const limpio = negativo ? texto.slice(1) : texto;
  const [entero = '0', decimal = ''] = limpio.split('.');
  if (!/^\d+$/.test(entero || '0') || !/^\d*$/.test(decimal)) return 0n;
  const centavos = (BigInt(entero || '0') * 100n) + BigInt((decimal + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

function sumarImportes(filas, campo) {
  return filas.reduce((total, fila) => total + aCentavos(fila[campo]), 0n);
}

function formatearCentavos(centavos) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = FORMATO_NUMERO.format(Number(absoluto / 100n));
  const decimales = String(absoluto % 100n).padStart(2, '0');
  return `${negativo ? '−' : ''}$${entero}.${decimales}`;
}

function formatearDinero(valor) {
  return formatearCentavos(aCentavos(valor));
}

function formatearFecha(valor, incluirHora = false) {
  if (!valor) return '—';
  const texto = String(valor);
  const fecha = new Date(texto.length === 10 ? `${texto}T12:00:00` : texto);
  if (Number.isNaN(fecha.getTime())) return texto;
  return (incluirHora ? FORMATO_FECHA_HORA : FORMATO_FECHA).format(fecha);
}

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(`${hasta}T12:00:00`) - Date.parse(`${desde}T12:00:00`)) / 86_400_000);
}

function agruparVentas(ventas, desde, hasta) {
  const dias = diasEntre(desde, hasta);
  const granularidad = dias > 180 ? 'mes' : dias > 45 ? 'semana' : 'dia';
  const grupos = new Map();

  ventas.forEach((fila) => {
    const fecha = new Date(`${String(fila.fecha).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return;
    let clave = String(fila.fecha).slice(0, 10);
    let etiqueta = FORMATO_FECHA.format(fecha);

    if (granularidad === 'mes') {
      clave = clave.slice(0, 7);
      etiqueta = fecha.toLocaleDateString('es-SV', { month: 'short', year: '2-digit' });
    } else if (granularidad === 'semana') {
      const lunes = new Date(fecha);
      lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
      clave = fechaLocal(lunes);
      etiqueta = `Sem. ${lunes.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' })}`;
    } else {
      etiqueta = fecha.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' });
    }

    const grupo = grupos.get(clave) ?? { clave, etiqueta, ventas: 0n, tickets: 0 };
    grupo.ventas += aCentavos(fila.total);
    grupo.tickets += Number(fila.tickets) || 0;
    grupos.set(clave, grupo);
  });

  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

function construirVentasSucursal(ventas) {
  const grupos = new Map();
  ventas.forEach((fila) => {
    const clave = fila.id_sucursal ?? fila.sucursal;
    const grupo = grupos.get(clave) ?? { id_sucursal: fila.id_sucursal, sucursal: fila.sucursal, tickets: 0, ventas: 0n };
    grupo.tickets += Number(fila.tickets) || 0;
    grupo.ventas += aCentavos(fila.total);
    grupos.set(clave, grupo);
  });
  return [...grupos.values()]
    .sort((a, b) => a.ventas === b.ventas ? a.sucursal.localeCompare(b.sucursal) : a.ventas > b.ventas ? -1 : 1)
    .map((fila) => ({
      ...fila,
      _fila: fila.id_sucursal ?? fila.sucursal,
      ticketPromedio: fila.tickets ? formatearCentavos((fila.ventas + BigInt(Math.floor(fila.tickets / 2))) / BigInt(fila.tickets)) : formatearCentavos(0n),
      ventasTexto: formatearCentavos(fila.ventas),
    }));
}

function exportarCsv(nombre, filas) {
  if (!filas.length) return;
  const claves = [...new Set(filas.flatMap((fila) => Object.keys(fila)))].filter((clave) => clave !== '_fila');
  const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
  const contenido = [
    claves.map(escapar).join(','),
    ...filas.map((fila) => claves.map((clave) => escapar(fila[clave])).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}-${HOY}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function TablaPaginada({ filas, columnas, idFila = '_fila', vacio, tamano = 12 }) {
  const [pagina, setPagina] = useState(0);
  const paginas = Math.max(1, Math.ceil(filas.length / tamano));
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(paginaActual * tamano, (paginaActual + 1) * tamano);

  return (
    <>
      <Table filas={visibles} columnas={columnas} idFila={idFila} vacio={vacio} />
      {paginas > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-fg-muted">
          <span>Mostrando {paginaActual * tamano + 1}–{Math.min((paginaActual + 1) * tamano, filas.length)} de {filas.length}</span>
          <div className="flex gap-2">
            <Button variante="ghost" className="px-3 py-1.5" disabled={paginaActual === 0} onClick={() => setPagina((actual) => Math.max(0, actual - 1))}>Anterior</Button>
            <Button variante="ghost" className="px-3 py-1.5" disabled={paginaActual >= paginas - 1} onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))}>Siguiente</Button>
          </div>
        </div>
      )}
    </>
  );
}

function GraficoVentas({ serie }) {
  const maximo = serie.reduce((max, punto) => punto.ventas > max ? punto.ventas : max, 0n);
  if (!serie.length) {
    return <p className="py-12 text-center text-sm text-fg-muted">No hay ventas suficientes para construir la tendencia.</p>;
  }

  return (
    <div className="w-full min-w-0 pb-1">
      <div className="grid h-56 w-full min-w-0 items-end gap-1 border-b border-line px-1 pt-5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }}>
        {serie.map((punto, indice) => {
          const altura = maximo > 0n ? Number((punto.ventas * 100n) / maximo) : 0;
          return (
            <div key={punto.clave} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={`${punto.etiqueta}: ${formatearCentavos(punto.ventas)} · ${punto.tickets} tickets`}>
              <span className="text-[9px] tabular-nums text-fg-muted sm:text-[10px]">{altura >= 18 ? `${altura}%` : ''}</span>
              <div
                className="w-full min-h-1 rounded-t-md transition-[height]"
                style={{
                  height: `${Math.max(3, altura)}%`,
                  backgroundColor: indice === serie.length - 1 ? 'var(--chart-focus)' : 'var(--chart-neutral)',
                }}
                aria-label={`${punto.etiqueta}: ${formatearCentavos(punto.ventas)}`}
              />
              <span className="w-full truncate text-center text-[8px] text-fg-muted sm:text-[10px]">{punto.etiqueta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResumenProductos({ productos }) {
  if (!productos.length) return <p className="py-10 text-center text-sm text-fg-muted">No hay productos vendidos en este período.</p>;
  const maximo = Math.max(...productos.map((fila) => Number(fila.unidades) || 0), 1);
  return (
    <ol className="space-y-4">
      {productos.slice(0, 8).map((fila, indice) => {
        const unidades = Number(fila.unidades) || 0;
        return (
          <li key={`${fila.nombre}-${indice}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium"><span className="mr-2 text-xs text-fg-muted">{String(indice + 1).padStart(2, '0')}</span>{fila.nombre}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">{FORMATO_NUMERO.format(unidades)} u.</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${fila.nombre}: ${unidades} unidades`}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (unidades / maximo) * 100)}%`, backgroundColor: indice === 0 ? 'var(--chart-focus)' : 'var(--chart-neutral)' }} />
            </div>
            <p className="mt-1 text-right text-xs text-fg-muted">{formatearDinero(fila.ingreso)}</p>
          </li>
        );
      })}
    </ol>
  );
}

function ResumenMetodosPago({ metodos }) {
  if (!metodos.length) return <p className="py-8 text-center text-sm text-fg-muted">No hay pagos registrados para el período.</p>;
  const total = sumarImportes(metodos, 'total');
  return (
    <ul className="space-y-4">
      {metodos.map((fila, indice) => {
        const monto = aCentavos(fila.total);
        const porcentaje = total > 0n ? Number((monto * 100n) / total) : 0;
        return (
          <li key={fila.metodo}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{ETIQUETAS_PAGO[fila.metodo] ?? fila.metodo}</span>
              <span className="shrink-0 font-semibold tabular-nums">{formatearCentavos(monto)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${ETIQUETAS_PAGO[fila.metodo] ?? fila.metodo}: ${porcentaje}% del ingreso`}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, porcentaje)}%`, backgroundColor: indice === 0 ? 'var(--chart-focus)' : 'var(--chart-neutral)' }} />
            </div>
            <p className="mt-1 text-xs text-fg-muted">{FORMATO_NUMERO.format(Number(fila.tickets) || 0)} tickets que utilizaron este método · {porcentaje}% del ingreso</p>
          </li>
        );
      })}
    </ul>
  );
}

function importesEsperadosTurno(fila) {
  return aCentavos(fila.esperado_efectivo) + aCentavos(fila.esperado_tarjeta) + aCentavos(fila.esperado_digital);
}

function importesContadosTurno(fila) {
  return aCentavos(fila.monto_cierre_efectivo) + aCentavos(fila.monto_cierre_pos_tarjeta) + aCentavos(fila.monto_cierre_digital);
}

function tieneDiferenciaTurno(fila) {
  return [fila.dif_efectivo, fila.dif_tarjeta, fila.dif_digital].some((valor) => aCentavos(valor) !== 0n);
}

// Se suman diferencias absolutas por método: una diferencia positiva de efectivo
// no debe compensar una diferencia negativa de tarjeta o pagos digitales.
function desviacionAbsolutaTurno(fila) {
  return [fila.dif_efectivo, fila.dif_tarjeta, fila.dif_digital]
    .reduce((total, valor) => {
      const centavos = aCentavos(valor);
      return total + (centavos < 0n ? -centavos : centavos);
    }, 0n);
}

export default function ReportesPage() {
  const { usuario, tiene } = useAuth();
  const sucursales = usuario?.sucursales ?? [];
  const puedeVerMargen = tiene('INV_VER_COSTOS');
  const puedeVerCuadres = tiene('CAJA_VER_CUADRES');
  const puedeVerCuentas = tiene('COM_VER_CXP');
  const controladorCarga = useRef(null);
  const [desde, setDesde] = useState(INICIO);
  const [hasta, setHasta] = useState(HOY);
  const [idSucursal, setIdSucursal] = useState('');
  const [datos, setDatos] = useState({ ventas: [], productos: [], metodosPago: [], alertas: [], margen: [], cuadres: [], cuentas: [] });
  const [cargando, setCargando] = useState(true);
  const [errores, setErrores] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState('ventas');

  async function cargar(filtros = { desde, hasta, idSucursal }) {
    const rangoInvalido = !filtros.desde || !filtros.hasta || filtros.desde > filtros.hasta || diasEntre(filtros.desde, filtros.hasta) > 366;
    if (rangoInvalido) {
      setErrores(['Selecciona un rango válido de hasta 366 días. La fecha inicial debe ser anterior o igual a la final.']);
      return;
    }

    controladorCarga.current?.abort();
    const controlador = new AbortController();
    controladorCarga.current = controlador;
    setCargando(true);
    setErrores([]);

    const consulta = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta });
    if (filtros.idSucursal) consulta.set('idSucursal', filtros.idSucursal);
    const query = consulta.toString();
    const parametrosStock = filtros.idSucursal ? `?idSucursal=${encodeURIComponent(filtros.idSucursal)}` : '';
    const consultas = [
      { clave: 'ventas', etiqueta: 'Ventas diarias', promesa: api.get(`/reportes/ventas-diarias?${query}`, { signal: controlador.signal }) },
      { clave: 'productos', etiqueta: 'Productos más vendidos', promesa: api.get(`/reportes/top-productos?${query}`, { signal: controlador.signal }) },
      { clave: 'metodosPago', etiqueta: 'Ventas por método de pago', promesa: api.get(`/reportes/ventas-por-metodo-pago?${query}`, { signal: controlador.signal }) },
      { clave: 'alertas', etiqueta: 'Alertas de inventario', promesa: api.get(`/reportes/alertas-stock${parametrosStock}`, { signal: controlador.signal }) },
    ];
    if (puedeVerMargen) consultas.push({ clave: 'margen', etiqueta: 'Costo y margen', promesa: api.get('/reportes/margen-productos', { signal: controlador.signal }) });
    if (puedeVerCuadres) consultas.push({ clave: 'cuadres', etiqueta: 'Cuadres de caja', promesa: api.get(`/reportes/cuadre-turnos?${query}`, { signal: controlador.signal }) });
    if (puedeVerCuentas) consultas.push({ clave: 'cuentas', etiqueta: 'Cuentas por pagar', promesa: api.get(`/reportes/cuentas-por-pagar?${query}`, { signal: controlador.signal }) });

    const resultados = await Promise.allSettled(consultas.map((item) => item.promesa));
    if (controlador.signal.aborted) return;

    const siguientes = { ventas: [], productos: [], metodosPago: [], alertas: [], margen: [], cuadres: [], cuentas: [] };
    const fallos = [];
    resultados.forEach((resultado, indice) => {
      const { clave, etiqueta } = consultas[indice];
      if (resultado.status === 'fulfilled') {
        siguientes[clave] = resultado.value.map((fila, numero) => ({ ...fila, _fila: fila.id_turno ?? fila.id_compra ?? fila.id_producto ?? `${clave}-${numero}` }));
      } else {
        fallos.push(`${etiqueta}: ${resultado.reason?.message ?? 'error desconocido'}`);
      }
    });
    setDatos(siguientes);
    setErrores(fallos);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    return () => controladorCarga.current?.abort();
    // La carga inicial usa los filtros predeterminados de este montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumen = useMemo(() => {
    const total = sumarImportes(datos.ventas, 'total');
    const tickets = datos.ventas.reduce((suma, fila) => suma + (Number(fila.tickets) || 0), 0);
    const promedio = tickets ? (total + BigInt(Math.floor(tickets / 2))) / BigInt(tickets) : 0n;
    return { total, tickets, promedio };
  }, [datos.ventas]);

  const serieVentas = useMemo(() => agruparVentas(datos.ventas, desde, hasta), [datos.ventas, desde, hasta]);
  const ventasSucursal = useMemo(() => construirVentasSucursal(datos.ventas), [datos.ventas]);
  const alertasAgotadas = datos.alertas.filter((fila) => fila.nivel === 'AGOTADO').length;
  const alertasBajoMinimo = datos.alertas.length - alertasAgotadas;
  const saldoPendiente = sumarImportes(datos.cuentas, 'saldo');
  const cuentasVencidas = datos.cuentas.filter((fila) => Number(fila.dias_vencida) > 0).length;
  const turnosConDiferencia = datos.cuadres.filter((fila) => fila.estado === 'CERRADO' && tieneDiferenciaTurno(fila)).length;
  const pestanasReportes = [
    { clave: 'ventas', texto: 'Resumen de ventas', icono: BarChart3, total: datos.ventas.length },
    { clave: 'inventario', texto: 'Control de inventario', icono: Boxes, total: datos.alertas.length },
    ...((puedeVerCuadres || puedeVerCuentas) ? [{ clave: 'finanzas', texto: 'Control financiero y operativo', icono: WalletCards, total: datos.cuadres.length + datos.cuentas.length }] : []),
  ];

  const columnasVentas = [
    { clave: 'fecha', titulo: 'Fecha', render: (fila) => formatearFecha(String(fila.fecha).slice(0, 10)) },
    { clave: 'sucursal', titulo: 'Sucursal' },
    { clave: 'tickets', titulo: 'Tickets', alinear: 'right' },
    { clave: 'subtotal', titulo: 'Subtotal', alinear: 'right', render: (fila) => formatearDinero(fila.subtotal) },
    { clave: 'iva', titulo: 'IVA', alinear: 'right', render: (fila) => formatearDinero(fila.iva) },
    { clave: 'total', titulo: 'Total', alinear: 'right', render: (fila) => <span className="font-semibold tabular-nums">{formatearDinero(fila.total)}</span> },
    { clave: 'ticket_promedio', titulo: 'Ticket promedio', alinear: 'right', render: (fila) => formatearDinero(fila.ticket_promedio) },
  ];

  const filasCsv = [
    ...datos.ventas.map((fila) => ({ reporte: 'Ventas diarias', ...fila })),
    ...datos.productos.map((fila) => ({ reporte: 'Productos más vendidos', ...fila })),
    ...datos.metodosPago.map((fila) => ({ reporte: 'Ventas por método de pago', ...fila, metodo: ETIQUETAS_PAGO[fila.metodo] ?? fila.metodo })),
    ...datos.alertas.map((fila) => ({ reporte: 'Alertas de inventario', ...fila })),
    ...datos.margen.map((fila) => ({ reporte: 'Costo y margen', ...fila })),
    ...datos.cuadres.map((fila) => ({ reporte: 'Cuadres de caja', ...fila })),
    ...datos.cuentas.map((fila) => ({ reporte: 'Cuentas por pagar', ...fila })),
  ];

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6 print:space-y-3">
      <EncabezadoPagina
        seccion="Análisis del negocio"
        titulo="Reportes"
        descripcion="Ventas, desempeño por sucursal, inventario y control financiero desde los registros del sistema."
        acciones={(
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variante="secondary" icono={Download} disabled={!filasCsv.length || cargando} onClick={() => exportarCsv('artesa-reportes', filasCsv)}>Exportar CSV</Button>
            <Button variante="ghost" icono={Printer} onClick={() => window.print()}>Guardar PDF</Button>
          </div>
        )}
      />

      {errores.length > 0 && (
        <BannerError error={{
          titulo: 'Algunos reportes necesitan atención',
          mensaje: errores.join(' · '),
          accion: '',
        }} />
      )}

      <Card titulo="Período de consulta" descripcion="Las ventas, productos, cuadres y cuentas por pagar respetan el rango y las sucursales asignadas.">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto] xl:items-end" onSubmit={(evento) => { evento.preventDefault(); cargar({ desde, hasta, idSucursal }); }}>
          <label className="block text-sm font-medium">
            Desde
            <input className="input mt-1.5" type="date" value={desde} max={hasta || undefined} onChange={(evento) => setDesde(evento.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Hasta
            <input className="input mt-1.5" type="date" value={hasta} min={desde || undefined} max={HOY} onChange={(evento) => setHasta(evento.target.value)} required />
          </label>
          <Select
            etiqueta="Sucursal"
            value={idSucursal}
            onChange={(evento) => setIdSucursal(evento.target.value)}
            placeholder="Todas mis sucursales"
            opciones={sucursales.map((sucursal) => ({ valor: String(sucursal.id_sucursal), texto: sucursal.nombre }))}
          />
          <Button type="submit" cargando={cargando}>Aplicar filtros</Button>
        </form>
        <p className="mt-3 text-xs text-fg-muted">Máximo 366 días por consulta. Los resultados se limitan a las sucursales que tienes asignadas.</p>
      </Card>

      <Pestanas etiqueta="Secciones de reportes" activa={seccionActiva} onCambiar={setSeccionActiva} pestanas={pestanasReportes} className="flex-wrap" />

      {seccionActiva === 'ventas' && <section role="tabpanel" id="panel-ventas" aria-labelledby="tab-ventas" aria-label="Resumen de ventas" className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold">Resumen de ventas</h2>
            <p className="text-xs text-fg-muted">Importes de ventas emitidas, sin comprobantes anulados.</p>
          </div>
          <span className="text-xs text-fg-muted">{formatearFecha(desde)} – {formatearFecha(hasta)}</span>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica icono={Banknote} valor={cargando ? '…' : formatearCentavos(resumen.total)} etiqueta="Venta total con IVA" tono="primario" />
          <Metrica icono={ReceiptText} valor={cargando ? '…' : FORMATO_NUMERO.format(resumen.tickets)} etiqueta="Tickets emitidos" tono="info" />
          <Metrica icono={TrendingUp} valor={cargando ? '…' : formatearCentavos(resumen.promedio)} etiqueta="Ticket promedio ponderado" tono="exito" />
          <Metrica icono={Store} valor={cargando ? '…' : ventasSucursal.length} etiqueta="Sucursales con ventas" tono="neutro" />
        </div>
      </section>}

      {seccionActiva === 'ventas' && <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card titulo="Tendencia de ventas" descripcion="Cada barra representa ingresos del día. La altura muestra su proporción respecto al día con más ventas; el valor exacto aparece al enfocar o pasar el cursor.">
          <GraficoVentas serie={serieVentas} />
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-neutral)' }} />Períodos anteriores</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-focus)' }} />Período más reciente</span>
          </div>
        </Card>
        <div className="space-y-4">
          <Card titulo="Productos más vendidos" descripcion="Ranking por unidades; el ingreso se muestra debajo de cada barra.">
            <ResumenProductos productos={datos.productos} />
          </Card>
          <Card titulo="Ventas por método de pago" descripcion="Distribución del ingreso cobrado; un ticket puede incluir varios métodos.">
            <ResumenMetodosPago metodos={datos.metodosPago} />
          </Card>
        </div>
      </div>}

      {seccionActiva === 'ventas' && <Card titulo="Desempeño por sucursal" descripcion="Comparación de ingresos y volumen de tickets en el período seleccionado.">
        <TablaPaginada
          filas={ventasSucursal}
          idFila="_fila"
          vacio="No hay ventas por sucursal en este período."
          columnas={[
            { clave: 'sucursal', titulo: 'Sucursal', render: (fila) => <span className="font-semibold">{fila.sucursal}</span> },
            { clave: 'tickets', titulo: 'Tickets', alinear: 'right', render: (fila) => FORMATO_NUMERO.format(fila.tickets) },
            { clave: 'ventasTexto', titulo: 'Ventas', alinear: 'right', render: (fila) => <span className="font-semibold tabular-nums">{fila.ventasTexto}</span> },
            { clave: 'ticketPromedio', titulo: 'Ticket promedio', alinear: 'right' },
          ]}
        />
      </Card>}

      {seccionActiva === 'ventas' && <Card titulo="Detalle de ventas diarias" descripcion="Desglose auditable por fecha y sucursal; exportable a CSV.">
        <TablaPaginada filas={datos.ventas} columnas={columnasVentas} vacio="No hay ventas para el período seleccionado." />
      </Card>}

      {seccionActiva === 'inventario' && <section role="tabpanel" id="panel-inventario" aria-labelledby="tab-inventario" className="min-w-0 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Control de inventario</h2>
          <p className="text-xs text-fg-muted">Alertas actuales y rentabilidad estimada con el costo promedio de insumos.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metrica icono={AlertTriangle} valor={cargando ? '…' : alertasAgotadas} etiqueta="Insumos agotados" tono={alertasAgotadas ? 'aviso' : 'exito'} />
          <Metrica icono={Package} valor={cargando ? '…' : alertasBajoMinimo} etiqueta="Insumos bajo el mínimo" tono={alertasBajoMinimo ? 'aviso' : 'neutro'} />
        </div>
        <Card titulo="Alertas de existencias" descripcion="Fotografía del stock actual; no depende del período de ventas.">
          <TablaPaginada
            filas={datos.alertas}
            vacio="No hay insumos agotados ni bajo el mínimo configurado."
            columnas={[
              { clave: 'sucursal', titulo: 'Sucursal' },
              { clave: 'insumo', titulo: 'Insumo' },
              { clave: 'stock_actual', titulo: 'Existencia', alinear: 'right', render: (fila) => `${fila.stock_actual} ${fila.unidad}` },
              { clave: 'stock_minimo', titulo: 'Mínimo', alinear: 'right', render: (fila) => `${fila.stock_minimo} ${fila.unidad}` },
              { clave: 'faltante', titulo: 'Faltante', alinear: 'right', render: (fila) => `${fila.faltante} ${fila.unidad}` },
              { clave: 'nivel', titulo: 'Nivel', render: (fila) => <span className={`text-xs font-semibold ${fila.nivel === 'AGOTADO' ? 'text-danger' : 'text-warning'}`}>{fila.nivel === 'AGOTADO' ? 'Agotado' : 'Bajo mínimo'}</span> },
            ]}
          />
        </Card>

        {puedeVerMargen && (
          <Card titulo="Costo y margen por producto" descripcion="Estimación basada en recetas y costo promedio, con precio neto de IVA. No representa utilidad contable realizada.">
            <TablaPaginada
              filas={datos.margen}
              vacio="No hay información de costos para productos activos."
              columnas={[
                { clave: 'nombre', titulo: 'Producto' },
                { clave: 'precio_sin_iva', titulo: 'Precio sin IVA', alinear: 'right', render: (fila) => formatearDinero(fila.precio_sin_iva) },
                { clave: 'costo_receta', titulo: 'Costo estimado', alinear: 'right', render: (fila) => formatearDinero(fila.costo_receta) },
                { clave: 'margen', titulo: 'Margen', alinear: 'right', render: (fila) => <span className="font-semibold tabular-nums">{formatearDinero(fila.margen)}</span> },
                { clave: 'margen_pct', titulo: 'Margen %', alinear: 'right', render: (fila) => `${Number(fila.margen_pct ?? 0).toLocaleString('es-SV', { maximumFractionDigits: 2 })}%` },
              ]}
            />
          </Card>
        )}
      </section>}

      {(puedeVerCuadres || puedeVerCuentas) && seccionActiva === 'finanzas' && (
        <section role="tabpanel" id="panel-finanzas" aria-labelledby="tab-finanzas" className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-semibold">Control financiero y operativo</h2>
            <p className="text-xs text-fg-muted">Reportes visibles según tus permisos de caja y compras.</p>
          </div>

          {puedeVerCuadres && (
            <Card titulo="Cuadres de caja por turno" descripcion="Compara los importes esperados con los montos contados al cerrar cada turno. Se muestran hasta 500 registros.">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <Metrica icono={ClipboardCheck} valor={cargando ? '…' : datos.cuadres.length} etiqueta="Turnos en el período" tono="info" />
                <Metrica icono={AlertTriangle} valor={cargando ? '…' : turnosConDiferencia} etiqueta="Turnos cerrados con diferencia" tono={turnosConDiferencia ? 'aviso' : 'exito'} />
                <Metrica icono={Wallet} valor={cargando ? '…' : datos.cuadres.filter((fila) => fila.estado === 'ABIERTO').length} etiqueta="Turnos aún abiertos" tono="neutro" />
              </div>
              <TablaPaginada
                filas={datos.cuadres}
                vacio="No hay turnos de caja para el período seleccionado."
                columnas={[
                  { clave: 'abierto_en', titulo: 'Apertura', render: (fila) => formatearFecha(fila.abierto_en, true) },
                  { clave: 'sucursal', titulo: 'Sucursal' },
                  { clave: 'caja', titulo: 'Caja / usuario', render: (fila) => <><span className="block font-medium">{fila.caja}</span><span className="text-xs text-fg-muted">{fila.usuario}</span></> },
                  { clave: 'estado', titulo: 'Estado', render: (fila) => <span className={fila.estado === 'CERRADO' ? 'text-success' : 'text-info'}>{fila.estado === 'CERRADO' ? 'Cerrado' : 'Abierto'}</span> },
                  { clave: 'esperado_total', titulo: 'Total esperado', alinear: 'right', render: (fila) => formatearCentavos(importesEsperadosTurno(fila)) },
                  { clave: 'contado_total', titulo: 'Total contado', alinear: 'right', render: (fila) => fila.estado === 'CERRADO' ? formatearCentavos(importesContadosTurno(fila)) : '—' },
                  { clave: 'desviacion', titulo: 'Desviación absoluta', alinear: 'right', render: (fila) => {
                    const desviacion = desviacionAbsolutaTurno(fila);
                    return <span className={`font-semibold tabular-nums ${desviacion === 0n ? 'text-success' : 'text-danger'}`}>{fila.estado === 'CERRADO' ? formatearCentavos(desviacion) : '—'}</span>;
                  } },
                ]}
              />
            </Card>
          )}

          {puedeVerCuentas && (
            <Card titulo="Cuentas por pagar" descripcion="Facturas no pagadas emitidas durante el período; el saldo resta los pagos registrados. Se muestran hasta 500 registros.">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <Metrica icono={Wallet} valor={cargando ? '…' : formatearCentavos(saldoPendiente)} etiqueta="Saldo pendiente" tono="primario" />
                <Metrica icono={ReceiptText} valor={cargando ? '…' : datos.cuentas.length} etiqueta="Facturas abiertas" tono="info" />
                <Metrica icono={AlertTriangle} valor={cargando ? '…' : cuentasVencidas} etiqueta="Facturas vencidas" tono={cuentasVencidas ? 'aviso' : 'exito'} />
              </div>
              <TablaPaginada
                filas={datos.cuentas}
                vacio="No hay facturas pendientes emitidas en este período."
                columnas={[
                  { clave: 'sucursal', titulo: 'Sucursal' },
                  { clave: 'proveedor', titulo: 'Proveedor' },
                  { clave: 'num_factura', titulo: 'Factura' },
                  { clave: 'tipo_costo', titulo: 'Tipo', render: (fila) => fila.tipo_costo === 'COSTO' ? 'Costo' : 'Gasto' },
                  { clave: 'fecha_vencimiento', titulo: 'Vencimiento', render: (fila) => formatearFecha(String(fila.fecha_vencimiento).slice(0, 10)) },
                  { clave: 'total', titulo: 'Total', alinear: 'right', render: (fila) => formatearDinero(fila.total) },
                  { clave: 'pagado', titulo: 'Pagado', alinear: 'right', render: (fila) => formatearDinero(fila.pagado) },
                  { clave: 'saldo', titulo: 'Saldo', alinear: 'right', render: (fila) => <span className="font-semibold tabular-nums">{formatearDinero(fila.saldo)}</span> },
                  { clave: 'estado_pago', titulo: 'Estado', render: (fila) => {
                    const parcial = fila.estado_pago === 'PARCIAL';
                    const vencida = Number(fila.dias_vencida) > 0;
                    return <span className={`text-xs font-semibold ${vencida ? 'text-danger' : 'text-warning'}`}>{vencida ? `${fila.dias_vencida} días vencida` : parcial ? 'Pago parcial' : 'Pendiente'}{vencida && parcial ? ' · parcial' : ''}</span>;
                  } },
                ]}
              />
            </Card>
          )}
        </section>
      )}

      <p className="text-xs text-fg-muted print:hidden">
        Los reportes de margen, caja y cuentas por pagar aparecen solo cuando tu rol tiene los permisos correspondientes. Los costos son estimados; las alertas reflejan el inventario actual.
      </p>
    </div>
  );
}
