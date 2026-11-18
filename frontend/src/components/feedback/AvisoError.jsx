import { CircleAlert, RefreshCw, TriangleAlert } from 'lucide-react';

// Aviso de error en línea para un bloque del dashboard: qué pasó → por qué → qué hacer → reintentar.
// Solo usa utilidades de Tailwind y tokens del tema (sin depender de clases propias de otras ramas).
export default function AvisoError({ error, onReintentar, className = '' }) {
  if (!error) return null;
  const grave = error.categoria === 'sistema';
  const Icono = grave ? CircleAlert : TriangleAlert;
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-md border px-4 py-3 text-body ${grave ? 'border-danger/40 bg-danger-soft' : 'border-warning/40 bg-warning-soft'} ${className}`}>
      <Icono size={18} aria-hidden="true" strokeWidth={1.75} className={`mt-0.5 shrink-0 ${grave ? 'text-danger-text' : 'text-warning-text'}`} />
      <div className="min-w-0 flex-1 text-fg">
        <p className="font-semibold leading-snug">{error.titulo}</p>
        <p className="mt-0.5 leading-snug">{error.mensaje} {error.accion}</p>
        {error.reintentable && onReintentar && (
          <button type="button" onClick={onReintentar} className="btn-ghost btn-sm mt-2.5">
            <RefreshCw size={14} aria-hidden="true" /> Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
