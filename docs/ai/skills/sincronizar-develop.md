---
name: sincronizar-develop
description: >-
  Baja e integra los cambios de la rama develop hacia la rama de trabajo actual solo si hay novedades remotas,
  resolviendo conflictos de forma segura y prohibiendo terminantemente cualquier tipo de rebase.
triggers:
  - bajar cambios develop
  - pull develop
  - sincronizar develop
  - actualizar desde develop
  - traer cambios develop
  - sincronizar rama con develop
lee_antes:
  - docs/ai/CONTEXT.md
  - docs/ai/CHANGELOG_AGENTE.md
permisos: []
no_hacer:
  - Queda terminantemente PROHIBIDO usar git rebase, git rebase -i o git pull --rebase.
  - No descartar ni sobrescribir cambios locales sin confirmar; usar stash o commit antes de sincronizar.
  - No ejecutar un merge innecesario si origin/develop no tiene commits nuevos respecto a HEAD.
  - No resolver conflictos aplicando checkout --ours o --theirs de manera indiscriminada.
salida_esperada: >-
  Rama local sincronizada con develop mediante merge estándar (o confirmación de estar al día si no había cambios),
  con historial intacto y sin rebase.
---

# Skill: Sincronizar Cambios desde Develop

Esta skill garantiza que la rama de trabajo actual se mantenga al día con la rama base compartida `develop`, verificando primero si existen cambios remotos pendientes, integrándolos de forma limpia y protegiendo el historial del equipo.

---

## 🚫 Regla de Oro: Prohibición Estricta de Rebase

> [!CAUTION]
> **QUEDA TERMINANTEMENTE PROHIBIDO EL REBASE EN ARTESA.**
> - ❌ `git rebase develop` / `git rebase origin/develop`
> - ❌ `git pull --rebase`
> - ❌ `git rebase -i` (interactivo sobre ramas compartidas o publicadas)
>
> **Motivo técnico de cátedra**: En un equipo de 8 personas, el rebase reescribe los hashes SHA-1 de los commits, destruye la cronología real de trabajo colaborativo y borra la autoría individual de cada estudiante, comprometiendo la trazabilidad y la defensa del proyecto. Toda integración se realiza mediante **merge estándar** con su respectivo merge commit.

---

## Protocolo de Ejecución Paso a Paso

### 1. Inspeccionar el estado local de trabajo
Antes de cualquier operación de red o merge, comprueba que el área de trabajo esté segura:
```bash
git status --short --branch
```
- **Si hay cambios sin guardar (uncommitted/staged)**:
  - Si pertenecen a la tarea en curso y están listos: confírmalos primero siguiendo la skill `convencion-commits`.
  - Si son cambios en progreso (incompletos): guárdalos temporalmente en el stash para evitar bloqueos:
    ```bash
    git stash push -m "wip: antes de sincronizar develop"
    ```

### 2. Consultar cambios remotos sin alterar el árbol local
Descarga las referencias actualizadas del servidor:
```bash
git fetch origin develop
```

### 3. Evaluar si existen cambios pendientes en `develop`
Comprueba si `origin/develop` tiene commits que tu rama actual no posea:
```bash
# Contar commits entrantes desde origin/develop
git rev-list HEAD..origin/develop --count
```

- **Caso A: El conteo es `0` (NO hay cambios en develop)**:
  - La rama actual ya está al día.
  - **No ejecutes ningún merge.**
  - Si guardaste cambios en stash en el paso 1, recupéralos:
    ```bash
    git stash pop
    ```
  - Informa claramente: *"La rama ya se encuentra al día con origin/develop (0 commits nuevos). No se requiere integración."*
  - Fin del flujo.

- **Caso B: El conteo es mayor a `0` (SÍ hay cambios nuevos)**:
  - Continúa con el **Paso 4**.

### 4. Integrar los cambios de `develop` (Merge sin Rebase)
Aplica la integración según la rama donde te encuentres:

#### Si estás ubicado directamente en la rama `develop`:
```bash
# Integra únicamente en avance rápido o merge limpio sin rebase
git merge --no-rebase origin/develop
```

#### Si estás en una rama de trabajo (`feature/...` u otra):
```bash
# Integra origin/develop preservando el historial de commits
git merge origin/develop --no-rebase -m "🔀 merge(git): sincronizar cambios desde origin/develop"
```

### 5. Resolución de Conflictos (si se presentan)
Si Git detecta divergencias que no puede resolver automáticamente:
1. Identifica los archivos conflictivos con `git status`.
2. Abre cada archivo con conflicto y examina los bloques `<<<<<<<`, `=======`, `>>>>>>>`.
3. **Regla de resolución**: Combina cuidadosamente el código preservando las mejoras de ambos lados.
   - Revisa especialmente migraciones SQL, rutas de backend, contratos de API y componentes de React.
   - Nunca uses `git checkout --ours` o `--theirs` a ciegas.
4. Tras resolver todos los archivos:
   ```bash
   git add <archivos_resueltos>
   git commit -m "🔀 merge(git): resolver conflictos al sincronizar develop"
   ```
5. Si usaste stash en el paso 1, restáuralo ahora:
   ```bash
   git stash pop
   ```
   (Si el pop genera algún conflicto menor con el trabajo en progreso, resuélvelo manualmente).

### 6. Verificación de Integridad
Tras completar el merge:
1. Ejecuta la suite de pruebas automatizadas para asegurar que la integración no provocó regresiones:
   ```bash
   pnpm test
   ```
2. Comprueba que el estado de Git quede limpio:
   ```bash
   git status
   ```

---

## Checklist de Cierre
- [ ] Árbol de trabajo limpio o cambios protegidos en stash antes de operar.
- [ ] `git fetch origin develop` ejecutado con éxito.
- [ ] Conteo de commits revisado; solo se procedió con merge si existían cambios (`count > 0`).
- [ ] **Ningún comando de rebase ejecutado (`rebase` prohibido)**.
- [ ] En caso de conflictos: resueltos combinando mejoras y sin descartar código a ciegas.
- [ ] Stash restaurado (si aplicó).
- [ ] Suite de pruebas (`pnpm test`) ejecutada y en verde.
