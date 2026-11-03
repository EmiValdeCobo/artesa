# Protocolo de ahorro y preservación de contexto (agentes de IA)

Objetivo: gastar el mínimo de tokens sin perder el hilo del proyecto. Aplica a opencode, Cursor, Antigravity y Claude.

## 1. Arranque de sesión (máx. ~2 lecturas)
1. Lee `docs/ai/CONTEXT.md` (≤60 líneas) y `tail -n 15 docs/ai/CHANGELOG_AGENTE.md`.
2. Elige la skill por **trigger** (tabla en `AGENTS.md`). Lee solo esa.
3. No abras nada más hasta que la tarea lo exija.

## 2. Consulta selectiva
- Antes de abrir un archivo: `grep -n`/`rg` para ubicar el fragmento; abre solo ese rango (≤150 líneas).
- BD: `docs/ai/DB_MAP.md`; nunca el schema completo.
- No releas lo ya leído en la sesión: cita el hallazgo en una línea.
- Un archivo grande se lee por rangos; lockfiles, `node_modules`, `dist`, `.sql` completos: **prohibido**.

## 3. Salida mínima (no inyectar código no pedido)
- Entrega **solo el diff / el fragmento cambiado** con ruta y contexto de 2-3 líneas; no reimprimas archivos completos.
- Edita con parches (`str_replace`) en lugar de reescribir.
- Sin refactors, renombres, comentarios o estilos fuera del alcance. Si ves algo mejorable, anótalo en 1 línea como "sugerencia", no lo hagas.
- No repitas código que ya existe: reutiliza (`.btn-primary`, `EstadoBadge`, funciones `fn_*`, `asyncHandler`).
- Si la petición es ambigua y cambia el resultado: **una** pregunta corta antes de generar.

## 4. Resumen rodante de contexto
Cuando la conversación supere ~20 intercambios, o antes de cambiar de tema, genera este bloque y úsalo como único contexto previo:
```
## RESUMEN DE SESIÓN (≤12 líneas)
Objetivo:        <1 línea>
Hecho:           <archivos tocados + qué>
Decisiones:      <y por qué>
Pendiente:       <siguiente paso concreto>
Reglas activas:  <RN / permisos / restricciones relevantes>
Archivos clave:  <rutas que conviene reabrir>
```
Luego descarta el historial detallado. Los hechos duraderos pasan a `CONTEXT.md`; el resto, a una línea de `CHANGELOG_AGENTE.md`.

## 5. Cierre de cada tarea
1. 1 línea en `CHANGELOG_AGENTE.md` (`AAAA-MM-DD | quién | módulo | qué | archivos`).
2. Si cambió estado/decisión → actualiza la fila en `CONTEXT.md` y borra lo obsoleto (máx. 60 líneas).
3. Si tocó BD → `DB_MAP.md`. Si hubo uso significativo de IA → `docs/USO_IA.md`.
4. Resumen al usuario en 3-5 líneas: qué, por qué, qué debe entender el integrante para defenderlo.

## 6. Señales de alerta (detenerse y resumir)
Releer el mismo archivo · pegar >50 líneas sin que se pidan · respuestas que repiten la pregunta · más de 3 archivos abiertos sin plan.
