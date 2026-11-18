import { useRef } from 'react';

// Pestañas accesibles (patrón WAI-ARIA "tabs"): flechas ←/→, Inicio y Fin cambian de pestaña,
// y solo la activa entra en el orden de Tab. El contenido lo dibuja quien la usa con
// role="tabpanel" id={`panel-${clave}`} aria-labelledby={`tab-${clave}`}.
//
//   <Pestanas etiqueta="Secciones" activa={p} onCambiar={setP}
//     pestanas={[{ clave: 'roles', texto: 'Roles', icono: Users, total: 7 }]} />
export default function Pestanas({ pestanas, activa, onCambiar, etiqueta, className = '' }) {
  const refs = useRef({});

  const alPresionar = (evento, indice) => {
    const destino = { ArrowRight: (indice + 1) % pestanas.length, ArrowLeft: (indice - 1 + pestanas.length) % pestanas.length, Home: 0, End: pestanas.length - 1 }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    onCambiar(pestanas[destino].clave);
    refs.current[pestanas[destino].clave]?.focus();
  };

  return (
    <div role="tablist" aria-label={etiqueta} className={`flex gap-1 border-b border-line ${className}`}>
      {pestanas.map(({ clave, texto, icono: Icono, total }, indice) => {
        const seleccionada = clave === activa;
        return (
          <button key={clave} ref={(el) => { refs.current[clave] = el; }} type="button" role="tab" id={`tab-${clave}`} aria-selected={seleccionada} aria-controls={`panel-${clave}`}
            tabIndex={seleccionada ? 0 : -1} onClick={() => onCambiar(clave)} onKeyDown={(evento) => alPresionar(evento, indice)}
            className={`-mb-px flex min-h-control-lg items-center gap-2 border-b-2 px-3 text-label font-semibold transition-colors ${seleccionada ? "border-primary text-fg" : "border-transparent text-fg-muted hover:border-line-strong hover:text-fg"}`}>
            {Icono && <Icono size={16} strokeWidth={1.75} aria-hidden="true" />}
            {texto}
            {total !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-label-sm tabular-nums text-fg-muted">{total}</span>}
          </button>
        );
      })}
    </div>
  );
}
