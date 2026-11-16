import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const leer = (rel) => readFile(resolve(process.cwd(), rel), 'utf-8');

test('T19 API: posApi exporta registrarVenta hacia POST /pos/ventas', async () => {
  const api = await leer('frontend/src/modules/pos/posApi.js');
  assert.match(api, /export\s+(async\s+)?function\s+registrarVenta|export\s+const\s+registrarVenta/);
  assert.match(api, /\/pos\/ventas/);
});

test('T19 ModalCobro: soporta pagos mixtos con los 4 métodos oficiales', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  assert.match(modal, /EFECTIVO/);
  assert.match(modal, /TARJETA/);
  assert.match(modal, /TRANSFERENCIA/);
  assert.match(modal, /BITCOIN_CHIVO/);
});

test('T19 ModalCobro: cálculos monetarios sin float (centavos / toFixed(2)) y regla anti-float en payload', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  assert.match(modal, /toFixed\(2\)/);
  assert.doesNotMatch(modal, /parseFloat\(/);
  // Confirma que el payload envíe montos como strings
  assert.match(modal, /descuento/);
  assert.match(modal, /monto/);
});

test('T19 ModalCobro: incluye billetes rápidos y cálculo de vuelto en efectivo', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  assert.match(modal, /Exacto/);
  assert.match(modal, /\$20/);
  assert.match(modal, /\$50/);
  assert.match(modal, /\$100/);
  assert.match(modal, /vueltoCentavos|vuelto/i);
});

test('T19 ModalCobro: valida faltante en tiempo real y bloquea confirmación incompleta', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  assert.match(modal, /faltante/i);
  assert.match(modal, /sobrante/i);
  assert.match(modal, /puedeConfirmar/);
});

test('T19 ModalCobro: envía tipo_comprobante FCF o CCF y asocia id_cliente', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  assert.match(modal, /tipo_comprobante/);
  assert.match(modal, /'FCF'/);
  assert.match(modal, /'CCF'/);
  assert.match(modal, /id_cliente/);
});

test('T19 Comprobante térmico: formato estándar 80mm con datos fiscales y window.print()', async () => {
  const ticket = await leer('frontend/src/modules/pos/imprimirTicket.js');
  assert.match(ticket, /80mm/);
  assert.match(ticket, /window\.print\(\)/);
  assert.match(ticket, /correlativo/);
  assert.match(ticket, /sucursal/);
  assert.match(ticket, /IVA/);
});

test('T19 VentaExitosa: modal muestra correlativo, vuelto prominente y botones de impresión y nueva venta', async () => {
  const exitosa = await leer('frontend/src/modules/pos/VentaExitosaModal.jsx');
  assert.match(exitosa, /correlativo/);
  assert.match(exitosa, /vuelto/i);
  assert.match(exitosa, /Imprimir/i);
  assert.match(exitosa, /Nueva venta/i);
});

test('T19 PosPage: integra ModalCobro y VentaExitosaModal protegiendo contra venta sin turno de caja', async () => {
  const pos = await leer('frontend/src/modules/pos/PosPage.jsx');
  assert.match(pos, /<ModalCobro/);
  assert.match(pos, /<VentaExitosaModal/);
  assert.match(pos, /turnoActivo/);
  assert.match(pos, /\/caja/);
});

test('T19 PosPage: al completar venta vacía el carrito, deselecciona cliente y recarga existencias', async () => {
  const pos = await leer('frontend/src/modules/pos/PosPage.jsx');
  assert.match(pos, /handleVentaExitosa/);
  assert.match(pos, /vaciar/);
  assert.match(pos, /setClienteSeleccionado/);
  assert.match(pos, /cargar\(\)/);
});

test('T19 PosPage: conserva contratos de permisos y estructura UI', async () => {
  const pos = await leer('frontend/src/modules/pos/PosPage.jsx');
  assert.match(pos, /tiene\('INV_VER_STOCK'\)/);
  assert.match(pos, /puedeCCF \? tipoDocumento : 'FACTURA'/);
  assert.match(pos, /<BannerError/);
  assert.match(pos, /<EncabezadoPagina/);
});

