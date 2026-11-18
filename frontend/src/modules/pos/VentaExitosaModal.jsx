import { CircleCheck, Printer, X } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import { formatoMoneda } from './impuestos.js';
import { abrirVentanaImpresion } from './imprimirTicket.js';

export default function VentaExitosaModal({
  abierto,
  venta,
  onNuevaVenta,
}) {
  if (!abierto || !venta) return null;

  const vueltoNum = Number(venta.vuelto || 0);

  return (
    <Dialogo onCerrar={onNuevaVenta} tamano="sm" labelledBy="titulo-exito">
      <div className="flex items-start gap-3 px-6 pt-6">
        <span className="grid size-control-lg shrink-0 place-items-center rounded-lg bg-success-soft text-success-text" aria-hidden="true">
          <CircleCheck size={24} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="titulo-exito" className="text-h3 text-fg">Venta registrada con éxito</h2>
          <p className="mt-0.5 text-body-sm text-fg-muted">
            {venta.tipo_comprobante} <span className="font-mono text-fg">#{venta.correlativo}</span>
          </p>
          {venta.cliente_nombre && (
            <p className="mt-0.5 text-body-sm text-fg-muted">Cliente: {venta.cliente_nombre}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onNuevaVenta}
          className="btn-ghost btn-sm !border-transparent !px-1.5"
          aria-label="Cerrar modal"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="px-6 pb-6 pt-5">
        <dl className="rounded-md bg-muted p-4">
          <div className="flex items-center justify-between text-body-sm">
            <dt className="text-fg-muted">Total cobrado</dt>
            <dd className="font-semibold tabular-nums text-fg">{formatoMoneda(Number(venta.total))}</dd>
          </div>
          {vueltoNum > 0 && (
            <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
              <dt className="text-label text-fg">Vuelto a entregar</dt>
              <dd className="text-kpi tabular-nums text-success-text">{formatoMoneda(vueltoNum)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variante="ghost" icono={Printer} onClick={() => abrirVentanaImpresion(venta)}>
            Imprimir ticket
          </Button>
          <Button onClick={onNuevaVenta}>Nueva venta</Button>
        </div>
      </div>
    </Dialogo>
  );
}
