# T01 — Contrato de API del POS
**Acuerdo vinculante entre Ortiz (Backend) y Rodas (Frontend)**
Proyecto: artesa · Ciclo 02-2026 · Fecha: 2026-11-07

---

## 1. Objetivo y Alcance

Este documento especifica las rutas, payloads, formatos de respuesta y reglas de negocio que el backend debe exponer y el frontend del POS debe consumir. Funciona como contrato técnico: cualquier cambio requiere acuerdo de ambas partes y actualización de este archivo.

### Flujo general

```
Catálogo (GET /api/inventario/productos)
        │
        ▼
Carrito (frontend, solo local)
        │  POST /api/pos/ordenes
        ▼
Comanda / Orden  (estado: ABIERTA → EN_PREPARACION → LISTA → ENTREGADA)
        │  POST /api/pos/ventas
        ▼
Venta / Factura  (FCF o CCF, pagos mixtos, IVA desglosado)
```

---

## 2. Reglas Globales

| Regla | Detalle |
|---|---|
| **Dinero** | Siempre `string` con 2 decimales (`"35.00"`). Nunca `number` float. Coincide con `NUMERIC(10,2)` de PostgreSQL. |
| **Formato respuesta** | JSend: `{ "status": "success"\|"fail"\|"error", "data": … }` |
| **Autenticación** | JWT en cookie `httpOnly`. Toda ruta protegida valida `activo = true`. |
| **RBAC** | Cada endpoint lleva el permiso requerido indicado abajo. |
| **IDs** | UUID v4 en string para entidades principales; entero para catálogos auxiliares. |
| **Idioma** | UI y campos en español, igual que la BD. |

---

## 3. Catálogo de Productos

### `GET /api/inventario/productos`

> **Alias acordado con Rodas:** también accesible como `GET /api/productos` (el router redirige internamente).

**Permiso:** `INV_VER_STOCK`
**Descripción:** Lista de productos para el catálogo y carrito del POS.

#### Query params (todos opcionales)

| Param | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `categoria_id` | integer | `3` | Filtra por categoría |
| `buscar` | string | `"café"` | Búsqueda por nombre (ILIKE) |
| `activo` | boolean | `true` | Por defecto solo activos |
| `sucursal_id` | uuid | `"…"` | Para calcular stock de esa sucursal |

#### Respuesta `200 OK`

```json
{
  "status": "success",
  "data": {
    "productos": [
      {
        "id_producto":    4,
        "nombre":         "Café Americano",
        "categoria":      "Bebidas Calientes",
        "precio":         "2.50",
        "stock":          "48.00",
        "stock_minimo":   "10.00",
        "tipo":           "ELABORADO",
        "codigo_barra":   null,
        "activo":         true,
        "imagen_url":     "/uploads/cafe_americano.webp",
        "permite_descuento": true
      }
    ],
    "total": 1
  }
}
```

#### Notas de mapeo BD → JSON

| JSON | Columna BD | Tabla |
|---|---|---|
| `id_producto` | `id_producto` | `inventario.productos` |
| `nombre` | `nombre` | `inventario.productos` |
| `categoria` | `nombre` | `inventario.categorias_producto` (JOIN) |
| `precio` | `precio_venta` (con IVA) | `inventario.productos` |
| `stock` | `stock_actual` | `inventario.stock_sucursal` (JOIN) |
| `stock_minimo` | `stock_minimo` | `inventario.stock_sucursal` (JOIN) |
| `tipo` | `es_elaborado` → `"ELABORADO"` / `"REVENTA"` | `inventario.productos` |

> **Acuerdo:** el frontend NO envía `precio` al crear la orden (el backend lo toma de BD para evitar manipulación). El campo `precio` del catálogo es solo para mostrar en UI.

---

## 4. Órdenes / Comandas

### 4.1 `POST /api/pos/ordenes` — Crear comanda

**Permiso:** `POS_CREAR_ORDEN`

#### Payload

```json
{
  "id_turno":    "uuid-del-turno-activo",
  "canal":       "MESA",
  "etiqueta":    "Mesa 5",
  "id_cliente":  null,
  "notas":       "Sin azúcar en el café",
  "items": [
    {
      "id_producto":   4,
      "cantidad":      2,
      "nota":          "Extra caliente"
    }
  ]
}
```

| Campo | Tipo | Obligatorio | Valores válidos |
|---|---|---|---|
| `id_turno` | uuid | ✅ | Turno `ABIERTO` del cajero |
| `canal` | string | ✅ | `"MESA"` · `"LLEVAR"` · `"DOMICILIO"` |
| `etiqueta` | string | ✅ | Ej. `"Mesa 5"`, `"Para llevar #3"` |
| `id_cliente` | uuid | ❌ | Requerido solo para CCF |
| `notas` | string | ❌ | Notas generales de la orden |
| `items[].id_producto` | integer | ✅ | Debe existir y estar activo |
| `items[].cantidad` | integer | ✅ | ≥ 1 |
| `items[].nota` | string | ❌ | Personalización del ítem |

