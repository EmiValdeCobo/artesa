import { RefreshCw } from 'lucide-react';
import { haceCuanto } from '../../utils/formato.js';
import { useAhora } from '../../hooks/useAhora.js';

// Pie de cada bloque: cuán reciente es lo que se ve y un botón para refrescar al momento.
export default function Actualizado({ instante, actualizando, onRecargar }) {
  const ahora = useAhora(30000);
  return (
    <button
      type="button"
      onClick={onRecargar}
      disabled={actualizando}
      title="Actualizar ahora"
      className="inline-flex items-center gap-1.5 rounded-xs text-label-sm text-fg-muted transition-colors hover:text-fg disabled:cursor-progress"
    >
      <RefreshCw size={12} strokeWidth={2} aria-hidden="true" className={actualizando ? "opacity-40" : ""} />
      <span>Actualizado {haceCuanto(instante, ahora)}</span>
    </button>
  );
}
