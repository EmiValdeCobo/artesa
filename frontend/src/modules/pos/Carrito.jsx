import { Minus, Plus, Trash2, ReceiptText } from 'lucide-react';
import { Button } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { calcularTotales, formatoMoneda, IVA } from './impuestos.js';

// El crédito fiscal requiere POS_EMITIR_CCF (permiso distinto de POS_COBRAR).
const TIPOS_DOC = [
  { valor: 'FACTURA', texto: 'Consumidor final' },
  { valor: 'CCF', texto: 'Crédito fiscal (CCF)', permiso: 'POS_EMITIR_CCF' },
];

export default function Carrito({ items, tipoDocumento, onTipoDocumento, dispatch, onCobrar }) {
  const { tiene } = useAuth();
  const tipos = TIPOS_DOC.filter((t) => !t.permiso || tiene(t.permiso));
  const { subtotal, iva, total } = calcularTotales(items);
  const unidades = items.reduce((n, i) => n + i.cantidad, 0);

  return (
    <aside id="pedido-actual" className="card flex h-full scroll-mt-20 flex-col !p-0" aria-label="Pedido actual">
      <header className="border-b border-line p-4">
        <h2 className="font-semibold">Pedido actual</h2>
        <p className="text-xs text-fg-muted">{unidades} {unidades === 1 ? 'producto' : 'productos'}</p>
        {tipos.length < 2 ? <p className="mt-3 text-xs text-fg-muted">Documento: {tipos[0].texto}</p> : (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de documento">
          {tipos.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={tipoDocumento === t.valor} onClick={() => onTipoDocumento(t.valor)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${tipoDocumento === t.valor ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
              {t.texto}
            </button>
          ))}
        </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-fg-muted">
            <ReceiptText size={26} aria-hidden="true" />
            <p>Toca un producto del catálogo para empezar el pedido.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id_producto} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{i.nombre}</p>
                  <p className="text-xs text-fg-muted">{formatoMoneda(i.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="btn-ghost h-9 w-9 !p-0" aria-label={`Quitar una unidad de ${i.nombre}`}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad - 1 })}><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{i.cantidad}</span>
                  <button type="button" className="btn-ghost h-9 w-9 !p-0" aria-label={`Agregar una unidad de ${i.nombre}`} disabled={i.cantidad >= i.stock}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad + 1 })}><Plus size={14} /></button>
                </div>
                <p className="w-16 text-right text-sm font-semibold">{formatoMoneda(i.precio * i.cantidad)}</p>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar ${i.nombre}`}
                  onClick={() => dispatch({ tipo: 'quitar', id: i.id_producto })}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-line p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd>{formatoMoneda(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">IVA ({IVA * 100}%)</dt><dd>{formatoMoneda(iva)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatoMoneda(total)}</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <Button variante="ghost" disabled={!items.length} onClick={() => dispatch({ tipo: 'vaciar' })}>Vaciar</Button>
          <Button disabled={!items.length} onClick={onCobrar}>Cobrar {formatoMoneda(total)}</Button>
        </div>
      </footer>
    </aside>
  );
}