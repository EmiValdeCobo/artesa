import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('reportes: usa el formateador compartido sin referencias al nombre retirado', async () => {
  const page = await leer('frontend/src/modules/reportes/ReportesPage.jsx');
  assert.doesNotMatch(page, /\bformatearDinero\b/);
  assert.match(page, /import \{[^}]*formatoDinero[^}]*\} from '..\/..\/utils\/formato.js'/);
});

test('reportes: reutiliza consultas exitosas, caduca la caché y reintenta fallos', async () => {
  const page = await leer('frontend/src/modules/reportes/ReportesPage.jsx');
  const cuerpo = page.slice(page.indexOf('  async function cargar('), page.indexOf('\n  useEffect(', page.indexOf('  async function cargar(')));
  const cacheReportes = { current: new Map() };
  const controladorCarga = { current: null };
  let peticiones = 0;
  let fallar = false;
  let datos;
  let errores;
  const api = { get: async () => { peticiones++; if (fallar) throw new Error('sin red'); return []; } };
  const cargar = new Function('api', 'cacheReportes', 'controladorCarga', 'setDatos', 'setErrores', 'setCargando', 'diasEntre', 'puedeVerMargen', 'puedeVerCuadres', 'puedeVerCuentas', `${cuerpo}; return cargar;`)(api, cacheReportes, controladorCarga, (valor) => { datos = valor; }, (valor) => { errores = valor; }, () => {}, () => 1, false, false, false);
  const filtros = { desde: '2026-11-01', hasta: '2026-11-02', idSucursal: '' };
  await cargar(filtros);
  assert.equal(peticiones, 4);
  await cargar(filtros);
  assert.equal(peticiones, 4);
  assert.deepEqual(datos.ventas, []);
  assert.deepEqual(errores, []);
  for (const entrada of cacheReportes.current.values()) entrada.hasta = 0;
  await cargar(filtros);
  assert.equal(peticiones, 8);
  fallar = true;
  await cargar({ ...filtros, idSucursal: '2' });
  assert.equal(errores.length, 4);
  fallar = false;
  await cargar({ ...filtros, idSucursal: '2' });
  assert.equal(peticiones, 16);
  await cargar({ ...filtros, desde: '2026-11-03' });
  assert.equal(peticiones, 16);
});

test('sucursales: el directorio conserva el CRUD, filtra localmente y reutiliza el diálogo y métricas', async () => {
  const page = await leer('frontend/src/modules/empresa/SucursalesPage.jsx');
  assert.match(page, /api\.get\('\/empresa\/sucursales'/);
  assert.match(page, /api\.post\('\/empresa\/sucursales'/);
  assert.match(page, /api\.put\(`\/empresa\/sucursales\//);
  assert.match(page, /api\.patch\(`\/empresa\/sucursales\//);
  assert.match(page, /useMemo\(/);
  assert.match(page, /<Dialogo/);
  assert.match(page, /<Metrica/);
  assert.match(page, /<BannerError/);
});

test('reportes: los informes extendidos exigen permisos específicos además del permiso general', async () => {
  const routes = await leer('backend/src/modules/reportes/reportes.routes.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\), requirePermiso\('REP_VER_DASHBOARD'\)\)/);
  assert.match(routes, /router\.get\('\/cuadre-turnos', requirePermiso\('CAJA_VER_CUADRES'\)/);
  assert.match(routes, /router\.get\('\/ventas-por-metodo-pago'/);
  assert.match(routes, /router\.get\('\/cuentas-por-pagar', requirePermiso\('COM_VER_CXP'\)/);
  assert.match(routes, /router\.get\('\/margen-productos', requirePermiso\('INV_VER_COSTOS'\)/);
  assert.doesNotMatch(routes, /router\.(post|put|patch|delete)/);
});

test('reportes: las consultas nuevas limitan los datos a sucursales visibles y acotan resultados', async () => {
  const repo = await leer('backend/src/modules/reportes/reportes.repository.js');
  const cxpRepo = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  assert.match(repo, /FROM reportes\.vw_cuadre_turno q/);
  assert.match(repo, /GROUP BY s\.id_sucursal, s\.nombre, v\.fecha_emision::date/);
  assert.match(repo, /JOIN visibles s ON s\.id_sucursal = ss\.id_sucursal/);
  assert.match(repo, /FROM pos\.pagos p/);
  assert.match(repo, /q\.id_sucursal IN \(SELECT id_sucursal FROM visibles/);
  assert.match(repo, /listarCuentasPorPagar\(idUsuario, \{ \.\.\.filtros, estado: 'pendientes', periodoRecientePorDefecto: true \}\)/);
  assert.match(cxpRepo, /JOIN visibles s ON s\.id_sucursal = f\.id_sucursal/);
  assert.match(cxpRepo, /\$6::text = 'pendientes'/);
  assert.match(cxpRepo, /LIMIT \$7::int OFFSET \$8::int/);
  assert.doesNotMatch(cxpRepo, /LIMIT 500/);
  assert.equal((repo.match(/LIMIT 500/g) || []).length, 1);
});

test('reportes UI: agrega visualizaciones, paginación y condiciona los datos sensibles por permiso', async () => {
  const page = await leer('frontend/src/modules/reportes/ReportesPage.jsx');
  assert.match(page, /api\.get\(`\/reportes\/ventas-por-metodo-pago\?\$\{query\}`/);
  assert.match(page, /function ResumenMetodosPago/);
  assert.match(page, /api\.get\(`\/reportes\/cuadre-turnos\?\$\{query\}`/);
  assert.match(page, /api\.get\(`\/reportes\/cuentas-por-pagar\?\$\{query\}`/);
  assert.match(page, /if \(puedeVerMargen\)/);
  assert.match(page, /if \(puedeVerCuadres\)/);
  assert.match(page, /if \(puedeVerCuentas\)/);
  assert.match(page, /import GraficaTendencia, \{ LeyendaTendencia \} from '\.\/GraficaTendencia\.jsx'/);
  const grafica = await leer('frontend/src/modules/reportes/GraficaTendencia.jsx');
  assert.match(grafica, /calcularEje/);
  assert.match(grafica, /promedio/i);
  assert.match(grafica, /Hoy \(en curso\)/);
  assert.match(page, /function TablaPaginada/);
  assert.match(page, /function tieneDiferenciaTurno/);
  assert.match(page, /function desviacionAbsolutaTurno/);
  assert.match(page, /BigInt/);
  assert.match(page, /text\/csv;charset=utf-8/);
});
