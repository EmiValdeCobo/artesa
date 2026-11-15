import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTRATOS DE AUTHCONTEXT: GUARD DE VERSIÓN CONTRA CONDICIÓN DE CARRERA
// ─────────────────────────────────────────────────────────────────────────────
test('auth carrera: AuthContext define contador versionRef con useRef para invalidar peticiones viejas', async () => {
  const authContext = await leer('frontend/src/context/AuthContext.jsx');

  // Verifica import de useRef y creación del contador de versión
  assert.match(authContext, /import\s*\{[^}]*useRef[^}]*\}\s*from\s*['"]react['"]/);
  assert.match(authContext, /const\s+versionRef\s*=\s*useRef\(0\)/);

  // Verifica que iniciarSesion, logout y alVencer incrementen la versión
  assert.match(authContext, /iniciarSesion\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?versionRef\.current\s*\+=\s*1/);
  assert.match(authContext, /logout\s*=\s*\(\)\s*=>\s*\{[\s\S]*?versionRef\.current\s*\+=\s*1/);
  assert.match(authContext, /alVencer\s*=\s*\(\)\s*=>\s*\{[\s\S]*?versionRef\.current\s*\+=\s*1/);
});

test('auth carrera: recargarSesion captura versionInicio y descarta respuestas obsoletas en resolve y catch', async () => {
  const authContext = await leer('frontend/src/context/AuthContext.jsx');

  // Captura la versión al inicio de recargarSesion
  assert.match(authContext, /const\s+versionInicio\s*=\s*versionRef\.current/);

  // Comprueba que en try se compare la versión y se ignore el resultado si cambió
  assert.match(
    authContext,
    /try\s*\{[\s\S]*?if\s*\(\s*versionRef\.current\s*!==\s*versionInicio\s*\)\s*\{\s*return;?\s*\}[\s\S]*?setUsuario/,
  );

  // Comprueba que en catch se compare la versión y se evite limpiar el estado si cambió
  assert.match(
    authContext,
    /catch\s*\([^)]*\)\s*\{[\s\S]*?if\s*\(\s*versionRef\.current\s*!==\s*versionInicio\s*\)\s*\{\s*return;?\s*\}[\s\S]*?setUsuario\(null\)/,
  );

  // La firma pública y el value del provider siguen exponiendo recargarSesion intacto
  assert.match(authContext, /recargarSesion\s*:\s*recargarSesion|recargarSesion/);
  assert.match(
    authContext,
    /value=\{\{\s*usuario,\s*tipoSesion,\s*cargando,\s*login:\s*iniciarSesion,\s*logout,\s*tiene,\s*recargarSesion\s*\}\}/,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIMULACIÓN DE COMPORTAMIENTO: CONDICIÓN DE CARRERA Y PROTECCIÓN DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────
test('auth carrera simulación: respuesta tardía 401 de /auth/me NO pisa un login posterior exitoso', async () => {
  // Simulador del modelo de concurrencia de AuthContext
  let usuario = null;
  let tipoSesion = null;
  let permisos = [];
  const versionRef = { current: 0 };

  const recargarSesionSimulada = async (promesaMe) => {
    const versionInicio = versionRef.current;
    try {
      const data = await promesaMe;
      if (versionRef.current !== versionInicio) return;
      usuario = data.usuario;
      permisos = data.permisos || [];
      tipoSesion = 'admin';
      return data;
    } catch (err) {
      if (versionRef.current !== versionInicio) return;
      usuario = null;
      permisos = [];
      tipoSesion = null;
      throw err;
    }
  };

  const iniciarSesionSimulada = async (usuarioLogueado) => {
    versionRef.current += 1;
    usuario = usuarioLogueado;
    permisos = ['POS_VENTA', 'INV_VER_STOCK'];
    tipoSesion = 'admin';
  };

  // 1. Al montar se dispara recargarSesion con respuesta lenta (simulando backend/proxy en frío, 60ms)
  let rechazarMe;
  const promesaLenta401 = new Promise((_, reject) => {
    rechazarMe = () => reject(new Error('401 Unauthorized'));
  });
  const tareaRecarga = recargarSesionSimulada(promesaLenta401);

  // 2. Antes de que responda el 401, el usuario envía login exitoso (ej. a los 10ms)
  await new Promise((r) => setTimeout(r, 10));
  await iniciarSesionSimulada({ id_usuario: 1, username: 'admin', rol: 'ADMIN' });
  assert.equal(usuario?.username, 'admin', 'El usuario debe estar autenticado tras login');

  // 3. Llega tarde el 401 de /auth/me
  rechazarMe();
  await tareaRecarga;

  // 4. Verificación clave: el usuario NO fue sobreescrito con null por la respuesta vieja
  assert.ok(usuario !== null, 'El usuario no debe ser null tras llegar el 401 obsoleto');
  assert.equal(usuario.username, 'admin');
  assert.equal(tipoSesion, 'admin');
  assert.deepEqual(permisos, ['POS_VENTA', 'INV_VER_STOCK']);
});

test('auth carrera simulación: recarga explícita posterior al login actualiza permisos si no hay carrera', async () => {
  let usuario = { id_usuario: 1, username: 'admin' };
  let permisos = ['POS_VENTA'];
  const versionRef = { current: 1 };

  const recargarSesionSimulada = async (promesaMe) => {
    const versionInicio = versionRef.current;
    try {
      const data = await promesaMe;
      if (versionRef.current !== versionInicio) return;
      usuario = data.usuario;
      permisos = data.permisos || [];
      return data;
    } catch (err) {
      if (versionRef.current !== versionInicio) return;
      usuario = null;
      permisos = [];
      throw err;
    }
  };

  // Recarga legítima después del login (sin interferencia concurrente)
  const datosNuevos = {
    usuario: { id_usuario: 1, username: 'admin' },
    permisos: ['POS_VENTA', 'INV_VER_STOCK', 'SEG_GESTIONAR_ROLES'],
  };
  await recargarSesionSimulada(Promise.resolve(datosNuevos));

  assert.deepEqual(permisos, ['POS_VENTA', 'INV_VER_STOCK', 'SEG_GESTIONAR_ROLES']);
  assert.equal(usuario.username, 'admin');
});

test('auth carrera simulación: logout concurrente invalida recarga pendiente y previene resurrección de sesión', async () => {
  let usuario = { id_usuario: 1, username: 'admin' };
  const versionRef = { current: 1 };

  const recargarSesionSimulada = async (promesaMe) => {
    const versionInicio = versionRef.current;
    try {
      const data = await promesaMe;
      if (versionRef.current !== versionInicio) return;
      usuario = data.usuario;
      return data;
    } catch (err) {
      if (versionRef.current !== versionInicio) return;
      usuario = null;
      throw err;
    }
  };

  const logoutSimulado = () => {
    versionRef.current += 1;
    usuario = null;
  };

  // Se inicia recarga
  let resolverMe;
  const promesaPendiente = new Promise((resolve) => {
    resolverMe = () => resolve({ usuario: { id_usuario: 1, username: 'admin' } });
  });
  const tareaRecarga = recargarSesionSimulada(promesaPendiente);

  // Usuario hace logout antes de que termine
  logoutSimulado();
  assert.equal(usuario, null);

  // Llega la respuesta de la recarga previa
  resolverMe();
  await tareaRecarga;

  // No debe resucitar la sesión
  assert.equal(usuario, null, 'No debe resucitar usuario después de logout');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONTRATOS DE LOGINPAGE: DEPENDE DE CARGANDO PARA DESHABILITAR SUBMIT
// ─────────────────────────────────────────────────────────────────────────────
test('login page: consume cargando de useAuth y bloquea envío mientras cargando sea true', async () => {
  const loginPage = await leer('frontend/src/pages/LoginPage.jsx');

  // Lee cargando de useAuth()
  assert.match(
    loginPage,
    /const\s*\{[^}]*cargando[^}]*\}\s*=\s*useAuth\(\)/,
    'LoginPage debe desestructurar cargando de useAuth()',
  );

  // Previene el envío en manejarEnvio si enviando o cargando es true
  assert.match(
    loginPage,
    /if\s*\(\s*(?:enviando\s*\|\|\s*cargando|cargando\s*\|\|\s*enviando)\s*\)\s*return;?/,
    'manejarEnvio debe evitar el submit si cargando es true',
  );

  // Botón de envío deshabilitado cuando enviando o cargando es true
  assert.match(
    loginPage,
    /<button[^>]*type="submit"[^>]*disabled=\{(?:enviando\s*\|\|\s*cargando|cargando\s*\|\|\s*enviando)\}/,
    'El botón submit debe tener disabled={enviando || cargando}',
  );

  // Mantiene los estados visuales existentes (spinner y textos)
  assert.match(loginPage, /HiloSpinner/);
  assert.match(loginPage, /Ingresando…/);
  assert.match(loginPage, /Ingresar/);
});
