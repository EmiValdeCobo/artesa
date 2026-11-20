import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, QrCode, ScanLine } from 'lucide-react';
import InputMoneda from '../../../components/forms/InputMoneda.jsx';
import { Button } from '../../../components/ui/index.js';
import { formatoMoneda } from '../impuestos.js';
import {
  evaluarMontoTransferencia,
  generarReferenciaBanco,
  mascaraReferenciaTransferencia,
  textoQrTransferencia,
  validarReferenciaTransferencia,
} from './transferencia.js';

// Panel de transferencia SIMULADA: QR de ejemplo + referencia + monto pagado.
// Controlado por ModalCobro: `pago` trae { monto, monto_recibido, referencia, refCobro, confirmado, excedenteAceptado }.
export default function PagoTransferencia({ pago, idx, sucursal, onCambiar }) {
  const [qr, setQr] = useState('');
  const [tocados, setTocados] = useState({});
  const id = (c) => `transferencia-${c}-${idx}`;

  const textoQr = textoQrTransferencia({ sucursal, monto: pago.monto || '0.00', referencia: pago.refCobro });

  useEffect(() => {
    let vigente = true;
    // Import dinámico: la librería solo se descarga si se usa transferencia.
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(textoQr, { margin: 1, width: 176, errorCorrectionLevel: 'M' }))
      .then((url) => { if (vigente) setQr(url); })
      .catch(() => { if (vigente) setQr(''); });
    return () => { vigente = false; };
  }, [textoQr]);

  const errorRef = validarReferenciaTransferencia(pago.referencia);
  const evaluacion = useMemo(() => evaluarMontoTransferencia(pago.monto_recibido, pago.monto), [pago.monto_recibido, pago.monto]);
  const montoOk = evaluacion.estado === 'exacto' || (evaluacion.estado === 'excedente' && pago.excedenteAceptado);
  const puedeConfirmar = !errorRef && montoOk && !pago.confirmado;

  // Cualquier edición invalida la confirmación previa.
  const cambiar = (parche) => onCambiar({ ...parche, confirmado: false });

  if (pago.confirmado) {
    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-soft p-3 text-body-sm text-success-text" role="status">
        <span className="flex items-center gap-1.5 text-label">
          <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
          Transferencia registrada · Ref. {pago.referencia} · {formatoMoneda(Number(pago.monto_recibido))}
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

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <figure className="flex shrink-0 flex-col items-center rounded-md border border-line bg-white p-2">
          {qr ? (
            <img src={qr} alt={`Código QR simulado para pagar ${formatoMoneda(Number(pago.monto || 0))}`} width={176} height={176} />
          ) : (
            <div className="flex size-44 items-center justify-center text-fg-subtle" aria-hidden="true"><QrCode size={48} strokeWidth={1.25} /></div>
          )}
          <figcaption className="mt-1 text-center text-label-sm tabular-nums text-espresso-900">
            Pagar {formatoMoneda(Number(pago.monto || 0))}
          </figcaption>
        </figure>

        <div className="w-full min-w-0 space-y-3">
          <p className="text-body-sm text-fg-muted">
            El cliente escanea el código desde su banca en línea. Luego anota el número que le muestra su banco.
          </p>
          <p className="break-all font-mono text-label-sm text-fg-subtle">{pago.refCobro}</p>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { cambiar({ referencia: generarReferenciaBanco() }); setTocados((t) => ({ ...t, ref: true })); }}>
            <ScanLine size={16} strokeWidth={1.75} aria-hidden="true" /> Simular escaneo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id('ref')} className="mb-1 block text-label-sm text-fg-muted">
            Número de transferencia / referencia <span className="text-danger-text">*</span>
          </label>
          <input
            id={id('ref')}
            type="text"
            className="input w-full font-mono"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            placeholder="TRX123456789"
            value={pago.referencia}
            onChange={(e) => cambiar({ referencia: mascaraReferenciaTransferencia(e.target.value) })}
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
            <span>{evaluacion.mensaje} Confirmo registrar el excedente de ${evaluacion.excedente}.</span>
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
