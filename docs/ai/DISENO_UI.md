# artesa — Especificación de diseño UI (rediseño 2026-11)

Fuente única para los agentes que rediseñan pantallas. Tokens en `frontend/src/index.css`;
ejemplos vivos en `/_sistema` (`frontend/src/dev/SistemaPage.jsx`). Pilotos de referencia ya
aprobables: `modules/seguridad/UsuariosPage.jsx`, `modules/dashboard/*`, `layout/Sidebar.jsx`.

## 0. Reglas duras
- Solo cambia lo visual. Mismos campos, rutas, permisos, validaciones, flujos, props, nombres de
  archivo/componente y textos en español. Antes de editar, `grep` en `test/` por el archivo y conserva
  toda cadena/estructura que las pruebas busquen.
- Nada de hex, `text-[13px]`, `rounded-[10px]`, `shadow-xl/2xl`, `white/…`, `espresso-*` crudos en
  componentes: usa tokens semánticos (`bg-surface`, `text-fg-muted`, `border-line`, `text-success-text`…).
  Excepción: `chart-*`/`serie-*`/`heat-*` vía clase o `var(--…)` en SVG.
- Terracota (`btn-primary`) = única acción principal, UNA por vista o diálogo. Ocre solo resalta
  (badge, regla fina, dato destacado), nunca botón. Nada de botones multicolor.
- Sin spinners circulares (`Loader2`, `animate-spin`): listas/tablas → `Table cargando` o
  `SkeletonFilas`; bloques → `Skeleton`/`SkeletonTexto`; botones → `Button cargando` (puntos).
- Sin degradados decorativos, glass/blur, sombras > `shadow-md` (diálogos `shadow-lg`), emojis,
  ilustraciones caricaturescas ni fotos de stock. Iconos lucide 16/20/24, `strokeWidth={1.75}`.
- Números (dinero, cantidades, KPIs, IDs): `tabular-nums`; IDs/códigos/JSON en `font-mono`.
- WCAG AA en claro y oscuro: texto sobre fondo suave usa la variante `-text`
  (`bg-warning-soft text-warning-text`). Foco visible (global; no pongas `outline-none` sin reemplazo).
- Componentes base (`components/**`, `index.css`) están CONGELADOS para los agentes de módulo: si
  necesitas un cambio, repórtalo al orquestador; no lo hagas.

## 1. Anatomía de página
```
<div className="space-y-6">
  <EncabezadoPagina seccion="Grupo · Módulo" titulo="…" descripcion="…" acciones={…máx. 1 primaria + 1 ghost} />
  [Banner/BannerError descartable si aplica]
  [Fila de Metrica: grid gap-4 sm:grid-cols-2 xl:grid-cols-4 — solo con datos ya cargados]
  [Pestanas si la pantalla tiene secciones]
  <Card sinPadding icono={…} titulo="…" descripcion="N registros" acciones={1 filtro}>
     barra de herramientas (opcional) → Table
  </Card>
</div>
```
- Espaciado vertical entre bloques 24 px (`space-y-6`); dentro de tarjetas 16 px (`gap-4`); filas de
  formulario 16 px; grupos de botones 8 px (`gap-2`).
- Sin “hero” centrado ni bloques de bienvenida dentro de la app. Denso, calmado, operativo.

## 2. Barra de herramientas (sobre una tabla)
`flex flex-wrap items-center gap-3 border-b border-line px-5 py-3` dentro de la Card sinPadding:
búsqueda (`relative` + icono `Search` 16 `text-fg-subtle` a la izquierda + `.input pl-9`, `max-w-xs`),
como mucho 2 filtros (`Select tamano="sm"` o control segmentado), y a la derecha (`ml-auto`) la acción
primaria si no está en el encabezado. Filtros activos → botón ghost sm “Limpiar filtros”.

## 3. Tablas
- Siempre `Table` (orden, paginación 10/25/50/100, esqueleto, tarjetas < 768 px). Títulos de columna
  como texto plano (dan la etiqueta en móvil). Columnas redundantes en móvil: `clase: 'hidden md:table-cell'`.
- Celda primaria: `font-medium text-fg`; secundaria debajo `text-body-sm text-fg-muted`.
- Estados con `EstadoBadge`; etiquetas/categorías con `Insignia`; dinero alineado a la derecha `tipo: 'dinero'`.
- Acciones de fila: `BotonIcono` (neutro; `peligro` solo para eliminar/anular), máx. 3 visibles.
- Vacío: `vacio={<EstadoVacio icono titulo accion/>}` (Table ya acepta nodo).

## 4. Formularios y diálogos
- Etiqueta arriba (`block mb-1.5 text-label`), control `.input` 40 px, ayuda `text-body-sm text-fg-muted`,
  error `CampoError` + `aria-invalid`. Requerido: `*` en `text-danger-text`.
- Rejilla `grid gap-4 sm:grid-cols-2`; campos largos `sm:col-span-2`. Secciones con `.rotulo` + `border-t border-line pt-4`.
- `Dialogo` (radio xl, sombra lg). Cabecera `px-6 pt-6`: título `text-h3`, descripción `text-body text-fg-muted`.
  Cuerpo `px-6 py-5`. Pie `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-line px-6 py-4`:
  ghost “Cancelar” + 1 primaria (o `danger` si destruye). Drawers laterales: mismo patrón, `bg-surface border-l`.
