# Handoff de diseño: Dashboard, Catálogo y Reportes

## Alcance

Se ajustó solo la presentación de Dashboard, Catálogo de productos y Reportes, más componentes compartidos de formato, acciones y tooltip. Se conserva el tema cálido, tipografías y tarjetas existentes; no se agregaron dependencias ni endpoints.

## Layout y breakpoints

Los breakpoints corresponden a Tailwind CSS v4:

| Área | < 420 px | 420–639 px | 640–1023 px | 1024–1279 px | ≥ 1280 px |
|---|---|---|---|---|---|
| Dashboard, KPI | 1 columna si el panel < 420 px | 2 columnas desde 420 px | 4 columnas desde 760 px | 4 columnas desde 760 px | 4 columnas desde 760 px |
| Dashboard, paneles | Una columna, padding compacto | Una columna | Una columna: Más vendidos debajo de Ventas | Una columna | Ventas 8/12 + Más vendidos 4/12; Alertas a todo el ancho |
| Alertas | Una columna | Una columna | Una columna | Una columna | Dos columnas |
| Catálogo, filtros | Flex con wrap; buscador crece primero | Igual | Igual | Igual | Igual |
| Catálogo, tarjetas | Auto-fill, mínimo 17 rem limitado al contenedor | Auto-fill | Auto-fill | Auto-fill | Auto-fill |
| Reportes, analítica | Una columna | Una columna | Una columna | Dos columnas con inicio alineado | Dos columnas con inicio alineado |

El contenedor de página conserva su ancho natural; las zonas flex/grid y los nombres extensos usan `min-width: 0`, wrap o elipsis para evitar scroll horizontal. La gráfica diaria reduce etiquetas a intervalos regulares de acuerdo con el ancho disponible; el valor del día más reciente permanece dentro de la región de dibujo. En 30 días las barras se afinan en móvil, sin crear un segundo scroll horizontal.

### Ajustes de KPI y lista de productos (2026-11-16)

- Causa confirmada en código para el desborde KPI: `grid-cols-4` se activaba con `xl` según el viewport, aunque Ventas diarias solo ocupa 8 de 12 columnas junto a Más vendidos. La tarjeta no tenía ancho suficiente para cuatro cifras.
- Ventas diarias ahora es contenedor de consulta. KPI: 1 columna por debajo de 420 px de panel, 2 columnas desde 420 px y 4 columnas desde 760 px. Las cifras usan `clamp(1rem, 2.3cqi, 1.25rem)`, títulos `clamp(.6875rem, 1.5cqi, .75rem)`, notas `clamp(.6875rem, 1.25cqi, .75rem)`, tabular nums y ancho mínimo cero. Se conserva el valor monetario completo en el texto y atributo `title`.
- Variación: porcentaje e ícono quedan juntos; la referencia a los 7 días puede envolverse dentro de su tarjeta. Etiquetas de KPI en sentence case y una sola línea.
- Catálogo: encabezados Producto, Categoría, Tipo, Precio, Costo, Margen, Estado y Acciones. Los textos aclaratorios de IVA y base del margen quedan en `title`. En lista, filas de escritorio reservan 178 px para las cuatro acciones en una fila y miden 68 px; el código de barras es la única sublínea del nombre. El insumo aparece bajo Tipo solo si difiere del nombre. Costos y margen se ocultan debajo de 1024 px. Debajo de 768 px, las filas se muestran como tarjetas compactas.
- El contenedor de lista ya no aplica altura máxima ni scroll vertical propio; conserva overflow horizontal como resguardo y encabezado sticky.
- Los umbrales 420 y 760 px se derivaron del espacio interior calculado de las tarjetas: con cuatro columnas se reservan ~168 px por tarjeta, suficientes para la cifra de ejemplo con fuente de hasta 20 px y sus 32 px de padding. Falta confirmar el cálculo en el navegador con medición real de `scrollWidth/clientWidth`.
- La redundancia Categoría/Tipo “Reventa” depende de los datos de producto/categoría. Se mantuvieron los datos. Propuesta para evitarla en el futuro: mantener “Reventa” en Tipo y mostrar la categoría solo cuando aporte una clasificación distinta; revisar esa convención con el equipo antes de cambiar datos o contratos.
- El componente `Table` compartido añade alineación tabular a las celdas numéricas derechas; superficies afectadas: Catálogo de insumos, Inventario, CxP/Compras, Caja, Parámetros y Catálogo de productos. La tabla conserva su scroll vertical predeterminado en las demás pantallas; Catálogo de productos lo desactiva explícitamente. No se pudo hacer inspección visual de estas pantallas relacionadas en navegador.

