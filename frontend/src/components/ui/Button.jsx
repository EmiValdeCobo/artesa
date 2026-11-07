import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// Usa las clases .btn-* ya definidas en index.css (@layer components).
const VARIANTES = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const Button = forwardRef(function Button(
  { variante = 'primary', cargando = false, icono: Icono, disabled, className = '', children, type = 'button', ...resto },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || cargando} className={`${VARIANTES[variante]} ${className}`} {...resto}>
      {cargando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : Icono && <Icono size={16} aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;