import { useLayoutEffect, useRef, useState } from 'react';

// Tooltip reutilizable para cualquier gráfica. El contenedor del gráfico debe ser `relative`; (x, y) son px
// relativos a ese contenedor y señalan el punto que se explica. Va ARRIBA del punto (puede sobresalir del
// contenedor: no tapa el dato que explica) y pasa debajo solo si arriba no cabe en la pantalla; en horizontal
// se mantiene dentro del contenedor. Es solo visual (aria-hidden): el mismo texto va en el aria-label de cada
// elemento enfocable, así teclado y lectores de pantalla reciben lo mismo que quien usa el cursor.
export function TooltipFlotante({ visible, x, y, clave, contenedor, children }) {
  const caja = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, debajo: false, flecha: 0 });

  useLayoutEffect(() => {
    if (!visible || !caja.current || !contenedor.current) return;
    const w = caja.current.offsetWidth;
    const h = caja.current.offsetHeight;
    const marco = contenedor.current.clientWidth;
    const left = Math.min(Math.max(x - w / 2, 0), Math.max(marco - w, 0));
    const debajo = contenedor.current.getBoundingClientRect().top + y - h - 12 < 8; // 8 px de aire con el borde de la ventana
    setPos({ left, top: debajo ? y + 12 : y - h - 12, debajo, flecha: Math.min(Math.max(x - left, 10), w - 10) });
  }, [visible, x, y, clave, contenedor]);

  if (!visible) return null;
  return (
    <div
      ref={caja}
      aria-hidden="true"
      style={{ left: pos.left, top: pos.top }}
      className="anim-tip pointer-events-none absolute z-20 w-max max-w-64 bg-fg px-3 py-2.5 text-background shadow-lg"
    >
      {children}
      <span aria-hidden="true" style={{ left: pos.flecha }} className={`absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-fg ${pos.debajo ? '-top-1' : '-bottom-1'}`} />
    </div>
  );
}

// Estructura fija del contenido: etiqueta del punto → categoría/unidad → valor exacto → datos de apoyo.
export function TooltipContenido({ etiqueta, categoria, valor, unidad, filas = [] }) {
  return (
    <>
      <p className="text-xs font-semibold">{etiqueta}</p>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-background/70">{categoria}</p>
      <p className="flex items-baseline gap-1.5 leading-tight">
        <span className="font-display text-2xl font-semibold tabular-nums">{valor}</span>
        {unidad && <span className="text-[11px] text-background/70">{unidad}</span>}
      </p>
      {filas.length > 0 && (
        <dl className="mt-2 space-y-0.5 border-t border-background/25 pt-2 text-xs">
          {filas.map(([nombre, dato]) => (
            <div key={nombre} className="flex justify-between gap-6">
              <dt className="text-background/70">{nombre}</dt>
              <dd className="font-medium tabular-nums">{dato}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
