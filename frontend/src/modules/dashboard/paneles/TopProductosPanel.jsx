import { useRef, useState } from 'react';
import { Coffee, Store } from 'lucide-react';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import { Cargando, Panel, SelectorPeriodo, Vacio } from '../components/Panel.jsx';
import { TooltipContenido, TooltipFlotante } from '../../../components/display/Tooltip.jsx';
import { formatoDinero, formatoEntero } from '../../../utils/formato.js';
import { useDashboardData } from '../hooks/useDashboardData.js';

const PERIODOS = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];
const textoPeriodo = (dias) => (dias === 1 ? 'hoy' : `últimos ${dias} días`);
const periodoCorto = (dias) => (dias === 1 ? 'hoy' : `${dias} días`);

export default function TopProductosPanel({ cols, orden }) {
  const [dias, setDias] = useState(7);
  const [activo, setActivo] = useState(null);
  const [ancla, setAncla] = useState({ x: 0, y: 0 });
  const marco = useRef(null);
  const { datos, error, cargando, recargar } = useDashboardData('/dashboard/top-productos', { dias, limite: 5 }, { intervalo: 120000 });

  // Ancla el tooltip a la fila: arriba de ella y, con ratón, a la altura del cursor en horizontal.
  const anclar = (i, fila, clientX) => {
    const m = marco.current.getBoundingClientRect();
    const f = fila.getBoundingClientRect();
    setActivo(i);
    setAncla({ x: (clientX ?? f.left + f.width / 2) - m.left, y: f.top - m.top });
  };

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={5} alto="h-8" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Sin sucursal asignada" texto="Pide a un administrador que te asigne una." />;
  else if (datos.estado === 'sin_datos') cuerpo = <Vacio Icono={Coffee} titulo={dias === 1 ? 'Aún no hay ventas hoy' : `Sin ventas en los últimos ${dias} días`} texto="El ranking aparecerá cuando se registren ventas." />;
  else {
    const maximo = datos.productos[0].unidades;
    const total = datos.productos.length;
    const p = activo === null ? null : datos.productos[activo];
    cuerpo = (
      <div ref={marco} className="relative">
        <ol className="-mx-2">
          {datos.productos.map((prod, i) => {
            const lider = i === 0;
            const bajoCursor = i === activo;
            const resumenAria = `Puesto ${prod.posicion} de ${total}: ${prod.nombre}, ${formatoEntero(prod.unidades)} unidades, ${prod.participacionPct} % del total${datos.incluyeImportes ? `, importe ${formatoDinero(prod.ingreso)}` : ''}`;
            return (
              <li
                key={prod.id}
                tabIndex={0}
                aria-label={resumenAria}
                onPointerEnter={(e) => anclar(i, e.currentTarget, e.clientX)}
                onPointerMove={(e) => anclar(i, e.currentTarget, e.clientX)}
                onPointerLeave={() => setActivo(null)}
                onFocus={(e) => anclar(i, e.currentTarget)}
                onBlur={() => setActivo(null)}
                style={{ '--retardo': `${i * 50}ms` }}
                className={`anim-entrar grid cursor-default grid-cols-[1.75rem_1fr_6rem] items-center gap-x-3 px-2 py-3 outline-offset-0 transition-colors motion-reduce:transition-none ${bajoCursor ? 'bg-muted' : ''}`}
              >
                <span className={`font-display text-xl font-semibold tabular-nums ${lider ? 'text-primary-text' : 'text-fg-muted'}`}>{prod.posicion}</span>
                <div className="min-w-0">
                  <p className={`truncate text-sm ${lider ? 'font-semibold' : 'font-medium'}`}>{prod.nombre}</p>
                  <div className="mt-1.5 h-2 bg-line/70" aria-hidden="true">
                    <div className={`anim-barra-x h-full transition-colors motion-reduce:transition-none ${lider ? (bajoCursor ? 'bg-chart-focus-strong' : 'bg-chart-focus') : (bajoCursor ? 'bg-chart-focus' : 'bg-chart-neutral')}`} style={{ width: `${(prod.unidades / maximo) * 100}%`, '--retardo': `${120 + i * 60}ms` }} />
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <p className="text-sm font-semibold">{formatoEntero(prod.unidades)} <span className="text-xs font-normal text-fg-muted">uds.</span></p>
                  <p className="text-xs text-fg-muted">{datos.incluyeImportes ? formatoDinero(prod.ingreso) : `${prod.participacionPct} %`}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <TooltipFlotante visible={p !== null} clave={activo} contenedor={marco} x={ancla.x} y={ancla.y}>
          {p && (
            <TooltipContenido
              etiqueta={p.nombre}
              categoria="Unidades vendidas"
              valor={formatoEntero(p.unidades)}
              unidad={`uds. · ${periodoCorto(dias)}`}
              filas={[
                ['Puesto', `${p.posicion} de ${total}`],
                ['Participación', `${p.participacionPct} % de ${formatoEntero(datos.totalUnidades)} uds.`],
                ...(datos.incluyeImportes ? [['Importe bruto con IVA', formatoDinero(p.ingreso)]] : []),
              ]}
            />
          )}
        </TooltipFlotante>
      </div>
    );
  }

  return (
    <Panel titulo="Más vendidos" cols={cols} orden={orden} acciones={datos && datos.estado !== 'sin_sucursal' && <SelectorPeriodo etiqueta="Periodo del ranking" valor={dias} opciones={PERIODOS} onCambiar={setDias} />}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
      {datos?.estado === 'ok' && <p className="mt-4 border-t border-line pt-3 text-xs text-fg-muted">Ordenado por unidades vendidas, {textoPeriodo(dias)}.</p>}
    </Panel>
  );
}
