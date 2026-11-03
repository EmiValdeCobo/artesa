---
name: reportes
description: >-
  Dashboard y reportes (ventas diarias, top productos, margen, cuadre de turno, alertas de stock, cuentas por pagar)
  consumiendo las vistas del esquema `reportes`. Úsala para gráficos, tablas resumen y exportaciones.
triggers: [reporte, dashboard, ventas diarias, top productos, margen, cuadre, alerta stock, cuentas por pagar, exportar, csv, grafico]
lee_antes:
  - docs/ai/DB_MAP.md#reportes-vistas
permisos: [REP_VER_DASHBOARD, CAJA_VER_CUADRES, COM_VER_CXP]
no_hacer:
  - No agregar librerías de gráficos sin consultar al Tech Lead
  - No hacer agregaciones pesadas en el frontend: crear/usar una vista (migración)
salida_esperada: Endpoint GET con filtros (desde, hasta, sucursal) + vista de UI + línea en CHANGELOG
---
## Pasos
1. Backend `reportes`: un GET por vista (`/api/reportes/ventas-diarias?desde=&hasta=&sucursal=`), solo lectura, `requirePermiso`.
2. Parámetros validados con Zod (fechas ISO, rango máximo 366 días). Siempre parametrizado ($1).
3. Frontend: tarjetas KPI (`.card`), tabla y filtros; colores solo con tokens (`bg-primary`, `bg-secondary`, `text-success`...).
4. Exportación CSV en el cliente solo si el volumen es pequeño; si no, endpoint dedicado.

## Reglas
- Montos con 2 decimales desde NUMERIC (string): formatear al mostrar, no sumar floats.
- Respetar sucursal del usuario (`usuario_sucursal`) salvo ADMIN/GERENTE.
