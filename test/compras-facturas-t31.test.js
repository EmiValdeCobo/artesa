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

test('T31 schema: mantiene COSTO y rechaza propiedades no declaradas o detalles GASTO', () => {
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
  assert.match(repository, /id_insumo: item\.idInsumo,[\s\S]*cantidad: item\.cantidad,[\s\S]*costo_unitario: item\.costoUnitario/);
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

test('T31 conserva separados los endpoints de T32 y no implementa frontend', async () => {
  const route = await leer('backend/src/modules/compras/facturas/facturas.routes.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.doesNotMatch(route, /pagos|cuentas-por-pagar|gastos/i);
  assert.doesNotMatch(repository, /pagos_proveedor|COM_PAGAR_PROVEEDOR/);
});

const gasto = {
  ...body,
  numeroFactura: 'GAS-001',
  tipoCosto: 'GASTO',
  items: [
    { descripcion: 'Servicio de electricidad', cantidad: '1', costoUnitario: '185.40' },
    { descripcion: 'Internet', cantidad: '2', costoUnitario: '35.000000' },
  ],
};

test('T33 schema: acepta GASTO con varios detalles y conserva decimales como strings', () => {
  const parsed = registrarCompraSchema.parse(gasto);
  assert.equal(parsed.tipoCosto, 'GASTO');
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].descripcion, 'Servicio de electricidad');
  assert.equal(parsed.items[1].costoUnitario, '35.000000');
  assert.equal(typeof parsed.items[0].cantidad, 'string');
});

test('T33 schema: GASTO requiere tipo explícito y descripción no vacía de hasta 150 caracteres', () => {
  assert.throws(() => registrarCompraSchema.parse({ ...gasto, tipoCosto: undefined }));
  for (const descripcion of ['', '   ', 'D'.repeat(151)]) {
    assert.throws(() => registrarCompraSchema.parse({
      ...gasto,
      items: [{ ...gasto.items[0], descripcion }],
    }));
  }
  assert.equal(registrarCompraSchema.parse({
    ...gasto,
    items: [{ ...gasto.items[0], descripcion: ` ${'D'.repeat(150)} ` }],
  }).items[0].descripcion.length, 150);
});

test('T33 schema: GASTO rechaza idInsumo incluso si se envía null', () => {
  for (const idInsumo of [1, null]) {
    assert.throws(() => registrarCompraSchema.parse({
      ...gasto,
      items: [{ ...gasto.items[0], idInsumo }],
    }));
  }
});

test('T33 schema: requiere detalles, cantidad positiva y costo no negativo', () => {
  assert.throws(() => registrarCompraSchema.parse({ ...gasto, items: [] }));
  assert.throws(() => registrarCompraSchema.parse({
    ...gasto,
    items: [{ ...gasto.items[0], cantidad: '0' }],
  }));
  assert.throws(() => registrarCompraSchema.parse({
    ...gasto,
    items: [{ ...gasto.items[0], costoUnitario: '-1' }],
  }));
});

test('T33 schema: conserva CONTADO y CREDITO; los detalles COSTO siguen exigiendo idInsumo', () => {
  for (const condicionPago of ['CONTADO', 'CREDITO']) {
    assert.equal(registrarCompraSchema.parse({ ...gasto, condicionPago }).condicionPago, condicionPago);
  }
  assert.throws(() => registrarCompraSchema.parse({
    ...body,
    items: [{ cantidad: '1', costoUnitario: '2' }],
  }));
  assert.throws(() => registrarCompraSchema.parse({
    ...body,
    items: [{ ...body.items[0], idInsumo: null }],
  }));
});

test('T33 service: solo valida insumos para COSTO y conserva proveedor/sucursal y transacción', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  assert.match(service, /validarProveedor\(await repo\.buscarProveedor/);
  assert.match(service, /validarSucursal\(await repo\.buscarSucursal/);
  assert.match(service, /if \(datos\.tipoCosto === 'COSTO'\)[\s\S]*repo\.buscarInsumos[\s\S]*validarInsumos/);
  assert.match(service, /withTransaction\(async \(transaction\)/);
  assert.match(service, /\}, userId\)/);
});

test('T33 repository: invoca la función existente con bind, GASTO e insumo nulo', async () => {
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.match(repository, /datos\.tipoCosto === 'GASTO'[\s\S]*id_insumo: null,[\s\S]*descripcion: item\.descripcion/);
  assert.match(repository, /compras\.fn_registrar_compra\(/);
  assert.match(repository, /JSON\.stringify\(items\)/);
  assert.match(repository, /datos\.tipoCosto/);
  assert.doesNotMatch(repository, /UPDATE inventario\.|inventario\.fn_mover_stock|costo_promedio/);
});

test('T33: conserva ruta, permiso y respuesta aprobados de T31; no agrega bitácora ni migración', async () => {
  const route = await leer('backend/src/modules/compras/facturas/facturas.routes.js');
  const controller = await leer('backend/src/modules/compras/facturas/facturas.controller.js');
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  assert.match(route, /requirePermiso\('COM_REGISTRAR_COMPRA'\)/);
  assert.match(route, /router\.post\(\s*'\/'/);
  assert.match(controller, /res\.status\(201\)\.json\(\{ id_compra: idCompra \}\)/);
  assert.doesNotMatch(`${service}\n${route}`, /fn_auditar|bitacora/i);
});
