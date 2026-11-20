# Auditoría del sistema visual: Dashboard, Catálogo y Reportes

## Alcance y base visual

Se revisaron Dashboard, Catálogo de productos y Reportes antes de implementar. Las skills `/design:design-system` y `/design:design-handoff` no están instaladas en este entorno; esta auditoría y el handoff se redactan con la misma estructura de trabajo solicitada.

- Interfaz: React 18 + Vite, React Router.
- Estilos: Tailwind CSS v4 con tokens CSS-first en `frontend/src/index.css`; reglas puntuales en `frontend/src/modules/dashboard/dashboard.css`.
- Gráficas: SVG y CSS propios. El proyecto documenta que no se agregan librerías de gráficas sin consultar.
- Iconos: `lucide-react`; acciones compartidas via `frontend/src/config/iconos.js` y `BotonIcono`.
- Tipografía: Montserrat para interfaz y Fraunces para titulares/cifras editoriales.
- Tokens de paleta y tema claro/oscuro: `frontend/src/index.css` (`--bg-*`, `--text-*`, `--accent*`, `--border-color`, estados y charts). Dashboard define series propias derivadas de marca.
- Radio/espaciado: hoy se expresan principalmente con utilidades Tailwind (`rounded-xl/2xl`, `p-4/5/6`, `gap-*`); no hay escala semántica dedicada de radios ni espaciado.
- Formatos: ya existía `frontend/src/utils/formato.js`; Reportes mantenía una segunda instancia de Intl y formato monetario BigInt para preservar precisión.

## Hallazgos previos

- Dashboard ya tiene `Panel`, `SelectorPeriodo`, KPIs locales y una gráfica SVG adaptable; los KPI tenían 2 columnas en móvil y cuatro columnas solo en `lg`, con cifras y notas capaces de desbordar. El panel de alertas se adapta a dos columnas en pantallas `lg`, y su contexto no prevenía el encogimiento del chevron.
- Catálogo usaba una acción de receta con texto distinta en tabla y tarjetas, título nativo sin comportamiento accesible completo, pie con acciones en una sola línea y tarjetas sin grilla de ancho mínimo. El badge de tipo y los metadatos dejaban diferencias entre elaborado y reventa.
- Reportes sí construye la gráfica comparativa cuando hay ventas: la serie agrupa filas reales por fecha, y el gráfico tiene altura definida (`h-56`). No es un placeholder ni un contenedor sin altura. El espacio observado se explica por el estiramiento del grid: el panel de tendencia igualaba la altura de los dos paneles apilados a su derecha. La API ya entrega ventas diarias por sucursal; con ello se puede agregar comparación útil por sucursal sin endpoint nuevo.
- `Tooltip.jsx` atendía gráficas en posición absoluta dentro del marco; no estaba pensado para botones dentro de tarjetas/tablas con overflow. `BotonIcono` sí existía, con `title` nativo, pero sin tooltip con retraso/teclado/Escape/portal.

## Componentes compartidos a usar/extender

- `BotonIcono` para todas las acciones de fila y tarjeta, incluida la acción de receta con `ChefHat`.
- Componente de tooltip de acción en portal, acoplado al botón mediante `aria-describedby`; mantiene el Tooltip existente de gráficas sin cambiar su contrato.
- `Card` como panel de catálogo y reportes; `Panel` como panel del Dashboard.
- `Metrica` existente en reportes; KPI de Dashboard conserva acento principal y jerarquía actual pero gana reglas uniformes de grid.
- `formato.js` como fuente común de Intl para moneda, número, porcentaje y unidades; Reportes mantiene acumulación BigInt exacta y solo centraliza la presentación.

## Decisiones visuales

- Mantener paleta, tipografías y tarjetas actuales; no introducir dependencias ni nuevos colores de marca.
- Variación de peligro cambia de rojo sólido a borde/fondo tenue para que eliminar tenga el mismo peso visual que las acciones secundarias.
- Responsive: dashboard cambia de 4/2/1 KPI, paneles en escritorio/tablet/celular; Reportes pasa a una columna antes de 1024 px; catálogo usa `auto-fill/minmax` y acciones con wrap.
- Evitar widths rígidos para tarjetas y mantener `min-width: 0`, elipsis y `tabular-nums` en contenido que pueda crecer.

