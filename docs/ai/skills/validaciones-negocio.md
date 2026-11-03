---
name: validaciones-negocio
description: >-
  Aplicar y probar reglas de negocio (IVA, turnos, CCF, stock, pagos, planilla) sin duplicarlas: validar entradas
  con Zod y delegar la regla real a las funciones SQL. Úsala al implementar o corregir cualquier flujo crítico.
triggers: [validar, validacion, regla de negocio, iva, ccf, fcf, turno, stock negativo, pago, descuento, anular, planilla, dte, correlativo]
lee_antes:
  - docs/ai/DB_MAP.md (funciones fn_*)
  - README.md#reglas-de-negocio-críticas
no_hacer:
  - No recalcular IVA, totales ni stock en JS: llamar pos.fn_registrar_venta / inventario.fn_mover_stock / etc.
  - No capturar errores SQL para ocultarlos: mapear a AppError (400/409) con mensaje claro en español
salida_esperada: Esquema Zod + mapeo de errores + caso de prueba (curl) que demuestre la regla
---
## Pasos
1. Identifica la RN afectada (README §2) y la función SQL que la aplica.
2. Zod: forma y tipos (UUID, cantidades > 0, métodos de pago válidos). La regla de negocio NO va aquí.
3. Service: precondiciones baratas (permiso, turno abierto) y llamada a la función SQL dentro de `withTransaction`.
4. Mapea `RAISE EXCEPTION` de PostgreSQL → `AppError` (409 conflicto de negocio, 400 entrada inválida).
5. Frontend: mostrar el mensaje del backend con `EstadoBadge tipo="error"`; nunca asumir éxito.

## Casos mínimos a probar
- Venta sin turno abierto → 409 · CCF sin cliente/NRC → 400 · pago menor al total → 400 · anular dos veces → 409.