## Tokens y componentes

- Colores: tokens semánticos de `frontend/src/index.css` (`bg-*`, `text-*`, `border-color`, `accent`, `danger`, `chart-*`) y series de marca ya existentes en `dashboard.css`.
- Tipografía: Montserrat y Fraunces existentes. Las cifras usan `tabular-nums`; las de Dashboard usan tamaños fluidos con `clamp()`.
- Radios y espaciado: se mantienen las utilidades y tarjetas existentes (`rounded-xl/2xl`, `p-4/5/6`, `gap-*`); no se agrega una escala paralela.
- `BotonIcono`: `icono`, `etiqueta` obligatoria, `tono` (`neutro`, `aviso`, `exito`, `peligro`), `className`, `cargando`, `disabled` y atributos de botón. El catálogo fija acciones en este orden: receta, editar, activar/desactivar, eliminar. El tamaño táctil queda en 40 × 40 px.
- `AccionConTooltip`: `texto`, `children` y `retraso` (300 ms predeterminado). Añade descripción accesible al botón; abre con foco o hover, cierra con salida, Escape, scroll o resize y representa el tooltip en un portal con ajuste vertical. La entrada respeta `prefers-reduced-motion`.
- `Panel` (Dashboard) y `Card` (Catálogo/Reportes) permanecen como contenedores compartidos. Los KPI del Dashboard conservan su jerarquía actual y ahora se alinean mediante una cuadrícula responsiva.
- Formato común en `frontend/src/utils/formato.js`: `formatoDinero`, `formatoEntero`, `formatoDecimal` y `formatoCentavos`. Reportes mantiene la suma exacta en BigInt y delega solo la presentación.

## Estados e interacciones

- Reportes: tendencia, comparación por sucursal, ranking de productos y métodos de pago muestran carga, error y vacío. La gráfica sin datos no dibuja barras vacías; la leyenda usa forma y texto además del color.
- Dashboard: se conservan los estados de carga/error/vacío existentes. Los selectores de 7/14/30 días pueden pasar a la línea siguiente del título en pantallas pequeñas.
- Catálogo: tarjetas y lista reutilizan las mismas cuatro acciones, con nombre del producto en `aria-label`. El tooltip sirve para mouse y teclado; Escape lo cierra. El badge de tipo no se parte en líneas y se permite que baje bajo el título.
- El estado inactivo mantiene su badge y opacidad; las acciones no cambian su lógica ni permisos.

## Decisión de Reportes y datos

El gráfico comparativo original sí se renderizaba: las ventas se agrupaban desde filas de la API y el SVG tenía altura `h-56`. El vacío aparente se debía al estiramiento vertical de la grilla frente a dos paneles más altos a la derecha. Se usa `items-start` y se añade `Ventas por sucursal`, calculada a partir de las mismas filas de ventas diarias que ya alimentan la tabla de desempeño por sucursal. El total y los tickets son útiles para comparar las sucursales del rango, no requieren otro endpoint y mantienen la precisión de dinero en centavos BigInt.

## Estilo de peligro y pantallas relacionadas

