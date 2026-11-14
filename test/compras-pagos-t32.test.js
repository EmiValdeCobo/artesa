import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { idFacturaPagoSchema, registrarPagoSchema } from '../backend/src/modules/compras/pagos/pagos.schemas.js';
import { filtrosCuentasPorPagarSchema } from '../backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const idCompra = 'b1e9a663-d077-4b85-90a0-f70f3ba086e4';
const pagoValido = { monto: '500.00', metodo: 'TRANSFERENCIA', referencia: 'TRF-001' };

test('T32 schema: acepta monto decimal como string y referencia opcional', () => {
  assert.deepEqual(registrarPagoSchema.parse(pagoValido), pagoValido);
  assert.deepEqual(registrarPagoSchema.parse({ monto: '0.01', metodo: 'EFECTIVO' }), {
    monto: '0.01', metodo: 'EFECTIVO', referencia: null,
  });
});

test('T32 schema: valida monto positivo con hasta dos decimales y NUMERIC(12,2)', () => {
  for (const monto of ['0', '0.00', '-1.00', '1.001', '', '12345678901.00']) {
    assert.throws(() => registrarPagoSchema.parse({ ...pagoValido, monto }));
  }
  assert.equal(typeof registrarPagoSchema.parse({ ...pagoValido, monto: '9999999999.99' }).monto, 'string');
});

test('T32 schema: solo permite métodos de pago definidos por PostgreSQL', () => {
  for (const metodo of ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA']) {
    assert.equal(registrarPagoSchema.parse({ ...pagoValido, metodo }).metodo, metodo);
  }
  assert.throws(() => registrarPagoSchema.parse({ ...pagoValido, metodo: 'BITCOIN' }));
});

test('T32 schema: referencia admite hasta 100 caracteres y rechaza fechaPago no autorizada', () => {
  assert.equal(registrarPagoSchema.parse({ ...pagoValido, referencia: 'R'.repeat(100) }).referencia.length, 100);
  assert.throws(() => registrarPagoSchema.parse({ ...pagoValido, referencia: 'R'.repeat(101) }));
  assert.throws(() => registrarPagoSchema.parse({ ...pagoValido, fechaPago: '2026-11-13' }));
});

test('T32 schema: parámetro de factura debe ser UUID', () => {
  assert.equal(idFacturaPagoSchema.parse({ id: idCompra }).id, idCompra);
  assert.throws(() => idFacturaPagoSchema.parse({ id: '123' }));
});

test('T32 schema: filtros CxP permiten consulta sin rango y validan rangos acotados', () => {
  assert.deepEqual(filtrosCuentasPorPagarSchema.parse({}), {});
  assert.equal(filtrosCuentasPorPagarSchema.parse({ idSucursal: '2' }).idSucursal, 2);
  assert.throws(() => filtrosCuentasPorPagarSchema.parse({ desde: '2026-01-01' }));
  assert.throws(() => filtrosCuentasPorPagarSchema.parse({ desde: '2025-01-01', hasta: '2026-11-13' }));
});

