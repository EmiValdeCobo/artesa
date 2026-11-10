import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import { formatoMoneda } from './impuestos.js';

export default function ProductoCard({ producto, enCarrito, onAgregar }) {
  const agotado = producto.stock <= 0;
  const bajo = !agotado && producto.stock <= producto.stock_minimo;
  const sinMas = !agotado && enCarrito >= producto.stock;
  const estado = agotado ? ', agotado' : bajo ? `, quedan ${producto.stock}` : '';

  return (
    <button type="button" onClick={() => onAgregar(producto)} disabled={agotado || sinMas}
      aria-label={`Agregar ${producto.nombre}, ${formatoMoneda(producto.precio)}${estado}${enCarrito ? `, ${enCarrito} en el pedido` : ''}`}
      className={`relative flex h-full min-h-28 flex-col justify-between rounded-xl border p-3.5 text-left shadow-sm transition-colors disabled:cursor-not-allowed ${
        enCarrito > 0 ? 'border-primary bg-primary-soft' : agotado ? 'border-line bg-muted' : 'border-line bg-surface hover:border-primary hover:bg-primary-soft'}`}>
      <div className={enCarrito > 0 ? 'pr-8' : ''}>
        <p className={`line-clamp-2 text-sm font-semibold leading-snug ${agotado ? 'text-fg-muted' : ''}`}>{producto.nombre}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{producto.tipo === 'reventa' ? 'Reventa' : 'Elaborado'}</p>
      </div>
      {enCarrito > 0 && (
        <span className="absolute right-3 top-3 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-accent" aria-hidden="true">{enCarrito}</span>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <span className={`text-lg font-bold tabular-nums ${agotado ? 'text-fg-muted' : 'text-primary-text'}`}>{formatoMoneda(producto.precio)}</span>
        {agotado && <EstadoBadge tipo="error">Agotado</EstadoBadge>}
        {bajo && !sinMas && <EstadoBadge tipo="alerta">Quedan {producto.stock}</EstadoBadge>}
        {sinMas && <EstadoBadge tipo="info">Máximo en pedido</EstadoBadge>}
      </div>
    </button>
  );
}
