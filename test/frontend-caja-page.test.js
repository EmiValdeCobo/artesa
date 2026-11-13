import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('caja frontend: App.jsx registra y protege la ruta /caja con CAJA_ABRIR_TURNO', async () => {
  const app = await leer('frontend/src/App.jsx');
  assert.match(app, /import\s+CajaPage\s+from\s+['"]\.\/modules\/caja\/CajaPage\.jsx['"]/);
  assert.match(app, /path="caja"\s+element=\{\s*<ProtectedRoute\s+permiso="CAJA_ABRIR_TURNO">\s*<CajaPage\s*\/>/);
});

test('caja frontend: cajaApi expone todos los métodos del contrato de backend', async () => {
  const apiFile = await leer('frontend/src/api/caja.api.js');
  assert.match(apiFile, /listarCajas:\s*\(opciones\)\s*=>\s*api\.get\('\/cajas'/);
  assert.match(apiFile, /obtenerTurnoActual:\s*\(opciones\)\s*=>\s*api\.get\('\/turnos\/actual'/);
  assert.match(apiFile, /abrirTurno:\s*\(datos,\s*opciones\)\s*=>\s*api\.post\('\/turnos'/);
  assert.match(apiFile, /listarMovimientos:\s*\(idTurno,\s*opciones\)\s*=>\s*api\.get\(`\/turnos\/\$\{idTurno\}\/movimientos`/);
  assert.match(apiFile, /registrarMovimiento:\s*\(idTurno,\s*datos,\s*opciones\)\s*=>\s*api\.post\(`\/turnos\/\$\{idTurno\}\/movimientos`/);
  assert.match(apiFile, /cerrarTurno:\s*\(idTurno,\s*datos,\s*opciones\)\s*=>\s*api\.post\(`\/turnos\/\$\{idTurno\}\/cierre`/);
  assert.match(apiFile, /obtenerCuadre:\s*\(idTurno,\s*opciones\)\s*=>\s*api\.get\(`\/turnos\/\$\{idTurno\}\/cuadre`/);
  assert.match(apiFile, /listarCuadres:\s*\(filtros\s*=\s*\{\},\s*opciones\)\s*=>/);
});

test('caja frontend: CajaPage respeta la regla anti-float en cálculos y montos', async () => {
  const cajaPage = await leer('frontend/src/modules/caja/CajaPage.jsx');
  assert.doesNotMatch(cajaPage, /parseFloat\(/, 'No debe usarse parseFloat en CajaPage');
  assert.match(cajaPage, /PATRON_MONTO\s*=\s*\/\^\\d\{1,8\}\(\\.\\d\{1,2\}\)\?\$\//);
});

test('caja frontend: CajaPage maneja los flujos de apertura, movimientos, cierre y cuadre', async () => {
  const cajaPage = await leer('frontend/src/modules/caja/CajaPage.jsx');

  // Integración con cajaApi
  assert.match(cajaPage, /cajaApi\.obtenerTurnoActual\(\)/);
  assert.match(cajaPage, /cajaApi\.abrirTurno\(/);
  assert.match(cajaPage, /cajaApi\.registrarMovimiento\(/);
  assert.match(cajaPage, /cajaApi\.cerrarTurno\(/);
  assert.match(cajaPage, /cajaApi\.obtenerCuadre\(/);

  // Manejo de estado sin turno (404)
  assert.match(cajaPage, /err\.status\s*===\s*404/);

  // Componentes de feedback y diálogo
  assert.match(cajaPage, /<Dialogo/);
  assert.match(cajaPage, /<BannerError/);
  assert.match(cajaPage, /<Metrica/);
  assert.match(cajaPage, /<Table/);

  // Permisos granulares
  assert.match(cajaPage, /tiene\('CAJA_ABRIR_TURNO'\)/);
  assert.match(cajaPage, /tiene\('CAJA_MOVIMIENTOS'\)/);
  assert.match(cajaPage, /tiene\('CAJA_CERRAR_TURNO'\)/);
  assert.match(cajaPage, /tiene\('CAJA_VER_CUADRES'\)/);
});

test('caja frontend: todos los iconos de lucide-react usados en CajaPage están importados', async () => {
  const cajaPage = await leer('frontend/src/modules/caja/CajaPage.jsx');
  const importMatch = cajaPage.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  assert.ok(importMatch, 'Debe existir importación de lucide-react');
  const importados = new Set(
    importMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  assert.ok(importados.has('AlertTriangle'), 'AlertTriangle debe estar importado');
  assert.ok(importados.has('CheckCircle2'), 'CheckCircle2 debe estar importado');
  assert.ok(importados.has('AlertCircle'), 'AlertCircle debe estar importado');
  assert.ok(importados.has('Wallet'), 'Wallet debe estar importado');
  assert.ok(importados.has('Eye'), 'Eye debe estar importado');
});
