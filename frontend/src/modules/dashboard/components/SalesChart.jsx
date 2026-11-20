import { useId } from 'react';
import { formatoCentavos, formatoEntero } from '../../../utils/formato.js';

const W = 600;
const H = 180;
const PAD = { x: 14, top: 12, bottom: 26 };

function curva(filas, maximo, hasta) {
  const puntos = filas.filter((fila) => Number(fila.hour) <= hasta).map((fila) => ({
    x: PAD.x + (Number(fila.hour) / 23) * (W - PAD.x * 2),
    y: PAD.top + (1 - Number(fila.total) / maximo) * (H - PAD.top - PAD.bottom),
  }));
  return puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export default function SalesChart({ today, asOf }) {
  const id = useId();
  const filas = today.byHour ?? [];
  const maximo = Math.max(1, ...filas.map((f) => Number(f.total)), ...filas.map((f) => Number(f.sameWeekdayTotal)));
  const tope = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/El_Salvador' }).format(new Date(asOf)));
  const actual = curva(filas, maximo, tope);
  const anterior = curva(filas.map((f) => ({ hour: f.hour, total: f.sameWeekdayTotal })), maximo, tope);
  const texto = `Hoy llevas ${formatoCentavos(today.total)} en ${formatoEntero(today.tickets)} tickets. La curva compara cada hora con el mismo día de la semana pasada.`;
  return (
    <figure className="ventas-chart" aria-labelledby={`${id}-titulo`}>
      <figcaption id={`${id}-titulo`} className="sr-only">Ventas por hora de hoy y del mismo día de la semana pasada</figcaption>
      <p className="sr-only">{texto}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas por hora: hoy y mismo día de la semana pasada hasta la misma hora" className="ventas-chart-svg">
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={PAD.x} x2={W - PAD.x} y1={PAD.top + ratio * (H - PAD.top - PAD.bottom)} y2={PAD.top + ratio * (H - PAD.top - PAD.bottom)} className="ventas-chart-grid" />)}
        <path d={anterior} className="ventas-chart-prev" />
        <path d={actual} className="ventas-chart-current" />
        {filas.filter((f) => Number(f.hour) === tope).map((f) => <circle key={f.hour} cx={PAD.x + (tope / 23) * (W - PAD.x * 2)} cy={PAD.top + (1 - Number(f.total) / maximo) * (H - PAD.top - PAD.bottom)} r="4" className="ventas-chart-point" />)}
        {[0, 6, 12, 18, 23].map((hour) => <text key={hour} x={PAD.x + (hour / 23) * (W - PAD.x * 2)} y={H - 4} textAnchor={hour === 0 ? 'start' : hour === 23 ? 'end' : 'middle'} className="ventas-chart-label">{`${String(hour).padStart(2, '0')}:00`}</text>)}
      </svg>
      <div className="ventas-chart-legend" aria-hidden="true"><span><i className="ventas-legend-hoy" />Hoy</span><span><i className="ventas-legend-prev" />Mismo día de la semana pasada</span></div>
      <table className="sr-only"><caption>Ventas por hora en dólares</caption><thead><tr><th>Hora</th><th>Hoy</th><th>Mismo día semana pasada</th></tr></thead><tbody>{filas.filter((f) => Number(f.hour) <= tope).map((f) => <tr key={f.hour}><th>{String(f.hour).padStart(2, '0')}:00</th><td>{formatoCentavos(f.total)}</td><td>{formatoCentavos(f.sameWeekdayTotal)}</td></tr>)}</tbody></table>
    </figure>
  );
}
