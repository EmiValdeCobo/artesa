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
