// test/frontend-preparacion-dnd.test.js
// Pruebas unitarias de la lógica pura de arrastrar y soltar (DnD) para la cola de preparación (KDS)
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  esMovimientoValido,
  rutaDeEstados,
  moverOrdenOptimista,
  reconciliarCola,
  GestorSincronizacion,
  ESTADOS_ORDEN,
  COLUMNAS_KDS,
  RETARDO_SINCRONIZACION_MS,
  MENSAJES_DND,
} from '../frontend/src/modules/pos/preparacionDnd.js';

const raiz = join(import.meta.dirname, '..');
const leer = (rel) => readFile(join(raiz, rel), 'utf8');

// --- 1. Constantes y estados ---
test('dnd: define estados y columnas compatibles con KDS', () => {
  assert.deepEqual(ESTADOS_ORDEN, ['ABIERTA', 'EN_PREPARACION', 'LISTA', 'ENTREGADA']);
  assert.deepEqual(COLUMNAS_KDS, ['ABIERTA', 'EN_PREPARACION', 'LISTA']);
  assert.equal(RETARDO_SINCRONIZACION_MS, 600);
});

// --- 2. Validación de movimientos ---
test('dnd: valida movimientos hacia adelante válidos', () => {
  // Movimientos de 1 paso
  assert.equal(esMovimientoValido('ABIERTA', 'EN_PREPARACION'), true);
  assert.equal(esMovimientoValido('EN_PREPARACION', 'LISTA'), true);
  assert.equal(esMovimientoValido('LISTA', 'ENTREGADA'), true);

  // Salto de paso permitido para UI (se traduce en 2 llamadas API)
  assert.equal(esMovimientoValido('ABIERTA', 'LISTA'), true);
});

test('dnd: rechaza movimientos inválidos, retrocesos o mismo estado', () => {
  // Mismo estado
  assert.equal(esMovimientoValido('ABIERTA', 'ABIERTA'), false);
  assert.equal(esMovimientoValido('EN_PREPARACION', 'EN_PREPARACION'), false);
  assert.equal(esMovimientoValido('LISTA', 'LISTA'), false);

  // Retrocesos
  assert.equal(esMovimientoValido('LISTA', 'EN_PREPARACION'), false);
  assert.equal(esMovimientoValido('LISTA', 'ABIERTA'), false);
  assert.equal(esMovimientoValido('EN_PREPARACION', 'ABIERTA'), false);

  // Entregada solo permitida desde LISTA
  assert.equal(esMovimientoValido('ABIERTA', 'ENTREGADA'), false);
  assert.equal(esMovimientoValido('EN_PREPARACION', 'ENTREGADA'), false);

  // Estados nulos o desconocidos
  assert.equal(esMovimientoValido(null, 'LISTA'), false);
  assert.equal(esMovimientoValido('ABIERTA', 'DESCONOCIDO'), false);
});

// --- 3. Cálculo de ruta multi-paso ---
test('dnd: rutaDeEstados calcula secuencia secuencial requerida por la API', () => {
  assert.deepEqual(rutaDeEstados('ABIERTA', 'EN_PREPARACION'), ['EN_PREPARACION']);
  assert.deepEqual(rutaDeEstados('EN_PREPARACION', 'LISTA'), ['LISTA']);
  assert.deepEqual(rutaDeEstados('LISTA', 'ENTREGADA'), ['ENTREGADA']);

  // Salto multi-paso: ABIERTA -> LISTA requiere EN_PREPARACION primero y luego LISTA
  assert.deepEqual(rutaDeEstados('ABIERTA', 'LISTA'), ['EN_PREPARACION', 'LISTA']);

  // Movimientos no válidos retornan arreglo vacío
  assert.deepEqual(rutaDeEstados('LISTA', 'EN_PREPARACION'), []);
  assert.deepEqual(rutaDeEstados('ABIERTA', 'ABIERTA'), []);
});

// --- 4. Actualización optimista ---
test('dnd: moverOrdenOptimista actualiza el estado de la orden inmutablemente', () => {
  const colaInicial = [
    { id_orden: 101, estado: 'ABIERTA', cliente: 'Mesa 1' },
    { id_orden: 102, estado: 'EN_PREPARACION', cliente: 'Para llevar' },
  ];

  const resultado = moverOrdenOptimista(colaInicial, 101, 'EN_PREPARACION');
  assert.equal(resultado.find((o) => o.id_orden === 101).estado, 'EN_PREPARACION');
  assert.equal(colaInicial[0].estado, 'ABIERTA', 'no debe mutar el arreglo original');
});

