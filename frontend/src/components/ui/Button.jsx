import { forwardRef } from 'react';
import { PuntosCarga } from '../feedback/Skeleton.jsx';

// Usa las clases .btn-* de index.css (@layer components).
//   variante: primary (Terracota, la acción principal) · secondary (tonal) · ghost (borde) · danger
//   tamano: sm 32 px · md 40 px · lg 48 px
const VARIANTES = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};
const TAMANOS = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

const Button = forwardRef(function Button(
  { variante = 'primary', tamano = 'md', cargando = false, icono: Icono, disabled, className = '', children, type = 'button', ...resto },
  ref,
) {
  const tamanoIcono = tamano === 'lg' ? 20 : 16;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${VARIANTES[variante] || VARIANTES.primary} ${TAMANOS[tamano] ?? ''} ${className}`.replace(/\s+/g, ' ').trim()}
      {...resto}
    >
      {cargando ? <PuntosCarga /> : Icono && <Icono size={tamanoIcono} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
