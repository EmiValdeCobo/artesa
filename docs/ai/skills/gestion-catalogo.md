---
name: gestion-catalogo
description: >-
  Alta, edición y baja lógica de productos (platos/bebidas), insumos, categorías y recetas del catálogo de artesa.
  Úsala al tocar el menú, costos de receta o el stock mínimo.
triggers: [producto, plato, menu, catalogo, insumo, receta, categoria, precio, codigo de barra, stock minimo]
lee_antes:
  - docs/ai/DB_MAP.md#inventario
  - backend/src/modules/auth/ (solo como patrón de capas)
permisos: [INV_GESTIONAR_PRODUCTOS, INV_GESTIONAR_INSUMOS, INV_GESTIONAR_RECETAS, INV_VER_COSTOS]
no_hacer:
  - No editar 01_schema.sql (usar migración)
  - No borrar físicamente: usar activo=false
salida_esperada: Endpoint/pantalla funcionando + línea en CHANGELOG_AGENTE.md
---
## Pasos
1. Backend: módulo `inventario` (routes → controller → service → repository) siguiendo `nuevo-endpoint-rest`.
2. Producto elaborado (`es_elaborado=true`) requiere ≥1 fila en `recetas`; producto de reventa requiere `id_insumo_reventa`.
3. Guardar producto + receta en UNA transacción (`withTransaction`).
4. Frontend: `modules/inventario/` con tabla, formulario y `EstadoBadge` para activo/stock bajo (skill `nueva-pantalla-react`).

## Reglas de negocio
- `precio_venta` es el precio FINAL con IVA (RN-1). Mostrar margen con `reportes.vw_costo_margen_producto`.
- Costos visibles solo con `INV_VER_COSTOS`. Cambios quedan en bitácora (trigger).

## Checklist de cierre
- [ ] Zod valida precio ≥ 0 y cantidades > 0 · [ ] Dinero sin float · [ ] CHANGELOG
