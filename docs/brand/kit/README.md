# artesa — Kit de marca (concepto A "Masa enrollada")

Elegido por el equipo el 2026-11-17 entre 3 conceptos (`docs/brand/conceptos/`). Vista general: `preview-kit.png`.

## Idea
Una **"a" minúscula** cuyo ojo es una **masa enrollada** (1⅓ vueltas de espiral) que se estira para formar el asta.
Recoge el oficio (amasar en la artesa) y la continuidad con el logo anterior (la espiral), pero en **una sola forma**
y en minúsculas, igual que el nombre. El wordmark "artesa" es monolineal, redondeado y construido a mano.

## Colores (máx. 2 por pieza)
| Uso | Símbolo | Wordmark | Fondo |
|---|---|---|---|
| Principal (claro) | Terracota `#B15C3D` | Espresso `#321F19` | Alabastro `#F7F5F0` / blanco |
| Oscuro | Ocre `#E1A651` | Alabastro `#F7F5F0` | Espresso `#321F19` |
| 1 tinta (`-mono-oscuro`) | Espresso | Espresso | claro |
| 1 tinta inversa (`-mono-claro`) | Alabastro | Alabastro | oscuro, Terracota o foto |
| Térmico / fotocopia (`-negro`) | `#000` | `#000` | papel |

## Archivos (`svg/`)
- `isotipo*.svg`: símbolo para **≥ 33 px**.
- `isotipo-pequeno*.svg`: **corte para ≤ 32 px** (ojo cerrado + punto, trazos más gruesos). Nunca usar el isotipo normal a 16–32 px.
- `logotipo*.svg`: solo wordmark.
- `logo-principal*.svg`: lockup horizontal (símbolo = alto total del wordmark; separación = 0,45 × altura x).
- `logo-apilado*.svg`: lockup apilado (login, portadas, recibos).
- Sufijos: *(ninguno)* claro · `-oscuro` · `-mono-oscuro` · `-mono-claro` · `-negro`.
- `favicon.svg`: corte pequeño; cambia a Ocre con `prefers-color-scheme: dark`. `favicon-estatico.svg` es la fuente de los PNG.
- `app-icon.svg` (radio 112/512), `app-icon-pequeno.svg` (≤ 48 px), `app-icon-maskable.svg` (sangrado completo, zona segura 50 %).

`png/`: `favicon.ico` (16/32/48), `favicon-16/32/48.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `app-icon-48.png`, `isotipo-1024.png`, `logo-principal-1600.png`, `logo-principal-negro-600.png`.

Los nombres coinciden con `frontend/public/brand/`, así que el kit es un reemplazo directo.

## Reglas de uso
- **Área de respeto:** alrededor del logo, el ancho del asta del símbolo × 2 (≈ ⅓ del alto del símbolo).
- **Tamaños mínimos:** horizontal 96 px / 25 mm; apilado 64 px / 18 mm; isotipo 33 px (debajo, corte pequeño, mínimo 16 px).
- **Recibo térmico:** usar `logo-apilado-negro.svg` o `logo-principal-negro-600.png`, ≥ 30 mm de ancho.
- **No hacer:** cambiar colores fuera de la tabla, usar 3 colores, deformar, girar, añadir sombras o degradados,
  recomponer el wordmark con una fuente, usar Terracota sobre Espresso (bajo contraste).

## Técnica
- Todo es **contorno relleno** (sin `stroke`, sin `<text>`, sin `transform`, sin imágenes). Regla de relleno nonzero.
- Generado con `herramientas/kit.mjs` (geometría paramétrica → contornos), rasterizado con `herramientas/raster.mjs`
  (Chrome headless), hoja `herramientas/kitpreview.mjs`, auditoría `herramientas/audit.mjs`.
  Regenerar: `node herramientas/kit.mjs svg && node herramientas/raster.mjs .` (desde esta carpeta; requiere Chrome en
  la ruta por defecto de Windows).
- Las curvas están muestreadas como polilíneas finas (≈ 26 KB por lockup frente a 124 KB del logo anterior trazado de
  raster). Si se necesita un archivo más liviano, se puede optimizar con un editor vectorial sin cambiar la forma.

## Pendiente
- **Búsqueda de marca** antes de adoptarla formalmente (CNR El Salvador, WIPO Global Brand Database, USPTO). No se ha hecho.
- Prueba en impresora térmica real (solo se simuló a 1 bit).
