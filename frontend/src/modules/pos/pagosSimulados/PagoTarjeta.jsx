import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { Button } from '../../../components/ui/index.js';
import { formatoMoneda } from '../impuestos.js';
import {
  MARCAS,
  detectarMarca,
  mascaraCvv,
  mascaraNumeroTarjeta,
  mascaraTitular,
  mascaraVencimiento,
  procesarPagoTarjeta,
  validarTarjeta,
} from './tarjeta.js';

const VACIO = { numero: '', titular: '', vencimiento: '', cvv: '' };

// Checkout de tarjeta SIMULADO. Los datos sensibles (número, CVV, vencimiento) viven SOLO en el estado
// local de este componente y se borran al aprobar. Hacia ModalCobro sale únicamente
// { marca, ultimos4, autorizacion } mediante onAprobado.
export default function PagoTarjeta({ pago, idx, onAprobado, onReiniciar }) {
  const [campos, setCampos] = useState(VACIO);
  const [tocados, setTocados] = useState({});
  const [estado, setEstado] = useState('editando'); // editando | procesando | rechazada
  const [mensaje, setMensaje] = useState('');
  const refNumero = useRef(null);
  const id = (c) => `tarjeta-${c}-${idx}`;

  const marca = detectarMarca(campos.numero);
  const errores = useMemo(() => validarTarjeta(campos), [campos]);
  const valido = Object.values(errores).every((e) => !e);

  const cambiar = (campo, valor) => {
    setCampos((c) => ({ ...c, [campo]: valor }));
    if (estado === 'rechazada') { setEstado('editando'); setMensaje(''); }
  };
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }));

  const autorizar = async () => {
    setTocados({ numero: true, titular: true, vencimiento: true, cvv: true });
    if (!valido) return;
    setEstado('procesando');
    try {
      const resultado = await procesarPagoTarjeta(campos);
      setCampos(VACIO); // nada sensible queda en memoria de React
      setTocados({});
      setEstado('editando');
      onAprobado(resultado);
    } catch (err) {
      setEstado('rechazada');
      setMensaje(err.message || 'No se pudo procesar la tarjeta (simulación).');
      setCampos((c) => ({ ...c, cvv: '' }));
    }
  };

  if (pago.confirmado && pago.tarjeta) {
    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-soft p-3 text-body-sm text-success-text" role="status">
        <span className="flex items-center gap-1.5 text-label">
          <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
          Aprobada · {MARCAS[pago.tarjeta.marca]?.nombre} •••• {pago.tarjeta.ultimos4} · Aut. {pago.referencia}
        </span>
        <button type="button" className="btn-ghost btn-sm" onClick={onReiniciar}>Usar otra tarjeta</button>
      </div>
    );
  }

  const procesando = estado === 'procesando';
  const error = (c) => (tocados[c] ? errores[c] : '');
  const campo = (c, etiqueta, props) => (
    <div className={props.envoltura ?? ''}>
      <label htmlFor={id(c)} className="mb-1 block text-label-sm text-fg-muted">{etiqueta} <span className="text-danger-text">*</span></label>
      {props.control}
      {error(c) && <p id={`${id(c)}-error`} className="mt-1 text-label-sm text-danger-text">{error(c)}</p>}
    </div>
  );
  const aria = (c) => ({
    'aria-invalid': error(c) ? 'true' : undefined,
    'aria-describedby': error(c) ? `${id(c)}-error` : undefined,
    onBlur: () => tocar(c),
    disabled: procesando,
    autoComplete: 'off',
  });

  return (
    <div className="mt-3 space-y-3">
      <p className="flex items-center gap-1.5 rounded-md bg-warning-soft px-3 py-2 text-label-sm text-warning-text">
        <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Simulación: no se realiza ningún cargo real · {formatoMoneda(Number(pago.monto || 0))}
      </p>

      {/* Vista previa de la tarjeta (decorativa: los lectores de pantalla usan los campos) */}
      <div aria-hidden="true" className="relative mx-auto aspect-[1.586] w-full max-w-xs overflow-hidden rounded-lg bg-espresso-900 p-4 text-espresso-50 shadow-sm">
        <div className="flex items-start justify-between">
          <CreditCard size={28} strokeWidth={1.5} />
          <span className="text-label">{MARCAS[marca]?.nombre ?? ''}</span>
        </div>
        <p className="mt-6 font-mono text-lg tracking-wider tabular-nums">
          {campos.numero || '•••• •••• •••• ••••'}
        </p>
        <div className="mt-4 flex items-end justify-between gap-2 text-label-sm">
          <span className="min-w-0 truncate uppercase">{campos.titular || 'NOMBRE DEL TITULAR'}</span>
          <span className="shrink-0 font-mono">{campos.vencimiento || 'MM/AA'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {campo('numero', 'Número de tarjeta', {
          envoltura: 'col-span-2',
          control: (
            <div className="relative">
              <input
                ref={refNumero}
                id={id('numero')}
                type="text"
                inputMode="numeric"
                className="input w-full pr-28 font-mono tabular-nums"
                placeholder="1234 1234 1234 1234"
                maxLength={23}
                value={campos.numero}
                onChange={(e) => cambiar('numero', mascaraNumeroTarjeta(e.target.value))}
                {...aria('numero')}
              />
              {marca && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label-sm text-fg-muted">
                  {MARCAS[marca].nombre}
                </span>
              )}
            </div>
          ),
        })}
        {campo('titular', 'Nombre del titular', {
          envoltura: 'col-span-2',
          control: (
            <input id={id('titular')} type="text" className="input w-full uppercase" placeholder="COMO APARECE EN LA TARJETA"
              value={campos.titular} onChange={(e) => cambiar('titular', mascaraTitular(e.target.value))} {...aria('titular')} />
          ),
        })}
        {campo('vencimiento', 'Vencimiento', {
          control: (
            <input id={id('vencimiento')} type="text" inputMode="numeric" className="input w-full font-mono" placeholder="MM/AA" maxLength={5}
              value={campos.vencimiento} onChange={(e) => cambiar('vencimiento', mascaraVencimiento(e.target.value, campos.vencimiento))} {...aria('vencimiento')} />
          ),
        })}
        {campo('cvv', `CVV (${MARCAS[marca]?.largoCvv ?? 3} dígitos)`, {
          control: (
            <input id={id('cvv')} type="password" inputMode="numeric" className="input w-full font-mono" placeholder={marca === 'AMEX' ? '••••' : '•••'}
              maxLength={MARCAS[marca]?.largoCvv ?? 4}
              value={campos.cvv} onChange={(e) => cambiar('cvv', mascaraCvv(e.target.value, marca))} {...aria('cvv')} />
          ),
        })}
      </div>

      <div aria-live="polite">
        {estado === 'rechazada' && (
          <p className="flex items-center gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-label-sm text-danger-text" role="alert">
            <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> {mensaje}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-label-sm text-fg-subtle"><Lock size={14} strokeWidth={1.75} aria-hidden="true" /> No se guarda el número ni el CVV</span>
        <Button variante="secondary" tamano="sm" onClick={autorizar} cargando={procesando} disabled={!pago.monto || Number(pago.monto) <= 0}>
          {procesando ? 'Procesando…' : `Confirmar pago ${formatoMoneda(Number(pago.monto || 0))}`}
        </Button>
      </div>
    </div>
  );
}
