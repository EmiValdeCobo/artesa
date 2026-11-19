import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout.jsx';
import ProtectedRoute from './components/navigation/ProtectedRoute.jsx';
import Spinner from './components/ui/Spinner.jsx';
import { useAuth } from './context/AuthContext.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SplashScreen = lazy(() => import('./pages/SplashScreen.jsx'));
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage.jsx'));
const RolesPermisosPage = lazy(() => import('./modules/seguridad/RolesPermisosPage.jsx'));
const UsuariosPage = lazy(() => import('./modules/seguridad/UsuariosPage.jsx'));
const PosPage = lazy(() => import('./modules/pos/PosPage.jsx'));
const ClientesPage = lazy(() => import('./modules/pos/ClientesPage.jsx'));
const VentasHistorialPage = lazy(() => import('./modules/pos/VentasHistorialPage.jsx'));
const InventarioPage = lazy(() => import('./modules/inventario/InventarioPage.jsx'));
const KardexPage = lazy(() => import('./modules/inventario/KardexPage.jsx'));
const CatalogoInsumosPage = lazy(() => import('./modules/inventario/CatalogoInsumosPage.jsx'));
const CatalogoProductosPage = lazy(() => import('./modules/inventario/CatalogoProductosPage.jsx'));
const EditorRecetasPage = lazy(() => import('./modules/inventario/EditorRecetasPage.jsx'));
const ReportesPage = lazy(() => import('./modules/reportes/ReportesPage.jsx'));
const SucursalesPage = lazy(() => import('./modules/empresa/SucursalesPage.jsx'));
const ParametrosPage = lazy(() => import('./modules/empresa/ParametrosPage.jsx'));
const PendienteApiPage = lazy(() => import('./modules/PendienteApiPage.jsx'));
const BitacoraPage = lazy(() => import('./modules/seguridad/BitacoraPage.jsx'));
const CajaPage = lazy(() => import('./modules/caja/CajaPage.jsx'));
const PreparacionPage = lazy(() => import('./modules/pos/PreparacionPage.jsx'));
const ComprasPage = lazy(() => import('./modules/compras/ComprasPage.jsx'));
const ProveedoresPage = lazy(() => import('./modules/compras/ProveedoresPage.jsx'));
const CuentasPorPagarPage = lazy(() => import('./modules/compras/CuentasPorPagarPage.jsx'));
const CompraFacturaPage = lazy(() => import('./modules/compras/CompraFacturaPage.jsx'));
const PuestosPage = lazy(() => import('./modules/rrhh/PuestosPage.jsx'));
const EmpleadosPage = lazy(() => import('./modules/rrhh/EmpleadosPage.jsx'));
const PlanillasPage = lazy(() => import('./modules/rrhh/PlanillasPage.jsx'));
const PlanillaDetallePage = lazy(() => import('./modules/rrhh/PlanillaDetallePage.jsx'));
// Hoja viva del sistema de diseño: solo en desarrollo (en producción no se genera el chunk).
const SistemaPage = import.meta.env.DEV ? lazy(() => import('./dev/SistemaPage.jsx')) : null;

function CargandoPantalla() {
  return (
    <div className="flex min-h-[350px] items-center justify-center">
      <Spinner texto="Cargando pantalla…" />
    </div>
  );
}

