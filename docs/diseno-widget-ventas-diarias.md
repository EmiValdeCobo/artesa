# Widget Ventas diarias

## Sistema de diseño

La superficie conserva la marca de Artesa y limita Terracota al héroe y al rango seleccionado. Las variaciones positivas y negativas usan los colores semánticos del sistema. Montserrat se usa para lectura y cifras tabulares; Fraunces distingue el total principal. Los números se muestran con `Intl.NumberFormat` a través de `formatoCentavos`, en locale `es-SV` y moneda USD.

Los tokens del widget viven en `frontend/src/modules/dashboard/dashboard.css` bajo `.tema-dashboard`: `--ventas-color-*`, `--ventas-font-*`, `--ventas-space-*`, `--ventas-radius-*` y `--ventas-type-*`. Controles usan radio corto; las agrupaciones usan radio medio; el panel usa radio amplio. No hay sombra en el panel. La superficie del héroe separa el dato principal; reglas finas agrupan las filas de contexto.

| Componente | Variantes y estados | Props | Accesibilidad |
|---|---|---|---|
| `StatHero` | Principal; sin tickets conserva total cero y mensaje explícito; sigue el esqueleto durante carga | `today`, `asOf` | Hora en `<time>`, cifra tabular y curva asociada con resumen textual y tabla accesible |
| `StatRow` | Principal para el total del período; secundaria para comparaciones y promedio; estados de error se anuncian arriba del grupo | `label`, `value`, `detail`, `leading` | Etiquetas y cifras agrupadas en `dl/dt/dd`; los valores se leen aunque el color no se perciba |
| `RangeSelector` | 7, 14 y 30 días; seleccionado, hover, foco, deshabilitado durante carga | `value`, `onChange`, `disabled` | `tablist`/`tab`, flechas, Home/End, `aria-selected`, foco visible y alto táctil de 44 px |
| `SalesChart` | Línea de hoy y línea de referencia discontinua; curva recortada al corte actual | `today`, `asOf` | Nombre accesible, resumen en español y tabla horaria equivalente |
| `DeltaBadge` | Positiva, negativa, neutra o sin muestra suficiente | `pct`, `tickets`, `ticketsPrevios` | Ícono y texto con signo; no depende solo del color; oculta porcentajes con menos de cinco tickets en cualquiera de los períodos |

El `Esqueleto` mantiene la silueta de héroe, gráfica y filas. Un error inicial ofrece reintento; si ya había datos, se conservan y se informa su hora. Cuando no hubo ventas en todo el período, se muestra “Aún no hay ventas hoy”. Cuando no hubo ventas hoy pero sí en el período, se conserva el contexto y se explica que el héroe está en cero. La curva solo cambia con transición breve; `prefers-reduced-motion` la desactiva.

Estados por interacción: `RangeSelector` tiene default, hover, focus visible, active/seleccionado y disabled; al estar cargando temporalmente se deshabilita y mantiene su selección. `StatHero`, `StatRow`, `SalesChart` y `DeltaBadge` son de solo lectura, así que hover/focus/active/disabled no aplican; su estado visual por defecto no cambia al pasar el cursor. Carga, error y vacío se resuelven en el panel que los contiene, preservando la misma región para el esqueleto, el aviso con reintento y el estado vacío. `DeltaBadge` añade el estado neutro cuando la base es cero o la muestra es pequeña.

## Contrato y decisiones de datos

La aplicación incorpora el resumen en `GET /api/dashboard/ventas-diarias?dias=7|14|30&sucursal=<id>`, dentro de la ruta y autorización existentes del Dashboard. `dias` admite solo 7, 14 o 30. La respuesta añade `asOf`, `today`, `comparison`, `series` y `period`, manteniendo los campos previos mientras se migra cualquier consumidor. Los importes se serializan como cadenas de centavos enteros; el cliente solo los formatea. Tickets son enteros y `deltaPct` es una cadena decimal o `null`.

- `asOf` trae zona horaria ISO del negocio. El negocio usa el parámetro `zona_horaria`; el día inicia a medianoche local.
- El total de hoy y sus horas se cortan en `asOf`. Ayer a la misma hora y el mismo día de la semana pasada usan el mismo corte. “Ayer, día completo” es un dato aparte.
- La serie contiene los últimos N días, incluyendo el día actual parcial. El período anterior son los N días calendario anteriores. La variación se calcula en PostgreSQL y es `null` si la base es cero.
- Ventas anuladas se excluyen. No se modelan devoluciones como transacciones separadas en el esquema actual.
- La agregación se hace en PostgreSQL usando la zona del negocio y las sucursales/ventas autorizadas del usuario. La caché de proceso dura 30 segundos y se segmenta por usuario, permisos, alcance, sucursal, zona y rango; los permisos se vuelven a consultar en cada solicitud. El frontend consulta cada 30 segundos.
- Día sin actividad: `today.total` es cero; con cero tickets, el promedio es `—`. Sin base previa o con menos de cinco tickets en uno de los períodos, la variación se presenta como no representativa, sin porcentaje.
- El promedio se calcula y queda disponible en la respuesta, pero no se muestra en el widget hasta que tenga una comparación útil; así evita añadir una métrica aislada al resumen.

## Trade-offs y crecimiento

Se mantiene el SVG existente para ventas por día y se añade una línea SVG ligera para la curva horaria; así no se incorpora una biblioteca de gráficos al bundle. La consulta diaria y la horaria se agregan en SQL y el caché por usuario evita repetir el cálculo en cada polling. Si crece mucho el volumen, revisaría el plan con `EXPLAIN (ANALYZE, BUFFERS)`, confirmaría el índice compuesto sobre estado/sucursal/fecha, añadiría una tabla de agregados por hora y sucursal, y consideraría refresco incremental o SSE. Mantendría la agregación exacta y la verificación de permisos aun con datos precalculados.