#### Respuesta `201 Created`

```json
{
  "status": "success",
  "data": {
    "id_orden":  "uuid-generado",
    "estado":    "ABIERTA",
    "etiqueta":  "Mesa 5",
    "canal":     "MESA",
    "creada_en": "2026-11-07T17:30:00Z"
  }
}
```

---

### 4.2 `GET /api/pos/ordenes` — Listar órdenes activas

**Permiso:** `POS_CREAR_ORDEN`

#### Query params

| Param | Descripción |
|---|---|
| `id_turno` | Filtra por turno activo (recomendado) |
| `estado` | `ABIERTA` · `EN_PREPARACION` · `LISTA` · `ENTREGADA` |

#### Respuesta `200 OK`

```json
{
  "status": "success",
  "data": {
    "ordenes": [
      {
        "id_orden":  "uuid",
        "canal":     "MESA",
        "etiqueta":  "Mesa 5",
        "estado":    "ABIERTA",
        "total":     "5.00",
        "items_count": 2
      }
    ]
  }
}
```

---

### 4.3 `GET /api/pos/ordenes/:id` — Detalle de orden

**Permiso:** `POS_CREAR_ORDEN`

#### Respuesta `200 OK`

```json
{
  "status": "success",
  "data": {
    "id_orden":  "uuid",
    "canal":     "MESA",
    "etiqueta":  "Mesa 5",
    "estado":    "ABIERTA",
    "notas":     "Sin azúcar",
    "items": [
      {
        "id_detalle":      1,
        "id_producto":     4,
        "nombre_producto": "Café Americano",
        "cantidad":        2,
        "precio_unitario": "2.50",
        "subtotal":        "5.00",
        "nota":            "Extra caliente"
      }
    ],
    "subtotal": "5.00",
    "total":    "5.00"
  }
}
```

---

### 4.4 `PUT /api/pos/ordenes/:id` — Editar orden

**Permiso:** `POS_CREAR_ORDEN`
**Restricción:** solo si `estado = "ABIERTA"`. Si ya está en cocina → `409 Conflict`.

#### Payload (igual a POST, campos opcionales)

```json
{
  "etiqueta": "Mesa 5 - VIP",
  "notas":    "Alergia a nueces",
  "items": [
    { "id_producto": 4, "cantidad": 3, "nota": "" },
    { "id_producto": 7, "cantidad": 1, "nota": null }
  ]
}
```

---

### 4.5 `PATCH /api/pos/ordenes/:id/estado` — Cambiar estado

**Permiso:** `POS_VER_COLA_PREPARACION`

#### Payload

```json
{ "estado": "EN_PREPARACION" }
```

#### Máquina de estados válida

```
ABIERTA → EN_PREPARACION → LISTA → ENTREGADA → (FACTURADA lo pone el sistema al crear venta)
ABIERTA → ANULADA   (solo con permiso POS_ANULAR_VENTA)
```

#### Respuestas

| HTTP | Cuándo |
|---|---|
| `200` | Transición válida aplicada |
| `409` | Transición no permitida |
| `404` | Orden no existe |

---

## 5. Ventas y Pagos

### `POST /api/pos/ventas` — Registrar venta / factura

**Permiso:** `POS_COBRAR` (+ `POS_EMITIR_CCF` si tipo = CCF)

> El backend llama internamente a `pos.fn_registrar_venta(...)` que ejecuta todo de forma atómica: descuenta stock, genera correlativo, registra pagos y retorna `id_venta`.

#### Payload

```json
{
  "id_turno":          "uuid-del-turno",
  "id_orden":          "uuid-de-la-orden",
  "tipo_comprobante":  "FCF",
  "id_cliente":        null,
  "descuento":         "0.00",
  "pagos": [
    {
      "metodo":          "EFECTIVO",
      "monto":           "5.00",
      "monto_recibido":  "10.00",
      "referencia":      null
    }
  ]
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id_turno` | uuid | ✅ | Debe estar `ABIERTO` |
| `id_orden` | uuid | ✅ | Debe existir y no estar `ANULADA` |
| `tipo_comprobante` | string | ✅ | `"FCF"` o `"CCF"` |
| `id_cliente` | uuid | ✅ para CCF | Cliente con NRC y giro_economico |
| `descuento` | string | ❌ | Default `"0.00"`. Requiere `POS_APLICAR_DESCUENTO` |
| `pagos[].metodo` | string | ✅ | `"EFECTIVO"` · `"TARJETA"` · `"TRANSFERENCIA"` · `"BITCOIN_CHIVO"` |
| `pagos[].monto` | string | ✅ | Monto que cubre este método |
| `pagos[].monto_recibido` | string | ❌ | Solo EFECTIVO (para calcular vuelto) |
| `pagos[].referencia` | string | ❌ | Número de lote tarjeta / comprobante |

