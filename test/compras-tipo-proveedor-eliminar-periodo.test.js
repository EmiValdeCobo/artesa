import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proveedorSchema, listarProveedoresSchema } from '../backend/src/modules/compras/proveedores/proveedores.schemas.js';
import { eliminarFacturaSchema, idFacturaSchema } from '../backend/src/modules/compras/facturas/facturas.schemas.js';
import { filtrosCuentasPorPagarSchema } from '../backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.schemas.js';
import {
  desplazar, errorRango, etiquetaPeriodo, mesActual, mesAnterior, opcionDePeriodo, rangoDePeriodo, totalesPeriodo,
} from '../frontend/src/modules/compras/periodo.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('migración 020/021 idéntica en database/init (paridad)', () => {
  assert.equal(leer('database/migrations/020_compras_tipo_proveedor_eliminar_factura.sql'), leer('database/init/22_compras_tipo_proveedor_eliminar_factura.sql'));
  assert.equal(leer('database/migrations/021_backfill_tipo_proveedor.sql'), leer('database/init/23_backfill_tipo_proveedor.sql'));
});

test('migración 020: tipo de proveedor, soft delete y permiso solo para ADMIN', () => {
  const sql = leer('database/migrations/020_compras_tipo_proveedor_eliminar_factura.sql');
  assert.match(sql, /tipo VARCHAR\(10\) NOT NULL DEFAULT 'COMPRA'/);
  assert.match(sql, /CHECK \(tipo IN \('COMPRA', 'SERVICIO'\)\)/);
  assert.match(sql, /deleted_by UUID REFERENCES seguridad\.usuarios/);
  assert.match(sql, /UNIQUE INDEX IF NOT EXISTS ux_facturas_compra_proveedor_num_vigente[\s\S]*WHERE deleted_at IS NULL/);
  // Revierte el stock con la función existente (no se reimplementa en JS) y anula abonos.
  assert.match(sql, /inventario\.fn_mover_stock\(v_f\.id_sucursal, r\.id_insumo, -r\.cantidad, 'AJUSTE',\s*'COMPRA_ANULADA'/);
  assert.match(sql, /UPDATE compras\.pagos_proveedor SET deleted_at = now\(\)/);
  assert.match(sql, /WHERE r\.nombre = 'ADMIN' AND p\.codigo = 'COM_ELIMINAR_FACTURA'/);
  assert.match(leer('database/migrations/021_backfill_tipo_proveedor.sql'), /SET tipo = 'SERVICIO'[\s\S]*tipo_costo = 'GASTO'[\s\S]*NOT EXISTS[\s\S]*tipo_costo = 'COSTO'/);
});

test('proveedores: tipo obligatorio con default COMPRA y filtro opcional', () => {
  const base = { razonSocial: 'X', nrc: '123456-7', nit: '0614-123456-123-1', diasCredito: 0 };
  assert.equal(proveedorSchema.parse(base).tipo, 'COMPRA');
  assert.equal(proveedorSchema.parse({ ...base, tipo: 'SERVICIO' }).tipo, 'SERVICIO');
  assert.throws(() => proveedorSchema.parse({ ...base, tipo: 'OTRO' }));
  assert.equal(listarProveedoresSchema.parse({ tipo: 'SERVICIO' }).tipo, 'SERVICIO');
  assert.throws(() => listarProveedoresSchema.parse({ tipo: 'compra' }));
});

test('facturas: el backend rechaza proveedores del tipo equivocado', () => {
  const servicio = leer('backend/src/modules/compras/facturas/facturas.service.js');
  assert.match(servicio, /const esperado = tipoCosto === 'GASTO' \? 'SERVICIO' : 'COMPRA'/);
  assert.match(servicio, /validarProveedor\(await repo\.buscarProveedor\(datos\.idProveedor, transaction\), datos\.tipoCosto\)/);
});

test('facturas: detalle con COM_VER_CXP y eliminación protegida con COM_ELIMINAR_FACTURA', () => {
  const rutas = leer('backend/src/modules/compras/facturas/facturas.routes.js');
  assert.match(rutas, /router\.get\(\s*'\/facturas\/:id',[\s\S]*?requirePermiso\('COM_VER_CXP'\)/);
  assert.match(rutas, /router\.delete\(\s*'\/facturas\/:id',[\s\S]*?requirePermiso\('COM_ELIMINAR_FACTURA'\)/);
  assert.match(leer('backend/src/modules/compras/facturas/facturas.detalle.service.js'), /withTransaction\(/);
  assert.equal(idFacturaSchema.safeParse({ id: 'no-uuid' }).success, false);
  assert.equal(eliminarFacturaSchema.parse({}).motivo, null);
  assert.throws(() => eliminarFacturaSchema.parse({ extra: 1 }));
});

test('consultas excluyen facturas y abonos eliminados', () => {
  assert.match(leer('backend/src/modules/compras/cuentas-por-pagar.repository.js'), /f\.deleted_at IS NULL/);
  assert.match(leer('backend/src/modules/compras/pagos/pagos.repository.js'), /WHERE id_compra = \$1::uuid AND deleted_at IS NULL/);
  assert.match(leer('backend/src/modules/dashboard/dashboard.repository.js'), /f\.deleted_at IS NULL/);
});

test('CxP: campoFecha emisión/vencimiento validado', () => {
  assert.equal(filtrosCuentasPorPagarSchema.parse({ campoFecha: 'vencimiento' }).campoFecha, 'vencimiento');
  assert.throws(() => filtrosCuentasPorPagarSchema.parse({ campoFecha: 'pago' }));
});

test('periodo: mes actual, anterior, navegación y rangos', () => {
  assert.deepEqual(mesActual('2026-11-19'), { modo: 'mes', anio: 2026, mes: 11 });
  assert.deepEqual(mesAnterior('2026-01-05'), { modo: 'mes', anio: 2025, mes: 12 });
  assert.deepEqual(desplazar({ modo: 'mes', anio: 2026, mes: 12 }, 1), { modo: 'mes', anio: 2027, mes: 1 });
  assert.deepEqual(desplazar({ modo: 'anio', anio: 2026 }, -1), { modo: 'anio', anio: 2025 });
  assert.deepEqual(rangoDePeriodo({ modo: 'mes', anio: 2028, mes: 2 }), { desde: '2028-02-01', hasta: '2028-02-29' });
  assert.deepEqual(rangoDePeriodo({ modo: 'anio', anio: 2026 }), { desde: '2026-01-01', hasta: '2026-12-31' });
  assert.deepEqual(rangoDePeriodo({ modo: 'todo' }), {});
  assert.deepEqual(rangoDePeriodo({ modo: 'rango', desde: '2026-12-01', hasta: '2026-11-01' }), {});
  assert.match(errorRango({ desde: '2025-01-01', hasta: '2026-12-31' }), /366/);
  assert.equal(etiquetaPeriodo({ modo: 'mes', anio: 2026, mes: 11 }), 'Noviembre 2026');
  assert.equal(opcionDePeriodo({ modo: 'mes', anio: 2026, mes: 10 }, '2026-11-19'), 'anterior');
  assert.equal(opcionDePeriodo({ modo: 'mes', anio: 2026, mes: 3 }, '2026-11-19'), 'mes');
});

test('periodo: totales en centavos sin float', () => {
  const totales = totalesPeriodo([{ total: '0.10', pagado: '0.20', saldo: '0.30' }, { total: '0.20', pagado: '0.10', saldo: '1000000.01' }]);
  assert.deepEqual(totales, { total: 30n, pagado: 30n, saldo: 100000031n });
});
