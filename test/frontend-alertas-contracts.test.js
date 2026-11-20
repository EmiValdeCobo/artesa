// test/frontend-alertas-contracts.test.js
// Contratos de arquitectura para el sistema de alertas, toasts y notificaciones de acción en frontend
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const leer = (rel) => readFile(join(raiz, rel), 'utf8');

// --- 1. Toasts por encima de modales y drawers ---
test('alertas: Toasts.jsx tiene z-index mayor que Dialogo.jsx y drawers (z-[100])', async () => {
  const toastsSrc = await leer('frontend/src/components/feedback/Toasts.jsx');
  const dialogoSrc = await leer('frontend/src/components/Dialogo.jsx');
  const drawerSrc = await leer('frontend/src/modules/inventario/InsumoDrawer.jsx');

  assert.match(toastsSrc, /z-\[100\]|z-\[9999\]/, 'Toasts debe tener z-[100] o superior');
  assert.match(dialogoSrc, /z-\[60\]/, 'Dialogo usa z-[60]');
  assert.match(drawerSrc, /z-\[70\]/, 'InsumoDrawer usa z-[70]');
});

// --- 2. Accesibilidad de Toasts (aria-live) ---
test('alertas: Toasts.jsx define regiones aria-live assertive para errores y polite para éxitos', async () => {
  const toastsSrc = await leer('frontend/src/components/feedback/Toasts.jsx');
  assert.match(toastsSrc, /aria-live="assertive"/, 'debe tener región assertive');
  assert.match(toastsSrc, /aria-live="polite"/, 'debe tener región polite');
  assert.match(toastsSrc, /role="alert"/, 'debe tener role alert');
  assert.match(toastsSrc, /role="status"/, 'debe tener role status');
});

// --- 3. Duración de los toasts en AlertProvider ---
test('alertas: AlertProvider define duración ~4 s para éxito y deduplicación por clave', async () => {
  const alertProviderSrc = await leer('frontend/src/components/feedback/AlertProvider.jsx');
  assert.match(alertProviderSrc, /exito:\s*(4000|5000)/, 'éxito dura ~4 s');
  assert.match(alertProviderSrc, /toast\.clave\s*!==\s*clave/, 'clave evita duplicados');
});

// --- 4. Prohibición de window.alert y window.confirm nativos ---
test('alertas: no se permite window.alert() ni window.confirm() en módulos del frontend', async () => {
  const archivos = [
    'frontend/src/modules/compras/CompraFacturaPage.jsx',
    'frontend/src/modules/compras/ProveedoresPage.jsx',
    // El abono (única mutación de Cuentas por pagar) vive en PagoDialogo; la página solo lista.
    'frontend/src/modules/compras/PagoDialogo.jsx',
    'frontend/src/modules/pos/PosPage.jsx',
    'frontend/src/modules/pos/ModalCobro.jsx',
    'frontend/src/modules/pos/Carrito.jsx',
    'frontend/src/modules/pos/ClientesPage.jsx',
    'frontend/src/modules/caja/CajaPage.jsx',
    'frontend/src/modules/inventario/CatalogoInsumosPage.jsx',
    'frontend/src/modules/inventario/CatalogoProductosPage.jsx',
    'frontend/src/modules/inventario/InsumoDrawer.jsx',
    'frontend/src/modules/inventario/EditorRecetasPage.jsx',
    'frontend/src/modules/seguridad/UsuariosPage.jsx',
    'frontend/src/modules/seguridad/RolesPermisosPage.jsx',
    'frontend/src/modules/empresa/SucursalesPage.jsx',
    'frontend/src/modules/empresa/ParametrosPage.jsx',
  ];

  for (const archivo of archivos) {
    const src = await leer(archivo);
    assert.doesNotMatch(src, /\bwindow\.alert\s*\(/, `${archivo} no debe usar window.alert()`);
    assert.doesNotMatch(src, /\bwindow\.confirm\s*\(/, `${archivo} no debe usar window.confirm()`);
  }
});

// --- 5. Pantallas de acción importan y usan useAlert ---
test('alertas: pantallas principales de acción consumen useAlert()', async () => {
  const pantallasAccion = [
    'frontend/src/modules/compras/CompraFacturaPage.jsx',
    'frontend/src/modules/compras/ProveedoresPage.jsx',
    // El abono (única mutación de Cuentas por pagar) vive en PagoDialogo; la página solo lista.
    'frontend/src/modules/compras/PagoDialogo.jsx',
    'frontend/src/modules/pos/PosPage.jsx',
    'frontend/src/modules/pos/ModalCobro.jsx',
    'frontend/src/modules/pos/ClientesPage.jsx',
    'frontend/src/modules/pos/PreparacionPage.jsx',
    'frontend/src/modules/caja/CajaPage.jsx',
    'frontend/src/modules/inventario/CatalogoInsumosPage.jsx',
    'frontend/src/modules/inventario/CatalogoProductosPage.jsx',
    'frontend/src/modules/inventario/InsumoDrawer.jsx',
    'frontend/src/modules/inventario/EditorRecetasPage.jsx',
    'frontend/src/modules/inventario/InventarioPage.jsx',
    'frontend/src/modules/seguridad/UsuariosPage.jsx',
    'frontend/src/modules/seguridad/RolesPermisosPage.jsx',
    'frontend/src/modules/empresa/SucursalesPage.jsx',
    'frontend/src/modules/empresa/ParametrosPage.jsx',
    'frontend/src/modules/rrhh/EmpleadosPage.jsx',
    'frontend/src/modules/rrhh/PuestosPage.jsx',
    'frontend/src/modules/rrhh/PlanillasPage.jsx',
  ];

  for (const archivo of pantallasAccion) {
    const src = await leer(archivo);
    assert.match(src, /useAlert/, `${archivo} debe importar/usar useAlert`);
  }
});

// --- 6. Rutas de guardado capturan fallos con notificarError ---
test('alertas: acciones de mutación invocan notificarError en catch', async () => {
  const archivosMutacion = [
    'frontend/src/modules/compras/CompraFacturaPage.jsx',
    'frontend/src/modules/compras/ProveedoresPage.jsx',
    // El abono (única mutación de Cuentas por pagar) vive en PagoDialogo; la página solo lista.
    'frontend/src/modules/compras/PagoDialogo.jsx',
    'frontend/src/modules/pos/ModalCobro.jsx',
    'frontend/src/modules/pos/ClientesPage.jsx',
    'frontend/src/modules/caja/CajaPage.jsx',
    'frontend/src/modules/inventario/InsumoDrawer.jsx',
    'frontend/src/modules/seguridad/UsuariosPage.jsx',
    'frontend/src/modules/empresa/SucursalesPage.jsx',
    'frontend/src/modules/empresa/ParametrosPage.jsx',
    'frontend/src/modules/rrhh/EmpleadosPage.jsx',
    'frontend/src/modules/rrhh/PuestosPage.jsx',
  ];

  for (const archivo of archivosMutacion) {
    const src = await leer(archivo);
    assert.match(src, /notificarError\s*\(/, `${archivo} debe invocar notificarError() en fallos`);
  }
});