- Montos en inputs: `text-right tabular-nums`.

## 5. Gráficas y KPIs
- `Metrica` para KPIs (neutros; `tono` solo aviso/peligro/exito cuando es estado). Nunca tarjetas a color.
- Contexto en `chart-neutral`, dato importante en `chart-focus`; series `serie-1..5` en ese orden; rejilla
  `chart-grid` 1 px; ejes `text-label-sm text-fg-muted`; mapas de calor `heat-0..4`. Leyenda arriba a la izquierda.

## 6. Avisos
- Error de carga: `BannerError` (descartable con `onCerrar`). Acción: toasts (`useAlert().notificar`), abajo a la derecha.
- Avisos informativos persistentes: contenedor `rounded-md border px-4 py-3` con `bg-info-soft text-info-text`
  (o warning) + icono 16 + botón X para cerrar.

## 7. Patrones por módulo
- **POS (catálogo/carrito):** split; catálogo a la izquierda (búsqueda + chips de categoría segmentados
  `rounded-full border border-line px-3 h-control-sm`, activo `bg-primary-soft text-primary-text border-primary/40`),
  rejilla de productos `grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3`, tarjeta de producto: nombre
  `text-label`, precio `text-h3 tabular-nums`, sin imagen de stock (inicial/ícono en `bg-muted`), toda la tarjeta
  es el botón (foco visible, `hover:border-primary/40`). Carrito a la derecha `w-[22rem] xl:w-96` en `bg-surface
  border-l`: cabecera (pedido, cliente), líneas compactas con stepper `size-control-sm`, pie fijo con subtotal/IVA/
  total (`text-kpi`) y UN botón dominante `btn-primary btn-lg w-full` “Cobrar $X”. Móvil: carrito como hoja inferior/sección debajo.
- **Cobro mixto:** Dialogo lg; total arriba `text-kpi`; métodos como control segmentado; filas de pago con monto
  `text-right`; “Restante/Cambio” destacado con `bg-muted rounded-md p-4`; primaria “Confirmar cobro”.
- **Venta exitosa:** Dialogo sm; icono `CircleCheck` 24 en `bg-success-soft text-success-text size-control-lg rounded-lg`;
  nº de documento en `font-mono`; acciones: primaria “Nueva venta”, ghost “Imprimir ticket”.
- **KDS (preparación):** columnas por estado como tableros `bg-muted rounded-lg p-3`, cabecera con conteo (`Insignia`);
  tarjetas de orden `bg-surface border border-line rounded-md p-3 shadow-xs`, número `font-mono text-h3`, tiempo
  transcurrido `tabular-nums` (aviso/peligro por umbral existente), arrastre: tarjeta levantada `shadow-md ring-2 ring-primary/40`,
  zona destino `border-2 border-dashed border-primary/50 bg-primary-soft`. Respeta reduced-motion.
- **Caja:** estado del turno en una Card superior (EstadoBadge + monto inicial + acciones), KPIs del turno con Metrica,
  movimientos en Table; cuadre/cierre en Dialogo con tabla de denominaciones (inputs `text-right`) y diferencia
  destacada (`text-success-text`/`text-danger-text`).
- **Inventario/Kárdex:** filtros en barra; existencias con barra de nivel fina (`h-1 rounded-full bg-muted` +
  relleno `bg-chart-neutral`, bajo mínimo `bg-danger`); Kárdex con entradas `text-success-text` y salidas `text-danger-text` con signo.
- **Editor de recetas:** dos columnas (ficha/constructor | disponibilidad), tabla de componentes con inputs compactos `h-control-sm`.
- **Compras/CxP:** factura como formulario en 2 columnas + tabla de líneas editable; totales en panel `bg-muted rounded-lg p-4` a la derecha.
- **RR. HH./Planillas:** tablas densas; desglose con montos tabulares y fila total `font-semibold border-t-2 border-line-strong`.
- **Reportes:** pestañas; cada reporte = Card con icono + título + 1 filtro + exportar (ghost); gráficas según §5.
- **Empresa:** Sucursales con Table; Parámetros como lista de definición editable (`divide-y`, etiqueta izquierda, control derecha).
- **Seguridad:** Roles/permisos: lista de roles a la izquierda (selección `bg-primary-soft`), matriz de permisos a la derecha
  agrupada por módulo con `.rotulo` y checkboxes `accent-primary`. Bitácora: Table + diff JSON en `font-mono text-body-sm`,
  líneas añadidas `bg-success-soft text-success-text`, quitadas `bg-danger-soft text-danger-text`, prefijo `+`/`−`.
- **Portal cliente:** mismo sistema con `.tema-cliente` (acento Ocre, texto Espresso); login igual al admin en estructura.
- **Páginas de sistema (404/403/error/en construcción/vacío):** alineadas a la izquierda dentro del layout, no hero:
  código `font-mono text-label-sm text-fg-muted`, título `font-display text-h1`, una frase, acción primaria + ghost.
  Icono lucide 24 en `size-control-lg bg-muted rounded-lg`. Sin ilustraciones.

## 8. Responsive y movimiento
- < 768 px: una columna, tablas en tarjetas, barras de herramientas envuelven, acciones a ancho completo en pies de diálogo.
- Toques ≥ 40 px en móvil. Animaciones ≤ 200 ms, solo opacidad/transform; `prefers-reduced-motion` ya las apaga.
