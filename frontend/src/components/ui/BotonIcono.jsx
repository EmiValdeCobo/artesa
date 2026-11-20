import { forwardRef } from 'react';
import { PuntosCarga } from '../feedback/Skeleton.jsx';

// Botón de acción de fila solo con icono: mismo tamaño y tonos en todas las tablas.
// 40 px en pantallas táctiles, 32 px desde 768 px. `etiqueta` es obligatoria (aria-label y tooltip).
//   tono: neutro · aviso · exito · peligro
const TONOS = {
  neutro: 'btn-ghost text-fg-muted hover:text-fg',
  aviso: 'btn-ghost text-warning-text',
  exito: 'btn-ghost text-success-text',
  peligro: 'btn-danger-outline',
};

const BotonIcono = forwardRef(function BotonIcono(
  { icono: Icono, etiqueta, titulo, tono = 'neutro', cargando = false, disabled, className = '', type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${TONOS[tono] || TONOS.neutro} size-control-md !p-0 md:size-control-sm ${className}`.trim()}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? <PuntosCarga className="scale-75" /> : <Icono size={16} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
});

export default BotonIcono;