El tono de peligro de `BotonIcono` ahora usa borde y fondo suave en vez de rojo sólido. Por ser una variante compartida, también afecta botones de eliminar en Usuarios, Roles y permisos y Catálogo de insumos. No cambia el estilo de otros botones `btn-danger` ni insignias. Se verificó la superficie afectada por búsqueda del uso de `tono="peligro"`; no se pudo revisar cada pantalla en el navegador de esta sesión.

## Ajustes de Reportes, Inventario, Kárdex y Permisos (2026-11-16, segunda iteración)

### Reportes · Tendencia de ventas
- Se reemplaza la gráfica de porcentajes por `frontend/src/modules/reportes/GraficaTendencia.jsx`, que reutiliza la gramática del widget del Dashboard (`calcularEje`, `TooltipFlotante`/`TooltipContenido`, series `--serie-1`/`--serie-5`, barra rayada para el día en curso) en un SVG dibujado en píxeles reales del contenedor (ResizeObserver).
- Eje Y con marcas "redondas" y montos en USD (`formatoCentavos`/`formatoDineroCorto`); líneas guía punteadas suaves. Ya no hay porcentajes sobre las barras.
- Eje X con `etiquetaDia` ("lun 16") adelgazado de forma uniforme según el ancho (`SEPARACION_ETIQUETAS = 46` px mínimos); nunca trunca con "…". Fondos tenues `fill-muted` marcan sábados y domingos.
- Etiquetas directas solo en "Mejor día", "Peor día" y el monto del día en curso; el resto vive en el tooltip (mouse y teclado con flechas/Home/End/Escape, foco por barra, `aria-label` completo y tabla `sr-only` espejo).
- El día en curso se pinta rayado en acento, se etiqueta "Hoy (en curso)" y se excluye del promedio y del peor día. Línea punteada de promedio con su etiqueta en el borde derecho.
- Encima de la gráfica, `ResumenTendencia` muestra total del rango, promedio diario y mejor día (todo con datos que ya devuelve la API; los tickets por día también se muestran en el tooltip).
- Leyenda clara: "Días cerrados", "Hoy (en curso)", "Promedio". Estados: carga, "Sin ventas en este rango" y error.
- Limitación: con rangos > 45 días la serie se agrupa por semana/mes; entonces `fecha` es el lunes o 'YYYY-MM' y las marcas de fin de semana no aplican (usa `etiqueta` del agrupador).

### Inventario · Alertas de stock mínimo
- Nivel ahora muestra texto + ícono (`EstadoBadge`): "Agotado" / "Bajo mínimo", nunca el código interno. Unidades en minúscula (`ml`, `und`).
- Nuevo flujo "Comprar a proveedor": columna de casillas por fila + seleccionar-todo, botón de ícono (`ICONOS.comprar`, `BotonIcono`) con `aria-label` por insumo y acción "Crear compra con seleccionados". Solo visible con permiso `COM_REGISTRAR_COMPRA`.
- El flujo reutiliza el formulario existente `/compras/registrar` (`CompraFacturaPage`): navega con `location.state.borrador`, que prellena sucursal activa y líneas (insumo, cantidad = faltante redondeado hacia arriba, costo promedio si el usuario puede ver costos). Aviso persistente "Borrador sugerido. Revisa los datos antes de guardar" y nota "Faltante para llegar al mínimo (unidad)" bajo cada cantidad. Nada se envía hasta "Registrar factura"; salir de la pantalla descarta el borrador.
- Limitaciones de datos (reportadas, no inventadas): la API no expone proveedor habitual ni último costo por insumo ni compras pendientes por línea, así que el proveedor queda vacío y obligatorio, no hay agrupación por proveedor ni aviso de duplicados.

