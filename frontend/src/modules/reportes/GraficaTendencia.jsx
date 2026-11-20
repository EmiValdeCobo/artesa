import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { TooltipContenido, TooltipFlotante } from '../../components/display/Tooltip.jsx';
import { capitalizar, etiquetaDia, etiquetaDiaLarga, formatoCentavos, formatoDineroCorto, formatoEntero } from '../../utils/formato.js';
import { calcularEje } from '../dashboard/lib/ejes.js';
import Spinner from '../../components/ui/Spinner.jsx';

// Tendencia de ventas diarias del panel de Reportes. Misma gramática visual que la gráfica del
// Dashboard (SVG en píxeles reales, días cerrados neutros, "hoy" rayado en acento), más la línea
// de promedio del rango, marcas de fin de semana y etiquetas directas en los días clave.
// serie: [{ fecha: 'YYYY-MM-DD', total: centavos (number), tickets: number, etiqueta }] ya agrupada por día.
// Si el rango supera 45 días la página agrupa por semana/mes: entonces `fecha` puede ser el lunes de la
// semana o 'YYYY-MM'; `etiqueta` cubre esos casos y las marcas de fin de semana solo aplican a días.
const ALTO = 264;
const M = { arriba: 28, derecha: 10, abajo: 32, izquierda: 60 };
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

const ES_DIA = /^\d{4}-\d{2}-\d{2}$/;

const esFinDeSemana = (iso) => {
  if (!ES_DIA.test(iso)) return false;
  const dia = new Date(`${iso}T12:00:00`).getDay();
  return dia === 0 || dia === 6;
};

const etiquetaCortaDe = (f) => (ES_DIA.test(f.fecha) ? etiquetaDia(f.fecha) : (f.etiqueta ?? f.fecha));
const etiquetaLargaDe = (f) => (ES_DIA.test(f.fecha) ? capitalizar(etiquetaDiaLarga(f.fecha)) : (f.etiqueta ?? f.fecha));

export function LeyendaTendencia({ className = '' }) {
  const idRayas = useId();
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-label-sm text-fg-muted ${className}`}>
      <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-(--chart-neutral)" />Días cerrados</li>
      <li className="flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true" className="border border-(--serie-1)">
          <defs><pattern id={idRayas} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" className="fill-(--serie-1)" fillOpacity=".28" /><rect width="2.5" height="5" className="fill-(--serie-1)" /></pattern></defs>
          <rect width="12" height="12" fill={`url(#${idRayas})`} />
        </svg>
        Hoy (en curso)
      </li>
      <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-0 w-5 border-t-2 border-dashed border-(--serie-1)" />Promedio</li>
    </ul>
  );
}

