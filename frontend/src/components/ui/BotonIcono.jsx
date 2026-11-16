import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// Botón de acción de fila solo con icono (patrón del módulo de Usuarios): mismo tamaño, padding y
// tonos en todas las tablas. `etiqueta` es obligatoria: se usa como aria-label y como tooltip.
//   tono: neutro · aviso · exito · peligro
const TONOS = {
  neutro: 'btn-ghost',
  aviso: 'btn-ghost text-warning',
  exito: 'btn-ghost text-success',
  peligro: 'btn-danger',
};

const BotonIcono = forwardRef(function BotonIcono(
  { icono: Icono, etiqueta, titulo, tono = 'neutro', cargando = false, disabled, className = '', type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${TONOS[tono] || TONOS.neutro} !p-2 ${className}`.trim()}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Icono size={16} aria-hidden="true" />}
    </button>
  );
});

export default BotonIcono;
