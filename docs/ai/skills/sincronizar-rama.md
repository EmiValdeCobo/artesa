---
name: sincronizar-rama
description: Úsala antes de integrar una rama o resolver conflictos, y al iniciar trabajo sobre una rama existente, para comprobar que la referencia remota está actualizada y traer cambios pendientes sin perder trabajo local.
triggers:
  - sincronizar rama
  - cambios de develop
  - merge
  - conflicto git
  - actualizar rama
lee_antes:
  - docs/ai/CONTEXT.md
  - docs/ai/CHANGELOG_AGENTE.md
permisos: []
no_hacer:
  - No ejecutar reset, clean, rebase destructivo ni sobrescribir cambios locales.
  - No resolver conflictos eligiendo una rama completa sin comparar ambas versiones.
  - No dar por actualizado develop basándose solo en la referencia local.
salida_esperada: Estado remoto comprobado, cambios integrados preservando ambas mejoras y registro en CHANGELOG_AGENTE.md.
---

## Pasos
1. Lee `docs/ai/CONTEXT.md` y las últimas 15 líneas de `docs/ai/CHANGELOG_AGENTE.md`.
2. Inspecciona `git status --short --branch`, rama actual, upstream y remotos. No continúes con una operación que pueda afectar cambios sin guardar; conserva esos cambios y no los descartes.
3. Actualiza referencias remotas con `git fetch origin <rama-base>` y verifica el resultado. Si el fetch falla, informa la causa y no afirmes que la rama está sincronizada. Si `FETCH_HEAD` está bloqueado pero la referencia remota se actualizó, usa y compara explícitamente `origin/<rama-base>`.
4. Compara commits y archivos entre HEAD y la referencia remota: identifica commits entrantes y salientes, y revisa el contexto de cada cambio. No asumas que ya se integraron porque una referencia local parezca reciente.
5. Integra la rama base en la rama de trabajo preservando el historial. Ante conflictos, lee ambas versiones y produce una solución unificada que conserve el comportamiento y mejoras válidas de ambos lados. Revisa también imports, contratos, documentación y pruebas afectados.
6. Confirma con `git status` y el historial qué quedó integrado. No publiques ni cambies de rama salvo petición expresa.
7. Registra una línea del cambio en `docs/ai/CHANGELOG_AGENTE.md` siguiendo `00-registrar-cambio.md`.

## Checklist de cierre
- [ ] Rama y cambios locales inspeccionados
- [ ] Referencia remota actualizada o limitación reportada
- [ ] Cambios entrantes/salientes comparados
- [ ] Conflictos resueltos combinando las mejoras válidas
- [ ] Registro añadido a `CHANGELOG_AGENTE.md`
