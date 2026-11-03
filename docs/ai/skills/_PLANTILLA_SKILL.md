---
name: nombre-en-kebab-case            # igual al nombre del archivo
description: >-                        # 1-2 frases: QUÉ hace y CUÁNDO usarla (lo que el agente lee para decidir)
  Qué resuelve esta skill y en qué situaciones aplicarla.
triggers:                              # palabras/frases que la activan (ES, minúsculas, sin tildes opcional)
  - palabra clave 1
  - frase clave 2
  - módulo o tabla relacionada
lee_antes:                             # SOLO estos archivos; nada más hasta que haga falta
  - docs/ai/DB_MAP.md#seccion
  - ruta/a/archivo-patron.js
permisos: [CODIGO_PERMISO]             # códigos de seguridad.permisos que toca (si aplica)
no_hacer:                              # límites explícitos
  - No reimplementar lógica que ya existe en funciones SQL
salida_esperada: >-                    # qué debe entregar el agente, en una línea
  Diff mínimo + 1 línea en CHANGELOG_AGENTE.md
---

## Pasos
1. Paso concreto y verificable (archivo + qué cambiar).
2. ...

## Reglas de negocio que debe respetar
- RN-x: ...

## Checklist de cierre
- [ ] Probado (curl/UI) · [ ] Permiso aplicado · [ ] Entrada en `CHANGELOG_AGENTE.md` · [ ] Tokens de diseño (sin colores crudos)
