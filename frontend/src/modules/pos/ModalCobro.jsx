import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CreditCard, Banknote, Smartphone, ArrowRightLeft, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { calcularTotales, formatoMoneda, IVA } from './impuestos.js';
import { itemsParaVenta } from './carritoReducer.js';
import { registrarVenta } from './posApi.js';
import { REFERENCIAS_PAGO, validarReferenciaPago } from '../../utils/mascaras.js';
import PagoTransferencia from './pagosSimulados/PagoTransferencia.jsx';
import PagoTarjeta from './pagosSimulados/PagoTarjeta.jsx';
import { generarReferenciaCobro } from './pagosSimulados/transferencia.js';

// Tarjeta y transferencia son SIMULADAS (ver pagosSimulados/): cada línea debe confirmarse en su panel.
const METODOS_SIMULADOS = new Set(['TARJETA', 'TRANSFERENCIA']);
const camposSimulacionVacios = { confirmado: false, excedenteAceptado: false, tarjeta: null };

// ── Constantes ────────────────────────────────────────────────────────────────
const METODOS = [
  { valor: 'EFECTIVO', texto: 'Efectivo', icono: Banknote },
  { valor: 'TARJETA', texto: 'Tarjeta', icono: CreditCard },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia', icono: ArrowRightLeft },
  { valor: 'BITCOIN_CHIVO', texto: 'Bitcoin/Chivo', icono: Smartphone },
];

const BILLETES = [
  { etiqueta: 'Exacto', multiplicador: null },
  { etiqueta: '$1', valor: 1 },
  { etiqueta: '$5', valor: 5 },
  { etiqueta: '$10', valor: 10 },
  { etiqueta: '$20', valor: 20 },
  { etiqueta: '$50', valor: 50 },
  { etiqueta: '$100', valor: 100 },
];

// Dinero: nunca float. Operamos con centavos (enteros) y convertimos a string "0.00".
const aCentavos = (n) => Math.round((Number(n) || 0) * 100);
const desCentavos = (c) => (c / 100).toFixed(2);
const fmtStr = (n) => (Number(n) || 0).toFixed(2);

// Utilidad para limpiar y formatear entradas numéricas de dinero automáticamente con ceros (ej: "5" -> "0.05" o manejado como centavos)
const formatearEntradaDinero = (valorRaw) => {
  const limpio = String(valorRaw ?? '').replace(/[^\d]/g, '');
  if (!limpio) return '';
  const centavos = parseInt(limpio, 10);
  return (centavos / 100).toFixed(2);
};

