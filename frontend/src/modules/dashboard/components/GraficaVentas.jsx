import { useEffect, useId, useRef, useState } from 'react';
import { TooltipContenido, TooltipFlotante } from '../../../components/display/Tooltip.jsx';
import { capitalizar, etiquetaDia, etiquetaDiaLarga, formatoDinero, formatoEntero } from '../../../utils/formato.js';
import { calcularEje, formatoEje } from '../lib/ejes.js';

// Gráfica de barras en SVG propio (el proyecto no permite añadir librerías de gráficos sin consultar al Tech Lead).
// Se dibuja en píxeles reales del contenedor (no se escala un viewBox), así el texto siempre mide lo mismo.
// Jerarquía: días cerrados en neutro, "hoy" (día en curso) en acento con rayas, elemento bajo el cursor en acento.
// La altura de las barras es solo visual; las cifras exactas salen en el tooltip, en el aria-label y en la tabla oculta.
const ALTO = 248;
const M = { arriba: 26, derecha: 8, abajo: 30, izquierda: 56 };
const SEPARACION_ETIQUETAS = 46; // px mínimos entre etiquetas del eje X

function useAncho(ref) {
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(240, Math.floor(entrada.contentRect.width))));
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return ancho;
}

export function LeyendaVentas({ className = '' }) {
  return (
    <ul className={`flex flex-wrap items-center gap-4 text-xs font-medium text-fg-muted ${className}`}>
      <li className="flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true" className="border border-(--serie-1)"><defs><pattern id="ley-rayas" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" className="fill-(--serie-1)" fillOpacity=".28" /><rect width="2.5" height="5" className="fill-(--serie-1)" /></pattern></defs><rect width="12" height="12" fill="url(#ley-rayas)" /></svg>
        Hoy (en curso)
      </li>
      <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 bg-(--serie-2)" />Días cerrados</li>
    </ul>
  );
}

export default function GraficaVentas({ serie, hoy }) {
  const marco = useRef(null);
  const columnas = useRef([]);
  const ancho = useAncho(marco);
  const idRayas = useId();
  const [activo, setActivo] = useState(null);

  // Al tocar fuera de la gráfica (pantallas táctiles) se oculta el tooltip.
  useEffect(() => {
    const cerrar = (e) => { if (marco.current && !marco.current.contains(e.target)) setActivo(null); };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, []);

  const n = serie.length;
  const eje = calcularEje(Math.max(...serie.map((f) => Number(f.total)))); // solo escala visual
  const areaAncho = ancho - M.izquierda - M.derecha;
  const areaAlto = ALTO - M.arriba - M.abajo;
  const paso = areaAncho / n;
  const anchoBarra = Math.min(Math.max(3, paso * 0.62), 40);
  const base = M.arriba + areaAlto;
  const yDe = (valor) => M.arriba + areaAlto * (1 - valor / eje.techo);
  const xCentro = (i) => M.izquierda + paso * (i + 0.5);
  const indiceHoy = serie.findIndex((f) => f.fecha === hoy);
  const cadaEtiqueta = Math.max(1, Math.ceil(SEPARACION_ETIQUETAS / paso));

  const textoDe = (f) => `${capitalizar(etiquetaDiaLarga(f.fecha))}${f.fecha === hoy ? ' (en curso)' : ''}: ${formatoDinero(f.total)} en ${f.tickets} ${f.tickets === 1 ? 'ticket' : 'tickets'}`;

  const alTeclear = (e, i) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (e.key === 'Escape') e.currentTarget.blur();
    if (destino === undefined) return;
    e.preventDefault();
    columnas.current[Math.min(Math.max(destino, 0), n - 1)]?.focus();
  };

  const fActivo = activo === null ? null : serie[activo];

  return (
    <figure className="m-0">
      <div ref={marco} className="relative">
        <svg width={ancho} height={ALTO} className="block select-none font-sans" role="group" aria-label={`Ventas de los últimos ${n} días. Recorre los días con las flechas del teclado.`}>
          <defs>
            <pattern id={idRayas} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="fill-(--serie-1)" fillOpacity=".28" />
              <rect width="3" height="6" className="fill-(--serie-1)" />
            </pattern>
          </defs>

          {eje.marcas.map((marca) => (
            <g key={marca}>
              <line x1={M.izquierda} x2={ancho - M.derecha} y1={yDe(marca)} y2={yDe(marca)} className={marca === 0 ? 'stroke-fg-muted' : 'stroke-line'} strokeWidth="1" strokeDasharray={marca === 0 ? undefined : '2 4'} />
              <text x={M.izquierda - 10} y={yDe(marca) + 4} textAnchor="end" className="fill-fg-muted tabular-nums" fontSize="12">{formatoEje(marca, eje.paso)}</text>
            </g>
          ))}

          {indiceHoy >= 0 && <rect x={M.izquierda + paso * indiceHoy} y={M.arriba - 8} width={paso} height={areaAlto + 8} fill="var(--serie-hoy-fondo)" />}
          {activo !== null && <rect x={M.izquierda + paso * activo} y={M.arriba - 8} width={paso} height={areaAlto + 8} className="fill-muted" />}

          {serie.map((f, i) => {
            const valor = Number(f.total);
            const y = yDe(valor);
            const alto = Math.max(base - y, valor > 0 ? 2 : 0);
            const x = xCentro(i) - anchoBarra / 2;
            const esHoy = i === indiceHoy;
            const bajoCursor = i === activo;
            let relleno = 'fill-(--serie-2)';
            if (esHoy) relleno = '';
            else if (bajoCursor) relleno = 'fill-(--serie-1)';
            return (
              <g key={f.fecha} opacity={activo !== null && !bajoCursor ? 0.6 : 1}>
                <rect x={x} y={base - alto} width={anchoBarra} height={alto} className={`anim-barra ${relleno}`} style={{ '--retardo': `${Math.min(i * 22, 400)}ms` }} fill={esHoy ? `url(#${idRayas})` : undefined}
                  strokeWidth={esHoy ? 1.5 : 0} stroke={esHoy ? 'var(--serie-1)' : undefined} rx={2} />
                {(indiceHoy - i) % cadaEtiqueta === 0 && (
                  <text x={xCentro(i)} y={ALTO - 9} textAnchor="middle" fontSize="12" className={esHoy ? 'fill-(--serie-1-texto) font-bold' : bajoCursor ? 'fill-fg font-semibold' : 'fill-fg-muted'}>{etiquetaDia(f.fecha)}</text>
                )}
              </g>
            );
          })}

          {indiceHoy >= 0 && activo === null && (
            <text x={indiceHoy === n - 1 ? xCentro(indiceHoy) + anchoBarra / 2 : xCentro(indiceHoy)} y={yDe(Number(serie[indiceHoy].total)) - 7}
              textAnchor={indiceHoy === n - 1 ? 'end' : 'middle'} fontSize="13" paintOrder="stroke" stroke="var(--bg-surface)" strokeWidth="4" strokeLinejoin="round" className="fill-(--serie-1-texto) font-bold tabular-nums">{formatoDinero(serie[indiceHoy].total)}</text>
          )}

          {serie.map((f, i) => (
            <rect
              key={`zona-${f.fecha}`}
              ref={(el) => { columnas.current[i] = el; }}
              x={M.izquierda + paso * i} y={0} width={paso} height={ALTO} fill="transparent" className="cursor-crosshair outline-none"
              role="img" aria-label={textoDe(f)} tabIndex={i === (activo ?? indiceHoy) ? 0 : -1}
              onPointerEnter={() => setActivo(i)}
              onPointerDown={() => setActivo(i)}
              onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActivo(null); }}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              onKeyDown={(e) => alTeclear(e, i)}
            />
          ))}
        </svg>

        <TooltipFlotante visible={fActivo !== null} clave={activo} contenedor={marco} x={activo === null ? 0 : xCentro(activo)} y={fActivo ? yDe(Number(fActivo.total)) : 0}>
          {fActivo && (
            <TooltipContenido
              etiqueta={capitalizar(etiquetaDiaLarga(fActivo.fecha))}
              categoria={fActivo.fecha === hoy ? 'Ventas · día en curso' : 'Ventas'}
              valor={formatoDinero(fActivo.total)}
              unidad="USD con IVA"
              filas={[['Tickets', formatoEntero(fActivo.tickets)], ['Ticket promedio', fActivo.tickets ? formatoDinero(fActivo.ticketPromedio) : '—']]}
            />
          )}
        </TooltipFlotante>
      </div>

      <table className="sr-only">
        <caption>Ventas por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Total</th><th scope="col">Tickets</th></tr></thead>
        <tbody>{serie.map((f) => <tr key={f.fecha}><th scope="row">{etiquetaDiaLarga(f.fecha)}</th><td>{formatoDinero(f.total)}</td><td>{f.tickets}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
