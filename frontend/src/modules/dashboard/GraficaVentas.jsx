import { etiquetaDia, etiquetaDiaLarga, formatoDinero, formatoDineroCorto } from './formato.js';

// Gráfica de barras en SVG propio (el proyecto no permite añadir librerías de gráficos sin consultar al Tech Lead).
// La altura es solo visual; las cifras exactas están en cada <title> y en la tabla oculta para lectores de pantalla.
const ANCHO = 640;
const ALTO = 210;
const M = { arriba: 12, derecha: 8, abajo: 26, izquierda: 52 };

// Techo "redondo" del eje: 1, 2, 2.5, 5 o 10 × potencia de 10.
function techoEje(max) {
  if (max <= 0) return 10;
  const pot = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 2.5, 5, 10].map((f) => f * pot).find((t) => t >= max);
}

export default function GraficaVentas({ serie, hoy }) {
  const valores = serie.map((f) => Number(f.total)); // solo para dibujar alturas
  const techo = techoEje(Math.max(...valores));
  const areaAncho = ANCHO - M.izquierda - M.derecha;
  const areaAlto = ALTO - M.arriba - M.abajo;
  const paso = areaAncho / serie.length;
  const anchoBarra = Math.max(3, paso * 0.68);
  const cadaN = serie.length <= 8 ? 1 : serie.length <= 16 ? 2 : serie.length <= 35 ? 5 : 10;
  const guias = [0, 0.5, 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label={`Ventas de los últimos ${serie.length} días. Hoy: ${formatoDinero(serie.at(-1)?.total)}.`}>
        {guias.map((g) => {
          const y = M.arriba + areaAlto * (1 - g);
          return (
            <g key={g}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y} y2={y} className="stroke-line" strokeWidth="1" strokeDasharray={g === 0 ? undefined : '3 4'} />
              <text x={M.izquierda - 8} y={y + 3.5} textAnchor="end" className="fill-fg-muted" fontSize="10">{formatoDineroCorto(techo * g)}</text>
            </g>
          );
        })}
        {serie.map((f, i) => {
          const alto = (Number(f.total) / techo) * areaAlto;
          const x = M.izquierda + paso * i + (paso - anchoBarra) / 2;
          const esHoy = f.fecha === hoy;
          return (
            <g key={f.fecha}>
              <rect x={x} y={M.arriba + areaAlto - alto} width={anchoBarra} height={Math.max(alto, f.tickets ? 1.5 : 0)} className={esHoy ? 'fill-primary' : 'fill-secondary'}>
                <title>{`${etiquetaDiaLarga(f.fecha)}: ${formatoDinero(f.total)} en ${f.tickets} ${f.tickets === 1 ? 'ticket' : 'tickets'}`}</title>
              </rect>
              {(serie.length - 1 - i) % cadaN === 0 && (
                <text x={x + anchoBarra / 2} y={ALTO - 8} textAnchor="middle" className={esHoy ? 'fill-fg font-semibold' : 'fill-fg-muted'} fontSize="10">{etiquetaDia(f.fecha)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex items-center gap-4 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-primary" /> Hoy (parcial)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-secondary" /> Días anteriores</span>
      </figcaption>
      <table className="sr-only">
        <caption>Ventas por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Total</th><th scope="col">Tickets</th></tr></thead>
        <tbody>{serie.map((f) => <tr key={f.fecha}><th scope="row">{etiquetaDiaLarga(f.fecha)}</th><td>{formatoDinero(f.total)}</td><td>{f.tickets}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
