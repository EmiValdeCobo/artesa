import { useMemo, useRef, useState } from 'react';
import { Minus, TrendingDown, TrendingUp, Store } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import Actualizado from '../../../components/display/Actualizado.jsx';
import { formatoCentavos, formatoEntero, horaDe } from '../../../utils/formato.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import SalesChart from '../components/SalesChart.jsx';
import GraficaVentas from '../components/GraficaVentas.jsx';
import { Panel, Vacio } from '../components/Panel.jsx';
import '../dashboard.css';

const PERIODOS = [[7, '7 días'], [14, '14 días'], [30, '30 días']];

function RangeSelector({ value, onChange, disabled }) {
  const botones = useRef([]);
  const moverFoco = (event, index) => {
    const next = { ArrowRight: (index + 1) % PERIODOS.length, ArrowLeft: (index + PERIODOS.length - 1) % PERIODOS.length, Home: 0, End: PERIODOS.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(PERIODOS[next][0]);
    botones.current[next]?.focus();
  };
  return <div role="tablist" aria-label="Periodo de ventas" className="ventas-range">{PERIODOS.map(([days, label], index) => (
    <button key={days} id={`ventas-rango-${days}`} ref={(node) => { botones.current[index] = node; }} type="button" role="tab" aria-selected={value === days} aria-controls="ventas-periodo" tabIndex={value === days ? 0 : -1} disabled={disabled} onClick={() => onChange(days)} onKeyDown={(event) => moverFoco(event, index)} className="ventas-range-tab">{label}</button>
  ))}</div>;
}

function DeltaBadge({ pct, tickets, ticketsPrevios }) {
  if (pct === null || pct === undefined) return <span className="ventas-delta neutral" aria-label="Sin base previa para calcular la variación">—</span>;
  if (Number(tickets) < 5 || Number(ticketsPrevios) < 5) return <span className="ventas-delta neutral"><Minus size={15} aria-hidden="true" />Variación sin muestra suficiente</span>;
  const n = Number(pct);
  const Icon = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
  const texto = `${n > 0 ? '+' : ''}${n} % respecto al periodo anterior`;
  return <span className={`ventas-delta ${n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral'}`} aria-label={texto}><Icon size={15} aria-hidden="true" />{texto}</span>;
}

function StatRow({ label, value, detail, leading = false }) {
  return <div className={`ventas-stat-row${leading ? ' leading' : ''}`}><dt>{label}</dt><dd><span className="ventas-stat-value">{value}</span>{detail && <span className="ventas-stat-detail">{detail}</span>}</dd></div>;
}

function StatHero({ today, asOf }) {
  return <div className="ventas-hero">
    <div className="ventas-hero-copy"><p>Hoy hasta las <time dateTime={asOf}>{horaDe(asOf)}</time></p><p className="ventas-hero-value">{formatoCentavos(today.total)}</p><p>{formatoEntero(today.tickets)} {today.tickets === 1 ? 'ticket' : 'tickets'} registrados</p></div>
    <div className="ventas-hero-chart"><SalesChart today={today} asOf={asOf} /></div>
  </div>;
}

function Esqueleto() {
  return <div className="ventas-loading" aria-busy="true" role="status"><span className="sr-only">Cargando ventas</span><div className="ventas-loading-hero"/><div className="ventas-loading-chart"/><div className="ventas-loading-row"/><div className="ventas-loading-row"/><div className="ventas-loading-row"/></div>;
}

export default function VentasDiariasPanel({ cols, orden, sucursal }) {
  const { tiene } = useAuth();
  const propias = !tiene('REP_VER_DASHBOARD');
  const [dias, setDias] = useState(7);
  const params = useMemo(() => ({ dias, ...(sucursal ? { sucursal } : {}) }), [dias, sucursal]);
  const { datos, error, cargando, actualizando, recargar } = useDashboardData('/dashboard/ventas-diarias', params, { intervalo: 30000 });
  const sinSucursal = datos?.estado === 'sin_sucursal';

  let contenido;
  if (cargando) contenido = <Esqueleto />;
  else if (!datos) contenido = <AvisoError error={error} onReintentar={recargar} />;
  else if (sinSucursal) contenido = <Vacio Icono={Store} titulo="No hay sucursal asignada" texto="Pide a un administrador que te asigne una sucursal para consultar las ventas." />;
  else if (datos.estado === 'sin_datos') contenido = <Vacio titulo="Aún no hay ventas hoy" texto="Cuando se registren ventas, el resumen del día aparecerá aquí." />;
  else {
    const { today, comparison, period } = datos;
    const cifra = (v) => formatoCentavos(v ?? '0');
    const ticketsPrevios = period.previousTickets ?? 0;
    const updated = datos.asOf ?? datos.generadoEn;
    contenido = <>
      {error && <AvisoError className="mb-4" error={`${error} Se muestran los datos de las ${horaDe(updated)}.`} onReintentar={recargar} />}
      <StatHero today={today} asOf={datos.asOf} />
      {today.tickets === 0 && <p className="ventas-empty-today">Aún no hay ventas hoy. La comparación y el período muestran actividad de días anteriores.</p>}

      <div id="ventas-periodo" role="tabpanel" aria-labelledby={`ventas-rango-${dias}`}>
      <section className="ventas-daily-series" aria-labelledby="ventas-serie-titulo">
        <div className="ventas-series-heading"><h3 id="ventas-serie-titulo">Ventas por día</h3><p>Últimos {dias} días · {cifra(period.total)}</p></div>
        <GraficaVentas serie={datos.series.map((f) => ({ ...f, fecha: f.date }))} hoy={today.fecha} centavos mostrarTicketPromedio={false} />
      </section>

      <dl className="ventas-stat-list" aria-label={`Periodo seleccionado: últimos ${dias} días`}>
        <StatRow leading label="Periodo seleccionado" value={cifra(period.total)} detail={<DeltaBadge pct={period.deltaPct} tickets={period.tickets} ticketsPrevios={ticketsPrevios} />} />
        <StatRow label="Mismo día de la semana pasada, a esta hora" value={cifra(comparison.sameWeekdayLastWeekToSameHour)} detail={`${formatoEntero(comparison.sameWeekdayLastWeekTickets)} tickets`} />
        <StatRow label="Ayer, a esta hora" value={cifra(comparison.yesterdayToSameHour)} />
        <StatRow label="Ayer, día completo" value={cifra(comparison.yesterdayFullDay)} />
      </dl>
      </div>
      <div className="ventas-foot"><span>{propias ? 'Solo ventas registradas por ti' : datos.sucursales.map((s) => s.nombre).join(', ')}. Montos con IVA; anulaciones excluidas.</span><Actualizado instante={updated} actualizando={actualizando} onRecargar={recargar} /></div>
    </>;
  }

  return <Panel titulo={propias ? 'Mis ventas' : 'Ventas diarias'} cols={cols} orden={orden} acento={null} presentacion="ventas-panel" acciones={!sinSucursal && <RangeSelector value={dias} onChange={setDias} disabled={cargando} />}>{contenido}</Panel>;
}
