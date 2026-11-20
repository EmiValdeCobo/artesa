import { Inbox } from 'lucide-react';
import { SkeletonTexto } from '../../../components/feedback/Skeleton.jsx';

const COLUMNAS = { 3: 'xl:col-span-3', 4: 'xl:col-span-4', 5: 'xl:col-span-5', 6: 'xl:col-span-6', 7: 'xl:col-span-7', 8: 'xl:col-span-8', 12: 'xl:col-span-12' };

// Contenedor de cada bloque: misma anatomía que <Card> (icono + título + como mucho un filtro) dentro de la
// rejilla de 12 columnas. Bajo xl todos ocupan la fila completa (una sola columna en móvil).
export function Panel({ titulo, icono: Icono = null, cols = 6, orden = 0, acciones = null, presentacion = '', children }) {
  return (
    <section aria-label={titulo} style={{ '--retardo': `${orden * 70}ms` }} className={`card panel-dash anim-entrar col-span-12 min-w-0 ${presentacion} ${COLUMNAS[cols] ?? COLUMNAS[6]}`}>
      <header className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icono && (
            <span className="grid size-control-sm shrink-0 place-items-center rounded-md bg-primary-soft text-primary-text">
              <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <h2 className="min-w-0 text-body-lg font-semibold">{titulo}</h2>
        </div>
        {acciones}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// Selector de periodo: botones con aria-pressed (el estado no depende solo del color).
export function SelectorPeriodo({ valor, opciones, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="segmentado">
      {opciones.map(([v, texto]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onCambiar(v)} className="segmentado-opcion">
          {texto}
        </button>
      ))}
    </div>
  );
}

// Carga: esqueleto con la forma del contenido (sin spinners).
export function Cargando({ lineas = 4, texto = 'Cargando…' }) {
  return <SkeletonTexto lineas={lineas} texto={texto} className="py-1" />;
}

export function Vacio({ titulo, texto, Icono = Inbox }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1.5 px-4 py-6 text-center">
      <Icono size={22} aria-hidden="true" className="text-fg-muted" />
      <p className="text-body font-semibold">{titulo}</p>
      {texto && <p className="max-w-sm text-body text-fg-muted">{texto}</p>}
    </div>
  );
}
