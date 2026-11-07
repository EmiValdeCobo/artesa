import { CircleAlert, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { enlaceSoporte } from '../errors/soporte.js';

// Mensaje de error EN LÍNEA (dentro de la pantalla o del formulario), para errores que no merecen
// interrumpir: una lista que no cargó, un formulario que no se pudo guardar.
// Estructura fija y legible: qué pasó (título) → por qué (causa) → qué hacer (acción) → botón.
//
// Props: error = ErrorUsuario (de traducirError) · onReintentar · onCerrar · className
export default function BannerError({ error, onReintentar, onCerrar, className = '' }) {
  if (!error) return null;
  const esSistema = error.categoria === 'sistema';
  const Icono = esSistema ? CircleAlert : TriangleAlert;
  const soporte = esSistema ? enlaceSoporte() : null;

  return (
    <div role="alert" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${esSistema ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'} ${className}`}>
      <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${esSistema ? 'text-danger' : 'text-warning'}`} />
      <div className="min-w-0 flex-1 text-fg">
        <p className="font-semibold leading-snug">{error.titulo}</p>
        <p className="mt-0.5 leading-snug">{error.mensaje} {error.accion}</p>
        {((error.reintentable && onReintentar) || soporte) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {error.reintentable && onReintentar && <button type="button" className="btn-ghost min-h-9 !bg-surface !px-3 !py-1.5" onClick={onReintentar}><RefreshCw size={14} aria-hidden="true" /> Reintentar</button>}
            {soporte && <a href={soporte} className="btn-ghost min-h-9 !bg-surface !px-3 !py-1.5">Contactar a soporte</a>}
          </div>
        )}
      </div>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar mensaje" className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface/70 hover:text-fg">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
