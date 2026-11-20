import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuery } from '../backend/src/middlewares/validate.js';

test('validateQuery: redefine req.query con Object.defineProperty sin mutar propiedades directamente', () => {
  const schemaMock = {
    safeParse(data) {
      return {
        success: true,
        data: {
          limite: Number(data.limite || 10),
          filtro: data.filtro ?? null,
        },
      };
    },
  };

  const middleware = validateQuery(schemaMock);

  // Simular req.query con getter tipo Express 5
  let queryData = { limite: '25', filtro: 'activo' };
  const req = {};
  Object.defineProperty(req, 'query', {
    get() {
      return queryData;
    },
    set(v) {
      queryData = v;
    },
    configurable: true,
    enumerable: true,
  });

  let nextCalled = false;
  middleware(req, {}, (err) => {
    assert.equal(err, undefined);
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.validatedQuery, { limite: 25, filtro: 'activo' });
  assert.deepEqual(req.query, { limite: 25, filtro: 'activo' });
  assert.equal(req.query.limite, 25);
});