## Componentes y alcance ya aplicado

- Catálogo usa `AccionConTooltip` sobre `BotonIcono` para sus acciones de lista, tarjetas y modal de receta; cada acción mantiene nombre accesible y 40 px de área táctil.
- `formatoCentavos` se centraliza junto con `formatoDinero` y `formatoEntero`, preservando la suma BigInt de Reportes.
- La variante peligrosa delineada de `BotonIcono` también afecta Usuarios, Roles/permisos y Catálogo de insumos. El handoff documenta estas pantallas compartidas.
- Los detalles de layout, breakpoints, interacción y verificación pendiente están en `docs/handoff-diseno-dashboard-catalogo-reportes.md`.

## Convenciones de administración (2026-11-16)

### Rótulo de sección

Todos los `EncabezadoPagina` siguen `Grupo del menú · sección`: el primer término coincide con el grupo de navegación y el segundo identifica el módulo o vista. Se mantiene la misma escritura en páginas hermanas.

| Grupo | Secciones aplicadas |
|---|---|
| Operación | Inicio; Punto de venta; Historial ventas; Clientes (CCF); Preparación; Caja y turnos; Inventario; Catálogo; Compras |
| Gestión | RR. HH.; Reportes |
| Administración | Sucursales; Parámetros; Bitácora; Usuarios y roles; Pendiente de API |

### KPIs

Las filas de resumen usan `Metrica` y `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`. Los tonos expresan estado: `peligro` para vencido o agotado, `aviso` para pendiente, `exito` para correcto y `info` para contexto neutral. El Dashboard conserva sus indicadores propios de ventas diarias porque forman parte de la gráfica y usan reglas de contenedor documentadas en el handoff.

### Tablas y paginación (2026-11-16)

`Table.jsx` unifica la visualización de datos en toda la aplicación, proporcionando **ordenamiento interactivo en encabezados** y **paginación integrada** por defecto.

#### API de Table (`components/ui/Table.jsx`)
- **Props de tabla**:
  - `columnas`: Arreglo de configuración de columnas (ver abajo).
  - `filas`: Arreglo de objetos de datos.
  - `idFila`: Clave única de cada registro (ej. `'id_compra'`, `'id_usuario'`, por defecto `'id'`).
  - `paginacion`: `boolean` (por defecto `true`). Si es `false`, omite el pie de paginación y activa `scrollVertical` si corresponde (ideal para diálogos o tablas de captura con pocas filas).
  - `filasPorPaginaInicial`: `number` (por defecto `10`).
  - `opcionesFilasPorPagina`: `number[]` (por defecto `[10, 25, 50, 100]`).
  - `idTabla`: `string` opcional (ej. `'compras-cxp'`). Persiste el tamaño de página elegido por el usuario en `localStorage` bajo `try/catch`.
  - `ordenInicial`: `{ clave, direccion: 'asc'|'desc' }` opcional.
  - `onOrdenar`: `({ clave, direccion }) => void` callback opcional.
  - Modo servidor: `total`, `pagina`, `porPagina`, `onCambiarPagina`, `onCambiarPorPagina`. Si `total !== undefined`, delega el cálculo de corte de páginas al exterior.
  - Retrocompatibilidad: `cargando`, `vacio`, `maxAltura`, `scrollVertical`, `horizontal`, `minAncho`, `className`.

