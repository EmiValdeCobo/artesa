import { useRef, useState } from 'react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import { preparacionApi } from '../../api/preparacion.api.js';

// Cancelar un pedido en estado Nueva: el motivo es obligatorio (5–200, igual que anularOrdenSchema).
// Si el pedido ya se cobró, el backend anula también la venta (requiere POS_ANULAR_VENTA).
const ID_MOTIVO = 'cancelar-pedido-motivo';

export default function CancelarPedidoDialogo({ orden, onCerrar, onCancelado }) {
  const motivoRef = useRef(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async (e) => {
    e.preventDefault();
    const texto = motivo.trim();
    if (texto.length < 5) {
      setError('Escribe un motivo de al menos 5 caracteres.');
      motivoRef.current?.focus();
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const resultado = await preparacionApi.anularOrden(orden.id_orden, texto);
      onCancelado(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo onCerrar={enviando ? () => {} : onCerrar} rol="alertdialog" tamano="sm"
      labelledBy="titulo-cancelar-pedido" describedBy="desc-cancelar-pedido" enfoqueInicial={motivoRef}>
      <form onSubmit={confirmar} noValidate>
        <div className="space-y-4 px-6 py-5">
          <h2 id="titulo-cancelar-pedido" className="text-h3 text-fg">
            ¿Cancelar el pedido #{orden.id_orden}?
          </h2>
          <p id="desc-cancelar-pedido" className="text-body-sm text-fg-muted">
            {orden.pagada
              ? 'Este pedido ya se cobró: al cancelarlo se anula también su venta y se revierte el inventario.'
              : 'El pedido saldrá de la cola de preparación.'}{' '}
            Esta acción no se puede deshacer.
          </p>
          <div className="space-y-1.5">
            <label htmlFor={ID_MOTIVO} className="text-label text-fg">Motivo de cancelación</label>
            <textarea id={ID_MOTIVO} ref={motivoRef} rows={3} maxLength={200}
              className="input resize-y aria-invalid:border-danger"
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(error)} aria-describedby={error ? idError(ID_MOTIVO) : undefined}
              placeholder="Ej.: el cliente se retiró, producto agotado" />
            <CampoError id={ID_MOTIVO} mensaje={error} />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variante="ghost" onClick={onCerrar} disabled={enviando}>Volver</Button>
          <Button type="submit" variante="danger" cargando={enviando}>Cancelar pedido</Button>
        </div>
      </form>
    </Dialogo>
  );
}
