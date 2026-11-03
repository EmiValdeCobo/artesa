---
name: usar-funciones-sql
description: Llamar desde Node las funciones SQL de negocio (venta, anulación, cierre de caja, compra, planilla).
---
Firma completa de cada una en `docs/ai/DB_MAP.md`. Se llaman con `SELECT` parametrizado dentro de `withTransaction`:
```js
// Venta (items y pagos van como JSON string + cast ::jsonb)
const { rows } = await client.query(
  'SELECT pos.fn_registrar_venta($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) AS id_venta',
  [idTurno, 'FCF', idCliente ?? null, JSON.stringify(items), JSON.stringify(pagos), descuento ?? 0, idOrden ?? null]);
```
Errores de negocio (`RAISE EXCEPTION`) llegan como error PG código `P0001`: el `errorHandler` los devuelve como 400 con el mensaje. No los captures para ocultarlos.
Nunca recalcules IVA, totales, correlativos ni stock en JS: la función ya lo hace de forma atómica.