export default function GraficaTendencia({ serie, hoy, cargando, error }) {
  const marco = useRef(null);
  const columnas = useRef([]);
  const ancho = useAncho(marco);
  const idRayas = useId();
  const [activo, setActivo] = useState(null);

  useEffect(() => {
    const cerrar = (e) => { if (marco.current && !marco.current.contains(e.target)) setActivo(null); };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, []);

  const cerrados = useMemo(() => serie.filter((f) => f.fecha !== hoy), [serie, hoy]);

  // Promedio diario del rango solo con días cerrados: "hoy" aún está en curso y sesgaría el cálculo.
  const promedio = useMemo(() => (
    cerrados.length ? Math.round(cerrados.reduce((suma, f) => suma + f.total, 0) / cerrados.length) : null
  ), [cerrados]);

  // Mejor día entre los cerrados (empates: el primero del rango).
  const indiceMejor = useMemo(() => {
    let mejor = -1;
    serie.forEach((f, i) => {
      if (f.fecha === hoy) return;
      if (mejor < 0 || f.total > serie[mejor].total) mejor = i;
    });
    return mejor;
  }, [serie, hoy]);

  if (cargando) return <Spinner texto="Cargando tendencia de ventas…" className="h-64" />;
  if (error) return <p className="flex h-64 items-center justify-center text-center text-body text-danger-text" role="alert">No se pudo cargar la tendencia de ventas.</p>;
  if (!serie.length) return <p className="flex h-64 items-center justify-center text-center text-body text-fg-muted">Sin ventas en este rango</p>;

  const n = serie.length;
  const eje = calcularEje(Math.max(...serie.map((f) => f.total), promedio ?? 0));
  const areaAncho = ancho - M.izquierda - M.derecha;
  const areaAlto = ALTO - M.arriba - M.abajo;
  const paso = areaAncho / n;
  const anchoBarra = Math.min(Math.max(3, paso * 0.62), 40);
  const base = M.arriba + areaAlto;
  const yDe = (valor) => M.arriba + areaAlto * (1 - valor / eje.techo);
  const xCentro = (i) => M.izquierda + paso * (i + 0.5);
  const indiceHoy = serie.findIndex((f) => f.fecha === hoy);
  const cadaEtiqueta = Math.max(1, Math.ceil(SEPARACION_ETIQUETAS / paso));

  const variacion = (f) => {
    if (!promedio) return null;
    const diferencia = promedio ? Math.round(((f.total - promedio) / promedio) * 100) : 0;
    return `${diferencia >= 0 ? '+' : '−'}${Math.abs(diferencia)}% vs. promedio`;
  };

  const textoDe = (f) => `${etiquetaLargaDe(f)}${f.fecha === hoy ? ' (en curso)' : ''}: ${formatoCentavos(f.total)} en ${f.tickets} ${f.tickets === 1 ? 'ticket' : 'tickets'}${variacion(f) ? `. ${variacion(f)}` : ''}`;

  const alTeclear = (e, i) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (e.key === 'Escape') e.currentTarget.blur();
    if (destino === undefined) return;
    e.preventDefault();
    columnas.current[Math.min(Math.max(destino, 0), n - 1)]?.focus();
  };

  const fActivo = activo === null ? null : serie[activo];

  return (
    <figure className="m-0 w-full min-w-0 max-w-full">
      <div ref={marco} className="relative w-full min-w-0 max-w-full">
        <svg width="100%" height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} className="block w-full max-w-full select-none font-sans" role="group" aria-label="Ventas por día del período seleccionado. Recorre los días con las flechas del teclado.">
          <defs>
            <pattern id={idRayas} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="fill-(--serie-1)" fillOpacity=".28" />
              <rect width="3" height="6" className="fill-(--serie-1)" />
            </pattern>
          </defs>

          {eje.marcas.map((marca) => (
            <g key={marca}>
              <line x1={M.izquierda} x2={ancho - M.derecha} y1={yDe(marca)} y2={yDe(marca)} className={marca === 0 ? 'stroke-fg-muted' : 'stroke-(--chart-grid)'} strokeWidth="1" />
              <text x={M.izquierda - 10} y={yDe(marca) + 4} textAnchor="end" className="fill-fg-muted tabular-nums" fontSize="12">{Number.isInteger(eje.paso) ? formatoDineroCorto(marca / 100) : formatoCentavos(Math.round(marca))}</text>
            </g>
          ))}

          {/* Fondos: fines de semana y día en curso */}
          {serie.map((f, i) => esFinDeSemana(f.fecha) ? (
            <rect key={`fds-${f.fecha}`} x={M.izquierda + paso * i} y={M.arriba} width={paso} height={areaAlto} className="fill-muted" fillOpacity="0.45" />
          ) : null)}
          {indiceHoy >= 0 && <rect x={M.izquierda + paso * indiceHoy} y={M.arriba} width={paso} height={areaAlto} fill="var(--serie-hoy-fondo)" />}
          {activo !== null && <rect x={M.izquierda + paso * activo} y={M.arriba} width={paso} height={areaAlto} className="fill-muted" />}

          {/* Línea de promedio del rango (solo días cerrados) */}
          {promedio !== null && (
            <g aria-hidden="true">
              <line x1={M.izquierda} x2={ancho - M.derecha} y1={yDe(promedio)} y2={yDe(promedio)} stroke="var(--serie-1)" strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.75" />
            </g>
          )}

          {serie.map((f, i) => {
            const y = yDe(f.total);
            const alto = Math.max(base - y, f.total > 0 ? 2 : 0);
            const x = xCentro(i) - anchoBarra / 2;
            const esHoy = i === indiceHoy;
            const bajoCursor = i === activo;
            const esMejor = i === indiceMejor;
            let relleno = 'fill-(--chart-neutral)';
            if (esHoy) relleno = '';
            else if (bajoCursor || esMejor) relleno = 'fill-(--chart-focus)';
            return (
              <g key={f.fecha} opacity={activo !== null && !bajoCursor ? 0.6 : 1}>
                <rect x={x} y={base - alto} width={anchoBarra} height={alto} className={relleno} fill={esHoy ? `url(#${idRayas})` : undefined}
                  strokeWidth={esHoy ? 1.5 : 0} stroke={esHoy ? 'var(--serie-1)' : undefined} rx={Math.min(6, anchoBarra / 2)} />
                {(indiceHoy - i) % cadaEtiqueta === 0 && (
                  <text x={xCentro(i)} y={ALTO - 9} textAnchor="middle" fontSize="12" className={esHoy ? 'fill-(--serie-1-texto) font-bold' : bajoCursor ? 'fill-fg font-semibold' : 'fill-fg-muted'}>{etiquetaCortaDe(f)}</text>
                )}
              </g>
            );
          })}

          {/* Etiqueta de monto solo en el día en curso */}
          {indiceHoy >= 0 && activo === null && (
            <text x={indiceHoy === n - 1 ? xCentro(indiceHoy) + anchoBarra / 2 : xCentro(indiceHoy)} y={yDe(serie[indiceHoy].total) - 7}
              textAnchor={indiceHoy === n - 1 ? 'end' : 'middle'} fontSize="13" paintOrder="stroke" stroke="var(--bg-surface)" strokeWidth="4" strokeLinejoin="round" className="fill-(--serie-1-texto) font-bold tabular-nums">
              {formatoCentavos(serie[indiceHoy].total)}
            </text>
          )}

          {serie.map((f, i) => (
            <rect
              key={`zona-${f.fecha}`}
              ref={(el) => { columnas.current[i] = el; }}
              x={M.izquierda + paso * i} y={0} width={paso} height={ALTO} fill="transparent" className="cursor-crosshair outline-none"
              role="img" aria-label={textoDe(f)} tabIndex={i === (activo ?? (indiceHoy >= 0 ? indiceHoy : n - 1)) ? 0 : -1}
              onPointerEnter={() => setActivo(i)}
              onPointerDown={() => setActivo(i)}
              onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActivo(null); }}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              onKeyDown={(e) => alTeclear(e, i)}
            />
          ))}
        </svg>

        <TooltipFlotante visible={fActivo !== null} clave={activo} contenedor={marco} x={activo === null ? 0 : xCentro(activo)} y={fActivo ? yDe(fActivo.total) : 0}>
          {fActivo && (
            <TooltipContenido
              etiqueta={etiquetaLargaDe(fActivo)}
              categoria={fActivo.fecha === hoy ? 'Ventas · día en curso' : 'Ventas del día'}
              valor={formatoCentavos(fActivo.total)}
              unidad="USD con IVA"
              filas={[
                ...(fActivo.tickets != null ? [['Tickets', formatoEntero(fActivo.tickets)]] : []),
                ...(variacion(fActivo) ? [['Comparación', variacion(fActivo)]] : []),
              ]}
            />
          )}
        </TooltipFlotante>
      </div>

      <table className="sr-only fixed left-0 top-0">
        <caption>Ventas por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Total</th><th scope="col">Tickets</th></tr></thead>
        <tbody>{serie.map((f) => <tr key={f.fecha}><th scope="row">{etiquetaLargaDe(f)}</th><td>{formatoCentavos(f.total)}</td><td>{f.tickets}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
