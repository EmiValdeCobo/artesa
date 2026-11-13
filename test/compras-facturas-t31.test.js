import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registrarCompraSchema } from '../backend/src/modules/compras/facturas/facturas.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const body = {
  idProveedor: 3,
  idSucursal: 1,
  numeroFactura: 'FAC-001-2026',
  fechaEmision: '2026-11-12',
  condicionPago: 'CREDITO',
  items: [{ idInsumo: 8, cantidad: '50.0000', costoUnitario: '1.250000' }],
};

test('T31 schema: acepta factura COSTO y fija tipoCosto por defecto', () => {
  const parsed = registrarCompraSchema.parse(body);
  assert.equal(parsed.tipoCosto, 'COSTO');
  assert.deepEqual(parsed.items[0], { idInsumo: 8, cantidad: '50.0000', costoUnitario: '1.250000' });
});

test('T31 schema: solo permite COSTO y rechaza GASTO/propiedades no declaradas', () => {
  assert.throws(() => registrarCompraSchema.parse({ ...body, tipoCosto: 'GASTO' }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, extra: true }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, items: [{ ...body.items[0], descripcion: 'Luz' }] }));
});

test('T31 schema: requiere IDs enteros positivos, número de factura y condición permitida', () => {
  assert.throws(() => registrarCompraSchema.parse({ ...body, idProveedor: 0 }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, idSucursal: 1.5 }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, numeroFactura: ' ' }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, condicionPago: 'CREDITO_30' }));
});

test('T31 schema: admite CONTADO y CREDITO para calcular vencimiento en PostgreSQL', () => {
  assert.equal(registrarCompraSchema.parse({ ...body, condicionPago: 'CONTADO' }).condicionPago, 'CONTADO');
  assert.equal(registrarCompraSchema.parse({ ...body, condicionPago: 'CREDITO' }).condicionPago, 'CREDITO');
});

test('T31 schema: valida fecha calendario ISO, incluidos años bisiestos', () => {
  assert.equal(registrarCompraSchema.parse({ ...body, fechaEmision: '2024-02-29' }).fechaEmision, '2024-02-29');
  for (const fechaEmision of ['0000-01-01', '2025-02-29', '2026-04-31', '12/11/2026', '2026-13-01']) {
    assert.throws(() => registrarCompraSchema.parse({ ...body, fechaEmision }));
  }
});

test('T31 schema: requiere al menos un insumo por factura COSTO', () => {
  assert.throws(() => registrarCompraSchema.parse({ ...body, items: [] }));
  assert.throws(() => registrarCompraSchema.parse({ ...body, items: [{ ...body.items[0], idInsumo: -1 }] }));
});

test('T31 schema: conserva cantidades/costos como strings y aplica precisión NUMERIC', () => {
  for (const cantidad of ['0', '0.0000', '-1', '1.12345', '123456789']) {
    assert.throws(() => registrarCompraSchema.parse({ ...body, items: [{ ...body.items[0], cantidad }] }));
  }
  for (const costoUnitario of ['-1', '1.1234567', '1234567']) {
    assert.throws(() => registrarCompraSchema.parse({ ...body, items: [{ ...body.items[0], costoUnitario }] }));
  }
  assert.equal(typeof registrarCompraSchema.parse(body).items[0].costoUnitario, 'string');
  assert.equal(registrarCompraSchema.parse({ ...body, items: [{ ...body.items[0], costoUnitario: '0' }] }).items[0].costoUnitario, '0');
});

