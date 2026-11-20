---
name: flujo-feature-merge
description: >-
  Estandariza el ciclo de vida de una rama de trabajo: creación de la rama feature/<modulo>-<desc>
  desde develop, confirmación atómica con Gitmoji/Conventional Commits, publicación en remoto (push)
  y merge hacia develop con trazabilidad completa y estricta prohibición de rebase.
---

# Flujo de Rama Feature y Merge a Develop

Esta skill guía el ciclo completo de creación, publicación e integración de una rama de características (`feature`) hacia `develop`, garantizando la autoría individual de commits y **prohibiendo estrictamente cualquier rebase**.

---

## 🚫 Regla de Oro: Prohibición Absoluta de Rebase y Squash

> [!CAUTION]
> **ESTÁ ESTRICTAMENTE PROHIBIDO EL REBASE Y EL SQUASH MERGE EN ARTESA.**
> - ❌ `git rebase` / `git rebase develop` / `git rebase origin/develop`
> - ❌ `git pull --rebase`
> - ❌ `git merge --squash`
>
> **Motivo**: En un equipo de 8 personas, cada integrante debe poder defender sus propios commits en las evaluaciones de cátedra. Rebase y squash reescriben o destruyen la autoría individual. La integración se hace obligatoriamente con `git merge --no-ff`.

---

## Fases del Flujo

### Fase 1: Creación de la Rama Feature
1. Asegurar árbol de trabajo limpio: `git status`.
2. Posicionarse en `develop` y sincronizarlo con `sincronizar-develop`:
   ```bash
   git checkout develop
   git fetch origin develop
   git merge --ff-only origin/develop
   ```
3. Crear y cambiar a la rama siguiendo la nomenclatura `feature/<modulo>-<desc>`:
   ```bash
   git checkout -b feature/<modulo>-<desc>
   ```

### Fase 2: Trabajo y Commits Atómicos
1. Desarrollar la funcionalidad respetando las capas arquitectónicas del proyecto.
2. Validar que las pruebas sigan pasando:
   ```bash
   pnpm test
   ```
3. Confirmar cambios con la convención de Gitmoji y Conventional Commits (skill `convencion-commits`):
   ```bash
   git add <archivos>
   git commit -m "<emoji> <tipo>(<alcance>): <descripción>"
   ```

### Fase 3: Publicación en Remoto (Push)
Sube tu rama al repositorio remoto para respaldo y visibilidad de tus compañeros:
```bash
git push -u origin feature/<modulo>-<desc>
```

### Fase 4: Sincronización Pre-Merge con Develop
Antes de mergear a `develop`, comprueba si tus compañeros subieron cambios a `develop`:
1. Ejecuta:
   ```bash
   git fetch origin develop
   git rev-list HEAD..origin/develop --count
   ```
2. **Si el conteo es mayor a 0**:
   Integra los cambios de develop en tu feature branch **sin rebase**:
   ```bash
   git merge origin/develop -m "🔀 merge(git): sincronizar develop en feature/<modulo>-<desc> antes de merge"
   ```
   - Resuelve cualquier conflicto unificando el código de ambas partes.
   - Ejecuta `pnpm test`.
   - Sube la rama actualizada: `git push origin feature/<modulo>-<desc>`.
3. **Si el conteo es 0**: Continúa directamente a la Fase 5.

### Fase 5: Merge hacia la Rama `develop`
1. Cambiar a `develop`:
   ```bash
   git checkout develop
   ```
2. Asegurar que `develop` local esté al día con remoto:
   ```bash
   git fetch origin develop
   git merge --ff-only origin/develop
   ```
3. Ejecutar el merge formal preservando la historia de la rama (`--no-ff`):
   ```bash
   git merge --no-ff feature/<modulo>-<desc> -m "🔀 merge(<modulo>): integrar rama feature/<modulo>-<desc> en develop"
   ```
4. Ejecutar pruebas de regresión:
   ```bash
   pnpm test
   ```
5. Subir los cambios integrados a `develop` en GitHub:
   ```bash
   git push origin develop
   ```

### Fase 6: Cierre y Registro
1. Añade una línea en `docs/ai/CHANGELOG_AGENTE.md` según la skill `00-registrar-cambio`.
2. Actualiza `docs/ai/CONTEXT.md` si el estado o decisiones cambiaron (máx. 60 líneas).
3. Elimina la rama feature local si ya está fusionada y respaldada en origin:
   ```bash
   git branch -d feature/<modulo>-<desc>
   ```

---

## Checklist
- [ ] Rama creada como `feature/<modulo>-<desc>` a partir de `develop`.
- [ ] Commits realizados con `<emoji> <tipo>(<alcance>): <descripción>`.
- [ ] Rama feature subida a origin con `git push -u origin feature/<modulo>-<desc>`.
- [ ] Cambios de develop sincronizados en la feature antes de mergear (sin rebase).
- [ ] **Prohibido rebase y squash: merge ejecutado con `git merge --no-ff`**.
- [ ] Suite `pnpm test` aprobada al 100%.
- [ ] `develop` subido a origin con `git push origin develop`.
- [ ] Registro en `docs/ai/CHANGELOG_AGENTE.md`.
