import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CreditCard, Banknote, Smartphone, ArrowRightLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import { calcularTotales, formatoMoneda, IVA } from './impuestos.js';
import { registrarVenta } from './posApi.js';
import { traducirError } from '../../errors/traducirError.js';

// ── Constantes ────────────────────────────────────────────────────────────────
const METODOS = [
  { valor: 'EFECTIVO',       texto: 'Efectivo',      icono: Banknote },
  { valor: 'TARJETA',        texto: 'Tarjeta',       icono: CreditCard },
  { valor: 'TRANSFERENCIA',  texto: 'Transferencia', icono: ArrowRightLeft },
  { valor: 'BITCOIN_CHIVO',  texto: 'Bitcoin/Chivo', icono: Smartphone },
];

const BILLETES = [
  { etiqueta: 'Exacto', multiplicador: null },
  { etiqueta: '$1',  valor: 1 },
  { etiqueta: '$5',  valor: 5 },
  { etiqueta: '$10', valor: 10 },
  { etiqueta: '$20', valor: 20 },
  { etiqueta: '$50', valor: 50 },
  { etiqueta: '$100', valor: 100 },
];

// Dinero: nunca float. Operamos con centavos (enteros) y convertimos a string "0.00".
const aCentavos  = (n) => Math.round((Number(n) || 0) * 100);
const desCentavos = (c) => (c / 100).toFixed(2);
const fmtStr      = (n) => (Number(n) || 0).toFixed(2);

const pagoVacio = () => ({ metodo: 'EFECTIVO', monto: '', monto_recibido: '', referencia: '' });

