import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { actualizarInsumoSchema } from '../backend/src/modules/inventario/inventario.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('inventario: el kardex conserva autenticación admin y usa INV_VER_KARDEX', async () => {
  const routes = await leer('backend/src/modules/inventario/inventario.routes.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\)\)/);
  assert.match(routes, /router\.get\('\/movimientos', requirePermiso\('INV_VER_KARDEX'\)/);
  assert.match(routes, /router\.get\('\/stock', requirePermiso\('INV_VER_STOCK', 'INV_GESTIONAR_INSUMOS'\)/);
  assert.match(routes, /router\.get\('\/alertas', requirePermiso\('INV_VER_STOCK'\)/);
});

test('inventario: desactivar insumo y unidad devuelve 409 con dependencias activas', async () => {
  const [servicio, repositorio, errores, insumosUi, productosUi] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
    leer('frontend/src/errors/catalogo.js'),
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
  ]);
  assert.match(servicio, /No se puede desactivar\. Lo usan: \$\{nombres\.join\(', '\)\}\$\{resto\}/);
  assert.match(servicio, /No se puede desactivar: la usan \$\{nombres\.join\(', '\)\}/);
  assert.match(repositorio, /r\.id_insumo = \$1 OR p\.id_insumo_reventa = \$1/);
  assert.match(repositorio, /FROM inventario\.insumos[\s\S]*activo = true AND id_unidad_base = \$1/);
  assert.match(errores, /No se puede desactivar\\\. Lo usan:/);
  assert.match(insumosUi, /Mostrar inactivos/);
  assert.match(productosUi, /Mostrar inactivos/);
  assert.match(insumosUi, /Reactivar insumo/);
  assert.match(productosUi, /Reactivar producto/);
});

test('inventario: drawer limita reventa a insumos disponibles y muestra su vínculo', async () => {
  const pagina = await leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx');
  assert.match(pagina, /i\.tipo_insumo\)\.toUpperCase\(\) === 'REVENTA'/);
  assert.match(pagina, /!insumosVinculados\.has\(String\(i\.id_insumo\)\)/);
  assert.match(pagina, /Cada venta descontará 1/);
  assert.match(pagina, /p\.insumo_reventa/);
  assert.ok(pagina.indexOf('<SelectorTipoProducto form={form}') < pagina.indexOf('id="producto-nombre"'));
  assert.ok(pagina.indexOf('id="producto-nombre"') < pagina.indexOf('etiqueta="Categoría del producto"'));
  assert.ok(pagina.indexOf('id="producto-precio-venta"') < pagina.indexOf('etiqueta="Insumo de reventa"'));
});

test('inventario: margen usa precio neto de IVA y costo en aritmética entera', async () => {
  const { calcularMargen, calcularMargenDolares, calcularCostoReceta } = await import('../frontend/src/modules/inventario/costeo.js');
  assert.equal(calcularMargen('3.50', '2.0000'), 35.4);
  assert.equal(calcularMargenDolares('3.50', '4.0000'), '-0.9027');
  assert.equal(calcularCostoReceta([{ cantidad_requerida: '0.5000', costo_promedio: '2.1234' }]), '1.0617');
});

