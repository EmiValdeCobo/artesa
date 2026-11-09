import { CircleAlert, RefreshCw, TriangleAlert } from 'lucide-react';

// Aviso de error en línea para un bloque del dashboard: qué pasó → por qué → qué hacer → reintentar.
// Solo usa utilidades de Tailwind y tokens del tema (sin depender de clases propias de otras ramas).
export default function AvisoError({ error, onReintentar, className = '' }) {
  if (!error) return null;
  const grave = error.categoria === 'sistema';
  const Icono = grave ? CircleAlert : TriangleAlert;
  return (
    <div role="alert" className={`flex items-start gap-3 border px-4 py-3 text-sm ${grave ? 'border-danger/40 bg-danger-soft' : 'border-warning/40 bg-warning-soft'} ${className}`}>
      <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${grave ? 'text-danger' : 'text-warning'}`} />
      <div className="min-w-0 flex-1 text-fg">
        <p className="font-semibold leading-snug">{error.titulo}</p>
        <p className="mt-0.5 leading-snug">{error.mensaje} {error.accion}</p>
        {error.reintentable && onReintentar && (
          <button type="button" onClick={onReintentar} className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-muted motion-reduce:transition-none">
            <RefreshCw size={14} aria-hidden="true" /> Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
