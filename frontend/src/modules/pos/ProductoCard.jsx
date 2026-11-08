import { formatoMoneda } from './impuestos.js';

export default function ProductoCard({ producto, enCarrito, onAgregar }) {
  const agotado = producto.stock <= 0;
  const bajo = !agotado && producto.stock <= producto.stock_minimo;
  const sinMas = enCarrito >= producto.stock;

  return (
    <button type="button" onClick={() => onAgregar(producto)} disabled={agotado || sinMas}
      aria-label={`Agregar ${producto.nombre}, ${formatoMoneda(producto.precio)}${agotado ? ', agotado' : ''}`}
      className="group flex min-h-28 flex-col justify-between rounded-xl border border-line bg-surface p-3.5 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-55">
      <div>
        <p className="text-sm font-semibold leading-snug">{producto.nombre}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{producto.tipo === 'reventa' ? 'Reventa' : 'Elaborado'}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-lg font-bold text-primary-text">{formatoMoneda(producto.precio)}</span>
        {agotado && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Agotado</span>}
        {bajo && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Quedan {producto.stock}</span>}
        {enCarrito > 0 && !agotado && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-accent">{enCarrito}</span>}
      </div>
    </button>
  );
}