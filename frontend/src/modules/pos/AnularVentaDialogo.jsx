import { useRef, useState } from 'react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import { anularVenta } from './posApi.js';

// Confirmación de anulación con motivo obligatorio (5–255 caracteres, igual que el esquema Zod del backend).
// La reversión de stock y caja la hace pos.fn_anular_venta; aquí solo se captura el motivo.
const ID_MOTIVO = 'anular-venta-motivo';

export default function AnularVentaDialogo({ venta, onCerrar, onAnulada }) {
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
      await anularVenta(venta.id_venta, texto);
      onAnulada();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo onCerrar={enviando ? () => {} : onCerrar} rol="alertdialog" tamano="sm"
      labelledBy="titulo-anular-venta" describedBy="desc-anular-venta" enfoqueInicial={motivoRef}>
      <form onSubmit={confirmar} noValidate>
        <div className="space-y-4 px-6 py-5">
          <h2 id="titulo-anular-venta" className="text-h3 text-fg">
            ¿Anular {venta.tipo_comprobante} #{venta.correlativo}?
          </h2>
          <p id="desc-anular-venta" className="text-body-sm text-fg-muted">
            Se revierte el inventario y el movimiento de caja por <strong className="font-medium text-fg tabular-nums">${venta.total}</strong>.
            Esta acción no se puede deshacer.
          </p>
          <div className="space-y-1.5">
            <label htmlFor={ID_MOTIVO} className="text-label text-fg">Motivo de anulación</label>
            <textarea id={ID_MOTIVO} ref={motivoRef} rows={3} maxLength={255}
              className={`input resize-y aria-invalid:border-danger`}
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(error)} aria-describedby={error ? idError(ID_MOTIVO) : undefined}
              placeholder="Ej.: error en el cobro, el cliente devolvió el pedido" />
            <CampoError id={ID_MOTIVO} mensaje={error} />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variante="ghost" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
          <Button type="submit" variante="danger" cargando={enviando}>Anular venta</Button>
        </div>
      </form>
    </Dialogo>
  );
}