test('T31 routes: POST /api/compras exige autenticación admin, permiso, Zod y asyncHandler', async () => {
  const route = await leer('backend/src/modules/compras/facturas/facturas.routes.js');
  const index = await leer('backend/src/modules/index.js');
  const agregador = await leer('backend/src/modules/compras/compras.routes.js');
  assert.match(route, /router\.post\(\s*'\/'/);
  assert.match(route, /authenticate,[\s\S]*requireTipo\('admin'\),[\s\S]*requirePermiso\('COM_REGISTRAR_COMPRA'\),[\s\S]*validate\(registrarCompraSchema\),[\s\S]*asyncHandler/);
  assert.match(index, /router\.use\('\/compras', comprasRoutes\)/);
  assert.match(agregador, /router\.use\(proveedoresRoutes\)/);
  assert.match(agregador, /router\.use\(facturasRoutes\)/);
});

test('T31 repository: llama función SQL con bind, JSONB e id_usuario', async () => {
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.match(repository, /compras\.fn_registrar_compra\(/);
  assert.match(repository, /\$6::jsonb,[\s\S]*\$7::uuid,[\s\S]*\$8::varchar/);
  assert.match(repository, /JSON\.stringify\(items\)/);
  assert.match(repository, /id_insumo: idInsumo,[\s\S]*cantidad,[\s\S]*costo_unitario: costoUnitario/);
  assert.match(repository, /bind,/);
  assert.doesNotMatch(repository, /\b(INSERT INTO compras\.(facturas_compra|compra_detalles)|UPDATE inventario\.)/i);
});

test('T31 repository: valida referencias bajo transacción y bloquea cambios concurrentes de estado', async () => {
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.match(repository, /compras\.proveedores[\s\S]*FOR UPDATE/);
  assert.match(repository, /empresa\.sucursales[\s\S]*FOR UPDATE/);
  assert.match(repository, /inventario\.insumos[\s\S]*ORDER BY id_insumo[\s\S]*FOR UPDATE/);
  assert.match(repository, /deleted_at/);
  assert.match(repository, /activo/);
});

test('T31 service: valida proveedor, sucursal e insumos activos/no eliminados y usa withTransaction(userId)', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  assert.match(service, /withTransaction\(async \(transaction\)/);
  assert.match(service, /\}, userId\)/);
  assert.match(service, /validarProveedor\(await repo\.buscarProveedor/);
  assert.match(service, /validarSucursal\(await repo\.buscarSucursal/);
  assert.match(service, /validarInsumos\(insumos, datos\.items\)/);
  assert.match(service, /Proveedor no encontrado', 404/);
  assert.match(service, /El proveedor está inactivo', 409/);
  assert.match(service, /Sucursal no encontrada', 404/);
  assert.match(service, /La sucursal está inactiva', 409/);
  assert.match(service, /El insumo \$\{idInsumo\} no existe`, 404/);
  assert.match(service, /El insumo \$\{idInsumo\} está inactivo`, 409/);
});

test('T31 service: mapea duplicado, excepción SQL y restricciones sin ocultar errores desconocidos', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  assert.match(service, /error\.original \?\? error\.parent \?\? error/);
  assert.match(service, /pg\.code === '23505'[\s\S]*409/);
  assert.match(service, /pg\.code === 'P0001'[\s\S]*400/);
  assert.match(service, /pg\.code === '23503'[\s\S]*409/);
  assert.match(service, /'22003', '22008'/);
  assert.match(service, /return error/);
});

test('T31 controller: responde 201 directo con id_compra', async () => {
  const controller = await leer('backend/src/modules/compras/facturas/facturas.controller.js');
  assert.match(controller, /res\.status\(201\)\.json\(\{ id_compra: idCompra \}\)/);
  assert.doesNotMatch(controller, /sequelize|SQL|IVA|subtotal|total/);
});

test('T31 no calcula montos, vencimiento, costo promedio o stock en JavaScript', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.doesNotMatch(service, /\b(?:IVA|subtotal|vencimiento|costoPromedio|fn_mover_stock)\b/i);
  assert.doesNotMatch(repository, /ROUND\(|SUM\(|costo_promedio\s*=|UPDATE inventario\./i);
  assert.match(repository, /compras\.fn_registrar_compra/);
});

test('T31 no añade auditoría, migraciones ni modifica el schema inicial', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.doesNotMatch(`${service}\n${repository}`, /bitacora|fn_auditar/i);
});

test('T31 deja pagos/CxP, GASTO y frontend fuera del módulo implementado', async () => {
  const route = await leer('backend/src/modules/compras/facturas/facturas.routes.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.doesNotMatch(route, /pagos|cuentas-por-pagar|gastos/i);
  assert.doesNotMatch(repository, /pagos_proveedor|COM_PAGAR_PROVEEDOR|tipoCosto: 'GASTO'/);
});
