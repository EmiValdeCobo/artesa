import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { menu, grupoDeRuta, esItemActivo } from '../frontend/src/config/menu.js';
import { estadoPlanilla } from '../frontend/src/modules/rrhh/planillaUtils.js';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('planilla detalle: App.jsx registra rrhh/planillas/:idPlanilla con RRHH_VER_PLANILLA y carga perezosa', async () => {
  const app = await leer('frontend/src/App.jsx');
  assert.match(app, /const PlanillaDetallePage = lazy\(\(\) => import\('\.\/modules\/rrhh\/PlanillaDetallePage\.jsx'\)\)/);
  assert.match(app, /path="rrhh\/planillas\/:idPlanilla"\s+element=\{\s*<ProtectedRoute\s+permiso="RRHH_VER_PLANILLA">\s*<PlanillaDetallePage\s*\/>/);
});

test('planilla detalle: el ítem "Planilla" y el grupo RR. HH. quedan activos en /rrhh/planillas/5', () => {
  const gestion = menu.find((e) => e.seccion === 'Gestión');
  const rrhh = gestion.items.find((i) => i.id === 'rrhh');
  const planilla = rrhh.hijos.find((h) => h.texto === 'Planilla');

  assert.equal(planilla.end, true, '/rrhh debe conservar end: true');
  assert.equal(esItemActivo(planilla, '/rrhh/planillas/5'), true);
  assert.equal(esItemActivo(planilla, '/rrhh'), true);
  assert.equal(esItemActivo(planilla, '/rrhh/empleados'), false);
  assert.equal(esItemActivo(planilla, '/rrhh/puestos'), false);
  assert.equal(grupoDeRuta(menu, '/rrhh/planillas/5'), 'rrhh');
  assert.equal(grupoDeRuta(menu, '/rrhh/empleados'), 'rrhh');
});

test('planilla detalle: estadoPlanilla distingue procesada, calculada y sin calcular', () => {
  assert.equal(estadoPlanilla({ procesada: true, empleados: 3 }).texto, 'Procesada');
  assert.equal(estadoPlanilla({ procesada: true, empleados: 0 }).tipo, 'exito');
  assert.equal(estadoPlanilla({ procesada: false, empleados: 2 }).texto, 'Calculada');
  assert.equal(estadoPlanilla({ procesada: false, empleados: '4' }).tipo, 'info');
  assert.equal(estadoPlanilla({ procesada: false, empleados: 0 }).texto, 'Sin calcular');
  assert.equal(estadoPlanilla({}).tipo, 'aviso');
});

test('planilla detalle: sin parseFloat ni sumas de dinero en JS; totales vienen de SQL', async () => {
  const [detalle, utils] = await Promise.all([
    leer('frontend/src/modules/rrhh/PlanillaDetallePage.jsx'),
    leer('frontend/src/modules/rrhh/planillaUtils.js'),
  ]);
  for (const src of [detalle, utils]) {
    assert.doesNotMatch(src, /parseFloat\(/);
    assert.doesNotMatch(src, /\.reduce\(/);
  }
  assert.match(detalle, /totales\.salario_neto/);
  assert.match(detalle, /'Total planilla'/);
});
