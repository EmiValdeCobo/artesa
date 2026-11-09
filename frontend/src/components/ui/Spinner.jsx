import { Loader2 } from 'lucide-react';

export default function Spinner({ texto = 'Cargando…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 p-8 text-sm text-fg-muted ${className}`}>
      <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}