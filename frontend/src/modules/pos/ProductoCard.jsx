import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import { formatoMoneda } from './impuestos.js';

export default function ProductoCard({ producto, enCarrito, onAgregar }) {
  const agotado = producto.stock <= 0;
  const bajo = !agotado && producto.stock <= producto.stock_minimo;
  const sinMas = !agotado && enCarrito >= producto.stock;
  const estado = agotado ? ', agotado' : bajo ? `, quedan ${producto.stock}` : '';
  const inicial = producto.nombre?.trim().charAt(0).toUpperCase() || '·';

  return (
    <button type="button" onClick={() => onAgregar(producto)} disabled={agotado || sinMas}
      aria-label={`Agregar ${producto.nombre}, ${formatoMoneda(producto.precio)}${estado}${enCarrito ? `, ${enCarrito} en el pedido` : ''}`}
      className={`relative flex h-full min-h-32 flex-col gap-3 rounded-lg border p-3 text-left shadow-xs transition-colors disabled:cursor-not-allowed ${
        enCarrito > 0 ? 'border-primary/40 bg-primary-soft' : agotado ? 'border-line bg-muted' : 'border-line bg-surface hover:border-primary/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid size-control-md shrink-0 place-items-center rounded-md bg-muted font-display text-h3 ${agotado ? 'text-fg-muted' : 'text-fg-muted'}`} aria-hidden="true">{inicial}</span>
        {enCarrito > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-label-sm tabular-nums text-on-accent" aria-hidden="true">{enCarrito}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-label ${agotado ? 'text-fg-muted' : 'text-fg'}`}>{producto.nombre}</p>
        <p className="mt-0.5 text-label-sm text-fg-muted">{producto.tipo === 'reventa' ? 'Reventa' : 'Elaborado'}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <span className={`text-h3 tabular-nums ${agotado ? 'text-fg-muted' : 'text-fg'}`}>{formatoMoneda(producto.precio)}</span>
        {agotado && <EstadoBadge tipo="error">Agotado</EstadoBadge>}
        {bajo && !sinMas && <EstadoBadge tipo="alerta">Quedan {producto.stock}</EstadoBadge>}
        {sinMas && <EstadoBadge tipo="info">Máximo en pedido</EstadoBadge>}
      </div>
    </button>
  );
}
