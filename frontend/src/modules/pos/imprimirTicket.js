import { detallePago } from './pagosSimulados/describirPago.js';

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const NOMBRE_METODO = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', BITCOIN_CHIVO: 'Bitcoin / Chivo' };
const ETIQUETA_REFERENCIA = { TARJETA: 'Autorización', TRANSFERENCIA: 'Ref. bancaria', BITCOIN_CHIVO: 'ID transacción' };
// Los hash Lightning son largos: el ticket muestra inicio…fin; el valor completo queda en pos.pagos.referencia.
const abreviarReferencia = (ref) => (ref.length > 24 ? `${ref.slice(0, 12)}…${ref.slice(-8)}` : ref);

export function abrirVentanaImpresion(venta, { esReimpresion = false } = {}) {
  const ancho = 780;
  const alto = 680;
  const left = Math.max(0, Math.round((window.screen.width - ancho) / 2));
  const top = Math.max(0, Math.round((window.screen.height - alto) / 2));

  const ventana = window.open(
    '',
    '_blank',
    `width=${ancho},height=${alto},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
  if (!ventana) return;

  const fecha = venta.fecha_emision
    ? new Date(venta.fecha_emision).toLocaleString('es-SV')
    : new Date().toLocaleString('es-SV');

  const detalles = venta.detalles ?? [];
  const pagos = venta.pagos ?? [];

  // Cálculo dinámico de altura en mm para que Chrome recorte perfectamente el ticket térmico de 80mm
  const alturaBaseMm = 120;
  const alturaItemsMm = detalles.reduce((acc, d) => acc + (d.nota ? 10 : 6), 0);
  const alturaPagosMm = pagos.length > 0 ? 10 + pagos.length * 6 : 0;
  const alturaExtraClienteMm =
    (venta.nrc ? 5 : 0) +
    (venta.giro_economico ? 6 : 0) +
    (venta.cliente_direccion ? 7 : 0);

  const alturaTotalMm = Math.max(
    130,
    Math.ceil(alturaBaseMm + alturaItemsMm + alturaPagosMm + alturaExtraClienteMm),
  );

  const filasItems = detalles
    .map(
      (d) => `
        <tr>
          <td style="padding:3px 0; vertical-align:top;${d.id_detalle_padre ? ' padding-left:10px;' : ''}">
            ${d.id_detalle_padre ? '+ ' : `${escaparHtml(d.cantidad)}x `}${escaparHtml(d.nombre_producto)}
            ${d.nota ? `<div style="font-size:10px;color:#555;">(${escaparHtml(d.nota)})</div>` : ''}
          </td>
          <td style="padding:3px 0; text-align:right; vertical-align:top; white-space:nowrap;">
            $${escaparHtml(d.subtotal_linea)}
          </td>
        </tr>`,
    )
    .join('');

  const filasPagos = pagos
    .map((p) => {
      const montoNum = Number(p.monto ?? 0);
      const recibidoNum = p.monto_recibido != null ? Number(p.monto_recibido) : null;
      const vuelto =
        p.metodo === 'EFECTIVO' && recibidoNum != null && recibidoNum > montoNum
          ? (recibidoNum - montoNum).toFixed(2)
          : null;

      return `
        <div style="margin-bottom:3px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;">
            <span>${escaparHtml(NOMBRE_METODO[p.metodo] ?? p.metodo)}${p.simulado ? ' (simulado)' : ''}</span>
            <span>$${escaparHtml(p.monto)}</span>
          </div>
          ${
            p.metodo === 'TARJETA' && p.ultimos4
              ? `<div style="font-size:10px;color:#444;">${escaparHtml(detallePago(p))}</div>`
              : p.referencia
              ? `<div style="font-size:10px;color:#444;word-break:break-all;">${escaparHtml(ETIQUETA_REFERENCIA[p.metodo] ?? 'Ref.')}: ${escaparHtml(abreviarReferencia(p.referencia))}</div>`
              : ''
          }
          ${
            p.metodo === 'TRANSFERENCIA' && recibidoNum != null && recibidoNum > montoNum
              ? `<div style="font-size:10px;color:#444;">Transferido: $${escaparHtml(recibidoNum.toFixed(2))} (excedente, sin vuelto)</div>`
              : ''
          }
          ${
            recibidoNum != null && p.metodo === 'EFECTIVO'
              ? `<div style="display:flex;justify-content:space-between;font-size:10px;color:#444;">
                   <span>Recibido: $${escaparHtml(Number(recibidoNum).toFixed(2))}</span>
                   ${vuelto ? `<span>Vuelto: $${escaparHtml(vuelto)}</span>` : ''}
                 </div>`
              : ''
          }
        </div>`;
    })
    .join('');

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}</title>
        <style>
          @page {
            size: 80mm ${alturaTotalMm}mm;
            margin: 0mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
            padding: 16px;
            background: #f3f4f6;
            color: #111;
            font-size: 11.5px;
            line-height: 1.3;
          }
          .ticket {
            width: 80mm;
            margin: 0 auto;
            background: #fff;
            padding: 3mm 4mm;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
          }
          @media print {
            @page {
              size: 80mm ${alturaTotalMm}mm;
              margin: 0;
            }
            html, body {
              width: 80mm;
              height: ${alturaTotalMm}mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff;
            }
            .ticket {
              width: 80mm;
              margin: 0 !important;
              padding: 3mm 4mm;
              box-shadow: none;
            }
          }
          .centro { text-align: center; }
          .linea { border-top: 1px dashed #333; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .totales div { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
          .total-final { font-size: 13.5px !important; font-weight: bold; margin-top: 4px !important; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="centro">
            <div style="font-weight:bold;font-size:15px;">ARTESA</div>
            <div style="font-size:10.5px;">Cafetería &amp; Panadería Artesanal</div>
            ${venta.sucursal_nombre ? `<div style="font-size:10.5px;font-weight:bold;margin-top:2px;">Sucursal: ${escaparHtml(venta.sucursal_nombre)}</div>` : ''}
            ${venta.sucursal_direccion ? `<div style="font-size:9.5px;">${escaparHtml(venta.sucursal_direccion)}${venta.sucursal_departamento ? `, ${escaparHtml(venta.sucursal_departamento)}` : ''}</div>` : ''}
            ${venta.sucursal_telefono ? `<div style="font-size:9.5px;">Tel: ${escaparHtml(venta.sucursal_telefono)}</div>` : ''}
            <div style="font-size:11px;margin-top:5px;font-weight:bold;">
              ${venta.tipo_comprobante === 'CCF' ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA CONSUMIDOR FINAL'}
            </div>
            <div style="font-size:12px;font-weight:bold;">
              ${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}
            </div>
          </div>

          <div class="linea"></div>

          <div style="font-size:10.5px;">
            <div><strong>Fecha:</strong> ${escaparHtml(fecha)}</div>
            <div><strong>Generado por:</strong> ${escaparHtml(venta.cajero_username || 'Cajero POS')}</div>
            <div><strong>Cliente:</strong> ${escaparHtml(venta.cliente_nombre || 'Consumidor Final')}</div>
            ${venta.cliente_num_documento ? `<div><strong>${escaparHtml(venta.cliente_tipo_documento || 'Doc')}:</strong> ${escaparHtml(venta.cliente_num_documento)}</div>` : ''}
            ${venta.nrc ? `<div><strong>NRC:</strong> ${escaparHtml(venta.nrc)}</div>` : ''}
            ${venta.giro_economico ? `<div><strong>Giro:</strong> ${escaparHtml(venta.giro_economico)}</div>` : ''}
            ${venta.cliente_direccion ? `<div><strong>Dirección cliente:</strong> ${escaparHtml(venta.cliente_direccion)}</div>` : ''}
            ${venta.numero_control ? `<div style="word-break:break-all;"><strong>No. Control DTE:</strong> ${escaparHtml(venta.numero_control)}</div>` : ''}
            ${venta.codigo_generacion ? `<div style="word-break:break-all;"><strong>Cód. Generación:</strong> ${escaparHtml(venta.codigo_generacion)}</div>` : ''}
          </div>

          <div class="linea"></div>

          <table>
            <thead>
              <tr style="border-bottom:1px solid #333;">
                <th style="text-align:left;padding-bottom:3px;">Descripción</th>
                <th style="text-align:right;padding-bottom:3px;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${filasItems || '<tr><td colspan="2">Sin detalle</td></tr>'}
            </tbody>
          </table>

          <div class="linea"></div>

          <div class="totales">
            <div><span>Subtotal:</span><span>$${escaparHtml(venta.subtotal ?? '0.00')}</span></div>
            <div><span>Descuento:</span><span>-$${escaparHtml(venta.descuento ?? '0.00')}</span></div>
            <div><span>IVA (13%):</span><span>$${escaparHtml(venta.iva ?? '0.00')}</span></div>
            <div class="total-final"><span>TOTAL:</span><span>$${escaparHtml(venta.total ?? '0.00')}</span></div>
          </div>

          ${
            filasPagos
              ? `<div class="linea"></div>
                 <div style="font-size:10.5px;font-weight:bold;margin-bottom:2px;">Formas de pago</div>
                 ${filasPagos}`
              : ''
          }

          <div class="linea"></div>
          <div class="centro" style="font-size:10px;">
            ${esReimpresion ? '<div>Reimpresión de comprobante</div>' : ''}
            <div>¡Gracias por su preferencia!</div>
          </div>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            setTimeout(function () {
              window.print();
            }, 150);
          };
          window.onafterprint = function () {
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  ventana.document.close();
}