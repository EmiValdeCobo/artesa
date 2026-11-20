---
name: sincronizar-develop
description: >-
  Baja e integra los cambios de la rama develop hacia la rama de trabajo actual solo si hay novedades remotas,
  resolviendo conflictos de forma segura y prohibiendo terminantemente cualquier tipo de rebase.
---

# Sincronizar Cambios desde Develop

Esta skill guía la sincronización de la rama de trabajo actual con la rama compartida `develop`, verificando primero si existen commits entrantes y aplicando una integración segura **sin rebase**.

---

## 🚫 Regla de Oro: Prohibición Estricta de Rebase

> [!CAUTION]
> **QUEDA TERMINANTEMENTE PROHIBIDO EL REBASE EN ARTESA.**
> - ❌ `git rebase develop` / `git rebase origin/develop`
> - ❌ `git pull --rebase`
> - ❌ `git rebase -i`
>
> **Motivo**: En un equipo de 8 integrantes, el rebase altera los hashes de commits y reescribe el historial, borrando la trazabilidad de autoría que cada estudiante debe defender. Toda integración debe realizarse mediante **merge commit estándar**.

---

## Protocolo de Ejecución

### 1. Inspección de cambios locales
Comprueba el estado del árbol de trabajo:
```bash
git status --short --branch
```
- Si hay cambios listos: commitea con la convención de `convencion-commits`.
- Si hay cambios incompletos en curso: resguárdalos temporalmente con:
  ```bash
  git stash push -m "wip: antes de sincronizar develop"
  ```

### 2. Fetch de la rama `develop`
Trae los cambios remotos actualizados sin modificar el directorio de trabajo:
```bash
git fetch origin develop
```

### 3. Verificación de commits entrantes
Evalúa si `origin/develop` tiene novedades que no están en la rama actual:
```bash
git rev-list HEAD..origin/develop --count
```
- **Si el conteo es `0`**:
  - No hay cambios en `develop`. No realices ningún merge.
  - Si hiciste stash, restáuralo (`git stash pop`).
  - Reporta que la rama ya está al día y concluye.
- **Si el conteo es `> 0`**:
  - Continúa al paso 4 para integrar.

### 4. Integración mediante Merge (Sin Rebase)
- **Si estás ubicado en `develop`**:
  ```bash
  git merge origin/develop
  ```
- **Si estás en una rama de trabajo (`feature/...`)**:
  ```bash
  git merge origin/develop -m "🔀 merge(git): sincronizar cambios desde origin/develop"
  ```

### 5. Manejo de Conflictos
Si se generan conflictos durante el merge:
1. Revisa los archivos afectados con `git status`.
2. Edita cada archivo y combina las mejoras de ambas ramas (nunca apliques `--ours` o `--theirs` a ciegas).
3. Añade los archivos resueltos: `git add <archivos>`.
4. Finaliza el commit de merge:
   ```bash
   git commit -m "🔀 merge(git): resolver conflictos al sincronizar develop"
   ```
5. Si habías guardado cambios en stash, recupéralos con `git stash pop`.

### 6. Verificación de Calidad
1. Ejecuta la suite de pruebas del proyecto:
   ```bash
   pnpm test
   ```
2. Confirma que el árbol de trabajo quede limpio:
   ```bash
   git status
   ```

---

## Checklist
- [ ] Árbol de trabajo protegido o commiteado previamente.
- [ ] `git fetch origin develop` ejecutado.
- [ ] Verificado conteo de commits; merge ejecutado solo si había cambios pendientes.
- [ ] **Ningún comando de rebase utilizado**.
- [ ] Conflictos resueltos unificando ambas fuentes.
- [ ] Pruebas automatizadas ejecutadas y superadas.
