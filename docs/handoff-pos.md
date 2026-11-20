# Handoff · Punto de venta (POS)

Actualizado: 2026-11-20. Alcance: pantalla `/pos` (catálogo + panel «Pedido actual»).

## Layout y breakpoints
| Ancho | Comportamiento |
|---|---|
| ≥ 1024 px (`lg`) | Dos columnas: catálogo flexible + panel de ancho `--spacing-panel-pedido` (clamp 380–440 px). La página no hace scroll: `<main>` ocupa `100dvh` y cada columna tiene scroll propio. |
| < 1024 px | Una columna. El pedido queda debajo del catálogo y una barra fija inferior muestra unidades, total y «Ver pedido». |

- Shell (`layout/AppLayout.jsx`): variante solo por ruta. `RUTAS_OPERACION` (`/pos`, `/preparacion`) usa `lg:p-6` en vez de `lg:p-8`. `RUTAS_ALTO_VENTANA` (`/pos`) convierte `<main>` en columna flex de alto de ventana. El resto de páginas no cambia.
- Grilla de productos: `repeat(auto-fill, minmax(var(--spacing-tarjeta-producto), 1fr))`, con un mínimo de 180 px por tarjeta. Resultado: 6 columnas a 1920 px y 3 a 1440 px.
- Limitación conocida: a 1024 px con el sidebar expandido, el catálogo baja a 1 columna. Con el sidebar colapsado vuelve a 2–3.

## Tokens
Nuevos en `index.css` (`@theme`):
- `--spacing-panel-pedido: clamp(23.75rem, 28vw, 27.5rem)`.
- `--spacing-tarjeta-producto: 11.25rem`.

Reutilizados: `size-control-md` (40 px, zonas de toque), `text-label`, `text-label-sm`, `text-body`, `text-kpi`, `fg`, `fg-muted`, `primary-text`, `primary-soft`, `line`, `muted`, `surface`. No se agregaron colores.

## Componentes
| Componente | Cambio |
|---|---|
| `PosPage` | Sin `max-w-7xl`. El chip de sucursal/turno solo aparece **sin** turno (selector de sucursal); con turno abierto, la información vive en `IndicadorTurno`. `vaciarPedido` confirma con `useAlert().confirm` cuando hay 2 o más ítems. |
| `Carrito` (ítem) | 3 filas: (1) nombre (2 líneas, `title` con el nombre completo) + subtotal; (2) precio c/u + stepper + Quitar; (3) extras, nota (1 línea con elipsis) y acción de nota/extras. |
| `Carrito` (panel) | «Vaciar pedido», estado vacío nuevo y región `sr-only` con `aria-live` que anuncia «Total actualizado: $X». |
| `PersonalizarLineaDialogo` | Título «Nota y extras», botón «Guardar». Mantiene textarea (200 car., igual que el backend), atajos «Sin X» y extras. |
| `ProductoCard` | Tooltip «Sin existencias en esta sucursal» en el badge «Agotado». |

## Estados e interacciones
- Ítem sin nota: botón «Agregar nota o extras» (ícono `MessageSquarePlus`).
- Ítem con nota o extras: se muestran los extras y «Nota: …» (1 línea); la acción pasa a «Editar nota o extras» (ícono `Pencil`). Abre el diálogo.
- Vaciar con 1 ítem: vacía al instante y ofrece «Deshacer» en el toast.
- Vaciar con 2 o más ítems: diálogo «¿Vaciar el pedido?» con los botones «Vaciar pedido» y «Mantener pedido».
- Lista vacía: «Aún no hay productos» y «Cobrar» deshabilitado.

## Casos límite verificados
- Nombre largo: se corta en 2 líneas y el nombre completo queda en el tooltip.
- Nota larga: 1 línea con elipsis.
- Cantidad de 2 o 3 dígitos: contador con `min-w-8`.
- Ítem con extras: lista en línea con su precio.
- Agotado: tarjeta deshabilitada sobre `bg-muted` y texto `fg-muted` (AA).

## Accesibilidad
- Zonas de toque de 40 px: −, +, Quitar, Vaciar pedido y acción de nota.
- `aria-label` en los botones de solo ícono, incluido «Quitar {producto}».
- La cantidad se anuncia con `aria-live`; el total, con una región `aria-live` dedicada.
- Foco visible global (`:focus-visible` con `--ring`).
- `prefers-reduced-motion` global en `index.css`.
- Contraste en tema oscuro: `--text-secondary #bfb5a7` sobre `surface #2a1a14` ≈ 8:1; `--text-subtle #9a8e7f` sobre `muted #36231b` ≈ 4,6:1. El tema claro usa los mismos tokens, ya documentados como AA en `index.css`.

## Desviación consciente del brief
La nota se edita en el diálogo existente y no en un popover inline. Motivo: el mismo flujo elige extras (checkboxes con stock) y atajos «Sin ingrediente». Un popover de solo texto obligaría a separar extras en otro flujo. El límite queda en 200 caracteres porque es el máximo que valida el backend (`ventas.schemas.js`).
