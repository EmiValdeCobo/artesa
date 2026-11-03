---
name: registrar-cambio
description: Úsala al terminar CUALQUIER cambio (código, BD, docs). Registra el cambio y mantiene el contexto ligero.
---
1. Añade UNA línea al final de `docs/ai/CHANGELOG_AGENTE.md`:
   `AAAA-MM-DD | <persona>/<agente> | <modulo> | <qué cambió, 1 frase> | <archivos principales>`
2. Si cambió el estado de un módulo, una decisión o un pendiente → edita la fila/sección correspondiente de `docs/ai/CONTEXT.md` (no lo hagas crecer: máx. 60 líneas; borra lo obsoleto).
3. Si el cambio toca la BD → actualiza también `docs/ai/DB_MAP.md`.
4. Si usaste IA para algo significativo → añade línea en `docs/USO_IA.md`.
5. Cierra en el chat con 3-5 líneas: qué hiciste, por qué, y qué debe entender el integrante para defenderlo.
No copies código en el changelog; solo la línea.
