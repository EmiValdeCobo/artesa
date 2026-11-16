import { CheckCircle2, Printer, PlusCircle, X } from 'lucide-react';
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
      {/* Botón de salida en la esquina superior derecha */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onNuevaVenta}
          className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 pb-6 pt-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={36} />
        </div>

        <h2 id="titulo-exito" className="mt-4 text-xl font-bold text-fg">
          ¡Venta registrada con éxito!
        </h2>
        <p className="mt-1 text-sm font-semibold text-primary">
          {venta.tipo_comprobante} #{venta.correlativo}
        </p>

        {venta.cliente_nombre && (
          <p className="mt-0.5 text-xs text-fg-muted">
            Cliente: {venta.cliente_nombre}
          </p>
        )}

        <div className="mt-5 rounded-xl border border-line bg-muted/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Total cobrado:</span>
            <span className="font-bold text-fg tabular-nums">{formatoMoneda(Number(venta.total))}</span>
          </div>

          {vueltoNum > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Vuelto a entregar
              </span>
              <span className="mt-1 block text-2xl font-extrabold text-success tabular-nums">
                {formatoMoneda(vueltoNum)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button
            variante="ghost"
            onClick={() => abrirVentanaImpresion(venta)}
            className="flex-1 inline-flex items-center justify-center gap-1.5"
          >
            <Printer size={16} /> Imprimir comprobante
          </Button>

          <Button
            onClick={onNuevaVenta}
            className="flex-1 inline-flex items-center justify-center gap-1.5"
          >
            <PlusCircle size={16} /> Nueva venta
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}