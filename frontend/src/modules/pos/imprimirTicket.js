function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function abrirVentanaImpresion(venta) {
  const ventana = window.open('', '_blank', 'width=420,height=720');
  if (!ventana) return;

  const fecha = venta.fecha_emision
    ? new Date(venta.fecha_emision).toLocaleString('es-SV')
    : new Date().toLocaleString('es-SV');

  const filasItems = (venta.detalles ?? [])
    .map(
      (d) => `
        <tr>
          <td style="padding:3px 0; vertical-align:top;">
            ${escaparHtml(d.cantidad)}x ${escaparHtml(d.nombre_producto)}
            ${d.nota ? `<div style="font-size:10px;color:#555;">(${escaparHtml(d.nota)})</div>` : ''}
          </td>
          <td style="padding:3px 0; text-align:right; vertical-align:top; white-space:nowrap;">
            $${escaparHtml(d.subtotal_linea)}
          </td>
        </tr>`,
    )
    .join('');

  const filasPagos = (venta.pagos ?? [])
    .map(
      (p) => `
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span>${escaparHtml(p.metodo)}</span>
          <span>$${escaparHtml(p.monto)}</span>
        </div>`,
    )
    .join('');

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            color: #111;
            font-size: 12px;
            line-height: 1.35;
          }
          .centro { text-align: center; }
          .linea { border-top: 1px dashed #333; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .totales div { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
          .total-final { font-size: 14px !important; font-weight: bold; margin-top: 4px !important; }
        </style>
      </head>
      <body>
        <div class="centro">
          <div style="font-weight:bold;font-size:15px;">ARTESA</div>
          <div style="font-size:11px;">Cafetería &amp; Panadería Artesanal</div>
          ${venta.sucursal_nombre ? `<div style="font-size:11px;font-weight:bold;">Sucursal: ${escaparHtml(venta.sucursal_nombre)}</div>` : ''}
          ${venta.sucursal_direccion ? `<div style="font-size:10px;">${escaparHtml(venta.sucursal_direccion)}${venta.sucursal_departamento ? `, ${escaparHtml(venta.sucursal_departamento)}` : ''}</div>` : ''}
          ${venta.sucursal_telefono ? `<div style="font-size:10px;">Tel: ${escaparHtml(venta.sucursal_telefono)}</div>` : ''}
          <div style="font-size:11px;margin-top:4px;font-weight:bold;">
            ${venta.tipo_comprobante === 'CCF' ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA CONSUMIDOR FINAL'}
          </div>
          <div style="font-size:12px;font-weight:bold;">
            ${escaparHtml(venta.tipo_comprobante)} #${escaparHtml(venta.correlativo)}
          </div>
        </div>

        <div class="linea"></div>

        <div style="font-size:11px;">
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

        ${filasPagos
          ? `<div class="linea"></div>
             <div style="font-size:11px;font-weight:bold;margin-bottom:2px;">Formas de pago</div>
             ${filasPagos}`
          : ''
        }

        <div class="linea"></div>
        <div class="centro" style="font-size:10px;">
          <div>¡Gracias por su preferencia!</div>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  ventana.document.close();
}