// ── Componente ModalCobro ─────────────────────────────────────────────────────
export default function ModalCobro({
  abierto,
  onCerrar,
  items,
  tipoDocumento,
  clienteSeleccionado,
  turnoActivo,
  descuentoGlobal = '0.00',
  onVentaExitosa,
}) {
  const [pagos, setPagos]               = useState([pagoVacio()]);
  const [descuento, setDescuento]       = useState(descuentoGlobal);
  const [enviando, setEnviando]         = useState(false);
  const [errorEnvio, setErrorEnvio]     = useState(null);
  const primerInputRef = useRef(null);

  // ── Resetear pagos al abrir con el monto total por defecto ─────────────
  useEffect(() => {
    if (abierto) {
      const { total: totalBruto } = calcularTotales(items);
      const descCent = aCentavos(descuentoGlobal);
      const totCent = Math.max(aCentavos(totalBruto) - descCent, 0);
      const inicial = desCentavos(totCent);
      setPagos([{ metodo: 'EFECTIVO', monto: inicial, monto_recibido: inicial, referencia: '' }]);
      setDescuento(descuentoGlobal);
      setEnviando(false);
      setErrorEnvio(null);
    }
  }, [abierto, items, descuentoGlobal]);

  // ── Cálculos derivados (totales, faltante, vuelto) ───────────────────────
  const { subtotal, iva, total: totalBruto } = calcularTotales(items);
  const descuentoCentavos = aCentavos(descuento);
  const totalCentavos     = Math.max(aCentavos(totalBruto) - descuentoCentavos, 0);
  const totalFinal        = desCentavos(totalCentavos);

  const sumaPagosCentavos = useMemo(
    () => pagos.reduce((s, p) => s + aCentavos(p.monto), 0),
    [pagos],
  );

  const faltanteCentavos = Math.max(totalCentavos - sumaPagosCentavos, 0);

  // Vuelto: solo si hay EFECTIVO y el monto_recibido supera el monto del pago en efectivo
  const vueltoCentavos = useMemo(() => {
    let totalRecibido = 0;
    let totalMontoEfectivo = 0;
    for (const p of pagos) {
      if (p.metodo === 'EFECTIVO') {
        totalMontoEfectivo += aCentavos(p.monto);
        totalRecibido += aCentavos(p.monto_recibido || p.monto);
      }
    }
    return Math.max(totalRecibido - totalMontoEfectivo, 0);
  }, [pagos]);

  const puedeConfirmar = items.length > 0
    && faltanteCentavos === 0
    && sumaPagosCentavos >= totalCentavos
    && !enviando;

  // ── Mutadores de pagos ───────────────────────────────────────────────────
  const actualizarPago = useCallback((idx, campo, valor) => {
    setPagos((prev) => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));
  }, []);

  const agregarPago = () => setPagos((prev) => [...prev, pagoVacio()]);

  const quitarPago = (idx) => setPagos((prev) => prev.filter((_, i) => i !== idx));

  const asignarRestante = (idx) => {
    const otrosCentavos = pagos.reduce((s, p, i) => (i !== idx ? s + aCentavos(p.monto) : s), 0);
    const restante = Math.max(totalCentavos - otrosCentavos, 0);
    actualizarPago(idx, 'monto', desCentavos(restante));
    if (pagos[idx].metodo === 'EFECTIVO') {
      actualizarPago(idx, 'monto_recibido', desCentavos(restante));
    }
  };

  const aplicarBillete = (idx, billete) => {
    if (billete.multiplicador === null) {
      // "Exacto": pone el monto_recibido igual al monto
      const monto = pagos[idx].monto || desCentavos(totalCentavos);
      actualizarPago(idx, 'monto_recibido', monto);
      if (!pagos[idx].monto) actualizarPago(idx, 'monto', monto);
    } else {
      actualizarPago(idx, 'monto_recibido', fmtStr(billete.valor));
    }
  };

  // ── Enviar al backend ────────────────────────────────────────────────────
  const confirmar = async () => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const payload = {
        id_turno: turnoActivo.id_turno,
        tipo_comprobante: tipoDocumento === 'CCF' ? 'CCF' : 'FCF',
        id_cliente: clienteSeleccionado?.id_cliente ?? null,
        descuento: fmtStr(descuento),
        items: items.map((i) => ({
          id_producto: i.id_producto,
          cantidad: i.cantidad,
          nota: null,
        })),
        pagos: pagos.map((p) => ({
          metodo: p.metodo,
          monto: fmtStr(p.monto),
          monto_recibido: p.metodo === 'EFECTIVO' && p.monto_recibido
            ? fmtStr(p.monto_recibido)
            : null,
          referencia: p.referencia?.trim() || null,
        })),
      };
      const venta = await registrarVenta(payload);
      onVentaExitosa?.({ ...venta, vuelto: desCentavos(vueltoCentavos) });
    } catch (err) {
      setErrorEnvio(traducirError(err));
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  return (
    <Dialogo onCerrar={enviando ? undefined : onCerrar} tamano="lg" labelledBy="titulo-cobro">
      <div className="p-5 sm:p-6">
        {/* ── Encabezado ── */}
        <h2 id="titulo-cobro" className="text-lg font-bold text-fg">Confirmar cobro</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {tipoDocumento === 'CCF' ? 'Crédito fiscal (CCF)' : 'Factura consumidor final (FCF)'}
          {clienteSeleccionado ? ` · ${clienteSeleccionado.nombre_razon_social}` : ' · Consumidor final'}
        </p>

        {/* ── Resumen ── */}
        <div className="mt-5 rounded-lg border border-line bg-muted/40 p-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</dt>
              <dd className="tabular-nums">{formatoMoneda(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">IVA ({IVA * 100}%)</dt>
              <dd className="tabular-nums">{formatoMoneda(iva)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-fg-muted">Descuento</dt>
              <dd>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input w-24 text-right text-sm !py-1"
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  placeholder="0.00"
                  aria-label="Descuento"
                />
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total a cobrar</dt>
              <dd className="tabular-nums">{formatoMoneda(Number(totalFinal))}</dd>
            </div>
          </dl>
        </div>

        {/* ── Pagos mixtos ── */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Forma de pago</h3>
            {pagos.length < 4 && (
              <button type="button" onClick={agregarPago} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-text hover:underline">
                <Plus size={14} /> Agregar método
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {pagos.map((pago, idx) => (
              <div key={idx} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center gap-2">
                  {/* Selector de método */}
                  <select
                    aria-label="Método de pago"
                    className="input flex-1 text-sm !py-1.5"
                    value={pago.metodo}
                    onChange={(e) => actualizarPago(idx, 'metodo', e.target.value)}
                  >
                    {METODOS.map((m) => (
                      <option key={m.valor} value={m.valor}>{m.texto}</option>
                    ))}
                  </select>

                  {/* Monto */}
                  <input
                    ref={idx === 0 ? primerInputRef : undefined}
                    type="text"
                    inputMode="decimal"
                    className="input w-28 text-right text-sm !py-1.5"
                    placeholder="0.00"
                    value={pago.monto}
                    onChange={(e) => actualizarPago(idx, 'monto', e.target.value)}
                    aria-label="Monto del pago"
                  />

                  {/* Botón restante */}
                  <button
                    type="button"
                    onClick={() => asignarRestante(idx)}
                    className="btn-ghost min-h-8 text-xs !px-2"
                    title="Asignar restante"
                  >
                    Todo
                  </button>

                  {/* Quitar */}
                  {pagos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarPago(idx)}
                      className="grid h-8 w-8 place-items-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"
                      aria-label="Quitar pago"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Efectivo: monto recibido y billetes rápidos */}
                {pago.metodo === 'EFECTIVO' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-fg-muted whitespace-nowrap">Recibe:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input w-28 text-right text-sm !py-1"
                        placeholder="0.00"
                        value={pago.monto_recibido}
                        onChange={(e) => actualizarPago(idx, 'monto_recibido', e.target.value)}
                        aria-label="Monto recibido del cliente"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {BILLETES.map((b) => (
                        <button
                          key={b.etiqueta}
                          type="button"
                          onClick={() => aplicarBillete(idx, b)}
                          className="rounded-md border border-line bg-muted/50 px-2.5 py-1 text-xs font-medium text-fg hover:bg-primary-soft hover:text-primary-text transition-colors"
                        >
                          {b.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarjeta/Transferencia/Bitcoin: referencia */}
                {pago.metodo !== 'EFECTIVO' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      className="input w-full text-sm !py-1"
                      placeholder="Referencia / últimos 4 dígitos"
                      value={pago.referencia}
                      onChange={(e) => actualizarPago(idx, 'referencia', e.target.value)}
                      aria-label="Referencia del pago"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Indicador faltante / vuelto ── */}
        <div className="mt-4 rounded-lg border border-line p-3 text-sm">
          {faltanteCentavos > 0 ? (
            <div className="flex items-center justify-between text-danger">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertCircle size={15} /> Falta por cubrir
              </span>
              <span className="font-bold tabular-nums">{formatoMoneda(Number(desCentavos(faltanteCentavos)))}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-success">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} /> Pago completo
              </span>
              {vueltoCentavos > 0 && (
                <span className="text-fg font-bold tabular-nums">
                  Vuelto: {formatoMoneda(Number(desCentavos(vueltoCentavos)))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Error de envío ── */}
        {errorEnvio && (
          <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {errorEnvio}
          </p>
        )}

        {/* ── Acciones ── */}
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
          <Button variante="ghost" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar}>
            {enviando ? 'Procesando…' : `Confirmar cobro ${formatoMoneda(Number(totalFinal))}`}
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}