test('inventario: drawer reutilizable permite alta en producto y receta con permiso', async () => {
  const [drawer, productos, recetas] = await Promise.all([
    leer('frontend/src/modules/inventario/InsumoDrawer.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
    leer('frontend/src/modules/inventario/EditorRecetasPage.jsx'),
  ]);
  assert.match(drawer, /valoresIniciales/);
  assert.match(drawer, /onGuardado\(guardado\)/);
  assert.match(productos, /getUnidades\(\)/);
  assert.match(productos, /tiene\('INV_GESTIONAR_INSUMOS'\)[\s\S]*?Crear insumo de reventa/);
  assert.match(drawer, /z-\[70\]/);
  assert.match(recetas, /Pide a quien administra insumos que cree/);
  assert.match(recetas, /handleSeleccionarInsumo\(nuevo, ''\)/);
  assert.match(recetas, /cantidad-receta-\$\{nuevo\.id_insumo\}/);
});

test('inventario: diálogo de existencias usa contratos Zod y sucursales asignadas', async () => {
  const [dialogo, api, routes, controller, inventarioPage, insumosPage] = await Promise.all([
    leer('frontend/src/modules/inventario/DialogoExistenciasInsumo.jsx'),
    leer('frontend/src/modules/inventario/inventarioApi.js'),
    leer('backend/src/modules/inventario/inventario.routes.js'),
    leer('backend/src/modules/inventario/inventario.controller.js'),
    leer('frontend/src/modules/inventario/InventarioPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
  ]);
  assert.match(dialogo, /idSucursal: Number\(sucursal\)/);
  assert.match(dialogo, /cantidad: cantidad\.trim\(\), tipo, motivo: motivo\.trim\(\)/);
  assert.match(dialogo, /stockMinimo: minimo\.trim\(\)/);
  assert.match(api, /api\.post\(`\/inventario\/insumos\/\$\{idInsumo\}\/movimientos`/);
  assert.match(api, /api\.patch\(`\/inventario\/insumos\/\$\{idInsumo\}\/stock-minimo`/);
  assert.match(routes, /router\.get\('\/stock', requirePermiso\('INV_VER_STOCK', 'INV_GESTIONAR_INSUMOS'\)/);
  assert.match(controller, /configurarMinimo[\s\S]*req\.params\.id\)/);
  assert.match(inventarioPage, /usuario\?\.sucursales/);
  assert.match(insumosPage, /tiene\('INV_GESTIONAR_INSUMOS'\).*Existencias/);
});

test('inventario: el seeder asigna el kardex solo a roles autorizados y restringe costos de BODEGUERO', async () => {
  const seeder = await leer('database/seeders/003_inventario_kardex.sql');
  assert.match(seeder, /'INV_VER_KARDEX'[\s\S]*ON CONFLICT \(codigo\) DO NOTHING/);
  assert.match(seeder, /r\.nombre IN \('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO'\)/);
  assert.match(seeder, /ON CONFLICT DO NOTHING/);
  assert.match(seeder, /r\.nombre NOT IN \('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO'\)/);
  const quitarCostos = seeder.slice(seeder.lastIndexOf('DELETE FROM'));
  assert.ok(quitarCostos);
  assert.match(quitarCostos, /p\.codigo = 'INV_VER_COSTOS'/);
  assert.match(quitarCostos, /r\.nombre = 'BODEGUERO'/);
  assert.doesNotMatch(quitarCostos, /ADMIN|GERENTE_SUCURSAL|CONTADOR/);
});

test('inventario: el costo unitario requiere acceso al kardex y permiso INV_VER_COSTOS', async () => {
  const [routes, service, repository] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.routes.js'),
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
  ]);
  const sinCosto = repository.match(/const SQL_MOVIMIENTOS_SIN_COSTO = `([\s\S]*?)`;/)?.[1];
  const conCosto = repository.match(/const SQL_MOVIMIENTOS_CON_COSTO = `([\s\S]*?)`;/)?.[1];
  assert.ok(sinCosto, 'debe existir una consulta para usuarios sin permiso de costos');
  assert.ok(conCosto, 'debe existir una consulta para usuarios con permiso de costos');
  assert.doesNotMatch(sinCosto, /costo_unitario/);
  assert.match(conCosto, /m\.costo_unitario/);
  assert.match(routes, /router\.get\('\/movimientos', requirePermiso\('INV_VER_KARDEX'\)/);
  assert.match(service, /usuarioTienePermiso\(userId, 'INV_VER_COSTOS'\)/);
  assert.match(repository, /verCostos \? SQL_MOVIMIENTOS_CON_COSTO : SQL_MOVIMIENTOS_SIN_COSTO/);
  assert.doesNotMatch(repository, /SELECT\s+m\.\*/i);
});

test('inventario: sucursal e insumo se filtran en SQL antes del límite de movimientos', async () => {
  const repository = await leer('backend/src/modules/inventario/inventario.repository.js');
  const sql = repository.match(/const SQL_MOVIMIENTOS_SIN_COSTO = `([\s\S]*?)`;/)?.[1];
  assert.ok(sql);
  const asignacion = sql.indexOf('seguridad.usuario_sucursal');
  const filtroSucursal = sql.indexOf('$2::int');
  const filtroInsumo = sql.indexOf('$3::int');
  const orden = sql.indexOf('ORDER BY m.creado_en DESC, m.id_movimiento DESC');
  const limite = sql.indexOf('LIMIT 500');
  assert.ok(asignacion >= 0 && asignacion < filtroSucursal);
  assert.ok(filtroSucursal < filtroInsumo && filtroInsumo < orden && orden < limite);
  assert.match(repository, /\[idUsuario, idSucursal, idInsumo\]/);
  assert.match(repository, /sequelize\.query\(sql, \{ bind, transaction, type: QueryTypes\.SELECT \}\)/);
});

test('inventario: las mermas conservan transacción, función SQL y manejo de P0001', async () => {
  const [service, repository] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
  ]);
  assert.match(service, /withTransaction\(/);
  assert.match(service, /pg\.code === 'P0001'/);
  assert.match(repository, /inventario\.fn_registrar_merma\(\$1,\$2,\$3,\$4,\$5\)/);
  assert.doesNotMatch(repository, /UPDATE\s+inventario\.stock_sucursal\s+SET\s+stock_actual/i);
});

test('inventario: listar insumos une unidades con id_unidad_base y devuelve tipo_insumo', async () => {
  const repository = await leer('backend/src/modules/inventario/inventario.repository.js');
  const consulta = repository.match(/export const listarInsumos = ([^\n]+);/)?.[1];
  assert.ok(consulta, 'debe existir la consulta de insumos');
  assert.match(consulta, /i\.tipo_insumo/);
  assert.match(consulta, /JOIN inventario\.unidades_medida u ON u\.id_unidad = i\.id_unidad_base/);
  assert.doesNotMatch(consulta, /USING\s*\(id_unidad\)/);
});

test('inventario: editar insumo conserva costo y el listado de productos cuenta ingredientes', async () => {
  const payload = actualizarInsumoSchema.parse({ nombre: 'Leche entera', tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, activo: true });
  assert.equal(payload.costoPromedio, undefined);
  const repository = await leer('backend/src/modules/inventario/inventario.repository.js');
  assert.match(repository, /if \(data\.costoPromedio !== undefined\) values\.costo_promedio = data\.costoPromedio/);
  assert.match(repository, /COUNT\(\*\)::int FROM inventario\.recetas r WHERE r\.id_producto = p\.id_producto/);
});

test('inventario: el controller de merma lee el parámetro :id declarado por la ruta', async () => {
  const [controller, routes] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.controller.js'),
    leer('backend/src/modules/inventario/inventario.routes.js'),
  ]);
  assert.match(routes, /router\.post\('\/insumos\/:id\/mermas'/);
  assert.match(controller, /registrarMerma = async \(req, res\) => res\.status\(201\)\.json\(await service\.registrarMerma\(parseId\(req\.params\.id\), req\.body, req\.user\.id\)\)/);
  assert.doesNotMatch(controller, /registrarMerma[^\n]*req\.params\.idInsumo/);
});

test('inventario: los chips de T10 usan tipos reales recibidos del endpoint de insumos', async () => {
  const page = await leer('frontend/src/modules/inventario/InventarioPage.jsx');
  assert.match(page, /api\.get\('\/inventario\/insumos'\)/);
  assert.match(page, /insumo\.tipo_insumo/);
  assert.match(page, /tiposPorInsumo\[String\(fila\.id_insumo\)\] === filtroTipo/);
  assert.match(page, /valor: 'INGREDIENTE'/);
  assert.match(page, /valor: 'EMPAQUE'/);
  assert.match(page, /valor: 'REVENTA'/);
});

test('inventario UI: CatalogoInsumosPage, CatalogoProductosPage y EditorRecetasPage cumplen especificación y RBAC', async () => {
  const [app, menu, insumosPage, productosPage, recetasPage] = await Promise.all([
    leer('frontend/src/App.jsx'),
    leer('frontend/src/config/menu.js'),
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
    leer('frontend/src/modules/inventario/EditorRecetasPage.jsx'),
  ]);

  // 1. Rutas protegidas en App.jsx
  assert.match(app, /path="catalogo\/insumos" element={<ProtectedRoute permiso="INV_GESTIONAR_INSUMOS"><CatalogoInsumosPage \/><\/ProtectedRoute>}/);
  assert.match(app, /path="catalogo\/productos" element={<ProtectedRoute permiso="INV_VER_STOCK"><CatalogoProductosPage \/><\/ProtectedRoute>}/);
  assert.match(app, /path="catalogo\/productos\/:idProducto\/receta" element={<ProtectedRoute permiso="INV_GESTIONAR_RECETAS"><EditorRecetasPage \/><\/ProtectedRoute>}/);

  // 2. Menú lateral en menu.js
  assert.match(menu, /ruta: '\/catalogo\/insumos', texto: 'Insumos y unidades', permiso: 'INV_GESTIONAR_INSUMOS'/);
  assert.match(menu, /ruta: '\/catalogo\/productos', texto: 'Productos', permiso: 'INV_VER_STOCK'/);
  assert.doesNotMatch(menu, /ruta: '\/inventario\/recetas'/);

  // 3. CatalogoInsumosPage: pestañas y unidades; stock se consulta por sucursal en Existencias
  assert.match(insumosPage, /PestanaInsumos/);
  assert.match(insumosPage, /PestanaUnidades/);
  assert.match(insumosPage, /CampoError/);
  assert.doesNotMatch(insumosPage, /SemaforoBadge|calcularEstadoStock|BAJO_MINIMO|AGOTADO/);
  assert.match(insumosPage, /Inventario.*Existencias/);
  assert.match(insumosPage, /onReintentar=\{cargar\}/);
  assert.doesNotMatch(insumosPage, /codigo_sku|stock_minimo/);
  assert.match(insumosPage, /factor_conversion/);

  // 4. CatalogoProductosPage: alternancia de vistas, precio con formato sin pérdida, filtro y botón de receta
  assert.match(productosPage, /vista === 'tabla'/);
  assert.match(productosPage, /vista === 'cuadricula'/);
  assert.match(productosPage, /formatoDinero\(p\.precio_venta\)/);
  assert.match(productosPage, /\/catalogo\/productos\/\$\{p\.id_producto\}\/receta/);
  assert.match(productosPage, /Elaborado \(Receta\)/);
  assert.match(productosPage, /Reventa/);

  // 5. EditorRecetasPage: dos paneles, simulador financiero, simulador de disponibilidad con cuello de botella
  assert.match(recetasPage, /lg:grid-cols-\[2fr_3fr\]/);
  assert.match(recetasPage, /Simulador Financiero/);
  assert.match(recetasPage, /Disponibilidad Operativa/);
  assert.match(recetasPage, /cuelloDeBotella/);
  assert.match(recetasPage, /Math\.round\(cant \* costoUnit \* 10000\) \/ 10000/);

  // 6. Ninguna pantalla de catálogo debe importar datos ficticios.
  for (const pagina of [insumosPage, productosPage, recetasPage]) assert.doesNotMatch(pagina, /mockData/);
  assert.match(productosPage, /Sin receta/);
  assert.match(productosPage, /filtroReceta/);
  assert.match(productosPage, /n_ingredientes/);
});

test('inventario: rutas de unidades-medida soportan endpoints REST completos con RBAC', async () => {
  const [routes, api] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.routes.js'),
    leer('frontend/src/modules/inventario/inventarioApi.js'),
  ]);

  // Backend expone /unidades-medida en GET, POST, PUT y DELETE
  assert.match(routes, /router\.get\('\/unidades-medida'/);
  assert.match(routes, /router\.post\('\/unidades-medida'/);
  assert.match(routes, /router\.put\('\/unidades-medida\/:id'/);
  assert.match(routes, /router\.delete\('\/unidades-medida\/:id'/);

  // Frontend consume la ruta exacta sin 404
  assert.match(api, /api\.get\('\/inventario\/unidades-medida'\)/);
  assert.match(api, /api\.post\('\/inventario\/unidades-medida'/);
  assert.match(api, /api\.put\(`\/inventario\/unidades-medida\/\$\{id\}`/);
  assert.match(api, /api\.delete\(`\/inventario\/unidades-medida\/\$\{id\}`/);
});

test('inventario: validación de unidad de medida normaliza códigos y factor de conversión', async () => {
  const { unidadSchema, actualizarUnidadSchema } = await import('../backend/src/modules/inventario/inventario.schemas.js');

  const creada = unidadSchema.parse({ codigo: 'kg', nombre: 'Kilogramo', factor_conversion: '1000.0000' });
  assert.equal(creada.codigo, 'KG');
  assert.equal(creada.nombre, 'Kilogramo');
  assert.equal(creada.factor_conversion, '1000.0000');
  assert.equal(creada.activo, true);

  const desactivada = actualizarUnidadSchema.parse({ activo: false });
  assert.equal(desactivada.activo, false);
});

