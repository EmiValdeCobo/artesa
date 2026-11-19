import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { Button, Select } from '../../components/ui/index.js';
import { registrarPago } from './comprasApi.js';

const dinero = (valor) => `$${String(valor ?? '0.00')}`;
function aCentavos(valor) {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(valor ?? '').trim());
  return partes ? BigInt(partes[1]) * 100n + BigInt((partes[2] ?? '').padEnd(2, '0')) : null;
}

export default function PagoDialogo({ factura, cerrar, onPagado }) {
  const { notificar, notificarError } = useAlert();
  const [monto, setMonto] = useState(factura?.saldo ?? '');
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const montoCentavos = aCentavos(monto);
    const saldoCentavos = aCentavos(factura.saldo);
    if (montoCentavos == null || montoCentavos <= 0n) {
      notificar.advertencia('Monto inválido', { mensaje: 'Ingresa un monto de abono mayor a $0.00, con hasta dos decimales.' });
      return;
    }
    if (saldoCentavos == null || montoCentavos > saldoCentavos) {
      notificar.advertencia('Monto excede el saldo', { mensaje: `El abono no puede superar el saldo pendiente de ${dinero(factura.saldo)}.` });
      return;
    }
    setGuardando(true);
    try {
      await registrarPago(factura.id_compra, { monto, metodo, referencia: referencia.trim() || null });
      notificar.exito('Abono registrado', { mensaje: `Se registró el abono de ${dinero(monto)} a ${factura.proveedor}.` });
      onPagado();
    } catch (err) {
      notificarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo onCerrar={() => !guardando && cerrar()} tamano="sm" labelledBy="pago-titulo">
      <div className="px-6 pt-6">
        <h2 id="pago-titulo" className="text-h3">Registrar abono</h2>
        <p className="mt-1 text-body text-fg-muted">{factura.proveedor} · Factura {factura.num_factura}</p>
      </div>
      <form onSubmit={enviar}>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-md bg-muted p-3 text-body"><div className="flex justify-between"><span className="text-fg-muted">Saldo pendiente</span><strong className="tabular-nums">{dinero(factura.saldo)}</strong></div></div>
          <label className="flex flex-col text-label">Monto del abono
            <input className="input mt-1.5 h-10 text-right tabular-nums" type="number" min="0.01" step="0.01" max={factura.saldo} value={monto} onChange={(evento) => setMonto(evento.target.value)} required />
            <span className="mt-1 block text-body-sm font-normal text-fg-muted">No puede superar el saldo pendiente.</span>
          </label>
          <Select etiqueta="Método" value={metodo} onChange={(evento) => setMetodo(evento.target.value)} opciones={[
            { valor: 'EFECTIVO', texto: 'Efectivo' }, { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
            { valor: 'CHEQUE', texto: 'Cheque' }, { valor: 'TARJETA', texto: 'Tarjeta' },
          ]} />
          <label className="flex flex-col text-label">Referencia <span className="font-normal text-fg-muted">(opcional)</span>
            <input className="input mt-1.5 h-10" maxLength={100} value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <Button variante="ghost" onClick={cerrar}>Cancelar</Button>
          <Button type="submit" icono={CreditCard} cargando={guardando}>Registrar abono</Button>
        </div>
      </form>
    </Dialogo>
  );
}