// Utilidad para limpiar y validar porcentaje sin usar parseFloat (cumpliendo regla anti-float)
const formatearEntradaPorcentaje = (valorRaw) => {
  const limpio = String(valorRaw ?? '').replace(/[^\d]/g, ''); // Solo números enteros para el porcentaje
  if (!limpio) return '';
  const num = Number(limpio);
  if (num > 100) return '100';
  return String(num);
};

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
  const { notificarError } = useAlert();
  const [pagos, setPagos] = useState([pagoVacio()]);
  const [porcentajeDesc, setPorcentajeDesc] = useState(''); // Descuento por porcentaje (ej: '10' para 10%)
  const [enviando, setEnviando] = useState(false);
  const primerInputRef = useRef(null);

  // ── Resetear pagos al abrir con el monto total por defecto ─────────────
  useEffect(() => {
    if (abierto) {
      const { total: totalBruto } = calcularTotales(items);
      const inicial = fmtStr(totalBruto);
      setPagos([{ metodo: 'EFECTIVO', monto: inicial, monto_recibido: inicial, referencia: '' }]);
      setPorcentajeDesc('');
      setEnviando(false);
    }
  }, [abierto, items]);

  // ── Cálculos derivados (totales, faltante, vuelto) ───────────────────────
  const { subtotal, iva, total: totalBruto } = calcularTotales(items);

  // Cálculo del descuento monetario basado en el porcentaje ingresado sobre el subtotal (o total bruto)
  const descPorcentajeNum = Number(porcentajeDesc) || 0;
  const descuentoCentavos = Math.round(aCentavos(subtotal) * (descPorcentajeNum / 100));
  const descuentoEfectivoStr = desCentavos(descuentoCentavos);

  const totalCentavos = Math.max(aCentavos(totalBruto) - descuentoCentavos, 0);
  const totalFinal = desCentavos(totalCentavos);

  const sumaPagosCentavos = useMemo(
    () => pagos.reduce((s, p) => s + aCentavos(p.monto), 0),
    [pagos],
  );

  const faltanteCentavos = Math.max(totalCentavos - sumaPagosCentavos, 0);
  const sobranteCentavos = Math.max(sumaPagosCentavos - totalCentavos, 0);

  // Vuelto: solo si hay EFECTIVO y el monto_recibido supera el monto del pago en efectivo
  const vueltoCentavos = useMemo(() => {
    let totalMontoEfectivo = 0;
    let totalRecibido = 0;
    for (const p of pagos) {
      if (p.metodo === 'EFECTIVO') {
        totalMontoEfectivo += aCentavos(p.monto);
        totalRecibido += aCentavos(p.monto_recibido || p.monto);
      }
    }
    return Math.max(totalRecibido - totalMontoEfectivo, 0);
  }, [pagos]);

  // Cada pago no en efectivo necesita su comprobante con el formato del método.
  const erroresReferencia = useMemo(
    () => pagos.map((p) => validarReferenciaPago(p.metodo, p.referencia)),
    [pagos],
  );

  const lineasSimuladasConfirmadas = pagos.every((p) => !METODOS_SIMULADOS.has(p.metodo) || p.confirmado);

  const puedeConfirmar = items.length > 0
    && lineasSimuladasConfirmadas
    && erroresReferencia.every((e) => !e)
    && faltanteCentavos === 0
    && sobranteCentavos === 0
    && sumaPagosCentavos === totalCentavos
    && !enviando;

  // ── Mutadores de pagos con formateo automático de ceros ───────────────────
  const actualizarPago = useCallback((idx, campo, valor) => {
    setPagos((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      if (campo === 'monto') {
        const monto = formatearEntradaDinero(valor);
        if (!METODOS_SIMULADOS.has(p.metodo)) return { ...p, monto };
        // Cambiar el monto invalida la autorización simulada; en transferencia el monto pagado
        // sigue al aplicado mientras el cajero no lo haya editado.
        const sigue = p.metodo === 'TRANSFERENCIA' && p.monto_recibido === p.monto;
        return {
          ...p,
          ...camposSimulacionVacios,
          monto,
          referencia: p.metodo === 'TARJETA' ? '' : p.referencia,
          monto_recibido: sigue ? monto : p.monto_recibido,
        };
      }
      if (campo === 'monto_recibido') return { ...p, monto_recibido: formatearEntradaDinero(valor) };
      // Al cambiar de método el comprobante anterior ya no aplica (cada uno tiene su formato).
      if (campo === 'metodo' && valor !== p.metodo) {
        return {
          ...p,
          ...camposSimulacionVacios,
          metodo: valor,
          referencia: '',
          monto_recibido: valor === 'TRANSFERENCIA' ? p.monto : (valor === 'EFECTIVO' ? p.monto_recibido : ''),
          refCobro: valor === 'TRANSFERENCIA' ? generarReferenciaCobro() : undefined,
        };
      }
      return { ...p, [campo]: valor };
    }));
  }, []);

  // Parche directo (paneles simulados): sus valores ya vienen validados/enmascarados.
  const parchearPago = useCallback((idx, parche) => {
    setPagos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...parche } : p)));
  }, []);

  const agregarPago = () => {
    const restante = Math.max(totalCentavos - sumaPagosCentavos, 0);
    setPagos((prev) => [
      ...prev,
      {
        metodo: 'TARJETA',
        monto: restante > 0 ? desCentavos(restante) : '',
        monto_recibido: '',
        referencia: '',
      },
    ]);
  };

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
    try {
      const payload = {
        id_turno: turnoActivo.id_turno,
        tipo_comprobante: tipoDocumento === 'CCF' ? 'CCF' : 'FCF',
        id_cliente: clienteSeleccionado?.id_cliente ?? null,
        descuento: descuentoEfectivoStr,
        items: itemsParaVenta(items),
        pagos: pagos.map((p) => ({
          metodo: p.metodo,
          monto: fmtStr(p.monto),
          // Efectivo: lo entregado (vuelto). Transferencia: lo transferido (excedente, no es vuelto).
          monto_recibido: (p.metodo === 'EFECTIVO' || p.metodo === 'TRANSFERENCIA') && p.monto_recibido
            ? fmtStr(p.monto_recibido)
            : null,
          referencia: p.referencia?.trim() || null,
          // Solo datos no sensibles: nunca número completo, CVV ni vencimiento.
          ...(METODOS_SIMULADOS.has(p.metodo) ? { simulado: true } : {}),
          ...(p.metodo === 'TARJETA' && p.tarjeta ? { tarjeta: { marca: p.tarjeta.marca, ultimos4: p.tarjeta.ultimos4 } } : {}),
        })),
      };
      const venta = await registrarVenta(payload);
      onVentaExitosa?.({ ...venta, vuelto: desCentavos(vueltoCentavos) });
    } catch (err) {
      notificarError(err);
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  return (
    <Dialogo onCerrar={enviando ? undefined : onCerrar} tamano="lg" labelledBy="titulo-cobro">
      <div className="p-5 sm:p-6">
        {/* ── Encabezado ── */}
        <h2 id="titulo-cobro" className="text-h3 text-fg">Confirmar cobro</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          {tipoDocumento === 'CCF' ? 'Crédito fiscal (CCF)' : 'Factura consumidor final (FCF)'}
          {clienteSeleccionado ? ` · ${clienteSeleccionado.nombre_razon_social}` : ' · Consumidor final'}
        </p>

        <p className="mt-4 text-kpi tabular-nums text-fg">{formatoMoneda(Number(totalFinal))}</p>

        {/* ── Resumen ── */}
        <div className="mt-3 rounded-md border border-line p-4">
          <dl className="space-y-1 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</dt>
              <dd className="tabular-nums">{formatoMoneda(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">IVA ({IVA * 100}%)</dt>
              <dd className="tabular-nums">{formatoMoneda(iva)}</dd>
            </div>

            {/* Descuento por porcentaje */}
            <div className="flex items-center justify-between gap-2">
              <dt className="text-fg-muted flex items-center gap-1">
                Descuento (%)
                {descuentoCentavos > 0 && (
                  <span className="text-label-sm text-success-text tabular-nums">(-{formatoMoneda(Number(descuentoEfectivoStr))})</span>
                )}
              </dt>
              <dd className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="input w-20 text-right tabular-nums"
                  value={porcentajeDesc}
                  onChange={(e) => setPorcentajeDesc(formatearEntradaPorcentaje(e.target.value))}
                  placeholder="0"
                  aria-label="Porcentaje de descuento"
                />
                <span className="text-xs text-fg-muted">%</span>
              </dd>
            </div>

            <div className="flex justify-between border-t border-line pt-2 text-label text-fg">
              <dt>Total a cobrar</dt>
              <dd className="tabular-nums">{formatoMoneda(Number(totalFinal))}</dd>
            </div>
          </dl>
        </div>

        {/* ── Pagos mixtos ── */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-label text-fg">Forma de pago</h3>
            {pagos.length < 4 && (
              <button type="button" onClick={agregarPago} className="btn-ghost btn-sm">
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Agregar método
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {pagos.map((pago, idx) => (
              <div key={idx} className="rounded-md border border-line bg-surface p-3">
                {/* Selector de método: control segmentado */}
                <div className="mb-2 flex flex-wrap gap-1 rounded-md bg-muted p-1" role="group" aria-label="Método de pago">
                  {METODOS.map((m) => (
                    <button key={m.valor} type="button" aria-pressed={pago.metodo === m.valor}
                      onClick={() => actualizarPago(idx, 'metodo', m.valor)}
                      className={`h-control-sm flex-1 rounded-sm px-2.5 text-label-sm transition-colors ${pago.metodo === m.valor ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}>
                      {m.texto}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-label-sm text-fg-muted">Monto</span>

                  {/* Monto (con autocompletado de ceros) */}
                  <input
                    ref={idx === 0 ? primerInputRef : undefined}
                    type="text"
                    inputMode="decimal"
                    className="input w-28 text-right tabular-nums"
                    placeholder="0.00"
                    value={pago.monto}
                    onChange={(e) => actualizarPago(idx, 'monto', e.target.value)}
                    aria-label="Monto del pago"
                  />

                  {/* Botón restante */}
                  <button
                    type="button"
                    onClick={() => asignarRestante(idx)}
                    className="btn-ghost btn-sm"
                    title="Asignar restante"
                  >
                    Todo
                  </button>

                  {/* Quitar */}
                  {pagos.length > 1 && (
                    <BotonIcono icono={ICONOS.eliminar} tono="peligro" etiqueta="Quitar pago" onClick={() => quitarPago(idx)} />
                  )}
                </div>

                {/* Efectivo: monto recibido y billetes rápidos */}
                {pago.metodo === 'EFECTIVO' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 text-label-sm text-fg-muted whitespace-nowrap">Recibe:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input w-28 text-right tabular-nums"
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
                          className="h-control-sm rounded-full border border-line px-3 text-label-sm tabular-nums text-fg transition-colors hover:border-primary/40"
                        >
                          {b.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {pago.metodo === 'TRANSFERENCIA' && (
                  <PagoTransferencia
                    pago={pago}
                    idx={idx}
                    sucursal={turnoActivo?.sucursal}
                    onCambiar={(parche) => parchearPago(idx, parche)}
                  />
                )}
                {pago.metodo === 'TARJETA' && (
                  <PagoTarjeta
                    pago={pago}
                    idx={idx}
                    onAprobado={({ marca, ultimos4, autorizacion }) => parchearPago(idx, {
                      confirmado: true, referencia: autorizacion, tarjeta: { marca, ultimos4 },
                    })}
                    onReiniciar={() => parchearPago(idx, { ...camposSimulacionVacios, referencia: '' })}
                  />
                )}

                {/* Bitcoin/Chivo: comprobante con formato propio (tarjeta y transferencia usan sus paneles) */}
                {REFERENCIAS_PAGO[pago.metodo] && !METODOS_SIMULADOS.has(pago.metodo) && (() => {
                  const cfg = REFERENCIAS_PAGO[pago.metodo];
                  const idCampo = `referencia-pago-${idx}`;
                  const error = pago.referencia ? erroresReferencia[idx] : '';
                  return (
                    <div className="mt-2">
                      <label htmlFor={idCampo} className="mb-1 block text-label-sm text-fg-muted">
                        {cfg.etiqueta} <span className="text-danger-text">*</span>
                      </label>
                      <input
                        id={idCampo}
                        type="text"
                        inputMode={cfg.inputMode}
                        maxLength={cfg.maxLength}
                        autoComplete="off"
                        spellCheck={false}
                        className={`input w-full ${pago.metodo === 'BITCOIN_CHIVO' ? 'font-mono' : ''}`}
                        placeholder={cfg.placeholder}
                        value={pago.referencia}
                        onChange={(e) => actualizarPago(idx, 'referencia', cfg.aplicar(e.target.value))}
                        aria-invalid={error ? 'true' : undefined}
                        aria-describedby={error ? `${idCampo}-error` : undefined}
                      />
                      {error && (
                        <p id={`${idCampo}-error`} className="mt-1 text-label-sm text-danger-text">{error}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* ── Indicador faltante / vuelto ── */}
        <div className="mt-4 rounded-md bg-muted p-4 text-body-sm" aria-live="polite">
          {faltanteCentavos > 0 ? (
            <div className="flex items-center justify-between text-danger-text">
              <span className="flex items-center gap-1.5 text-label">
                <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Falta por cubrir
              </span>
              <span className="text-h3 tabular-nums">{formatoMoneda(Number(desCentavos(faltanteCentavos)))}</span>
            </div>
          ) : !lineasSimuladasConfirmadas ? (
            <div className="flex items-center gap-1.5 text-label text-warning-text">
              <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Confirma el pago con tarjeta o transferencia
            </div>
          ) : sobranteCentavos > 0 ? (
            <div className="flex items-center justify-between text-danger-text">
              <span className="flex items-center gap-1.5 text-label">
                <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Montos exceden el total
              </span>
              <span className="text-h3 tabular-nums">+{formatoMoneda(Number(desCentavos(sobranteCentavos)))}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-success-text">
              <span className="flex items-center gap-1.5 text-label">
                <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" /> Pago completo
              </span>
              {vueltoCentavos > 0 && (
                <span className="text-h3 tabular-nums text-fg">
                  Vuelto: {formatoMoneda(Number(desCentavos(vueltoCentavos)))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Acciones ── */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variante="ghost" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar} cargando={enviando}>
            {enviando ? 'Procesando…' : `Confirmar cobro ${formatoMoneda(Number(totalFinal))}`}
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}