### Kárdex
- Tope real confirmado: el endpoint `GET /inventario/movimientos` tiene `LIMIT 500` fijo y solo acepta `idSucursal`/`idInsumo`. Cuando la respuesta llega a 500 se muestra el aviso "estás viendo los más recientes; afina los filtros".
- Filtros nuevos, combinables y persistentes en la URL (`useSearchParams`, `replace`): rango de fechas con atajos (Hoy, 7 días, 30 días, Este mes) + fechas libres, tipo de movimiento multi (los 8 del CHECK de la BD), sentido (entradas/salidas), insumo con búsqueda (CustomSelect `buscable`) y texto en motivo/referencia con debounce de 300 ms. Filtrado en cliente sobre lo cargado; el servidor solo filtra sucursal e insumo.
- Chips quitables + "Limpiar filtros", conteo "X de Y movimientos", orden por columna (encabezados con botón y flecha), paginación con selector 25/50/100 y CSV de lo filtrado (marca el tope en la primera línea del archivo).
- Fecha en hora local `America/El_Salvador` en una línea ("16 nov 2026, 14:53") con el ISO en `title`. Cantidad con signo explícito +/− y `tabular-nums` alineada a la derecha; tipo como badge con ícono y texto.
- Un solo scroll (el de la página): la tabla usa `Table` con `scrollVertical={false} horizontal={false} minAncho="min-w-0"`; columnas secundarias se ocultan por breakpoint (`hidden md/lg/xl:table-cell`): Saldo <md, Costo unit. y Motivo <lg, Sucursal y Usuario <xl.

### Seguridad · Catálogo de permisos
- Causa real del corte: la tarjeta envolvía la tabla en `max-h-[560px] overflow-y-auto`, así la primera fila quedaba bajo el `thead` sticky y la última se recortaba; además el scrollbar interno se montaba sobre el encabezado. Se eliminó el scroll interno y el `overflow-hidden` de la tarjeta (que impedía el sticky al viewport); la tabla ahora crece con la página.
- Columnas responsivas: Módulo se oculta <sm y Roles <md. La celda Roles mantiene "+N" pero ahora es un botón con tooltip al hover/foco que lista todos los roles (accesible por teclado y `aria-label` con la lista completa).

### Table.jsx (compartido)
- Cambios aditivos y compatibles: nueva prop `encabezado` (nodo que sustituye al título en `<th>` sin romper `data-label`), `clase` por columna (th/td), `horizontal` (false = sin contenedor de scroll, permite sticky al viewport) y `minAncho` configurable. Ninguna pantalla existente cambia de comportamiento por defecto.
- Pantallas que usan Table.jsx y quedan afectadas solo si adoptan las nuevas props: Reportes (TablaPaginada), Inventario (alertas/stock), Kárdex, Catálogo de insumos/productos, Compras/CxP/gastos, Caja, Parámetros, Usuarios, Bitácora. El resto sigue con `scrollVertical`/`overflow-x-auto` predeterminados.

## Verificación y pendientes

- Build de Vite: correcto después de los ajustes.
- Lint: cero errores; quedan dos warnings existentes en Caja y Compras, fuera del alcance.
- Suite: 357/357 correcta al permitir los sockets locales de Supertest. Sin ese permiso, 6 pruebas de integración fallaron con `EACCES`.
- `git diff --check`: correcto.
- Pendiente de verificación visual y automatizada en navegador: no se pudieron medir `scrollWidth/clientWidth`, intersecciones, alturas ni tooltips a 320, 375, 414, 768, 1024, 1100, 1280 y 1440 px, con valores simulados y rangos 7/14/30. El navegador local no pudo conectar al Vite de esta sesión. Por eso estos cambios no se marcan como visualmente verificados.
- Capturas antes/después: pendientes; no se generaron capturas del estado inicial ni posterior. Se requiere repetir con navegador conectado y guardar ambas vistas.
- Catálogo: pendiente recorrer los 36 productos y validar filas, scroll, breakpoint móvil, nombre “Café molido Orígenes 340 g” y tooltips por mouse/teclado. No se reiniciaron los datos de la BD porque `seed:reset` los reemplaza.