- **Props de columna (`columnas[i]`)**:
  - `clave`: Identificador del campo.
  - `titulo`: Texto visible del encabezado.
  - `ordenable`: `boolean` (por defecto `true`, excepto para `clave === 'acciones'` o explícito `false`).
  - `tipo`: `'texto' | 'numero' | 'dinero' | 'fecha' | 'booleano'` (por defecto `'texto'`).
    - `'dinero'`: Compara cadenas PostgreSQL `NUMERIC` sin `parseFloat` ni conversiones a float IEEE-754 (ej. "9.50" < "10.00", "1000.10" > "999.99").
    - `'texto'`: Usa `Intl.Collator('es', { numeric: true, sensitivity: 'base' })` para orden natural en español respetando tildes y números.
    - `'fecha'`: Ordena cronológicamente cadenas ISO o YYYY-MM-DD sin desfase horario.
    - `'booleano'`: False antes que true en asc; true antes que false en desc.
    - Nulos, indefinidos y cadenas vacías se posicionan siempre al final en ambos sentidos.
  - `valorOrden`: `(fila) => any` (opcional). Función extractora para celdas con `render` JSX o valores compuestos (ej. razón social en celdas de proveedor con NRC/NIT, o valor numérico exacto).
  - `alinear`: `'right'` o sin definir (alinea tanto el texto como el botón de orden a la derecha).
  - `encabezado`: Nodo JSX para sustituir el texto del título.
  - `render`: `(fila) => nodo` para renderizado personalizado de celda.
  - `clase`, `descripcion`.

- **Accesibilidad y UX**:
  - Encabezados con `<button type="button">` accesibles por teclado (Tab, Enter/Espacio), cursor pointer y foco visible.
  - Iconos interactivos: `ChevronsUpDown` (tenue) en columnas inactivas, `ArrowUp` en orden ascendente y `ArrowDown` en orden descendente.
  - Atributo `aria-sort="ascending|descending|none"` en cada `<th>`.
  - Región `aria-live="polite"` que anuncia cambios de orden y página para lectores de pantalla.
  - Paginador con componente `Select` (`CustomSelect`), sin `<select>` nativos, selector de filas por página, navegación accesible y resumen "Mostrando X–Y de Z".

#### Tablas manuales conservadas

Se mantienen manuales exclusivamente las superficies que dependen de edición interactiva en línea de inputs con IDs específicos por fila:
- `EditorRecetasPage.jsx`: Ficha técnica y Constructor interactivo de recetas con inputs en línea `cantidad-receta-${id}`, proporción dinámica y `<tfoot>` con costo total.
- Tablas accesibles `sr-only` de gráficas (`GraficaTendencia`, `GraficaVentas`, `SalesChart`) y generación de tickets (`pos/imprimirTicket.js`).
Todas las demás pantallas de la app fueron migradas a `Table.jsx` unificado.

## Notificaciones y feedback (2026-11-16)

Para evitar que los resultados de acciones queden ocultos fuera de la vista tras scroll o detrás de modales y drawers, el feedback sigue una regla estricta y unificada a través de `useAlert()` (`AlertProvider` + `Toasts`):

1. **Resultado de una acción del usuario** (guardar, crear, eliminar, cobrar, cerrar turno, cambiar estado):
   - Éxito: `notificar.exito('Título o mensaje')` (toast verde ~4 s).
   - Fallo de API: `notificarError(error, { reintentar })` en el bloque `catch`. El catálogo traduce el error y decide automáticamente si requiere toast o modal. Nunca mostrar texto crudo del servidor en divs de estado.
2. **Validación previa del cliente que bloquea un envío** (campos vacíos, sin turno abierto, stock insuficiente al agregar al carrito):
   - `notificar.advertencia('Título o aviso')` para alertar inmediatamente al usuario en primer plano; los errores por campo (`CampoError`) se mantienen *además* bajo el input correspondiente.
3. **Decisión destructiva o irreversible** (eliminar, anular, cerrar turno, desactivar entidad):
   - `confirm('¿Deseas continuar?', { titulo, destructivo: true })` modal de confirmación accesible.
4. **Error crítico o bloqueo operativo** (sesión expirada, fallo de caja o cobro, pérdida irrecuperable):
   - Modal mediante `notificarError` (canal modal) o `mostrarError(error)`.
5. **Estados persistentes en línea (NO se migran a popup)**:
   - Pantalla o tabla que no cargó (`BannerError` contextual con botón "Reintentar"), estados vacíos (`EstadoVacio`) y mensajes de ayuda por campo. Si el usuario pulsó explícitamente "Actualizar" o "Filtrar", se acompaña opcionalmente de un toast.
6. **Prohibiciones**:
   - Prohibido crear estados locales `const [mensaje, setMensaje] = useState()` para renderizar alertas en divs dentro de formularios o páginas.
   - Prohibido el uso de `window.alert()` o `window.confirm()` nativos del navegador.

