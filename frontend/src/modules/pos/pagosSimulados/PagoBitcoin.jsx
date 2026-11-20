import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import InputMoneda from '../../../components/forms/InputMoneda.jsx';
import { Button } from '../../../components/ui/index.js';
import { formatoMoneda } from '../impuestos.js';
import {
  evaluarMontoBitcoin,
  generarHashBitcoin,
  mascaraReferenciaBitcoin,
  validarReferenciaBitcoin,
} from './bitcoin.js';

export default function PagoBitcoin({ pago, idx, onCambiar }) {
  const [tocados, setTocados] = useState({});
  const id = (c) => `bitcoin-${c}-${idx}`;

  const errorRef = validarReferenciaBitcoin(pago.referencia);
  const evaluacion = useMemo(() => evaluarMontoBitcoin(pago.monto_recibido, pago.monto), [pago.monto_recibido, pago.monto]);
  const montoOk = evaluacion.estado === 'exacto' || (evaluacion.estado === 'excedente' && pago.excedenteAceptado);
  const puedeConfirmar = !errorRef && montoOk && !pago.confirmado;

  const cambiar = (parche) => onCambiar({ ...parche, confirmado: false });

  if (pago.confirmado) {
    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-soft p-3 text-body-sm text-success-text" role="status">
        <span className="flex items-center gap-1.5 text-label">
          <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
          Bitcoin registrado · {pago.referencia.slice(0, 12)}… · {formatoMoneda(Number(pago.monto_recibido))}
        </span>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onCambiar({ confirmado: false })}>Editar</button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="flex items-center gap-1.5 rounded-md bg-warning-soft px-3 py-2 text-label-sm text-warning-text">
        <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Simulación: no es un pago real
      </p>

      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-muted">
          <Smartphone size={20} strokeWidth={1.5} className="text-fg-muted" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-body-sm text-fg-muted">
            El cliente paga desde Chivo Wallet o Lightning. Ingresa el ID de transacción que muestra la app.
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { cambiar({ referencia: generarHashBitcoin() }); setTocados((t) => ({ ...t, ref: true })); }}>
            <Smartphone size={16} strokeWidth={1.75} aria-hidden="true" /> Simular pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id('ref')} className="mb-1 block text-label-sm text-fg-muted">
            ID de transacción <span className="text-danger-text">*</span>
          </label>
          <input
            id={id('ref')}
            type="text"
            className="input w-full font-mono"
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            placeholder="a1b2c3d4e5f6g7h8"
            value={pago.referencia}
            onChange={(e) => cambiar({ referencia: mascaraReferenciaBitcoin(e.target.value) })}
            onBlur={() => setTocados((t) => ({ ...t, ref: true }))}
            aria-invalid={tocados.ref && errorRef ? 'true' : undefined}
            aria-describedby={tocados.ref && errorRef ? `${id('ref')}-error` : undefined}
          />
          {tocados.ref && errorRef && <p id={`${id('ref')}-error`} className="mt-1 text-label-sm text-danger-text">{errorRef}</p>}
        </div>
        <div>
          <label htmlFor={id('monto')} className="mb-1 block text-label-sm text-fg-muted">
            Monto pagado ($) <span className="text-danger-text">*</span>
          </label>
          <InputMoneda
            id={id('monto')}
            className="w-full"
            valor={pago.monto_recibido}
            onValor={(v) => cambiar({ monto_recibido: v, excedenteAceptado: false })}
            maximo="99999999.99"
            aria-describedby={`${id('monto')}-aviso`}
          />
        </div>
      </div>

      <div id={`${id('monto')}-aviso`} aria-live="polite">
        {(evaluacion.estado === 'insuficiente' || evaluacion.estado === 'invalido') && (
          <p className="flex items-center gap-1.5 text-label-sm text-danger-text">
            <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> {evaluacion.mensaje}
          </p>
        )}
        {evaluacion.estado === 'excedente' && (
          <label className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-label-sm text-warning-text">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!!pago.excedenteAceptado}
              onChange={(e) => cambiar({ excedenteAceptado: e.target.checked })}
            />
            <span>{evaluacion.mensaje} Confirmo registrar el excedente.</span>
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variante="secondary"
          tamano="sm"
          disabled={!puedeConfirmar}
          onClick={() => onCambiar({ confirmado: true })}
        >
          Confirmar pago
        </Button>
      </div>
    </div>
  );
}