test('T32 routes: pago exige sesión admin, COM_PAGAR_PROVEEDOR, UUID, body Zod y asyncHandler', async () => {
  const routes = await leer('backend/src/modules/compras/pagos/pagos.routes.js');
  assert.match(routes, /router\.post\([\s\S]*'\/:id\/pagos'/);
  assert.match(routes, /authenticate,[\s\S]*requireTipo\('admin'\),[\s\S]*requirePermiso\('COM_PAGAR_PROVEEDOR'\),[\s\S]*validarIdFactura,[\s\S]*validate\(registrarPagoSchema\),[\s\S]*asyncHandler/);
  assert.match(routes, /idFacturaPagoSchema\.safeParse/);
});

test('T32 routes: consulta operativa exige autenticación y únicamente el permiso COM_VER_CXP', async () => {
  const routes = await leer('backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.routes.js');
  assert.match(routes, /router\.get\([\s\S]*'\/cuentas-por-pagar'/);
  assert.match(routes, /requirePermiso\('COM_VER_CXP'\)/);
  assert.match(routes, /router\.get\([\s\S]*authenticate,[\s\S]*requirePermiso\('COM_VER_CXP'\)/);
  assert.doesNotMatch(routes, /requireTipo|REP_VER_DASHBOARD/);
});

test('T32 agrega pagos y CxP al router existente de compras sin reemplazar T30/T31', async () => {
  const compras = await leer('backend/src/modules/compras/compras.routes.js');
  const index = await leer('backend/src/modules/index.js');
  assert.match(compras, /router\.use\(pagosRoutes\)/);
  assert.match(compras, /router\.use\(cuentasPorPagarRoutes\)/);
  assert.match(compras, /router\.use\(proveedoresRoutes\)/);
  assert.match(compras, /router\.use\(facturasRoutes\)/);
  assert.match(index, /router\.use\('\/compras', comprasRoutes\)/);
});

test('T32 service: bloquea factura con SELECT FOR UPDATE antes de insertar pago', async () => {
  const service = await leer('backend/src/modules/compras/pagos/pagos.service.js');
  const repository = await leer('backend/src/modules/compras/pagos/pagos.repository.js');
  assert.match(repository, /FROM compras\.facturas_compra[\s\S]*FOR UPDATE/);
  assert.match(service, /buscarFacturaParaPago\(idCompra, transaction\)[\s\S]*insertarPago\(idCompra/);
});

test('T32 service: rechaza factura inexistente o pagada antes de persistir', async () => {
  const service = await leer('backend/src/modules/compras/pagos/pagos.service.js');
  assert.match(service, /Factura no encontrada', 404/);
  assert.match(service, /factura\.estado_pago === 'PAGADO'[\s\S]*409/);
  assert.match(service, /estado_pago === 'PAGADO'[\s\S]*?insertarPago/);
});

test('T32 permite pago sobre CONTADO y CREDITO sin modificar regla por condición', async () => {
  const service = await leer('backend/src/modules/compras/pagos/pagos.service.js');
  const repository = await leer('backend/src/modules/compras/pagos/pagos.repository.js');
  assert.doesNotMatch(service, /condicion_pago|CONTADO|CREDITO/);
  assert.match(repository, /CURRENT_DATE/);
});

test('T32 cada pago es un INSERT nuevo, conserva id_usuario y nunca actualiza estado_pago manualmente', async () => {
  const repository = await leer('backend/src/modules/compras/pagos/pagos.repository.js');
  assert.match(repository, /INSERT INTO compras\.pagos_proveedor/);
  assert.match(repository, /CURRENT_DATE/);
  assert.match(repository, /\$5::uuid/);
  assert.match(repository, /RETURNING id_pago/);
  assert.doesNotMatch(repository, /UPDATE compras\.facturas_compra|SET estado_pago/);
});

test('T32 respuesta incluye pago, estado actualizado, total pagado y saldo como strings', async () => {
  const repository = await leer('backend/src/modules/compras/pagos/pagos.repository.js');
  const controller = await leer('backend/src/modules/compras/pagos/pagos.controller.js');
  assert.match(repository, /p\.monto::text AS monto/);
  assert.match(repository, /f\.estado_pago/);
  assert.match(repository, /t\.total_pagado::text AS total_pagado/);
  assert.match(repository, /\(f\.total - t\.total_pagado\)::text AS saldo/);
  assert.match(controller, /res\.status\(201\)\.json\(pago\)/);
});

test('T32 errores mapean sobrepago a 409, referencia inexistente a 404 y restricciones inválidas a 400', async () => {
  const service = await leer('backend/src/modules/compras/pagos/pagos.service.js');
  assert.match(service, /error\.original \?\? error\.parent \?\? error/);
  assert.match(service, /pg\.code === 'P0001'[\s\S]*409/);
  assert.match(service, /pg\.code === '23503'[\s\S]*404/);
  assert.match(service, /pg\.code === '23514'[\s\S]*400/);
});

test('T32 pagos usan withTransaction(userId) y propagan errores para rollback', async () => {
  const service = await leer('backend/src/modules/compras/pagos/pagos.service.js');
  assert.match(service, /withTransaction\(async \(transaction\)/);
  assert.match(service, /\}, userId\)/);
  assert.match(service, /catch \(error\)[\s\S]*throw mapearErrorPago\(error\)/);
});

test('T32 reportes y Compras reutilizan una consulta CxP común', async () => {
  const reportes = await leer('backend/src/modules/reportes/reportes.repository.js');
  const shared = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  const cxpService = await leer('backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.service.js');
  assert.match(reportes, /listarCuentasPorPagar\(idUsuario, filtros, true\)/);
  assert.match(cxpService, /listarCuentasPorPagar\(userId, filtros, false\)/);
  assert.match(shared, /f\.estado_pago <> 'PAGADO'/);
  assert.match(shared, /SUM\(monto\)/);
  assert.match(shared, /f\.total::text AS total/);
  assert.match(shared, /AS pagado/);
  assert.match(shared, /AS saldo/);
  assert.match(shared, /JOIN visibles s ON s\.id_sucursal = f\.id_sucursal/);
  assert.match(shared, /LIMIT 500/);
});

test('T32 repositorio shared preserva ventana de 30 días de Reportes y deja CxP operativa sin rango fijo', async () => {
  const shared = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  assert.match(shared, /periodoRecientePorDefecto/);
  assert.match(shared, /CURRENT_DATE - 29/);
  assert.match(shared, /NOT \$5::boolean AND \(\$2::date IS NULL OR f\.fecha_emision >= \$2::date\)/);
});

test('T32 no agrega bitácora, tablas, triggers ni lógica de T33', async () => {
  const moduleFiles = [
    'backend/src/modules/compras/pagos/pagos.repository.js',
    'backend/src/modules/compras/pagos/pagos.service.js',
    'backend/src/modules/compras/cuentas-por-pagar.repository.js',
  ];
  const sources = (await Promise.all(moduleFiles.map(leer))).join('\n');
  assert.doesNotMatch(sources, /bitacora|fn_auditar/i);
  assert.doesNotMatch(sources, /CREATE TABLE|CREATE TRIGGER|GASTO/);
});
