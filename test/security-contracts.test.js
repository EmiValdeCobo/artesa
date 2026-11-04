import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('el cliente conserva el error string del backend y usa cookies', async () => {
  const source = await leer('frontend/src/api/client.js');
  assert.match(source, /typeof data\?\.error === 'string'/);
  assert.match(source, /credentials: 'include'/);
});

test('administración exige tipo admin y revalidación activa', async () => {
  const routes = await leer('backend/src/modules/seguridad/seguridad.routes.js');
  const auth = await leer('backend/src/middlewares/auth.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\)\)/);
  assert.match(auth, /activo: true/);
});

test('runner de base de datos registra checksum e idempotencia', async () => {
  const source = await leer('scripts/db.js');
  assert.match(source, /schema_migrations/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /Omitiendo/);
});
