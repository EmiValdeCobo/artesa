import { Inbox } from 'lucide-react';

const COLUMNAS = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 12: 'lg:col-span-12' };

// Contenedor de cada bloque: rejilla de 12 columnas, tarjeta redondeada con un punto de color de la paleta en el título.
export function Panel({ titulo, cols = 6, orden = 0, acciones = null, acento = 1, children }) {
  return (
    <section aria-label={titulo} style={{ '--retardo': `${orden * 70}ms`, '--panel-acento': `var(--serie-${acento})` }} className={`anim-entrar panel-dash col-span-12 min-w-0 overflow-hidden border border-line bg-surface ${COLUMNAS[cols] ?? COLUMNAS[6]}`}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 pt-4">
        <h2 className="flex items-center gap-2.5 text-base font-bold"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--serie-${acento})` }} />{titulo}</h2>
        {acciones}
      </div>
      <div className="p-6 pt-4">{children}</div>
    </section>
  );
}

// Selector de periodo: botones con aria-pressed (el estado no depende solo del color).
export function SelectorPeriodo({ valor, opciones, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="flex overflow-hidden rounded-full border border-line bg-muted p-0.5 text-sm sm:text-xs">
      {opciones.map(([v, texto]) => (
        <button
          key={v}
          type="button"
          aria-pressed={valor === v}
          onClick={() => onCambiar(v)}
          className={`min-h-9 whitespace-nowrap rounded-full px-4 py-2 font-semibold transition-colors motion-reduce:transition-none ${valor === v ? 'bg-primary text-on-accent' : 'text-fg-muted hover:bg-primary-soft hover:text-primary-text'}`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

export function Cargando({ lineas = 4, alto = 'h-4' }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-3 motion-safe:animate-pulse" aria-hidden="true">
        {Array.from({ length: lineas }, (_, i) => <div key={i} className={`${alto} bg-muted rounded`} style={{ width: `${95 - i * 12}%` }} />)}
      </div>
    </div>
  );
}

export function Vacio({ titulo, texto, Icono = Inbox }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1.5 px-4 py-6 text-center">
      <Icono size={22} aria-hidden="true" className="text-fg-muted" />
      <p className="text-sm font-semibold">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-fg-muted">{texto}</p>}
    </div>
  );
}
