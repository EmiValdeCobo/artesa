# Compras: IVA, crédito fiscal y costeo de insumos

Documento técnico y contrato de interfaz para el flujo de compras a proveedores
(migración `018_compras_tipo_documento_margen.sql`). Explica qué hace el sistema
y por qué, para que cualquier integrante pueda defenderlo.

## 1. Flujo actual (precio con IVA → costo neto)

```
CompraFacturaPage.jsx  (el usuario escribe el precio unitario TAL COMO viene en el documento, IVA incluido)
  → POST /api/compras/facturas  (authenticate + requirePermiso('COM_REGISTRAR_COMPRA') + Zod)
  → facturas.repository.js → compras.fn_registrar_compra(..., p_tipo_documento)
      total_linea    = ROUND(cantidad × precio_con_iva, 2)
      subtotal_linea = ROUND(total_linea / (1 + tasa), 2)   ← solo si el documento es CCF
      iva_linea      = total_linea − subtotal_linea
      → compras.facturas_compra (subtotal, iva_credito, total, tipo_documento)
      → compras.compra_detalles (costo_unitario = neto, costo_unitario_con_iva = original)
           → trigger trg_detalle_compra: recalcula costo_promedio ponderado y mueve stock (kárdex)
```

## 2. Tipo de documento y crédito fiscal (nuevo)

Solo el **Comprobante de Crédito Fiscal (CCF)** emitido por un contribuyente inscrito da
derecho a descontar el IVA pagado (Ley de IVA, arts. 64-65). Si la compra viene en
Factura de Consumidor Final (CF) o Factura de Sujeto Excluido (FSE), ese IVA **no se
recupera**: forma parte del costo del insumo.

| tipo_documento | IVA crédito | costo_unitario guardado |
|---|---|---|
| `CCF` (por defecto) | total − total/1.13 | precio / 1.13 |
| `CF` | 0.00 | precio completo |
| `FSE` | 0.00 | precio completo (el sujeto excluido no cobra IVA) |

## 3. Costo promedio ponderado (CPP) y recetas

- Cada compra recalcula `inventario.insumos.costo_promedio`:
  `(stock_total × costo_actual + cantidad × costo_neto) / (stock_total + cantidad)`.
  Es un método admitido por el Código Tributario (art. 143) y suaviza la volatilidad.
- El stock usado es la suma de todas las sucursales; el stock negativo cuenta como 0
  (un faltante no "absorbe" el precio nuevo). Decisión consciente y documentada.
- El costo de receta no se guarda: se calcula al vuelo (`Σ cantidad × costo_promedio`).
  El kárdex sí guarda el costo vigente en cada movimiento, así que lo histórico no cambia.
- El precio de venta **nunca** se actualiza solo: lo decide una persona. Para que no se
  pierda margen en silencio, existe la alerta de margen bajo (sección 4).

## 4. Alerta de margen bajo (nuevo)

Parámetro `empresa.parametros.margen_minimo` (fracción, por defecto `0.60` = 60 % sobre
el precio sin IVA). Vista `reportes.vw_productos_margen_bajo`.

## 5. Contrato de API

### POST /api/compras/facturas (cambio compatible)
Body nuevo campo opcional: `tipoDocumento: 'CCF' | 'CF' | 'FSE'` (por defecto `'CCF'`).
`items[].costoUnitario` = precio unitario **con IVA incluido** (string decimal).

Respuesta 201 añade:
```json
{ "id_compra": "...", "idCompra": "...", "alertasMargen": [
  { "idProducto": 3, "nombre": "Capuchino", "precioSinIva": "2.21",
    "costoReceta": "0.43", "margenPct": "58.40", "margenMinimoPct": "60.00" } ] }
```
`alertasMargen` solo incluye productos activos que usan alguno de los insumos comprados
(receta o reventa) y cuyo margen quedó por debajo del mínimo. Arreglo vacío si no hay.
Solo se rellena si el usuario tiene `INV_VER_COSTOS`; si no, siempre `[]`.

### GET /api/reportes/margen-bajo
Permiso `INV_VER_COSTOS` (mismo que el reporte de margen). Devuelve el mismo formato
de objeto que `alertasMargen`, ordenado por `margenPct` ascendente.

### Listados de compras
Los listados/detalles de facturas incluyen `tipo_documento`.

## 6. Ejemplo numérico: por qué costear sin IVA

Compra de café con CCF: 5 kg a $11.30 con IVA = $56.50 → neto $10.00/kg, crédito fiscal $6.50.
Había 2 kg a $9.50 → nuevo CPP = (2×9.50 + 5×10.00)/7 = **$9.857143/kg**.

Capuchino (costos netos): café 0.018 kg = $0.1774 · leche 0.150 L = $0.1500 · vaso = $0.1000 → **$0.4274**.
Precio de venta $2.50 con IVA → $2.2124 neto + $0.2876 de débito fiscal.

| | Neto vs. neto (correcto) | Costo con IVA (error) |
|---|---|---|
| Costo receta | $0.4274 | $0.4830 |
| Margen | **$1.785 (80.7 %)** | $1.729 (78.2 %) |

Comprobación en caja: el cliente paga $2.50; al proveedor se le pagan $0.483; a Hacienda se le
entregan $0.2876 − $0.0556 = $0.232. Quedan $1.785, que es exactamente el margen neto. Si se
costeara con IVA, ese IVA se contaría dos veces: una como costo y otra como crédito que de todos
modos se recupera en el F-07.
