import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout.jsx';
import ProtectedRoute from './components/navigation/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ClienteLoginPage from './pages/ClienteLoginPage.jsx';
import ClienteHomePage from './pages/ClienteHomePage.jsx';
import DashboardPage from './modules/dashboard/DashboardPage.jsx';
import RolesPermisosPage from './modules/seguridad/RolesPermisosPage.jsx';
import UsuariosPage from './modules/seguridad/UsuariosPage.jsx';
import PosPage from './modules/pos/PosPage.jsx';
import InventarioPage from './modules/inventario/InventarioPage.jsx';
import KardexPage from './modules/inventario/KardexPage.jsx';
import ReportesPage from './modules/reportes/ReportesPage.jsx';
import SucursalesPage from './modules/empresa/SucursalesPage.jsx';
import ParametrosPage from './modules/empresa/ParametrosPage.jsx';
import PendienteApiPage from './modules/PendienteApiPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/cliente/login" element={<ClienteLoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute portal="admin">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="inventario"
          element={
            <ProtectedRoute permiso="INV_VER_STOCK">
              <InventarioPage />
            </ProtectedRoute>
          }
        />
        <Route path="inventario/kardex" element={<ProtectedRoute permiso="INV_VER_STOCK"><KardexPage /></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute permiso="REP_VER_DASHBOARD"><ReportesPage /></ProtectedRoute>} />
        <Route path="empresa/sucursales" element={<ProtectedRoute permiso="EMP_GESTIONAR_SUCURSALES"><SucursalesPage /></ProtectedRoute>} />
        <Route path="empresa/parametros" element={<ProtectedRoute permiso="EMP_EDITAR_PARAMETROS"><ParametrosPage /></ProtectedRoute>} />
        <Route path="rrhh/empleados" element={<ProtectedRoute permiso="RRHH_GESTIONAR_EMPLEADOS"><PendienteApiPage titulo="Empleados" descripcion="Gestión del personal por sucursal." endpoints={["GET/POST /api/empleados (no existe)", "PUT /api/empleados/:id (no existe)"]} /></ProtectedRoute>} />
        <Route path="rrhh/puestos" element={<ProtectedRoute permiso="RRHH_GESTIONAR_EMPLEADOS"><PendienteApiPage titulo="Puestos" descripcion="Catálogo de puestos y salarios base." endpoints={["GET/POST /api/puestos (no existe)", "PUT /api/puestos/:id (no existe)"]} /></ProtectedRoute>} />
        <Route path="rrhh" element={<ProtectedRoute permiso="RRHH_VER_PLANILLA"><PendienteApiPage titulo="RR. HH. y planilla" descripcion="Empleados, períodos y procesamiento de planillas." endpoints={["GET /api/planillas (no existe)", "POST /api/planillas (no existe)"]} /></ProtectedRoute>} />
        <Route path="compras/proveedores" element={<ProtectedRoute permiso="COM_GESTIONAR_PROVEEDORES"><PendienteApiPage titulo="Proveedores" descripcion="Catálogo de proveedores." endpoints={["GET/POST /api/proveedores (no existe)", "PUT /api/proveedores/:id (no existe)"]} /></ProtectedRoute>} />
        <Route path="compras/cuentas-por-pagar" element={<ProtectedRoute permiso="COM_VER_CXP"><PendienteApiPage titulo="Cuentas por pagar" descripcion="Facturas y pagos pendientes a proveedores." endpoints={["GET /api/compras/cuentas-por-pagar (no existe)", "POST /api/compras/:id/pagos (no existe)"]} /></ProtectedRoute>} />
        <Route path="compras" element={<ProtectedRoute permiso="COM_VER_CXP"><PendienteApiPage titulo="Compras" descripcion="Compras de insumos y gastos operativos." endpoints={["GET/POST /api/compras (no existe)", "POST /api/compras (tipo_costo=GASTO) (no existe)"]} /></ProtectedRoute>} />
        <Route path="compras/gastos" element={<ProtectedRoute permiso="COM_REGISTRAR_COMPRA"><PendienteApiPage titulo="Compras tipo gasto" descripcion="Registro de gastos que no ingresan inventario." endpoints={["POST /api/compras con tipo_costo=GASTO (no existe)"]} /></ProtectedRoute>} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route
        path="/cliente"
        element={<ProtectedRoute portal="cliente"><ClienteHomePage /></ProtectedRoute>}
      />
    </Routes>
  );
}
