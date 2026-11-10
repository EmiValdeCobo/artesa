import { Inbox } from 'lucide-react';

const COLUMNAS = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 12: 'lg:col-span-12' };

// Contenedor de cada bloque: rejilla de 12 columnas, esquinas rectas y regla fina (como el resto del inicio).
export function Panel({ titulo, cols = 6, orden = 0, acciones = null, acento = 1, children }) {
  return (
    <section aria-label={titulo} style={{ '--retardo': `${orden * 70}ms`, '--panel-acento': `var(--serie-${acento})` }} className={`anim-entrar panel-dash col-span-12 min-w-0 border border-t-0 border-line bg-surface ${COLUMNAS[cols] ?? COLUMNAS[6]}`}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: `var(--serie-${acento}-texto)` }}>{titulo}</h2>
        {acciones}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Selector de periodo: botones con aria-pressed (el estado no depende solo del color).
export function SelectorPeriodo({ valor, opciones, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="flex overflow-hidden rounded-md border border-line text-sm sm:text-xs">
      {opciones.map(([v, texto]) => (
        <button
          key={v}
          type="button"
          aria-pressed={valor === v}
          onClick={() => onCambiar(v)}
          className={`min-h-9 whitespace-nowrap px-3.5 py-2 font-semibold transition-colors motion-reduce:transition-none ${valor === v ? 'bg-primary text-on-accent' : 'text-fg-muted hover:bg-primary-soft hover:text-primary-text'}`}
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
        {Array.from({ length: lineas }, (_, i) => <div key={i} className={`${alto} bg-muted`} style={{ width: `${95 - i * 12}%` }} />)}
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
