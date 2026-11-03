---
name: prompts-significativos
description: >-
  Biblioteca y directrices de prompts de alto impacto arquitectónico, de negocio, seguridad y transacciones
  para dirigir agentes de IA en artesa. Excluye cambios cosméticos (colores, estilos, diseño superficial)
  y almacena plantillas rigurosas para flujos críticos, lógica SQL, RBAC, auditoría y normativas fiscales.
---

# Prompts Significativos para Agentes de IA (artesa)

Este catálogo almacena **únicamente prompts de alto impacto**: aquellos que definen arquitectura, reglas de negocio críticas, seguridad, transacciones ACID, normativas tributarias salvadoreñas y operaciones complejas.

> [!IMPORTANT]
> **Filtro de Significancia**:
> - ❌ **NO pertenece aquí**: *"Cambia el color del botón a verde"*, *"Haz el encabezado más grande"*, *"Añade un icono decorativo"*, *"Ajusta el margen inferior"*. Esos cambios son triviales y no justifican una indicación estructurada ni registro en la memoria técnica.
> - ✅ **SÍ pertenece aquí**: Prompts que instruyen al agente a implementar flujos de negocio, vincular funciones de base de datos, configurar transacciones, aplicar RBAC dinámico, emitir documentos tributarios o garantizar integridad de datos.

---

## 1. Anatomía de un Prompt Significativo en artesa

Todo prompt de alto impacto dirigido a un agente debe incluir 5 componentes obligatorios:

```markdown
1. Contexto & Objetivo: Qué módulo o flujo se construye y su propósito de negocio.
2. Contrato Técnico: Capas afectadas (routes -> controller -> service -> repository), esquemas Zod y códigos HTTP.
3. Regla de Negocio Crítica: Función SQL a invocar (`pos.fn_*`, `inventario.fn_*`), parámetros y control de excepciones (`P0001`).
4. Seguridad & Transaccionalidad: Código de permiso RBAC (`seguridad.permisos`), uso de `withTransaction` y fijación de `app.user_id`.
5. Criterio de Aceptación & Verificación: Casos de prueba (ej. curl), validación de errores (400, 409) y registro de cambio.
```

---

## 2. Catálogo de Prompts Significativos

### Prompt 1: Implementación de Módulo Backend Completo (4 Capas + Zod + RBAC)
*Úsalo al crear la lógica de un nuevo módulo o recurso del sistema.*

```markdown
Actúa como desarrollador backend senior en artesa (Node.js ESM, Express, PostgreSQL 16 con SQL directo `pg`).
Implementa el módulo `<NOMBRE_MODULO>` bajo `backend/src/modules/<NOMBRE_MODULO>/` respetando estrictamente las 4 capas:

1. `<nombre>.routes.js`:
   - Monta endpoints REST con verbos correctos (`GET /api/<recursos>`, `POST /api/<recursos>`, etc.).
   - Aplica los middlewares en este orden: `authenticate`, `requirePermiso('<CODIGO_PERMISO>')`, `validate(<schemaZod>)`, `asyncHandler(<controllerFn>)`.
2. `<nombre>.schemas.js`:
   - Define esquemas Zod rigurosos para `body`, `query` y `params` (UUIDs, números mayores a 0, tipos permitidos).
3. `<nombre>.controller.js`:
   - Responsabilidad única HTTP: extraer datos validados de `req`, invocar el servicio y responder con el código de estado correspondiente (200 OK, 201 Created, 204 No Content).
4. `<nombre>.service.js`:
   - Implementa la orquestación de negocio. Todas las escrituras deben ejecutarse dentro de `withTransaction(async (client) => { ... }, req.user.id)` para registrar la bitácora con `app.user_id`.
   - Lanza `new AppError(mensaje, statusCode)` para condiciones inválidas.
5. `<nombre>.repository.js`:
   - Consultas SQL directas estrictamente parametrizadas (`$1, $2`). Sin ORM.
   - Si la operación involucra lógica transaccional crítica, invoca la función PL/pgSQL correspondiente sin reimplementarla en JS.

Registra el router en `backend/src/modules/index.js` y entrega únicamente el diff mínimo con la verificación por curl de éxito y de rechazo sin permisos.
```

---

### Prompt 2: Registro de Venta POS con Función SQL Atómica
*Úsalo para ventas en mostrador, pagos múltiples y deducción de stock.*

