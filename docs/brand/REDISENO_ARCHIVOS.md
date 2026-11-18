# Rediseño visual 2026-11 — archivos cambiados y rutas afectadas

Estado: sin commit. Verificado con `pnpm --filter artesa-frontend build`, `eslint` (0 errores, 2 avisos previos)
y `pnpm test` 399/399. Especificación: `docs/ai/DISENO_UI.md`. Revisión visual: `/_sistema` (solo desarrollo) y
capturas en `docs/brand/revision-paso{1,2,3}/`.

## 1. Globales (afectan TODAS las rutas)
| Archivo | Cambio |
|---|---|
| `frontend/src/index.css` | Tokens de marca: escala tipográfica, radios, sombras, tamaños, colores `-text`, `line-strong`, foco, series, calor, esqueletos; tablas apiladas < 768 px; `.btn-*`, `.input`, `.card`, `.rotulo`, `.skeleton`, `.puntos-carga`; movimiento reducido |
| `frontend/package.json`, `pnpm-lock.yaml` | Dependencia `@fontsource-variable/geist-mono` |
| `frontend/public/brand/*` (38 archivos) | Kit del logo nuevo (concepto A): isotipo, corte pequeño, lockups, favicon, íconos de app |
| `frontend/src/App.jsx` | Ruta `/_sistema` solo en desarrollo (no cambia rutas de producción) |

## 2. Componentes base (afectan todas las pantallas que los usan)
| Archivo | Cambio |
|---|---|
| `components/ui/Button.jsx` | Prop `tamano` (sm/md/lg); carga con puntos |
| `components/ui/BotonIcono.jsx` | 40 px táctil / 32 px escritorio; carga con puntos |
| `components/ui/Card.jsx` | Prop `icono`; cabecera icono + título + 1 filtro |
| `components/ui/Table.jsx` | Estilo sobrio, esqueleto, tarjetas en móvil, `idSeleccionado`, `apilarEnMovil`, `pie` (fila de totales), `vacio` acepta nodo |
| `components/ui/Paginacion.jsx`, `CustomSelect.jsx` | Tokens y tamaños de control |
| `components/ui/Spinner.jsx` | Ahora esqueleto (nombre conservado) |
| `components/feedback/Skeleton.jsx` (nuevo) | `Skeleton`, `SkeletonTexto`, `SkeletonFilas`, `PuntosCarga` |
| `components/feedback/{EstadoBadge,EstadoVacio,BannerError,AvisoError,Toasts,AlertProvider}.jsx` | Colores `-text` (AA), tamaños tokenizados |
| `components/feedback/ErrorBoundary.jsx` | Usa la página de sistema `ErrorSistema` |
| `components/navigation/Pestanas.jsx` | Estilo de pestañas |
| `components/navigation/ProtectedRoute.jsx` | Estado de acceso denegado usa `AccesoDenegado` (redirecciones iguales) |
| `components/display/{Metrica,EncabezadoPagina,Tooltip,Actualizado}.jsx` | KPI neutro con `detalle`; título Fraunces; sin giro |
| `components/forms/{CampoTexto,CampoBorde,PasswordInput,CampoError}.jsx` | Tokens y foco |
| `components/branding/{Logo,Espiral,Insignia}.jsx` | Logo con reglas de tamaño (`alto`, `respeto`); `HiloSpinner` = puntos |
| `components/Dialogo.jsx`, `components/ThemeToggle.jsx` | Radio xl, sombra lg, overlay; foco en sidebar |
| `components/sistema/*` (nuevo) | `PaginaSistema`, `PaginaNoEncontrada`, `AccesoDenegado`, `ErrorSistema`, `EnConstruccion` |

## 3. Layout y acceso
| Archivo | Ruta(s) |
|---|---|
| `layout/Sidebar.jsx`, `layout/AppLayout.jsx` | Todas las rutas internas (`/` y subrutas) |
| `pages/LoginPage.jsx`, `layout/AuthPanelAdmin.jsx`, `layout/AuthLayout.jsx` (rama admin), `layout/Marca.jsx` | `/admin/login` (`/login` redirige) |
| `layout/LoginAdminArte.jsx` (eliminado) | — (solo lo usaba el login anterior) |
| `pages/ClienteLoginPage.jsx`, `layout/AuthPanelCliente.jsx` | `/cliente/login` |
| `pages/ClienteHomePage.jsx` | `/cliente` |

