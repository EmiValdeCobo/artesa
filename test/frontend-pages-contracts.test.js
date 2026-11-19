import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTRATOS DE PÁGINAS Y RUTAS (App.jsx)
// ─────────────────────────────────────────────────────────────────────────────
test('frontend rutas: App.jsx protege cada ruta con su permiso RBAC exacto', async () => {
  const app = await leer('frontend/src/App.jsx');

  assert.match(app, /<ProtectedRoute permiso="INV_VER_STOCK">\s*<InventarioPage \/>/);
  assert.match(app, /<ProtectedRoute permiso="INV_VER_KARDEX"><KardexPage \/><\/ProtectedRoute>/);
  assert.match(app, /<ProtectedRoute permiso="REP_VER_DASHBOARD"><ReportesPage \/><\/ProtectedRoute>/);
  assert.match(app, /<ProtectedRoute permiso="EMP_GESTIONAR_SUCURSALES"><SucursalesPage \/><\/ProtectedRoute>/);
  assert.match(app, /<ProtectedRoute permiso="EMP_EDITAR_PARAMETROS"><ParametrosPage \/><\/ProtectedRoute>/);
  assert.match(app, /<ProtectedRoute permiso="SEG_GESTIONAR_ROLES">\s*<RolesPermisosPage \/>/);
  assert.match(app, /path="catalogo\/insumos" element={<ProtectedRoute permiso="INV_GESTIONAR_INSUMOS">/);
  assert.match(app, /path="catalogo\/productos" element={<ProtectedRoute permiso="INV_VER_STOCK">/);
  assert.match(app, /path="catalogo\/productos\/:idProducto\/receta" element={<ProtectedRoute permiso="INV_GESTIONAR_RECETAS">/);
  assert.match(app, /path="inventario\/recetas" element={<Navigate to="\/catalogo\/productos" replace \/>/);
  assert.match(app, /path="compras\/proveedores" element={<ProtectedRoute permiso="COM_GESTIONAR_PROVEEDORES">/);
  assert.match(app, /path="compras\/cuentas-por-pagar" element={<ProtectedRoute permiso="COM_VER_CXP">/);
  assert.match(app, /path="compras" element={<ProtectedRoute permiso="COM_VER_CXP">/);
});

test('frontend rutas: módulos RRHH implementados con páginas funcionales y protegidas', async () => {
  const app = await leer('frontend/src/App.jsx');

  assert.match(app, /path="rrhh\/empleados".*<EmpleadosPage/s);
  assert.match(app, /path="rrhh\/puestos".*<PuestosPage/s);
  assert.match(app, /path="rrhh".*<PlanillasPage/s);
});

test('frontend code-splitting: App.jsx y AppLayout.jsx usan React.lazy y Suspense para dividir pantallas', async () => {
  const [app, layout] = await Promise.all([
    leer('frontend/src/App.jsx'),
    leer('frontend/src/layout/AppLayout.jsx'),
  ]);

  assert.match(app, /lazy\(/, 'App.jsx debe importar pantallas con React.lazy');
  assert.match(app, /<Suspense\s+fallback=/, 'App.jsx debe envolver rutas en Suspense');
  assert.match(app, /DashboardPage\s*=\s*lazy\(/);
  assert.match(app, /PosPage\s*=\s*lazy\(/);
  assert.match(app, /ReportesPage\s*=\s*lazy\(/);
  assert.match(layout, /<Suspense\s+fallback=.*<Outlet/s, 'AppLayout debe envolver Outlet en Suspense');
});

test('frontend PendienteApiPage: informa con transparencia qué endpoints faltan sin hacer llamadas', async () => {
  const page = await leer('frontend/src/modules/PendienteApiPage.jsx');
  assert.match(page, /Pendiente de API/);
  assert.match(page, /endpoints\.map/);
  assert.doesNotMatch(page, /api\.(get|post|put|patch|delete)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTRATOS DE PANTALLAS ESPECÍFICAS
// ─────────────────────────────────────────────────────────────────────────────
test('frontend sucursales y parámetros: consumen api/client.js y controlan errores con BannerError', async () => {
  const sucursales = await leer('frontend/src/modules/empresa/SucursalesPage.jsx');
  const parametros = await leer('frontend/src/modules/empresa/ParametrosPage.jsx');

  assert.match(sucursales, /api\.get\('\/empresa\/sucursales', \{ signal: controlador\.signal \}\)/);
  assert.match(sucursales, /api\.post\('\/empresa\/sucursales'/);
  assert.match(sucursales, /api\.put\(`\/empresa\/sucursales\//);
  assert.match(sucursales, /<BannerError/);

  assert.match(parametros, /api\.get\('\/empresa\/parametros'\)/);
  assert.match(parametros, /api\.put\('\/empresa\/parametros'/);
  assert.match(parametros, /<BannerError/);
});

test('frontend kardex y reportes: consultas filtradas y exportación CSV con codificación UTF-8 BOM', async () => {
  const kardex = await leer('frontend/src/modules/inventario/KardexPage.jsx');
  const reportes = await leer('frontend/src/modules/reportes/ReportesPage.jsx');

  // Paginación de servidor (AUDITORIA C3): recorre páginas leyendo X-Total.
  assert.match(kardex, /obtenerTodasLasPaginas\('\/inventario\/movimientos'/);
  assert.match(kardex, /<Table/);

  assert.match(reportes, /api\.get\(`\/reportes\/ventas-diarias\?\$\{query\}`/);
  assert.match(reportes, /api\.get\(`\/reportes\/top-productos\?\$\{query\}`/);
  assert.match(reportes, /api\.get\(`\/reportes\/alertas-stock\$\{parametrosStock\}`/);
  assert.match(reportes, /api\.get\('\/reportes\/margen-productos', \{ signal: controlador\.signal \}\)/);
  // BOM UTF-8 (\ufeff) para compatibilidad con Excel en El Salvador/Latinoamérica
  assert.match(reportes, /\\ufeff/);
  assert.match(reportes, /text\/csv;charset=utf-8/);
});

test('frontend contratos de dinero: los importes y totales nunca usan parseFloat ni pierden precisión', async () => {
  const codigo = [
    await leer('frontend/src/modules/empresa/SucursalesPage.jsx'),
    await leer('frontend/src/modules/empresa/ParametrosPage.jsx'),
    await leer('frontend/src/modules/inventario/KardexPage.jsx'),
    await leer('frontend/src/modules/reportes/ReportesPage.jsx'),
    await leer('frontend/src/modules/dashboard/DashboardPage.jsx'),
  ].join('\n');

  assert.doesNotMatch(codigo, /parseFloat\((?:total|subtotal|monto|precio|ingreso)/);
});

test('frontend dashboard: DashboardPage define fechaISO para <time> y mantiene sucursales como iterable', async () => {
  const dash = await leer('frontend/src/modules/dashboard/DashboardPage.jsx');
  assert.match(dash, /const\s+fechaISO\s*=/);
  assert.match(dash, /dateTime=\{fechaISO\}/);
  assert.doesNotMatch(dash, /const\s+sucursales\s*=.*\.join\(/);
});

test('frontend formularios: CampoTexto tolera icono omitido sin romper el render y condiciona pl-11', async () => {
  const campoTexto = await leer('frontend/src/components/forms/CampoTexto.jsx');
  assert.match(campoTexto, /tieneIcono/);
  assert.match(campoTexto, /displayName\s*=\s*['"]CampoTexto['"]/);
  assert.doesNotMatch(campoTexto, /<Icono\s+size=\{17\}\s+aria-hidden="true"\s*\/>\s*<input/);
});


test('frontend inventario: catalogo de insumos, productos y recetas protegen iconos, dialogos confirm y avisoLocal', async () => {
  const insumos = await leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx');
  const productos = await leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx');
  const recetas = await leer('frontend/src/modules/inventario/EditorRecetasPage.jsx');

  // CatalogoProductosPage importa X y usa confirm(mensaje, opciones)
  assert.match(productos, /import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*['"]lucide-react['"]/);
  assert.match(productos, /await\s+confirm\(\s*`¿Desactivar/);
  assert.match(productos, /const\s+avisoLocal\s*=/);

  // EditorRecetasPage importa Package, valida cantidad > 0 y blinda nombre de insumo
  assert.match(recetas, /import\s*\{[^}]*\bPackage\b[^}]*\}\s*from\s*['"]lucide-react['"]/);
  assert.match(recetas, /Number\(c\.cantidad_requerida\)\s*>\s*0/);
  assert.match(recetas, /\(ins\.nombre\s*\?\?\s*['"]['"]\)\.toLowerCase\(\)/);
  assert.match(recetas, /function\s+avisoLocal\s*\(/);
  assert.match(recetas, /useParams/);
  assert.doesNotMatch(recetas, /selector-producto/);

  // CatalogoInsumosPage no usa CampoTexto alto, usa inputs estandar y define avisoLocal
  assert.doesNotMatch(insumos, /import\s+CampoTexto\s+from/);
  assert.match(insumos, /className="input"/);
  assert.match(insumos, /const\s+avisoLocal\s*=/);
});

test('frontend auth: AuthContext expone recargarSesion y lo reutiliza en montaje inicial', async () => {
  const authContext = await leer('frontend/src/context/AuthContext.jsx');
  assert.match(authContext, /const\s+recargarSesion\s*=\s*useCallback/);
  assert.match(authContext, /recargarSesion\(\)/);
  assert.match(authContext, /value=\{\{\s*usuario,\s*tipoSesion,\s*cargando,\s*login:\s*iniciarSesion,\s*logout,\s*tiene,\s*recargarSesion\s*\}\}/);
  assert.match(authContext, /export\s+function\s+useAuth\(\)/);
});