test('dnd: moverOrdenOptimista con ENTREGADA retira la orden de la cola activa', () => {
  const colaInicial = [
    { id_orden: 201, estado: 'LISTA', cliente: 'Mesa 3' },
    { id_orden: 202, estado: 'ABIERTA', cliente: 'Mesa 4' },
  ];

  const resultado = moverOrdenOptimista(colaInicial, 201, 'ENTREGADA');
  assert.equal(resultado.length, 1);
  assert.equal(resultado.some((o) => o.id_orden === 201), false);
});

// --- 5. Reconciliación con polling sin pisar estado pendiente ---
test('dnd: reconciliarCola preserva órdenes con sincronización pendiente', () => {
  const colaLocal = [
    { id_orden: 301, estado: 'LISTA', cliente: 'Mesa 5' }, // Movida optimista a LISTA
    { id_orden: 302, estado: 'EN_PREPARACION', cliente: 'Mesa 6' },
  ];

  const colaServidor = [
    { id_orden: 301, estado: 'ABIERTA', cliente: 'Mesa 5' }, // Servidor aún reporta ABIERTA
    { id_orden: 302, estado: 'LISTA', cliente: 'Mesa 6' }, // Servidor avanzó otra orden
  ];

  const idsPendientes = new Set([301]);

  const reconciliada = reconciliarCola(colaLocal, colaServidor, idsPendientes);
  const orden301 = reconciliada.find((o) => o.id_orden === 301);
  const orden302 = reconciliada.find((o) => o.id_orden === 302);

  assert.equal(orden301.estado, 'LISTA', 'preserva el estado local optimista de la orden pendiente');
  assert.equal(orden302.estado, 'LISTA', 'toma el estado fresco del servidor para órdenes no pendientes');
});

// --- 6. Gestor de sincronización con debounce y ejecución secuencial ---
test('dnd: varios movimientos seguidos de la misma orden producen UNA sola secuencia final', async () => {
  const llamadasApi = [];
  const apiCambiarEstado = async (id, estado) => {
    llamadasApi.push({ id, estado });
    return { ok: true };
  };

  const exitos = [];
  const gestor = new GestorSincronizacion({
    apiCambiarEstado,
    retardoMs: 40,
    alExito: (id, final) => exitos.push({ id, final }),
  });

  // Movimiento 1: ABIERTA -> EN_PREPARACION
  gestor.programar(401, 'ABIERTA', 'EN_PREPARACION');
  assert.equal(gestor.esPendiente(401), true);

  // Movimiento 2 (antes de vencer el temporizador): pasa a LISTA
  gestor.programar(401, 'EN_PREPARACION', 'LISTA');

  // Esperar a que venza el debounce
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Debe haber ejecutado la ruta secuencial ABIERTA -> EN_PREPARACION -> LISTA
  assert.deepEqual(llamadasApi, [
    { id: 401, estado: 'EN_PREPARACION' },
    { id: 401, estado: 'LISTA' },
  ]);

  // Una sola notificación de éxito final
  assert.deepEqual(exitos, [{ id: 401, final: 'LISTA' }]);
  assert.equal(gestor.esPendiente(401), false);
});

test('dnd: si el movimiento falla, se detiene la secuencia y notifica error', async () => {
  const llamadasApi = [];
  const apiCambiarEstado = async (id, estado) => {
    llamadasApi.push({ id, estado });
    if (estado === 'EN_PREPARACION') {
      const err = new Error('409 Conflicto de estado concurrente');
      err.status = 409;
      throw err;
    }
  };

  let errorCapturado = null;
  const gestor = new GestorSincronizacion({
    apiCambiarEstado,
    retardoMs: 20,
    alError: (id, err, origen) => {
      errorCapturado = { id, err, origen };
    },
  });

  gestor.programar(501, 'ABIERTA', 'LISTA');

  await new Promise((resolve) => setTimeout(resolve, 60));

  // Solo intentó el primer paso y se detuvo
  assert.equal(llamadasApi.length, 1);
  assert.equal(llamadasApi[0].estado, 'EN_PREPARACION');
  assert.ok(errorCapturado);
  assert.equal(errorCapturado.id, 501);
  assert.equal(errorCapturado.origen, 'ABIERTA');
});

// --- 7. Contrato estático: PreparacionPage conserva botones y componentes accesibles ---
test('dnd contrato: PreparacionPage.jsx conserva botones de avance accesibles', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(src, /onAvanzar/, 'mantiene la prop onAvanzar');
  assert.match(src, /<button[^>]*type="button"/, 'mantiene botones accesibles en las tarjetas');
  assert.match(src, /useArrastrarTarjetas|preparacionDnd/, 'integra lógica de arrastrar');
  assert.match(src, /cursor-grab/, 'define cursor-grab');
  assert.match(src, /cursor-grabbing/, 'define cursor-grabbing');
  assert.match(src, /MENSAJES_DND|Solo se puede avanzar/, 'aviso de movimiento inválido');
});