#### Reglas de negocio

- `SUM(pagos[].monto) >= total_venta` — si falta → `400`
- Vuelto = `monto_recibido - monto` (solo aplica a pago en efectivo)
- Para CCF: `id_cliente` debe tener `nrc` y `giro_economico` no nulos → si no → `400`
- Precios tomados de `orden_detalles.precio_unitario` (congelados al crear la orden)
- IVA en FCF: `iva = ROUND(total - total / 1.13, 2)` (incluido en precio)
- IVA en CCF: precio gravado sin IVA + IVA desglosado aparte

#### Respuesta `201 Created`

```json
{
  "status": "success",
  "data": {
    "id_venta":          "uuid-venta",
    "tipo_comprobante":  "FCF",
    "correlativo":       "001-001-00000001",
    "subtotal":          "4.42",
    "iva":               "0.58",
    "descuento":         "0.00",
    "total":             "5.00",
    "vuelto":            "5.00",
    "estado":            "EMITIDA",
    "pagos": [
      {
        "metodo":         "EFECTIVO",
        "monto":          "5.00",
        "monto_recibido": "10.00"
      }
    ]
  }
}
```

---

## 6. Manejo de Errores y Validaciones Zod

### 400 — Error de validación de esquema

```json
{
  "status": "fail",
  "data": {
    "campo":   "pagos[0].monto",
    "mensaje": "Se esperaba string con formato decimal (ej. '5.00')"
  }
}
```

### 400 — Pago insuficiente

```json
{
  "status": "fail",
  "data": {
    "campo":   "pagos",
    "mensaje": "El total de pagos (4.00) no cubre el total de la venta (5.00)"
  }
}
```

### 409 — Conflicto de concurrencia

```json
{
  "status": "fail",
  "data": {
    "campo":   "id_orden",
    "mensaje": "La orden ya fue facturada o anulada"
  }
}
```

```json
{
  "status": "fail",
  "data": {
    "campo":   "id_turno",
    "mensaje": "El turno de caja está cerrado"
  }
}
```

```json
{
  "status": "fail",
  "data": {
    "campo":   "stock",
    "mensaje": "Stock insuficiente para el producto 'Café Americano' (disponible: 1, solicitado: 2)"
  }
}
```

### 403 — Sin permiso

```json
{
  "status": "fail",
  "data": { "mensaje": "No tiene el permiso requerido: POS_COBRAR" }
}
```

---

## 7. Resumen de Endpoints y Permisos

| Método | Ruta | Permiso | Estado |
|---|---|---|---|
| `GET` | `/api/inventario/productos` | `INV_VER_STOCK` | ⬜ Pendiente |
| `POST` | `/api/pos/ordenes` | `POS_CREAR_ORDEN` | ⬜ Pendiente |
| `GET` | `/api/pos/ordenes` | `POS_CREAR_ORDEN` | ⬜ Pendiente |
| `GET` | `/api/pos/ordenes/:id` | `POS_CREAR_ORDEN` | ⬜ Pendiente |
| `PUT` | `/api/pos/ordenes/:id` | `POS_CREAR_ORDEN` | ⬜ Pendiente |
| `PATCH` | `/api/pos/ordenes/:id/estado` | `POS_VER_COLA_PREPARACION` | ⬜ Pendiente |
| `POST` | `/api/pos/ventas` | `POS_COBRAR` | ⬜ Pendiente |

---

## 8. Checklist de Conformidad y Firmas

| # | Punto acordado | Ortiz ✅ | Rodas ✅ |
|---|---|---|---|
| 1 | Campo `precio` solo lectura en frontend (backend toma precio de BD) | ☐ | ☐ |
| 2 | Dinero como string `"0.00"` en ambas direcciones | ☐ | ☐ |
| 3 | Respuesta siempre en formato JSend | ☐ | ☐ |
| 4 | Campo `tipo` del producto: `"ELABORADO"` o `"REVENTA"` | ☐ | ☐ |
| 5 | Campos `stock` y `stock_minimo` vienen del catálogo | ☐ | ☐ |
| 6 | `canal` acepta: `MESA`, `LLEVAR`, `DOMICILIO` | ☐ | ☐ |
| 7 | `etiqueta` = identificador humano de mesa/pedido | ☐ | ☐ |
| 8 | Pagos mixtos: array de pagos, cada uno con `metodo` + `monto` | ☐ | ☐ |
| 9 | CCF requiere `id_cliente` con NRC y giro | ☐ | ☐ |
| 10 | `id_turno` siempre obligatorio en ordenes y ventas | ☐ | ☐ |

---

*Documento generado: 2026-11-07 · Próxima revisión: al iniciar implementación de T17/T19*
