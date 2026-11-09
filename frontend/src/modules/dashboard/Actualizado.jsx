import { RefreshCw } from 'lucide-react';
import { haceCuanto } from './formato.js';
import { useAhora } from './useAhora.js';

// Pie de cada bloque: cuán reciente es lo que se ve y un botón para refrescar al momento.
export default function Actualizado({ instante, actualizando, onRecargar }) {
  const ahora = useAhora(30000);
  return (
    <button
      type="button"
      onClick={onRecargar}
      disabled={actualizando}
      title="Actualizar ahora"
      className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg motion-reduce:transition-none"
    >
      <RefreshCw size={12} aria-hidden="true" className={actualizando ? 'motion-safe:animate-spin' : ''} />
      <span>Actualizado {haceCuanto(instante, ahora)}</span>
    </button>
  );
}
