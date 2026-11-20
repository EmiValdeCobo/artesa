import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('rrhh frontend: App.jsx registra y protege las rutas de RRHH con sus permisos', async () => {
  const app = await leer('frontend/src/App.jsx');
  assert.match(app, /path="rrhh\/empleados"\s+element=\{\s*<ProtectedRoute\s+permiso="RRHH_GESTIONAR_EMPLEADOS">\s*<EmpleadosPage\s*\/>/);
  assert.match(app, /path="rrhh\/puestos"\s+element=\{\s*<ProtectedRoute\s+permiso="RRHH_GESTIONAR_EMPLEADOS">\s*<PuestosPage\s*\/>/);
  assert.match(app, /path="rrhh"\s+element=\{\s*<ProtectedRoute\s+permiso="RRHH_VER_PLANILLA">\s*<PlanillasPage\s*\/>/);
});

test('rrhh frontend: rrhhApi expone todos los métodos para puestos, empleados y planillas', async () => {
  const apiFile = await leer('frontend/src/api/rrhh.api.js');
  // Puestos
  assert.match(apiFile, /listarPuestos:\s*\(opciones\)\s*=>\s*api\.get\('\/rrhh\/puestos'/);
  assert.match(apiFile, /crearPuesto:\s*\(datos,\s*opciones\)\s*=>\s*api\.post\('\/rrhh\/puestos'/);
  assert.match(apiFile, /actualizarPuesto:\s*\(id,\s*datos,\s*opciones\)\s*=>\s*api\.put\(`\/rrhh\/puestos\/\$\{id\}`/);
  assert.match(apiFile, /desactivarPuesto:\s*\(id,\s*opciones\)\s*=>\s*api\.delete\(`\/rrhh\/puestos\/\$\{id\}`/);
  assert.match(apiFile, /activarPuesto:\s*\(id,\s*opciones\)\s*=>\s*api\.patch\(`\/rrhh\/puestos\/\$\{id\}\/activar`/);

  // Empleados
  assert.match(apiFile, /listarEmpleados:\s*\(opciones\)\s*=>\s*api\.get\('\/rrhh\/empleados'/);
  assert.match(apiFile, /crearEmpleado:\s*\(datos,\s*opciones\)\s*=>\s*api\.post\('\/rrhh\/empleados'/);
  assert.match(apiFile, /actualizarEmpleado:\s*\(id,\s*datos,\s*opciones\)\s*=>\s*api\.put\(`\/rrhh\/empleados\/\$\{id\}`/);
  assert.match(apiFile, /desactivarEmpleado:\s*\(id,\s*opciones\)\s*=>\s*api\.delete\(`\/rrhh\/empleados\/\$\{id\}`/);
  assert.match(apiFile, /activarEmpleado:\s*\(id,\s*opciones\)\s*=>\s*api\.patch\(`\/rrhh\/empleados\/\$\{id\}\/activar`/);

  // Planillas
  assert.match(apiFile, /listarPlanillas:\s*\(filtros\s*=\s*\{\},\s*opciones\)\s*=>/);
  assert.match(apiFile, /obtenerPlanilla:\s*\(id,\s*opciones\)\s*=>\s*api\.get\(`\/rrhh\/planillas\/\$\{id\}`/);
  assert.match(apiFile, /crearPlanilla:\s*\(datos,\s*opciones\)\s*=>\s*api\.post\('\/rrhh\/planillas'/);
  assert.match(apiFile, /calcularPlanilla:\s*\(id,\s*opciones\)\s*=>\s*api\.post\(`\/rrhh\/planillas\/\$\{id\}\/calculo`/);
  assert.match(apiFile, /procesarPlanilla:\s*\(id,\s*opciones\)\s*=>\s*api\.post\(`\/rrhh\/planillas\/\$\{id\}\/procesamiento`/);
});

test('rrhh frontend: PuestosPage, EmpleadosPage y PlanillasPage respetan la regla anti-float', async () => {
  const [puestos, empleados, planillas] = await Promise.all([
    leer('frontend/src/modules/rrhh/PuestosPage.jsx'),
    leer('frontend/src/modules/rrhh/EmpleadosPage.jsx'),
    leer('frontend/src/modules/rrhh/PlanillasPage.jsx'),
  ]);

  assert.doesNotMatch(puestos, /parseFloat\(/, 'No debe usarse parseFloat en PuestosPage');
  assert.doesNotMatch(empleados, /parseFloat\(/, 'No debe usarse parseFloat en EmpleadosPage');
  assert.doesNotMatch(planillas, /parseFloat\(/, 'No debe usarse parseFloat en PlanillasPage');
});

test('rrhh frontend: todos los iconos de lucide-react usados en los módulos de RRHH están importados', async () => {
  const archivos = [
    'frontend/src/modules/rrhh/PuestosPage.jsx',
    'frontend/src/modules/rrhh/EmpleadosPage.jsx',
    'frontend/src/modules/rrhh/PlanillasPage.jsx',
  ];

  for (const archivo of archivos) {
    const contenido = await leer(archivo);
    const importMatch = contenido.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
    assert.ok(importMatch, `Debe existir importación de lucide-react en ${archivo}`);
    const importados = new Set(
      importMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // Verificar que los JSX usan identificadores importados
    const tagsUsados = [...contenido.matchAll(/<([A-Z][A-Za-z0-9]+)\s/g)].map((m) => m[1]);
    for (const tag of tagsUsados) {
      if (['Button', 'Card', 'Table', 'Select', 'Spinner', 'BotonIcono', 'Dialogo', 'BannerError', 'EstadoBadge', 'EstadoVacio', 'EncabezadoPagina', 'Metrica', 'Link'].includes(tag)) {
        continue;
      }
      assert.ok(importados.has(tag), `Icono ${tag} en ${archivo} debe estar importado de lucide-react`);
    }
  }
});
