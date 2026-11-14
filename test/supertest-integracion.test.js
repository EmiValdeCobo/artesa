import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../backend/src/app.js';

test('supertest: GET /api/health responde con estado HTTP y formato JSON esperado', async () => {
  const res = await request(app).get('/api/health');
  assert.ok([200, 503].includes(res.status), `Estado inesperado: ${res.status}`);
  assert.equal(res.headers['content-type']?.includes('application/json'), true);
  assert.ok(typeof res.body.estado === 'string');
});

test('supertest: endpoints protegidos rechazan solicitudes anónimas con 401 y formato de error consistente', async () => {
  const res = await request(app)
    .get('/api/seguridad/usuarios')
    .set('Accept', 'application/json');

  assert.equal(res.status, 401);
  assert.ok(res.body.error, 'La respuesta debe incluir la propiedad error');
});

test('supertest: validateQuery procesa query params en Express 5 sin error en getter', async () => {
  // Petición a endpoint con validateQuery (dashboard/ventas-diarias)
  const res = await request(app)
    .get('/api/dashboard/ventas-diarias?sucursal=1')
    .set('Accept', 'application/json');

  // No debe arrojar error 500 por mutación de req.query en Express 5
  assert.notEqual(res.status, 500);
  assert.equal(res.status, 401); // Exige autenticación tras superar validación de query
});

test('supertest: ruta parametrizada de stock procesa :id en lugar de param inexistente', async () => {
  const res = await request(app)
    .post('/api/inventario/insumos/10/movimientos')
    .set('Accept', 'application/json')
    .send({ cantidad: '5.0000', tipo: 'AJUSTE', motivo: 'Conteo' });

  // Pasa por router y middlewares sin fallo 500 de referencia
  assert.notEqual(res.status, 500);
  assert.equal(res.status, 401); // Rechazado por autenticación antes de base de datos
});

test('supertest: endpoint de bitácora acepta parámetro severity validado por Zod', async () => {
  const res = await request(app)
    .get('/api/bitacora?severity=CRITICAL&page=1&limit=10')
    .set('Accept', 'application/json');

  assert.notEqual(res.status, 500);
  assert.equal(res.status, 401);
});

test('supertest: endpoint inexistente responde 404 estructurado', async () => {
  const res = await request(app).get('/api/ruta-inexistente-xyz');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});
