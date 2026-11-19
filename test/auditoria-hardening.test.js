import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const leer = (rel) => fs.readFile(rel, 'utf8');

test('AUDITORIA D1: el arranque en producción se bloquea si queda la contraseña demo', async () => {
  const [server, guardia, schema] = await Promise.all([
    leer('backend/src/server.js'),
    leer('backend/src/utils/contrasenaDemo.js'),
    leer('database/init/01_schema.sql'),
  ]);
  assert.match(server, /await exigirSinContrasenasDemo\(\{ esProduccion: env\.isProduction \}\)/);
  assert.match(server, /process\.exit\(1\)/);
  assert.match(guardia, /if \(!esProduccion\) return;/);
  assert.match(guardia, /bcrypt\.compare\(CONTRASENA_DEMO/);
  // La guardia debe vigilar la misma contraseña que siembra el schema.
  const contrasena = /CONTRASENA_DEMO = '([^']+)'/.exec(guardia)[1];
  assert.ok(schema.includes(`crypt('${contrasena}'`));
});

test('AUDITORIA D2-D4/C9: hardening del backend', async () => {
  const [app, auth, servicio] = await Promise.all([
    leer('backend/src/app.js'),
    leer('backend/src/middlewares/auth.js'),
    leer('backend/src/modules/auth/auth.service.js'),
  ]);
  assert.match(app, /express\.json\(\{ limit: '100kb' \}\)/);
  assert.match(app, /app\.use\('\/api', limitadorGlobal, routes\)/);
  assert.match(auth, /algorithms: \['HS256'\]/);
  assert.match(auth, /payload\.tipo !== 'admin'/);
  assert.match(servicio, /algorithm: 'HS256'/);
});

test('AUDITORIA DEP1: versiones parcheadas declaradas', async () => {
  const front = JSON.parse(await leer('frontend/package.json'));
  const workspace = await leer('pnpm-workspace.yaml');
  assert.match(front.dependencies['react-router-dom'], /^\^7\.18\.[2-9]/);
  assert.match(front.devDependencies.vite, /^\^6\.4\.[5-9]/);
  assert.match(workspace, /uuid@<11\.1\.1: \^11\.1\.1/);
});
