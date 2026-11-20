import { useEffect, useState } from 'react';
import { CreditCard, X } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { SkeletonTexto } from '../../components/feedback/Skeleton.jsx';
import { BotonIcono, Button, Table } from '../../components/ui/index.js';
import { eliminarFactura, obtenerFactura } from './comprasApi.js';

const dinero = (valor) => `$${String(valor ?? '0.00')}`;
const DOCUMENTOS = { CCF: 'Crédito fiscal (CCF)', CF: 'Consumidor final (CF)', FSE: 'Sujeto excluido (FSE)' };
const METODOS = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', CHEQUE: 'Cheque', TARJETA: 'Tarjeta' };
// Cantidades NUMERIC(12,4) llegan como "750.0000": se muestran sin ceros de relleno, sin pasar por float.
const cantidad = (valor) => String(valor ?? '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

export function EstadoFactura({ factura }) {
  if (factura.estado_pago === 'PAGADO') return <EstadoBadge tipo="exito">Pagada</EstadoBadge>;
  if (Number(factura.dias_vencida) > 0) return <EstadoBadge tipo="error">Vencida · {factura.dias_vencida} d</EstadoBadge>;
  if (factura.estado_pago === 'PARCIAL') return <EstadoBadge tipo="info">Pago parcial</EstadoBadge>;
  return <EstadoBadge tipo="alerta">Pendiente</EstadoBadge>;
}

// Confirmación + eliminación lógica. El backend vuelve a validar COM_ELIMINAR_FACTURA (solo ADMIN).
export function useEliminarFactura(onEliminada) {
  const { confirm, notificar, notificarError } = useAlert();
  return async function eliminar(factura) {
    const inventario = factura.tipo_costo === 'COSTO'
      ? ' Las cantidades que ingresó se descontarán del inventario de la sucursal.'
      : '';
    const ok = await confirm(
      `Proveedor: ${factura.proveedor}\nFactura: ${factura.num_factura}\nMonto: ${dinero(factura.total)}\n\nLa factura y sus abonos dejarán de contar en saldos y reportes.${inventario} Quedará registrada en la bitácora.`,
      { titulo: 'Eliminar factura', etiquetaAceptar: 'Eliminar factura', destructivo: true },
    );
    if (!ok) return false;
    try {
      await eliminarFactura(factura.id_compra);
      notificar.exito('Factura eliminada', { mensaje: `Se eliminó la factura ${factura.num_factura} de ${factura.proveedor}.` });
      onEliminada?.(factura);
      return true;
    } catch (err) {
      notificarError(err);
      return false;
    }
  };
}

function Dato({ etiqueta, children }) {
  return <div className="min-w-0"><dt className="text-body-sm text-fg-muted">{etiqueta}</dt><dd className="mt-0.5 break-words font-medium">{children}</dd></div>;
}

export default function DetalleFacturaDialogo({ idCompra, cerrar, puedePagar = false, onAbonar }) {
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setFactura(null);
    setError(null);
    obtenerFactura(idCompra)
      .then((datos) => { if (vivo) setFactura(datos); })
      .catch((err) => { if (vivo) setError(err.message); });
    return () => { vivo = false; };
  }, [idCompra]);

  const gasto = factura?.tipo_costo === 'GASTO';
  const columnas = [
    { clave: 'concepto', titulo: gasto ? 'Concepto' : 'Producto', tipo: 'texto', ordenable: false, render: (l) => <span className="font-medium">{l.concepto}</span> },
    { clave: 'cantidad', titulo: 'Cantidad', alinear: 'right', ordenable: false, render: (l) => `${cantidad(l.cantidad)}${l.unidad ? ` ${l.unidad}` : ''}` },
    { clave: 'costo_unitario', titulo: 'Costo unit. (c/IVA)', alinear: 'right', ordenable: false, render: (l) => dinero(l.costo_unitario) },
    { clave: 'subtotal', titulo: 'Subtotal', alinear: 'right', ordenable: false, render: (l) => dinero(l.subtotal) },
    { clave: 'iva', titulo: 'IVA', alinear: 'right', ordenable: false, render: (l) => dinero(l.iva) },
    { clave: 'total', titulo: 'Total', alinear: 'right', ordenable: false, render: (l) => <span className="font-semibold">{dinero(l.total)}</span> },
  ];
  const puedeAbonar = puedePagar && onAbonar && factura && factura.estado_pago !== 'PAGADO';

  return (
    <Dialogo onCerrar={cerrar} tamano="xl" labelledBy="detalle-factura-titulo">
      <div className="flex items-start justify-between gap-3 px-6 pt-6">
        <div className="min-w-0">
          <h2 id="detalle-factura-titulo" className="text-h3">Factura {factura?.num_factura ?? ''}</h2>
          <p className="mt-1 text-body text-fg-muted">{factura ? `${factura.proveedor} · ${gasto ? 'Gasto operativo' : 'Compra de insumos'}` : 'Cargando detalle…'}</p>
        </div>
        <BotonIcono icono={X} etiqueta="Cerrar detalle" titulo="Cerrar" onClick={cerrar} />
      </div>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
        {error && <BannerError error={{ titulo: 'No se pudo cargar la factura', mensaje: error, accion: '' }} />}
        {!factura && !error && <SkeletonTexto lineas={6} texto="Cargando detalle de la factura…" />}
        {factura && (
          <>
            <dl className="grid grid-cols-2 gap-4 text-body sm:grid-cols-3">
              <Dato etiqueta="Proveedor">{factura.proveedor}</Dato>
              <Dato etiqueta="Sucursal">{factura.sucursal}</Dato>
              <Dato etiqueta="N.º de factura">{factura.num_factura}</Dato>
              <Dato etiqueta="Tipo de documento">{DOCUMENTOS[factura.tipo_documento] ?? factura.tipo_documento}</Dato>
              <Dato etiqueta="Emisión">{factura.fecha_emision}</Dato>
              <Dato etiqueta="Vencimiento">{factura.fecha_vencimiento} · {factura.condicion_pago === 'CREDITO' ? 'Crédito' : 'Contado'}</Dato>
              <Dato etiqueta="Estado"><EstadoFactura factura={factura} /></Dato>
            </dl>

            <section aria-labelledby="detalle-lineas">
              <h3 id="detalle-lineas" className="mb-2 text-body-lg font-semibold">{gasto ? 'Conceptos' : 'Productos comprados'}</h3>
              {factura.lineas.length
                ? <div className="overflow-hidden rounded-md border border-line"><Table columnas={columnas} filas={factura.lineas} idFila="id_detalle" paginacion={false} etiqueta="Líneas de la factura" pie={{ concepto: 'Total', subtotal: dinero(factura.subtotal), iva: dinero(factura.iva), total: dinero(factura.total) }} /></div>
                : <p className="rounded-md bg-muted p-3 text-body">Factura sin líneas registradas · Monto {dinero(factura.total)}</p>}
            </section>

            <section aria-labelledby="detalle-pagos" className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
              <div>
                <h3 id="detalle-pagos" className="mb-2 text-body-lg font-semibold">Pagos</h3>
                <dl className="space-y-1.5 rounded-md bg-muted p-3 text-body">
                  <div className="flex justify-between gap-3"><dt className="text-fg-muted">Total</dt><dd className="tabular-nums">{dinero(factura.total)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-fg-muted">Abonado</dt><dd className="tabular-nums">{dinero(factura.pagado)}</dd></div>
                  <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold"><dt>Saldo</dt><dd className="tabular-nums">{dinero(factura.saldo)}</dd></div>
                </dl>
              </div>
              <div className="min-w-0">
                <h4 className="mb-2 text-body font-medium text-fg-muted">Historial de abonos</h4>
                {factura.abonos.length ? (
                  <ul className="divide-y divide-line rounded-md border border-line text-body">
                    {factura.abonos.map((abono) => (
                      <li key={abono.id_pago} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="tabular-nums">{abono.fecha_pago}</span>
                        <span className="text-fg-muted">{METODOS[abono.metodo] ?? abono.metodo}{abono.referencia ? ` · ${abono.referencia}` : ''}</span>
                        <span className="font-medium tabular-nums">{dinero(abono.monto)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="rounded-md border border-dashed border-line p-3 text-body text-fg-muted">Aún no hay abonos registrados.</p>}
              </div>
            </section>
          </>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
        <Button variante="ghost" onClick={cerrar}>Cerrar</Button>
        {puedeAbonar && <Button icono={CreditCard} onClick={() => onAbonar(factura)}>Registrar abono</Button>}
      </div>
    </Dialogo>
  );
}