// Entrada en "/": visitante sin sesión → splash (que luego lleva a /admin/login);
// sesión válida → la aplicación. Durante la validación, ProtectedRoute muestra su esqueleto.
function EntradaRaiz() {
  const { usuario, tipoSesion, cargando } = useAuth();
  if (!cargando && (!usuario || tipoSesion !== 'admin')) return <SplashScreen />;
  return (
    <ProtectedRoute portal="admin">
      <AppLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<CargandoPantalla />}>
      <Routes>
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      {SistemaPage && <Route path="/_sistema" element={<SistemaPage />} />}
      <Route path="/" element={<EntradaRaiz />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="inventario"
          element={
            <ProtectedRoute permiso="INV_VER_STOCK">
              <InventarioPage />
            </ProtectedRoute>
          }
        />
        <Route path="inventario/kardex" element={<ProtectedRoute permiso="INV_VER_KARDEX"><KardexPage /></ProtectedRoute>} />
        <Route path="catalogo/insumos" element={<ProtectedRoute permiso="INV_GESTIONAR_INSUMOS"><CatalogoInsumosPage /></ProtectedRoute>} />
        <Route path="catalogo/productos" element={<ProtectedRoute permiso="INV_VER_STOCK"><CatalogoProductosPage /></ProtectedRoute>} />
        <Route path="catalogo/productos/:idProducto/receta" element={<ProtectedRoute permiso="INV_GESTIONAR_RECETAS"><EditorRecetasPage /></ProtectedRoute>} />
        <Route path="inventario/insumos" element={<Navigate to="/catalogo/insumos" replace />} />
        <Route path="inventario/productos" element={<Navigate to="/catalogo/productos" replace />} />
        <Route path="inventario/recetas" element={<Navigate to="/catalogo/productos" replace />} />
        <Route path="inventario/stock" element={<Navigate to="/inventario" replace />} />
        <Route path="pos/caja" element={<Navigate to="/caja" replace />} />
        <Route path="reportes" element={<ProtectedRoute permiso="REP_VER_DASHBOARD"><ReportesPage /></ProtectedRoute>} />
        <Route path="empresa/sucursales" element={<ProtectedRoute permiso="EMP_GESTIONAR_SUCURSALES"><SucursalesPage /></ProtectedRoute>} />
        <Route path="empresa/parametros" element={<ProtectedRoute permiso="EMP_EDITAR_PARAMETROS"><ParametrosPage /></ProtectedRoute>} />
        <Route path="seguridad/bitacora" element={<ProtectedRoute permiso="SEG_VER_BITACORA"><BitacoraPage /></ProtectedRoute>} />
        <Route path="rrhh/empleados" element={<ProtectedRoute permiso="RRHH_GESTIONAR_EMPLEADOS"><EmpleadosPage /></ProtectedRoute>} />
        <Route path="rrhh/puestos" element={<ProtectedRoute permiso="RRHH_GESTIONAR_EMPLEADOS"><PuestosPage /></ProtectedRoute>} />
        <Route path="rrhh" element={<ProtectedRoute permiso="RRHH_VER_PLANILLA"><PlanillasPage /></ProtectedRoute>} />
        <Route path="rrhh/planillas/:idPlanilla" element={<ProtectedRoute permiso="RRHH_VER_PLANILLA"><PlanillaDetallePage /></ProtectedRoute>} />
        <Route path="compras/proveedores" element={<ProtectedRoute permiso="COM_GESTIONAR_PROVEEDORES"><ProveedoresPage /></ProtectedRoute>} />
        <Route path="compras/cuentas-por-pagar" element={<ProtectedRoute permiso="COM_VER_CXP"><CuentasPorPagarPage /></ProtectedRoute>} />
        <Route path="compras/registrar" element={<ProtectedRoute permiso="COM_REGISTRAR_COMPRA"><CompraFacturaPage key="COSTO" /></ProtectedRoute>} />
        <Route path="compras" element={<ProtectedRoute permiso="COM_VER_CXP"><ComprasPage /></ProtectedRoute>} />
        <Route path="compras/gastos" element={<ProtectedRoute permiso="COM_REGISTRAR_COMPRA"><CompraFacturaPage key="GASTO" tipoCosto="GASTO" /></ProtectedRoute>} />
        <Route
          path="seguridad"
          element={
            <ProtectedRoute permiso="SEG_GESTIONAR_ROLES">
              <RolesPermisosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="seguridad/usuarios"
          element={
            <ProtectedRoute permiso="SEG_GESTIONAR_USUARIOS">
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos"
          element={
            <ProtectedRoute permiso="POS_COBRAR">
              <PosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos/clientes"
          element={
            <ProtectedRoute permiso="POS_GESTIONAR_CLIENTES">
              <ClientesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos/ventas"
          element={
            <ProtectedRoute permiso="POS_COBRAR">
              <VentasHistorialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="caja"
          element={
            <ProtectedRoute permiso="CAJA_ABRIR_TURNO">
              <CajaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="preparacion"
          element={
            <ProtectedRoute permiso="POS_VER_COLA_PREPARACION">
              <PreparacionPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/cliente/*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
    </Suspense>
  );
}