## 4. Módulos
| Archivo | Ruta |
|---|---|
| `modules/dashboard/{DashboardPage,dashboard.css}`, `components/{Panel,GraficaVentas,FilaIndicadores (nuevo)}`, `paneles/{VentasDiarias,TopProductos,Alertas}Panel.jsx` | `/` |
| `modules/pos/{PosPage,Carrito,ProductoCard,ModalCobro,VentaExitosaModal}.jsx` | `/pos` |
| `modules/pos/VentasHistorialPage.jsx` | `/pos/ventas` |
| `modules/pos/ClientesPage.jsx` | `/pos/clientes` |
| `modules/pos/PreparacionPage.jsx` | `/preparacion` (KDS) |
| `modules/caja/CajaPage.jsx` | `/caja` (`/pos/caja` redirige) |
| `modules/inventario/{InventarioPage,DialogoExistenciasInsumo}.jsx` | `/inventario` |
| `modules/inventario/KardexPage.jsx` | `/inventario/kardex` |
| `modules/inventario/{CatalogoInsumosPage,InsumoDrawer}.jsx` | `/catalogo/insumos` |
| `modules/inventario/{CatalogoProductosPage,catalogo-productos.css}` | `/catalogo/productos` |
| `modules/inventario/EditorRecetasPage.jsx` | `/catalogo/productos/:idProducto/receta` |
| `modules/compras/ComprasPage.jsx` | `/compras` |
| `modules/compras/CompraFacturaPage.jsx` | `/compras/registrar`, `/compras/gastos` |
| `modules/compras/ProveedoresPage.jsx` | `/compras/proveedores` |
| `modules/compras/CuentasPorPagarPage.jsx` | `/compras/cuentas-por-pagar` |
| `modules/empresa/{SucursalesPage,AperturaSucursalDialogo}.jsx` | `/empresa/sucursales` |
| `modules/empresa/ParametrosPage.jsx` | `/empresa/parametros` |
| `modules/rrhh/PlanillasPage.jsx` | `/rrhh` |
| `modules/rrhh/EmpleadosPage.jsx` | `/rrhh/empleados` |
| `modules/rrhh/PuestosPage.jsx` | `/rrhh/puestos` |
| `modules/reportes/{ReportesPage,GraficaTendencia}.jsx` | `/reportes` |
| `modules/seguridad/UsuariosPage.jsx` | `/seguridad/usuarios` |
| `modules/seguridad/{RolesPermisosPage,RolModal,PermisoModal,AsignarPermisoDialogo}.jsx` | `/seguridad` |
| `modules/seguridad/{BitacoraPage,BitacoraMetricas,JsonDiffViewer}.jsx` | `/seguridad/bitacora` |
| `modules/PendienteApiPage.jsx` | Rutas aún sin API que lo usan (estado “en construcción”) |

## 5. Solo desarrollo y documentación
| Archivo | Uso |
|---|---|
| `frontend/src/dev/SistemaPage.jsx` | `/_sistema` (no existe en producción) |
| `.claude/launch.json` | Servidor de vista previa local (puerto 5174) |
| `docs/ai/DISENO_UI.md` | Especificación de diseño para agentes |
| `docs/ai/{CHANGELOG_AGENTE,CONTEXT}.md`, `docs/USO_IA.md` | Registro de cambios y uso de IA |
| `docs/brand/revision-paso{1,2,3}/*.jpg` | Capturas de revisión |

## 6. Pendientes conocidos
- Revisión visual de las pantallas con sesión (requiere backend en marcha).
- Paso 4 (pase de consistencia) no ejecutado.
- Textos por confirmar: “Vaciar pedido”, “Imprimir ticket”, encabezado de venta exitosa sin “¡ !”, saludo y enlace a portal en el login admin.
- `layout/AuthLayout.jsx` rama cliente sin ajustar (decisión del equipo).
- Totales por columna en planilla requieren cambio de backend.