```markdown
Implementa el flujo de cobro y registro de venta en el POS invocando la función atómica `pos.fn_registrar_venta`.

Requisitos estrictos de ejecución:
1. No calcules totales, IVA (13%), números correlativos ni movimientos de stock en JavaScript. Todo se delega a `pos.fn_registrar_venta($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`.
2. Parámetros requeridos: `id_turno`, `tipo_comprobante` ('FCF' o 'CCF'), `id_cliente` (obligatorio con NRC si es CCF), `items` (JSON string de `[{id_producto, cantidad, precio_unitario, notas}]`), `pagos` (JSON string de `[{id_metodo_pago, monto, referencia}]`), `descuento`, `id_orden`.
3. Ejecución dentro de `withTransaction(..., req.user.id)`.
4. Captura de excepciones: El error de negocio de PostgreSQL con código `P0001` (ej. turno cerrado, stock insuficiente, montos de pago menores al total) debe transformarse en `AppError` con HTTP 400 o 409, conservando el mensaje en español sin ocultarlo.
5. Protege la ruta con `requirePermiso('POS_CREAR_VENTA')`.
6. Valida con un test curl:
   - Caso exitoso con comprobante emitido.
   - Caso fallido: venta con turno cerrado (debe responder 409 con el error de la BD).
```

---

### Prompt 3: Cuadratura y Cierre de Turno de Caja (Arqueo Ciego)
*Úsalo para el corte Z/X y control de efectivo.*

```markdown
Implementa el cierre de turno de caja delegando la liquidación a la función `pos.fn_cerrar_turno`.

Restricciones de negocio y seguridad:
1. Aplica principio de arqueo ciego: el cajero reporta el efectivo contado en físico sin conocer previamente el total esperado del sistema.
2. Endpoint: `POST /api/turnos/:id/cerrar` protegido por `authenticate` y `requirePermiso('CAJA_CERRAR_TURNO')`.
3. Valida con Zod: `efectivo_declarado` (número >= 0) y `notas_cierre` opcionales.
4. Invoca en el repository:
   `SELECT * FROM pos.fn_cerrar_turno($1, $2, $3)` enviando `id_turno`, `efectivo_declarado` y `notas`.
5. Si `diferencia != 0`, asegúrate de registrar la novedad y retornar el desglose exacto (esperado, declarado, diferencia) para que el frontend alerte al supervisor.
6. Nunca permitas cerrar un turno ya cerrado (la BD disparará excepción `P0001`, mapearla a 409 Conflict).
```

---

### Prompt 4: Movimiento de Inventario, Merma y Kardex Automático
*Úsalo para ajustes de stock, mermas o recepciones de materia prima.*

```markdown
Implementa el ajuste de inventario y registro de merma integrando las funciones `inventario.fn_mover_stock` e `inventario.fn_registrar_merma`.

Restricciones técnicas:
1. Queda estrictamente prohibido hacer `UPDATE inventario.insumos SET stock_actual = ...` directo desde Node.js. Todo cambio de existencias debe dejar trazabilidad en el kardex mediante la función SQL.
2. Firma de llamada:
   `SELECT inventario.fn_mover_stock($1, $2, $3, $4, $5, $6)`
   (id_insumo, cantidad_con_signo, tipo_movimiento, id_documento_ref, motivo, id_usuario).
3. Para mermas: validar tipo de merma ('CADUCIDAD', 'PREPARACION', 'ACCIDENTE', 'OTRO') y costo unitario histórico.
4. Envuelve la operación en `withTransaction` asociando `req.user.id`.
5. Protege el endpoint con `requirePermiso('INV_AJUSTAR_STOCK')` o `requirePermiso('INV_REGISTRAR_MERMA')`.
6. Documenta el formato del curl para comprobar el descuento de existencias y la inserción correspondiente en `inventario.kardex`.
```

---

### Prompt 5: Facturación Electrónica DTE y Cumplimiento Tributario de El Salvador
*Úsalo al estructurar comprobantes fiscales (FCF, CCF) y datos DTE.*

```markdown
Implementa la estructura de facturación electrónica simulada para el comprobante de venta, respetando la normativa del Ministerio de Hacienda de El Salvador:

1. Cálculos de IVA:
   - Para Factura de Consumidor Final (FCF): los precios de carta ya incluyen el 13% de IVA; se calcula `iva_monto = total_venta - (total_venta / 1.13)`.
   - Para Comprobante de Crédito Fiscal (CCF): el precio neto se grava con el 13% adicional; requiere obligatoriamente `nrc`, `nit` (o DUI homologado), `razon_social` y `giro` del cliente registrado.
2. Campos DTE simulados:
   - Generación de UUID v4 como `codigo_generacion`.
   - Formato de `numero_control`: `DTE-01-M001P001-XXXXXXXXXXXXXXX`.
   - Sello de recepción simulado (hash SHA-256 de control + timestamp).
3. Manejo de dinero:
   - No utilices números de punto flotante para operaciones financieras en JS. Maneja los valores como enteros de centavos o formatea con precisión decimal exacta usando strings de `NUMERIC(12,2)`.
4. Endpoint: `POST /api/ventas/:id/dte` protegido por `requirePermiso('POS_EMITIR_DTE')`.
```

---

### Prompt 6: Liquidación de Planilla y Retenciones Laborales de Ley
*Úsalo para el cálculo de sueldos, ISSS, AFP y Renta El Salvador.*

```markdown
Implementa el servicio de cálculo y generación de planilla salarial invocando `rrhh.fn_calcular_planilla`.

Directrices:
1. No reimplementes los tramos de renta ni las tasas de AFP (7.25%) e ISSS (3.00% con techo de $30.00) en código Node.js; invoca la función PL/pgSQL que ya lee los parámetros oficiales en `empresa.parametros` y `rrhh.tramos_renta`.
2. Endpoint: `POST /api/planillas/calcular` con `id_periodo`, `dias_trabajados`, `horas_extras` y `bonificaciones`.
3. Toda la liquidación debe correr en una transacción atómica; si un empleado tiene inconsistencias de contrato, la transacción revierte completa.
4. Protege con `requirePermiso('RRHH_GESTION_PLANILLA')`.
5. Retorna la planilla precalculada desglosada (Sueldo Bruto, Descuento ISSS, Descuento AFP, Renta Imponible, Retención Renta, Sueldo Neto) para confirmación de la jefatura antes de su aplicación definitiva.
```

---

### Prompt 7: Migración de Base de Datos Idempotente con RBAC y Bitácora
*Úsalo para crear tablas nuevas, columnas o funciones sin romper datos.*

```markdown
Diseña una migración de base de datos para el requerimiento `<DESCRIPCION_CAMBIO>`:

1. Archivo: Determina el siguiente consecutivo y crea `database/migrations/NNN_<descripcion>.sql`. NO toques `01_schema.sql`.
2. Idempotencia: Utiliza sentencias `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`.
3. Convenciones:
   - Esquemas correspondientes (`seguridad`, `empresa`, `inventario`, `pos`, `caja`, `compras`, `rrhh`).
   - Nombres en español, `snake_case`, llaves foráneas explícitas con `ON DELETE RESTRICT` (a menos que aplique `CASCADE` justificado).
   - Tipos de moneda en `NUMERIC(12,2)` (nunca REAL o FLOAT). Fechas con `TIMESTAMPTZ DEFAULT clock_timestamp()`.
4. Auditoría y Bitácora: Si la tabla almacena transacciones o datos maestros, añade el trigger de bitácora correspondiente (`seguridad.fn_bitacora_trigger`).
5. Permisos RBAC:
   - Inserta los nuevos permisos en `seguridad.permisos` con código único, nombre y módulo.
   - Asígnalos por defecto a los roles pertinentes en `seguridad.roles_permisos`.
6. Valida la migración ejecutándola en el contenedor local: `docker compose exec -T db psql -U postgres -d artesa < database/migrations/NNN_*.sql`.
7. Actualiza la sección afectada en `docs/ai/DB_MAP.md`.
```

---

### Prompt 8: Pantalla Operativa Compleja en React (POS / Turno)
*Úsalo para vistas frontend de misión crítica.*

```markdown
Crea la pantalla operativa `<NOMBRE_PANTALLA>` en `frontend/src/pages/<NombrePage>.jsx` o dentro de `frontend/src/modules/<modulo>/`:

1. Acceso y Seguridad:
   - Asegúrate de que la ruta en `App.jsx` esté envuelta en `<ProtectedRoute permiso="<CODIGO_PERMISO>">`.
2. Integración con API:
   - Crea las funciones de cliente en `frontend/src/api/<modulo>.api.js` usando la instancia central de Axios.
   - Manejo de estados: `cargando`, `error`, `datos`. Todo error del backend debe atraparse en `try/catch` y presentarse al usuario con `EstadoBadge` o alerta accesible (nunca pantalla en blanco ni fallo silencioso).
3. Reglas de Negocio en la Interfaz:
   - Sincroniza visualmente los cálculos exactos con las respuestas del backend (desglose de IVA, subtotales, totales).
   - Deshabilita los botones de acción durante el envío para evitar doble clic / envíos concurrentes (idempotencia en UI).
4. Componentes y Tokens de Diseño:
   - Reutiliza componentes de `frontend/src/components/` (`Modal`, `Boton`, `EstadoBadge`).
   - Usa Tailwind utilitario sin definir colores hexadecimales arbitrarios fuera de la paleta corporativa.
5. Verificación: Demuestra el flujo con datos de prueba, validando el bloqueo ante permisos insuficientes y la recuperación de errores de red.
```

---

## 3. Protocolo para Almacenar Nuevos Prompts Significativos

Cuando el equipo diseñe una indicación que resuelva un problema técnico o de negocio de alta complejidad:

1. **Verificar el filtro**: Asegurarse de que no sea un cambio estético, visual ni un ajuste de texto simple.
2. **Estandarizar**: Redactar siguiendo la sección 1 (Contexto, Contrato, Regla SQL, RBAC, Criterio de Aceptación).
3. **Guardar**: Añadirlo a la sección 2 de este archivo con un título descriptivo y la indicación de cuándo usarlo.
4. **Declarar**: Añadir la línea correspondiente en `docs/USO_IA.md` y en `docs/ai/CHANGELOG_AGENTE.md`.
