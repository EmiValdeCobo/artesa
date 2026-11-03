-- ============================================================================
-- ERP + POS "RESTAURANTE ORÍGENES SV"  ·  PostgreSQL 13+  ·  Organizado por esquemas
-- Esquemas: seguridad | empresa | inventario | pos | compras | rrhh | reportes
-- ============================================================================
-- Ejecutar sobre una BD vacía:  psql -U postgres -d origenes -f origenes_sv_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- crypt()/gen_salt() solo para los usuarios semilla (gen_random_uuid() ya es nativo)

CREATE SCHEMA IF NOT EXISTS seguridad;     -- usuarios, roles, permisos, bitácora
CREATE SCHEMA IF NOT EXISTS empresa;       -- sucursales y parámetros legales/configurables
CREATE SCHEMA IF NOT EXISTS inventario;    -- insumos, productos, recetas, stock, kardex
CREATE SCHEMA IF NOT EXISTS pos;           -- cajas, turnos, órdenes, ventas, pagos, clientes
CREATE SCHEMA IF NOT EXISTS compras;       -- proveedores, facturas de compra, cuentas por pagar
CREATE SCHEMA IF NOT EXISTS rrhh;          -- empleados, planillas, tramos de renta
CREATE SCHEMA IF NOT EXISTS reportes;      -- solo vistas (dashboard, alertas, cuadres)

-- ============================================================================
-- 1. SEGURIDAD (RBAC dinámico: el ADMIN crea roles y marca qué permisos tienen)
-- ============================================================================
CREATE TABLE seguridad.roles (
    id_rol       SERIAL PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL UNIQUE,
    descripcion  TEXT,
    es_sistema   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = no se puede borrar desde la UI (ADMIN, CAJERO...)
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seguridad.permisos (
    id_permiso   SERIAL PRIMARY KEY,
    codigo       VARCHAR(80) NOT NULL UNIQUE,      -- 'POS_COBRAR', 'INV_VER_STOCK'... (lo que valida el backend)
    modulo       VARCHAR(50) NOT NULL,             -- agrupa checkboxes en la pantalla de roles
    descripcion  TEXT
);

CREATE TABLE seguridad.roles_permisos (
    id_rol      INT NOT NULL REFERENCES seguridad.roles(id_rol) ON DELETE CASCADE,
    id_permiso  INT NOT NULL REFERENCES seguridad.permisos(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE seguridad.usuarios (
    id_usuario     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_rol         INT NOT NULL REFERENCES seguridad.roles(id_rol),
    username       VARCHAR(50) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,           -- bcrypt, NUNCA texto plano
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login   TIMESTAMP,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un usuario puede operar en una o varias sucursales (el gerente regional en varias)
CREATE TABLE seguridad.usuario_sucursal (
    id_usuario   UUID NOT NULL REFERENCES seguridad.usuarios(id_usuario) ON DELETE CASCADE,
    id_sucursal  INT NOT NULL,                      -- FK se agrega abajo (empresa.sucursales aún no existe)
    PRIMARY KEY (id_usuario, id_sucursal)
);

-- Bitácora: quién cambió qué (precios, recetas, permisos, anulaciones...)
CREATE TABLE seguridad.bitacora (
    id_bitacora    BIGSERIAL PRIMARY KEY,
    id_usuario     UUID,                            -- viene de SET LOCAL app.user_id (lo setea el backend)
    accion         VARCHAR(20) NOT NULL,            -- INSERT / UPDATE / DELETE
    entidad        VARCHAR(80) NOT NULL,            -- 'inventario.productos'
    datos_antes    JSONB,
    datos_despues  JSONB,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. EMPRESA (sucursales + parámetros: nada de números legales "quemados" en el código)
-- ============================================================================
CREATE TABLE empresa.sucursales (
    id_sucursal            SERIAL PRIMARY KEY,
    codigo_establecimiento VARCHAR(4) NOT NULL UNIQUE,  -- 'M001' (se usa en el número de control DTE)
    nombre                 VARCHAR(100) NOT NULL,
    direccion              TEXT NOT NULL,
    departamento           VARCHAR(50) NOT NULL DEFAULT 'San Salvador',
    telefono               VARCHAR(20),
    activa                 BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE seguridad.usuario_sucursal
    ADD CONSTRAINT fk_us_sucursal FOREIGN KEY (id_sucursal) REFERENCES empresa.sucursales(id_sucursal);

CREATE TABLE empresa.parametros (
    clave        VARCHAR(60) PRIMARY KEY,
    valor        VARCHAR(100) NOT NULL,
    descripcion  TEXT
);

CREATE OR REPLACE FUNCTION empresa.fn_param(p_clave TEXT) RETURNS TEXT AS $$
    SELECT valor FROM empresa.parametros WHERE clave = p_clave;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 3. INVENTARIO (insumos, productos, recetas/BOM, stock por sucursal, kardex)
-- ============================================================================
CREATE TABLE inventario.unidades_medida (
    id_unidad  SERIAL PRIMARY KEY,
    codigo     VARCHAR(10) NOT NULL UNIQUE,         -- GR, ML, UND
    nombre     VARCHAR(50) NOT NULL
);

CREATE TABLE inventario.categorias_producto (
    id_categoria SERIAL PRIMARY KEY,
    nombre       VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE inventario.insumos (
    id_insumo       SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    tipo_insumo     VARCHAR(15) NOT NULL DEFAULT 'INGREDIENTE'
                    CHECK (tipo_insumo IN ('INGREDIENTE','EMPAQUE','REVENTA')),
    id_unidad_base  INT NOT NULL REFERENCES inventario.unidades_medida(id_unidad),
    costo_promedio  NUMERIC(12,6) NOT NULL DEFAULT 0,   -- costo por 1 unidad base (ponderado, se recalcula al comprar)
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE inventario.stock_sucursal (
    id_sucursal   INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    id_insumo     INT NOT NULL REFERENCES inventario.insumos(id_insumo),
    stock_actual  NUMERIC(14,4) NOT NULL DEFAULT 0,
    stock_minimo  NUMERIC(14,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_sucursal, id_insumo)
);

CREATE TABLE inventario.productos (
    id_producto        SERIAL PRIMARY KEY,
    id_categoria       INT REFERENCES inventario.categorias_producto(id_categoria),
    nombre             VARCHAR(120) NOT NULL UNIQUE,
    codigo_barra       VARCHAR(50) UNIQUE,
    precio_venta       NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),  -- precio FINAL (IVA incluido)
    es_elaborado       BOOLEAN NOT NULL DEFAULT TRUE,                      -- TRUE: usa receta | FALSE: reventa
    id_insumo_reventa  INT REFERENCES inventario.insumos(id_insumo),      -- reventa: qué insumo se descuenta
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_producto_tipo CHECK (
        (es_elaborado AND id_insumo_reventa IS NULL) OR
        (NOT es_elaborado AND id_insumo_reventa IS NOT NULL)
    )
);

CREATE TABLE inventario.recetas (
    id_producto         INT NOT NULL REFERENCES inventario.productos(id_producto) ON DELETE CASCADE,
    id_insumo           INT NOT NULL REFERENCES inventario.insumos(id_insumo),
    cantidad_requerida  NUMERIC(10,4) NOT NULL CHECK (cantidad_requerida > 0),
    PRIMARY KEY (id_producto, id_insumo)
);

-- Kardex: CADA cambio de stock deja una fila (auditable, permite anular ventas, mermas, etc.)
CREATE TABLE inventario.movimientos_inventario (
    id_movimiento     BIGSERIAL PRIMARY KEY,
    id_sucursal       INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    id_insumo         INT NOT NULL REFERENCES inventario.insumos(id_insumo),
    tipo              VARCHAR(20) NOT NULL CHECK (tipo IN
                      ('INVENTARIO_INICIAL','COMPRA','VENTA','ANULACION_VENTA','MERMA','AJUSTE','TRASLADO_ENTRADA','TRASLADO_SALIDA')),
    cantidad          NUMERIC(14,4) NOT NULL,          -- con signo: negativo = sale, positivo = entra
    costo_unitario    NUMERIC(12,6) NOT NULL DEFAULT 0,
    stock_resultante  NUMERIC(14,4) NOT NULL,
    referencia_tipo   VARCHAR(20),                     -- 'VENTA', 'COMPRA'...
    referencia_id     UUID,
    motivo            TEXT,
    id_usuario        UUID REFERENCES seguridad.usuarios(id_usuario),
    creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_mov_inv_ref ON inventario.movimientos_inventario(referencia_tipo, referencia_id);
CREATE INDEX ix_mov_inv_insumo ON inventario.movimientos_inventario(id_sucursal, id_insumo, creado_en);

-- ============================================================================
-- 4. POS (cajas, turnos, clientes, órdenes, ventas/DTE, pagos)
-- ============================================================================
CREATE TABLE pos.cajas (
    id_caja               SERIAL PRIMARY KEY,
    id_sucursal           INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    codigo_punto_venta    VARCHAR(4) NOT NULL DEFAULT 'P001',   -- parte del número de control DTE
    nombre_identificador  VARCHAR(50) NOT NULL,
    UNIQUE (id_sucursal, codigo_punto_venta)
);

CREATE TABLE pos.turnos_caja (
    id_turno                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_caja                   INT NOT NULL REFERENCES pos.cajas(id_caja),
    id_usuario                UUID NOT NULL REFERENCES seguridad.usuarios(id_usuario),
    monto_apertura            NUMERIC(10,2) NOT NULL CHECK (monto_apertura >= 0),
    -- lo que el cajero CUENTA al cerrar
    monto_cierre_efectivo     NUMERIC(10,2),
    monto_cierre_pos_tarjeta  NUMERIC(10,2),
    monto_cierre_digital      NUMERIC(10,2),     -- Bitcoin/Chivo + transferencias
    -- lo que el SISTEMA calcula (se congela al cerrar)
    esperado_efectivo         NUMERIC(10,2),
    esperado_tarjeta          NUMERIC(10,2),
    esperado_digital          NUMERIC(10,2),
    dif_efectivo              NUMERIC(10,2),     -- contado - esperado (negativo = faltante)
    dif_tarjeta               NUMERIC(10,2),
    dif_digital               NUMERIC(10,2),
    abierto_en                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrado_en                TIMESTAMP,
    estado                    VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CERRADO'))
);
-- Solo UN turno abierto por caja y por cajero (lo garantiza la BD, no el frontend)
CREATE UNIQUE INDEX uq_turno_abierto_caja    ON pos.turnos_caja(id_caja)    WHERE estado = 'ABIERTO';
CREATE UNIQUE INDEX uq_turno_abierto_usuario ON pos.turnos_caja(id_usuario) WHERE estado = 'ABIERTO';

-- Entradas/salidas de efectivo durante el turno (retiro a bóveda, pago de un gas, fondo adicional)
CREATE TABLE pos.movimientos_caja (
    id_movimiento  SERIAL PRIMARY KEY,
    id_turno       UUID NOT NULL REFERENCES pos.turnos_caja(id_turno),
    tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO','EGRESO')),
    concepto       VARCHAR(150) NOT NULL,
    monto          NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    id_usuario     UUID NOT NULL REFERENCES seguridad.usuarios(id_usuario),
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pos.clientes (
    id_cliente           SERIAL PRIMARY KEY,
    nombre_razon_social  VARCHAR(150) NOT NULL,
    tipo_documento       VARCHAR(10) CHECK (tipo_documento IN ('DUI','NIT','PASAPORTE')),
    num_documento        VARCHAR(20),
    nrc                  VARCHAR(20),            -- obligatorio para CCF
    giro_economico       VARCHAR(150),           -- obligatorio para CCF
    direccion            TEXT,
    email                VARCHAR(120),
    telefono             VARCHAR(20),
    creado_en            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_cliente_documento ON pos.clientes(tipo_documento, num_documento) WHERE num_documento IS NOT NULL;

-- Correlativo por punto de venta y tipo de comprobante (se incrementa con bloqueo de fila: sin duplicados)
CREATE TABLE pos.series_documento (
    id_caja           INT NOT NULL REFERENCES pos.cajas(id_caja),
    tipo_comprobante  VARCHAR(10) NOT NULL CHECK (tipo_comprobante IN ('FCF','CCF')),
    ultimo_numero     BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id_caja, tipo_comprobante)
);

-- Orden = lo que se "toma" en el mostrador/mesa; aún no es factura. Alimenta la pantalla de preparación (KDS)
CREATE TABLE pos.ordenes (
    id_orden    SERIAL PRIMARY KEY,
    id_turno    UUID NOT NULL REFERENCES pos.turnos_caja(id_turno),
    id_cliente  INT REFERENCES pos.clientes(id_cliente),
    canal       VARCHAR(15) NOT NULL DEFAULT 'MOSTRADOR' CHECK (canal IN ('MOSTRADOR','PARA_LLEVAR','DELIVERY')),
    etiqueta    VARCHAR(60),                     -- nombre para llamar el pedido ("María")
    estado      VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
                CHECK (estado IN ('ABIERTA','EN_PREPARACION','LISTA','ENTREGADA','FACTURADA','ANULADA')),
    creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pos.orden_detalles (
    id_detalle       SERIAL PRIMARY KEY,
    id_orden         INT NOT NULL REFERENCES pos.ordenes(id_orden) ON DELETE CASCADE,
    id_producto      INT NOT NULL REFERENCES inventario.productos(id_producto),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL,
    nota             VARCHAR(200)                -- "sin azúcar", "extra shot"
);

CREATE TABLE pos.ventas (
    id_venta           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_turno           UUID NOT NULL REFERENCES pos.turnos_caja(id_turno),
    id_sucursal        INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    id_usuario         UUID NOT NULL REFERENCES seguridad.usuarios(id_usuario),
    id_cliente         INT REFERENCES pos.clientes(id_cliente),
    id_orden           INT REFERENCES pos.ordenes(id_orden),
    tipo_comprobante   VARCHAR(10) NOT NULL CHECK (tipo_comprobante IN ('FCF','CCF')),
    correlativo        VARCHAR(30) NOT NULL UNIQUE,            -- FCF-M001-00000001
    numero_control     VARCHAR(40) NOT NULL UNIQUE,            -- DTE-01-M001P001-000000000000001
    codigo_generacion  UUID NOT NULL DEFAULT gen_random_uuid(),-- identificador único del DTE
    sello_recepcion    VARCHAR(60),                            -- lo devolvería Hacienda (aquí: simulado)
    estado_dte         VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE'
                       CHECK (estado_dte IN ('PENDIENTE','ACEPTADO','RECHAZADO','CONTINGENCIA')),
    subtotal           NUMERIC(10,2) NOT NULL,                 -- venta gravada SIN IVA
    descuento          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    iva                NUMERIC(10,2) NOT NULL,                 -- 13%
    total              NUMERIC(10,2) NOT NULL,
    estado             VARCHAR(10) NOT NULL DEFAULT 'EMITIDA' CHECK (estado IN ('EMITIDA','ANULADA')),
    motivo_anulacion   TEXT,
    anulada_por        UUID REFERENCES seguridad.usuarios(id_usuario),
    anulada_en         TIMESTAMP,
    fecha_emision      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_venta_total  CHECK (total = subtotal + iva),
    CONSTRAINT ck_ccf_cliente  CHECK (tipo_comprobante <> 'CCF' OR id_cliente IS NOT NULL)
);
CREATE INDEX ix_ventas_fecha ON pos.ventas(id_sucursal, fecha_emision);

CREATE TABLE pos.venta_detalles (
    id_detalle       SERIAL PRIMARY KEY,
    id_venta         UUID NOT NULL REFERENCES pos.ventas(id_venta) ON DELETE CASCADE,
    id_producto      INT NOT NULL REFERENCES inventario.productos(id_producto),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL,                  -- precio con IVA "congelado" al momento de vender
    subtotal_linea   NUMERIC(10,2) NOT NULL,
    nota             VARCHAR(200)
);

CREATE TABLE pos.pagos (
    id_pago         SERIAL PRIMARY KEY,
    id_venta        UUID NOT NULL REFERENCES pos.ventas(id_venta) ON DELETE CASCADE,
    metodo          VARCHAR(30) NOT NULL CHECK (metodo IN ('EFECTIVO','TARJETA','BITCOIN_CHIVO','TRANSFERENCIA')),
    monto           NUMERIC(10,2) NOT NULL CHECK (monto > 0),  -- monto APLICADO a la venta
    monto_recibido  NUMERIC(10,2),                             -- efectivo entregado por el cliente (vuelto = recibido - monto)
    referencia      VARCHAR(100)
);

-- ============================================================================
-- 5. COMPRAS Y CUENTAS POR PAGAR
-- ============================================================================
CREATE TABLE compras.proveedores (
    id_proveedor  SERIAL PRIMARY KEY,
    razon_social  VARCHAR(150) NOT NULL,
    nrc           VARCHAR(20) NOT NULL,
    nit           VARCHAR(20) NOT NULL,
    contacto      VARCHAR(100),
    telefono      VARCHAR(20),
    dias_credito  INT NOT NULL DEFAULT 0,
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE compras.facturas_compra (
    id_compra          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_proveedor       INT NOT NULL REFERENCES compras.proveedores(id_proveedor),
    id_sucursal        INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    id_usuario         UUID REFERENCES seguridad.usuarios(id_usuario),
    num_factura        VARCHAR(50) NOT NULL,
    tipo_costo         VARCHAR(10) NOT NULL DEFAULT 'COSTO' CHECK (tipo_costo IN ('COSTO','GASTO')),  -- insumos vs luz/alquiler
    fecha_emision      DATE NOT NULL,
    condicion_pago     VARCHAR(10) NOT NULL DEFAULT 'CONTADO' CHECK (condicion_pago IN ('CONTADO','CREDITO')),
    fecha_vencimiento  DATE NOT NULL,
    subtotal           NUMERIC(12,2) NOT NULL,
    iva_credito        NUMERIC(12,2) NOT NULL,                 -- IVA crédito fiscal
    total              NUMERIC(12,2) NOT NULL,
    estado_pago        VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_pago IN ('PENDIENTE','PARCIAL','PAGADO')),
    UNIQUE (id_proveedor, num_factura),
    CONSTRAINT ck_compra_total CHECK (total = subtotal + iva_credito)
);

CREATE TABLE compras.compra_detalles (
    id_detalle      SERIAL PRIMARY KEY,
    id_compra       UUID NOT NULL REFERENCES compras.facturas_compra(id_compra) ON DELETE CASCADE,
    id_insumo       INT REFERENCES inventario.insumos(id_insumo),   -- NULL si es un gasto (luz, agua...)
    descripcion     VARCHAR(150),
    cantidad        NUMERIC(12,4) NOT NULL CHECK (cantidad > 0),
    costo_unitario  NUMERIC(12,6) NOT NULL CHECK (costo_unitario >= 0),   -- sin IVA, por unidad base
    subtotal        NUMERIC(12,2) NOT NULL,
    CONSTRAINT ck_detalle_ident CHECK (id_insumo IS NOT NULL OR descripcion IS NOT NULL)
);

CREATE TABLE compras.pagos_proveedor (
    id_pago     SERIAL PRIMARY KEY,
    id_compra   UUID NOT NULL REFERENCES compras.facturas_compra(id_compra),
    fecha_pago  DATE NOT NULL DEFAULT CURRENT_DATE,
    monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    metodo      VARCHAR(20) NOT NULL DEFAULT 'TRANSFERENCIA' CHECK (metodo IN ('EFECTIVO','TRANSFERENCIA','CHEQUE','TARJETA')),
    referencia  VARCHAR(100),
    id_usuario  UUID REFERENCES seguridad.usuarios(id_usuario)
);

-- ============================================================================
-- 6. RRHH Y NÓMINA (El Salvador)
-- ============================================================================
CREATE TABLE rrhh.puestos (
    id_puesto     SERIAL PRIMARY KEY,
    nombre        VARCHAR(50) NOT NULL UNIQUE,
    salario_base  NUMERIC(10,2) NOT NULL
);

CREATE TABLE rrhh.empleados (
    id_empleado      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sucursal      INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    id_puesto        INT NOT NULL REFERENCES rrhh.puestos(id_puesto),
    id_usuario       UUID UNIQUE REFERENCES seguridad.usuarios(id_usuario),   -- NULL si no usa el sistema
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    dui              VARCHAR(10) NOT NULL UNIQUE,
    nit              VARCHAR(17),
    fecha_ingreso    DATE NOT NULL DEFAULT CURRENT_DATE,
    salario_nominal  NUMERIC(10,2) NOT NULL CHECK (salario_nominal > 0),     -- MENSUAL
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabla de retención de Renta como DATOS (si el MH la cambia, se actualiza una tabla, no el código)
CREATE TABLE rrhh.tramos_renta (
    id_tramo      SERIAL PRIMARY KEY,
    tipo_periodo  VARCHAR(10) NOT NULL CHECK (tipo_periodo IN ('QUINCENAL','MENSUAL')),
    tramo         VARCHAR(5) NOT NULL,           -- I, II, III, IV
    desde         NUMERIC(10,2) NOT NULL,
    hasta         NUMERIC(10,2),                 -- NULL = sin límite
    cuota_fija    NUMERIC(10,2) NOT NULL,
    porcentaje    NUMERIC(5,4) NOT NULL,         -- 0.10 = 10%
    exceso_sobre  NUMERIC(10,2) NOT NULL,
    UNIQUE (tipo_periodo, tramo)
);

CREATE TABLE rrhh.planillas (
    id_planilla      SERIAL PRIMARY KEY,
    id_sucursal      INT NOT NULL REFERENCES empresa.sucursales(id_sucursal),
    periodo_inicio   DATE NOT NULL,
    periodo_fin      DATE NOT NULL,
    tipo_periodo     VARCHAR(10) NOT NULL DEFAULT 'QUINCENAL' CHECK (tipo_periodo IN ('QUINCENAL','MENSUAL')),
    procesada        BOOLEAN NOT NULL DEFAULT FALSE,    -- TRUE = cerrada, ya no se recalcula
    id_usuario       UUID REFERENCES seguridad.usuarios(id_usuario),
    procesada_en     TIMESTAMP,
    UNIQUE (id_sucursal, periodo_inicio, periodo_fin),
    CHECK (periodo_fin >= periodo_inicio)
);

CREATE TABLE rrhh.planilla_detalles (
    id_detalle         SERIAL PRIMARY KEY,
    id_planilla        INT NOT NULL REFERENCES rrhh.planillas(id_planilla) ON DELETE CASCADE,
    id_empleado        UUID NOT NULL REFERENCES rrhh.empleados(id_empleado),
    salario_bruto      NUMERIC(10,2) NOT NULL,
    bonificaciones     NUMERIC(10,2) NOT NULL DEFAULT 0,
    isss_laboral       NUMERIC(10,2) NOT NULL,
    afp_laboral        NUMERIC(10,2) NOT NULL,
    renta_retenida     NUMERIC(10,2) NOT NULL,
    otros_descuentos   NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_descuentos   NUMERIC(10,2) NOT NULL,
    salario_neto       NUMERIC(10,2) NOT NULL,
    isss_patronal      NUMERIC(10,2) NOT NULL DEFAULT 0,   -- costo real de la empresa
    afp_patronal       NUMERIC(10,2) NOT NULL DEFAULT 0,
    insaforp_patronal  NUMERIC(10,2) NOT NULL DEFAULT 0,
    UNIQUE (id_planilla, id_empleado)
);

-- ============================================================================
-- 7. FUNCIONES DE NEGOCIO
-- ============================================================================

-- 7.1 RBAC: ¿este usuario tiene este permiso? (el backend lo usa en un middleware)
CREATE OR REPLACE FUNCTION seguridad.fn_tiene_permiso(p_id_usuario UUID, p_codigo TEXT) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM seguridad.usuarios u
        JOIN seguridad.roles r          ON r.id_rol = u.id_rol AND r.activo
        JOIN seguridad.roles_permisos rp ON rp.id_rol = r.id_rol
        JOIN seguridad.permisos p        ON p.id_permiso = rp.id_permiso
        WHERE u.id_usuario = p_id_usuario AND u.activo AND p.codigo = p_codigo
    );
$$ LANGUAGE sql STABLE;

-- 7.2 Bitácora genérica (trigger). El backend hace: SET LOCAL app.user_id = '<uuid>' dentro de su transacción
CREATE OR REPLACE FUNCTION seguridad.fn_auditar() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO seguridad.bitacora(id_usuario, accion, entidad, datos_antes, datos_despues)
    VALUES (
        NULLIF(current_setting('app.user_id', true), '')::UUID,
        TG_OP,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
    );
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aud_productos      AFTER INSERT OR UPDATE OR DELETE ON inventario.productos      FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
CREATE TRIGGER trg_aud_recetas        AFTER INSERT OR UPDATE OR DELETE ON inventario.recetas        FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
CREATE TRIGGER trg_aud_roles_permisos AFTER INSERT OR UPDATE OR DELETE ON seguridad.roles_permisos FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
CREATE TRIGGER trg_aud_usuarios       AFTER INSERT OR UPDATE OR DELETE ON seguridad.usuarios        FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();

-- 7.3 Mover stock (ÚNICO punto por donde cambia el stock: valida, bloquea fila y escribe kardex)
CREATE OR REPLACE FUNCTION inventario.fn_mover_stock(
    p_id_sucursal INT, p_id_insumo INT, p_cantidad NUMERIC, p_tipo VARCHAR,
    p_ref_tipo VARCHAR DEFAULT NULL, p_ref_id UUID DEFAULT NULL,
    p_id_usuario UUID DEFAULT NULL, p_costo NUMERIC DEFAULT NULL, p_motivo TEXT DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
    v_actual NUMERIC;
    v_nuevo  NUMERIC;
    v_nombre TEXT;
BEGIN
    INSERT INTO inventario.stock_sucursal(id_sucursal, id_insumo)
    VALUES (p_id_sucursal, p_id_insumo) ON CONFLICT DO NOTHING;

    SELECT stock_actual INTO v_actual FROM inventario.stock_sucursal
    WHERE id_sucursal = p_id_sucursal AND id_insumo = p_id_insumo FOR UPDATE;   -- evita ventas simultáneas pisándose

    v_nuevo := v_actual + p_cantidad;
    IF v_nuevo < 0 AND COALESCE(empresa.fn_param('permitir_stock_negativo'), 'false') <> 'true' THEN
        SELECT nombre INTO v_nombre FROM inventario.insumos WHERE id_insumo = p_id_insumo;
        RAISE EXCEPTION 'Stock insuficiente de "%" (disponible: %, requerido: %)', v_nombre, v_actual, -p_cantidad
              USING ERRCODE = 'P0001';
    END IF;

    UPDATE inventario.stock_sucursal SET stock_actual = v_nuevo
    WHERE id_sucursal = p_id_sucursal AND id_insumo = p_id_insumo;

    INSERT INTO inventario.movimientos_inventario
        (id_sucursal, id_insumo, tipo, cantidad, costo_unitario, stock_resultante, referencia_tipo, referencia_id, motivo, id_usuario)
    VALUES (p_id_sucursal, p_id_insumo, p_tipo, p_cantidad,
            COALESCE(p_costo, (SELECT costo_promedio FROM inventario.insumos WHERE id_insumo = p_id_insumo)),
            v_nuevo, p_ref_tipo, p_ref_id, p_motivo, p_id_usuario);
    RETURN v_nuevo;
END;
$$ LANGUAGE plpgsql;

-- 7.4 Descontar stock por venta (TU FUNCIÓN, corregida: reventa, kardex, validación, locks)
CREATE OR REPLACE FUNCTION inventario.fn_descontar_stock_por_venta(
    p_id_sucursal INT, p_id_producto INT, p_cantidad_vendida INT,
    p_id_venta UUID DEFAULT NULL, p_id_usuario UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_prod inventario.productos%ROWTYPE;
    v_filas INT := 0;
BEGIN
    SELECT * INTO v_prod FROM inventario.productos WHERE id_producto = p_id_producto;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto % no existe', p_id_producto; END IF;

    IF v_prod.es_elaborado THEN
        FOR r IN SELECT id_insumo, cantidad_requerida FROM inventario.recetas WHERE id_producto = p_id_producto ORDER BY id_insumo
        LOOP
            PERFORM inventario.fn_mover_stock(p_id_sucursal, r.id_insumo, -(r.cantidad_requerida * p_cantidad_vendida),
                                              'VENTA', 'VENTA', p_id_venta, p_id_usuario);
            v_filas := v_filas + 1;
        END LOOP;
        IF v_filas = 0 THEN RAISE EXCEPTION 'El producto "%" es elaborado pero no tiene receta', v_prod.nombre; END IF;
    ELSE
        PERFORM inventario.fn_mover_stock(p_id_sucursal, v_prod.id_insumo_reventa, -p_cantidad_vendida,
                                          'VENTA', 'VENTA', p_id_venta, p_id_usuario);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.5 Devolver al stock lo que descontó una venta (anulación) usando el kardex
CREATE OR REPLACE FUNCTION inventario.fn_revertir_stock_venta(p_id_venta UUID, p_id_usuario UUID DEFAULT NULL) RETURNS VOID AS $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT id_sucursal, id_insumo, SUM(-cantidad) AS cant
             FROM inventario.movimientos_inventario
             WHERE referencia_tipo = 'VENTA' AND referencia_id = p_id_venta AND tipo = 'VENTA'
             GROUP BY id_sucursal, id_insumo
    LOOP
        PERFORM inventario.fn_mover_stock(r.id_sucursal, r.id_insumo, r.cant, 'ANULACION_VENTA', 'VENTA', p_id_venta, p_id_usuario);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7.6 Merma / ajuste manual de inventario
CREATE OR REPLACE FUNCTION inventario.fn_registrar_merma(
    p_id_sucursal INT, p_id_insumo INT, p_cantidad NUMERIC, p_motivo TEXT, p_id_usuario UUID
) RETURNS VOID AS $$
BEGIN
    PERFORM inventario.fn_mover_stock(p_id_sucursal, p_id_insumo, -ABS(p_cantidad), 'MERMA', NULL, NULL, p_id_usuario, NULL, p_motivo);
END;
$$ LANGUAGE plpgsql;

-- 7.7 Correlativo (FCF/CCF) + número de control tipo DTE. UPDATE...RETURNING bloquea la fila: no hay duplicados
CREATE OR REPLACE FUNCTION pos.fn_siguiente_correlativo(p_id_caja INT, p_tipo VARCHAR)
RETURNS TABLE (correlativo TEXT, numero_control TEXT) AS $$
DECLARE
    v_num BIGINT; v_est TEXT; v_pv TEXT;
BEGIN
    INSERT INTO pos.series_documento(id_caja, tipo_comprobante) VALUES (p_id_caja, p_tipo) ON CONFLICT DO NOTHING;
    UPDATE pos.series_documento SET ultimo_numero = ultimo_numero + 1
    WHERE id_caja = p_id_caja AND tipo_comprobante = p_tipo RETURNING ultimo_numero INTO v_num;

    SELECT s.codigo_establecimiento, c.codigo_punto_venta INTO v_est, v_pv
    FROM pos.cajas c JOIN empresa.sucursales s USING (id_sucursal) WHERE c.id_caja = p_id_caja;

    correlativo    := p_tipo || '-' || v_est || v_pv || '-' || LPAD(v_num::TEXT, 8, '0');
    numero_control := 'DTE-' || CASE p_tipo WHEN 'FCF' THEN '01' ELSE '03' END || '-' || v_est || v_pv || '-' || LPAD(v_num::TEXT, 15, '0');
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 7.8 REGISTRAR VENTA (todo o nada): valida turno, CCF, precios, IVA, pagos, descuenta inventario
--   p_items = [{"id_producto":1,"cantidad":2,"nota":"sin azúcar"}]
--   p_pagos = [{"metodo":"EFECTIVO","monto":5.00,"monto_recibido":10},{"metodo":"TARJETA","monto":3.00,"referencia":"AUTH123"}]
CREATE OR REPLACE FUNCTION pos.fn_registrar_venta(
    p_id_turno UUID, p_tipo VARCHAR, p_id_cliente INT, p_items JSONB, p_pagos JSONB,
    p_descuento NUMERIC DEFAULT 0, p_id_orden INT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_turno pos.turnos_caja%ROWTYPE; v_suc INT;
    v_cli pos.clientes%ROWTYPE;
    v_tasa NUMERIC := empresa.fn_param('tasa_iva')::NUMERIC;
    v_n_items INT; v_n_validos INT;
    v_bruto NUMERIC; v_total NUMERIC; v_iva NUMERIC; v_sub NUMERIC; v_pagado NUMERIC;
    v_corr TEXT; v_ctrl TEXT; v_id UUID := gen_random_uuid();
    r RECORD;
BEGIN
    SELECT * INTO v_turno FROM pos.turnos_caja WHERE id_turno = p_id_turno;
    IF NOT FOUND OR v_turno.estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno no existe o está cerrado'; END IF;
    SELECT id_sucursal INTO v_suc FROM pos.cajas WHERE id_caja = v_turno.id_caja;

    IF p_tipo = 'CCF' THEN
        SELECT * INTO v_cli FROM pos.clientes WHERE id_cliente = p_id_cliente;
        IF NOT FOUND OR v_cli.nrc IS NULL OR v_cli.giro_economico IS NULL THEN
            RAISE EXCEPTION 'Un CCF requiere cliente con NRC y giro económico';
        END IF;
    END IF;

    v_n_items := jsonb_array_length(p_items);
    IF v_n_items IS NULL OR v_n_items = 0 THEN RAISE EXCEPTION 'La venta no tiene productos'; END IF;

    -- El precio SIEMPRE se toma de la BD (no confiar en el precio que mande el frontend)
    SELECT COUNT(*), COALESCE(SUM(p.precio_venta * i.cantidad), 0) INTO v_n_validos, v_bruto
    FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
    JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.activo AND i.cantidad > 0;
    IF v_n_validos <> v_n_items THEN RAISE EXCEPTION 'Hay productos inexistentes, inactivos o con cantidad inválida'; END IF;

    IF p_descuento > v_bruto THEN RAISE EXCEPTION 'El descuento no puede superar el total'; END IF;
    v_total := ROUND(v_bruto - p_descuento, 2);
    v_iva   := ROUND(v_total - v_total / (1 + v_tasa), 2);   -- precios incluyen IVA: se desglosa
    v_sub   := v_total - v_iva;

    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC);
    IF ROUND(v_pagado, 2) <> v_total THEN RAISE EXCEPTION 'Los pagos (%) no cuadran con el total (%)', v_pagado, v_total; END IF;

    SELECT c.correlativo, c.numero_control INTO v_corr, v_ctrl FROM pos.fn_siguiente_correlativo(v_turno.id_caja, p_tipo) c;

    INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante,
                           correlativo, numero_control, estado_dte, sello_recepcion, subtotal, descuento, iva, total)
    VALUES (v_id, p_id_turno, v_suc, v_turno.id_usuario, p_id_cliente, p_id_orden, p_tipo,
            v_corr, v_ctrl, 'ACEPTADO', 'SIMULADO-' || upper(substr(v_id::text, 1, 8)), v_sub, p_descuento, v_iva, v_total);

    INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, nota)
    SELECT v_id, p.id_producto, i.cantidad, p.precio_venta, p.precio_venta * i.cantidad, i.nota
    FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
    JOIN inventario.productos p ON p.id_producto = i.id_producto;

    INSERT INTO pos.pagos(id_venta, metodo, monto, monto_recibido, referencia)
    SELECT v_id, x.metodo, x.monto, x.monto_recibido, x.referencia
    FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC, monto_recibido NUMERIC, referencia TEXT);

    FOR r IN SELECT id_producto, cantidad FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT)
    LOOP
        PERFORM inventario.fn_descontar_stock_por_venta(v_suc, r.id_producto, r.cantidad, v_id, v_turno.id_usuario);
    END LOOP;

    IF p_id_orden IS NOT NULL THEN UPDATE pos.ordenes SET estado = 'FACTURADA' WHERE id_orden = p_id_orden; END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 7.9 Anular venta (solo con el turno abierto; si ya cerró, se haría nota de crédito)
CREATE OR REPLACE FUNCTION pos.fn_anular_venta(p_id_venta UUID, p_motivo TEXT, p_id_usuario UUID) RETURNS VOID AS $$
DECLARE v pos.ventas%ROWTYPE; v_estado_turno TEXT;
BEGIN
    SELECT * INTO v FROM pos.ventas WHERE id_venta = p_id_venta FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no existe'; END IF;
    IF v.estado = 'ANULADA' THEN RAISE EXCEPTION 'La venta ya está anulada'; END IF;
    SELECT estado INTO v_estado_turno FROM pos.turnos_caja WHERE id_turno = v.id_turno;
    IF v_estado_turno <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno ya cerró: emita una nota de crédito'; END IF;
    IF COALESCE(trim(p_motivo), '') = '' THEN RAISE EXCEPTION 'Debe indicar el motivo de anulación'; END IF;

    UPDATE pos.ventas SET estado = 'ANULADA', motivo_anulacion = p_motivo, anulada_por = p_id_usuario, anulada_en = now()
    WHERE id_venta = p_id_venta;
    PERFORM inventario.fn_revertir_stock_venta(p_id_venta, p_id_usuario);
END;
$$ LANGUAGE plpgsql;

-- 7.10 Compras: al insertar el detalle entra el stock y se recalcula el costo promedio ponderado
CREATE OR REPLACE FUNCTION compras.fn_trg_detalle_compra() RETURNS TRIGGER AS $$
DECLARE v_suc INT; v_stock_total NUMERIC; v_costo NUMERIC; v_nuevo NUMERIC; v_usr UUID;
BEGIN
    IF NEW.id_insumo IS NULL THEN RETURN NEW; END IF;       -- es un gasto: no toca inventario
    SELECT id_sucursal, id_usuario INTO v_suc, v_usr FROM compras.facturas_compra WHERE id_compra = NEW.id_compra;
    SELECT COALESCE(SUM(GREATEST(stock_actual, 0)), 0) INTO v_stock_total FROM inventario.stock_sucursal WHERE id_insumo = NEW.id_insumo;
    SELECT costo_promedio INTO v_costo FROM inventario.insumos WHERE id_insumo = NEW.id_insumo;

    v_nuevo := (v_stock_total * v_costo + NEW.cantidad * NEW.costo_unitario) / (v_stock_total + NEW.cantidad);
    UPDATE inventario.insumos SET costo_promedio = ROUND(v_nuevo, 6) WHERE id_insumo = NEW.id_insumo;

    PERFORM inventario.fn_mover_stock(v_suc, NEW.id_insumo, NEW.cantidad, 'COMPRA', 'COMPRA', NEW.id_compra, v_usr, NEW.costo_unitario);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_detalle_compra AFTER INSERT ON compras.compra_detalles FOR EACH ROW EXECUTE FUNCTION compras.fn_trg_detalle_compra();

--   p_items = [{"id_insumo":1,"cantidad":5000,"costo_unitario":0.0310}]  o  [{"descripcion":"Energía eléctrica","cantidad":1,"costo_unitario":185.40}]
CREATE OR REPLACE FUNCTION compras.fn_registrar_compra(
    p_id_proveedor INT, p_id_sucursal INT, p_num_factura VARCHAR, p_fecha DATE, p_condicion VARCHAR,
    p_items JSONB, p_id_usuario UUID DEFAULT NULL, p_tipo_costo VARCHAR DEFAULT 'COSTO'
) RETURNS UUID AS $$
DECLARE
    v_id UUID := gen_random_uuid(); v_sub NUMERIC; v_iva NUMERIC; v_dias INT;
BEGIN
    SELECT CASE WHEN p_condicion = 'CREDITO' THEN dias_credito ELSE 0 END INTO v_dias FROM compras.proveedores WHERE id_proveedor = p_id_proveedor;
    SELECT ROUND(SUM(cantidad * costo_unitario), 2) INTO v_sub FROM jsonb_to_recordset(p_items) AS i(cantidad NUMERIC, costo_unitario NUMERIC);
    v_iva := ROUND(v_sub * empresa.fn_param('tasa_iva')::NUMERIC, 2);

    INSERT INTO compras.facturas_compra(id_compra, id_proveedor, id_sucursal, id_usuario, num_factura, tipo_costo, fecha_emision,
                                        condicion_pago, fecha_vencimiento, subtotal, iva_credito, total)
    VALUES (v_id, p_id_proveedor, p_id_sucursal, p_id_usuario, p_num_factura, p_tipo_costo, p_fecha,
            p_condicion, p_fecha + v_dias, v_sub, v_iva, v_sub + v_iva);

    INSERT INTO compras.compra_detalles(id_compra, id_insumo, descripcion, cantidad, costo_unitario, subtotal)
    SELECT v_id, i.id_insumo, i.descripcion, i.cantidad, i.costo_unitario, ROUND(i.cantidad * i.costo_unitario, 2)
    FROM jsonb_to_recordset(p_items) AS i(id_insumo INT, descripcion TEXT, cantidad NUMERIC, costo_unitario NUMERIC);
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 7.11 Pagos a proveedor: actualiza PENDIENTE / PARCIAL / PAGADO automáticamente
CREATE OR REPLACE FUNCTION compras.fn_trg_pago_proveedor() RETURNS TRIGGER AS $$
DECLARE v_total NUMERIC; v_pagado NUMERIC;
BEGIN
    SELECT total INTO v_total FROM compras.facturas_compra WHERE id_compra = NEW.id_compra;
    SELECT SUM(monto) INTO v_pagado FROM compras.pagos_proveedor WHERE id_compra = NEW.id_compra;
    IF v_pagado > v_total THEN RAISE EXCEPTION 'El pago excede el saldo de la factura'; END IF;
    UPDATE compras.facturas_compra
    SET estado_pago = CASE WHEN v_pagado = v_total THEN 'PAGADO' ELSE 'PARCIAL' END
    WHERE id_compra = NEW.id_compra;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_pago_proveedor AFTER INSERT ON compras.pagos_proveedor FOR EACH ROW EXECUTE FUNCTION compras.fn_trg_pago_proveedor();

-- 7.12 Cuadre de caja: calcula lo esperado (desde la vista), compara con lo contado y cierra el turno
CREATE OR REPLACE FUNCTION pos.fn_cerrar_turno(p_id_turno UUID, p_efectivo NUMERIC, p_tarjeta NUMERIC, p_digital NUMERIC) RETURNS JSONB AS $$
DECLARE v RECORD; v_estado TEXT;
BEGIN
    SELECT estado INTO v_estado FROM pos.turnos_caja WHERE id_turno = p_id_turno FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Turno no existe'; END IF;
    IF v_estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno ya está cerrado'; END IF;

    SELECT * INTO v FROM reportes.vw_cuadre_turno WHERE id_turno = p_id_turno;

    UPDATE pos.turnos_caja SET
        monto_cierre_efectivo = p_efectivo, monto_cierre_pos_tarjeta = p_tarjeta, monto_cierre_digital = p_digital,
        esperado_efectivo = v.esperado_efectivo, esperado_tarjeta = v.esperado_tarjeta, esperado_digital = v.esperado_digital,
        dif_efectivo = p_efectivo - v.esperado_efectivo, dif_tarjeta = p_tarjeta - v.esperado_tarjeta, dif_digital = p_digital - v.esperado_digital,
        cerrado_en = now(), estado = 'CERRADO'
    WHERE id_turno = p_id_turno;

    RETURN jsonb_build_object(
        'efectivo', jsonb_build_object('esperado', v.esperado_efectivo, 'contado', p_efectivo, 'diferencia', p_efectivo - v.esperado_efectivo),
        'tarjeta',  jsonb_build_object('esperado', v.esperado_tarjeta,  'contado', p_tarjeta,  'diferencia', p_tarjeta  - v.esperado_tarjeta),
        'digital',  jsonb_build_object('esperado', v.esperado_digital,  'contado', p_digital,  'diferencia', p_digital  - v.esperado_digital));
END;
$$ LANGUAGE plpgsql;

-- 7.13 Planilla: ISSS, AFP y Renta salen de empresa.parametros y rrhh.tramos_renta
CREATE OR REPLACE FUNCTION rrhh.fn_calcular_planilla(p_id_planilla INT) RETURNS INT AS $$
DECLARE
    pl rrhh.planillas%ROWTYPE; e RECORD; t rrhh.tramos_renta%ROWTYPE;
    v_factor NUMERIC; v_bruto NUMERIC; v_isss NUMERIC; v_afp NUMERIC; v_base NUMERIC; v_renta NUMERIC; v_n INT := 0;
    v_isss_tope NUMERIC := empresa.fn_param('isss_base_maxima_mensual')::NUMERIC;
BEGIN
    SELECT * INTO pl FROM rrhh.planillas WHERE id_planilla = p_id_planilla;
    IF NOT FOUND THEN RAISE EXCEPTION 'Planilla no existe'; END IF;
    IF pl.procesada THEN RAISE EXCEPTION 'La planilla ya fue procesada y no se puede recalcular'; END IF;

    v_factor := CASE pl.tipo_periodo WHEN 'QUINCENAL' THEN 2 ELSE 1 END;     -- cuántos periodos hay en el mes
    DELETE FROM rrhh.planilla_detalles WHERE id_planilla = p_id_planilla;

    FOR e IN SELECT * FROM rrhh.empleados WHERE id_sucursal = pl.id_sucursal AND activo LOOP
        v_bruto := ROUND(e.salario_nominal / v_factor, 2);
        v_isss  := ROUND(LEAST(v_bruto, v_isss_tope / v_factor) * empresa.fn_param('isss_empleado')::NUMERIC, 2);
        v_afp   := ROUND(v_bruto * empresa.fn_param('afp_empleado')::NUMERIC, 2);
        v_base  := v_bruto - v_isss - v_afp;                                   -- renta se calcula sobre lo que queda

        SELECT * INTO t FROM rrhh.tramos_renta
        WHERE tipo_periodo = pl.tipo_periodo AND v_base >= desde AND (hasta IS NULL OR v_base <= hasta);
        v_renta := ROUND(t.cuota_fija + (v_base - t.exceso_sobre) * t.porcentaje, 2);
        IF v_renta < 0 THEN v_renta := 0; END IF;

        INSERT INTO rrhh.planilla_detalles(id_planilla, id_empleado, salario_bruto, isss_laboral, afp_laboral, renta_retenida,
                                           total_descuentos, salario_neto, isss_patronal, afp_patronal, insaforp_patronal)
        VALUES (p_id_planilla, e.id_empleado, v_bruto, v_isss, v_afp, v_renta,
                v_isss + v_afp + v_renta, v_bruto - v_isss - v_afp - v_renta,
                ROUND(LEAST(v_bruto, v_isss_tope / v_factor) * empresa.fn_param('isss_patronal')::NUMERIC, 2),
                ROUND(v_bruto * empresa.fn_param('afp_patronal')::NUMERIC, 2),
                ROUND(v_bruto * empresa.fn_param('insaforp_patronal')::NUMERIC, 2));
        v_n := v_n + 1;
    END LOOP;
    RETURN v_n;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VISTAS (esquema reportes): alimentan dashboard y alertas sin lógica en el frontend
-- ============================================================================
CREATE OR REPLACE VIEW reportes.vw_alertas_stock AS
SELECT s.nombre AS sucursal, i.nombre AS insumo, u.codigo AS unidad, ss.stock_actual, ss.stock_minimo,
       ss.stock_minimo - ss.stock_actual AS faltante,
       CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel
FROM inventario.stock_sucursal ss
JOIN empresa.sucursales s ON s.id_sucursal = ss.id_sucursal
JOIN inventario.insumos i ON i.id_insumo = ss.id_insumo
JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base
WHERE i.activo AND ss.stock_actual <= ss.stock_minimo;

CREATE OR REPLACE VIEW reportes.vw_costo_margen_producto AS
SELECT p.id_producto, p.nombre, p.precio_venta,
       ROUND(p.precio_venta / (1 + empresa.fn_param('tasa_iva')::NUMERIC), 2) AS precio_sin_iva,
       ROUND(COALESCE(
            CASE WHEN p.es_elaborado THEN (SELECT SUM(r.cantidad_requerida * i.costo_promedio)
                                           FROM inventario.recetas r JOIN inventario.insumos i USING (id_insumo)
                                           WHERE r.id_producto = p.id_producto)
                 ELSE (SELECT costo_promedio FROM inventario.insumos WHERE id_insumo = p.id_insumo_reventa) END, 0), 2) AS costo_receta
FROM inventario.productos p;

CREATE OR REPLACE VIEW reportes.vw_cuadre_turno AS
SELECT t.id_turno, c.id_sucursal, t.id_caja, t.id_usuario, t.estado, t.monto_apertura,
       COALESCE(pg.efectivo, 0) AS ventas_efectivo, COALESCE(pg.tarjeta, 0) AS ventas_tarjeta, COALESCE(pg.digital, 0) AS ventas_digital,
       COALESCE(mc.ingresos, 0) AS ingresos_caja, COALESCE(mc.egresos, 0) AS egresos_caja,
       t.monto_apertura + COALESCE(pg.efectivo, 0) + COALESCE(mc.ingresos, 0) - COALESCE(mc.egresos, 0) AS esperado_efectivo,
       COALESCE(pg.tarjeta, 0) AS esperado_tarjeta,
       COALESCE(pg.digital, 0) AS esperado_digital,
       t.monto_cierre_efectivo, t.monto_cierre_pos_tarjeta, t.monto_cierre_digital,
       t.dif_efectivo, t.dif_tarjeta, t.dif_digital
FROM pos.turnos_caja t
JOIN pos.cajas c ON c.id_caja = t.id_caja
LEFT JOIN LATERAL (
    SELECT SUM(p.monto) FILTER (WHERE p.metodo = 'EFECTIVO') AS efectivo,
           SUM(p.monto) FILTER (WHERE p.metodo = 'TARJETA') AS tarjeta,
           SUM(p.monto) FILTER (WHERE p.metodo IN ('BITCOIN_CHIVO','TRANSFERENCIA')) AS digital
    FROM pos.pagos p JOIN pos.ventas v ON v.id_venta = p.id_venta
    WHERE v.id_turno = t.id_turno AND v.estado = 'EMITIDA') pg ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(monto) FILTER (WHERE tipo = 'INGRESO') AS ingresos, SUM(monto) FILTER (WHERE tipo = 'EGRESO') AS egresos
    FROM pos.movimientos_caja WHERE id_turno = t.id_turno) mc ON TRUE;

CREATE OR REPLACE VIEW reportes.vw_ventas_diarias AS
SELECT s.nombre AS sucursal, v.fecha_emision::DATE AS fecha, COUNT(*) AS tickets,
       SUM(v.subtotal) AS subtotal, SUM(v.iva) AS iva, SUM(v.total) AS total, ROUND(AVG(v.total), 2) AS ticket_promedio
FROM pos.ventas v JOIN empresa.sucursales s USING (id_sucursal)
WHERE v.estado = 'EMITIDA' GROUP BY s.nombre, v.fecha_emision::DATE;

CREATE OR REPLACE VIEW reportes.vw_top_productos AS
SELECT p.nombre, SUM(d.cantidad) AS unidades, SUM(d.subtotal_linea) AS ingreso
FROM pos.venta_detalles d JOIN pos.ventas v USING (id_venta) JOIN inventario.productos p USING (id_producto)
WHERE v.estado = 'EMITIDA' GROUP BY p.nombre ORDER BY unidades DESC;

CREATE OR REPLACE VIEW reportes.vw_cuentas_por_pagar AS
SELECT pr.razon_social AS proveedor, f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento, f.total,
       COALESCE(SUM(pp.monto), 0) AS pagado, f.total - COALESCE(SUM(pp.monto), 0) AS saldo,
       GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida, f.estado_pago
FROM compras.facturas_compra f
JOIN compras.proveedores pr USING (id_proveedor)
LEFT JOIN compras.pagos_proveedor pp USING (id_compra)
GROUP BY pr.razon_social, f.id_compra, f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento, f.total, f.estado_pago;

CREATE OR REPLACE VIEW reportes.vw_permisos_usuario AS
SELECT u.id_usuario, u.username, r.nombre AS rol, p.modulo, p.codigo AS permiso
FROM seguridad.usuarios u JOIN seguridad.roles r USING (id_rol)
JOIN seguridad.roles_permisos rp USING (id_rol) JOIN seguridad.permisos p USING (id_permiso)
WHERE u.activo AND r.activo;

-- ============================================================================
-- 9. DATOS SEMILLA
-- ============================================================================

-- 9.1 Parámetros (Ley El Salvador). Verificar vigencia con el MH / ISSS antes de la defensa.
INSERT INTO empresa.parametros(clave, valor, descripcion) VALUES
 ('tasa_iva',                 '0.13',  'IVA'),
 ('isss_empleado',            '0.03',  'ISSS cuota laboral'),
 ('isss_patronal',            '0.075', 'ISSS cuota patronal'),
 ('isss_base_maxima_mensual', '1000',  'Salario máximo cotizable ISSS (mensual) -> tope de $30 laboral'),
 ('afp_empleado',             '0.0725','AFP cuota laboral'),
 ('afp_patronal',             '0.0875','AFP cuota patronal'),
 ('insaforp_patronal',        '0.01',  'INSAFORP (empresas de 10+ empleados)'),
 ('permitir_stock_negativo',  'false', 'Si es true, se puede vender aunque el sistema marque 0 de stock');

-- 9.2 Tramos de retención de Renta (tabla vigente según Decreto Ejecutivo; revisar actualizaciones)
INSERT INTO rrhh.tramos_renta(tipo_periodo, tramo, desde, hasta, cuota_fija, porcentaje, exceso_sobre) VALUES
 ('QUINCENAL','I',    0.00,    275.00,  0.00,   0.00,    0.00),
 ('QUINCENAL','II',   275.01,  447.62,  8.83,   0.10,  275.00),
 ('QUINCENAL','III',  447.63, 1019.05, 30.00,   0.20,  447.62),
 ('QUINCENAL','IV',  1019.06,    NULL, 144.28,  0.30, 1019.05),
 ('MENSUAL',  'I',    0.00,    550.00,  0.00,   0.00,    0.00),
 ('MENSUAL',  'II',   550.01,  895.24, 17.67,   0.10,  550.00),
 ('MENSUAL',  'III',  895.25, 2038.10, 60.00,   0.20,  895.24),
 ('MENSUAL',  'IV',  2038.11,    NULL, 288.57,  0.30, 2038.10);

-- 9.3 Permisos
INSERT INTO seguridad.permisos(codigo, modulo, descripcion) VALUES
 ('SEG_GESTIONAR_USUARIOS','SEGURIDAD','Crear/editar/desactivar usuarios'),
 ('SEG_GESTIONAR_ROLES','SEGURIDAD','Crear roles y asignar permisos'),
 ('SEG_VER_BITACORA','SEGURIDAD','Consultar la bitácora de cambios'),
 ('EMP_GESTIONAR_SUCURSALES','EMPRESA','Crear/editar sucursales y cajas'),
 ('EMP_EDITAR_PARAMETROS','EMPRESA','Cambiar IVA, ISSS, AFP, etc.'),
 ('INV_VER_STOCK','INVENTARIO','Consultar stock y alertas'),
 ('INV_GESTIONAR_INSUMOS','INVENTARIO','Crear/editar insumos'),
 ('INV_GESTIONAR_PRODUCTOS','INVENTARIO','Crear/editar productos y precios'),
 ('INV_GESTIONAR_RECETAS','INVENTARIO','Editar recetas (BOM)'),
 ('INV_REGISTRAR_MERMA','INVENTARIO','Registrar mermas y ajustes'),
 ('INV_VER_COSTOS','INVENTARIO','Ver costos y márgenes'),
 ('POS_CREAR_ORDEN','POS','Tomar pedidos'),
 ('POS_VER_COLA_PREPARACION','POS','Ver pantalla de preparación (barra/cocina)'),
 ('POS_COBRAR','POS','Facturar y cobrar (FCF)'),
 ('POS_EMITIR_CCF','POS','Emitir Comprobante de Crédito Fiscal'),
 ('POS_APLICAR_DESCUENTO','POS','Aplicar descuentos'),
 ('POS_ANULAR_VENTA','POS','Anular ventas'),
 ('POS_GESTIONAR_CLIENTES','POS','Crear/editar clientes'),
 ('CAJA_ABRIR_TURNO','CAJA','Abrir turno de caja'),
 ('CAJA_CERRAR_TURNO','CAJA','Cerrar turno y cuadrar'),
 ('CAJA_MOVIMIENTOS','CAJA','Ingresos/egresos de caja'),
 ('CAJA_VER_CUADRES','CAJA','Ver cuadres de todos los turnos'),
 ('COM_GESTIONAR_PROVEEDORES','COMPRAS','Crear/editar proveedores'),
 ('COM_REGISTRAR_COMPRA','COMPRAS','Registrar facturas de compra'),
 ('COM_PAGAR_PROVEEDOR','COMPRAS','Registrar pagos a proveedores'),
 ('COM_VER_CXP','COMPRAS','Ver cuentas por pagar'),
 ('RRHH_GESTIONAR_EMPLEADOS','RRHH','Crear/editar empleados'),
 ('RRHH_VER_SALARIOS','RRHH','Ver salarios'),
 ('RRHH_CALCULAR_PLANILLA','RRHH','Calcular y procesar planilla'),
 ('RRHH_VER_PLANILLA','RRHH','Consultar planillas'),
 ('REP_VER_DASHBOARD','REPORTES','Ver dashboard y reportes de ventas');

-- 9.4 Roles base (el ADMIN podrá crear más desde la UI)
INSERT INTO seguridad.roles(nombre, descripcion, es_sistema) VALUES
 ('ADMIN','Acceso total',TRUE),
 ('GERENTE_SUCURSAL','Opera y supervisa una sucursal',TRUE),
 ('CAJERO','Toma pedidos, cobra y cierra su caja',TRUE),
 ('BARISTA','Ve y prepara pedidos, consulta stock',TRUE),
 ('BODEGUERO','Inventario y compras',TRUE),
 ('CONTADOR','Compras, cuentas por pagar, planilla y reportes',TRUE),
 ('RRHH','Gestión de personal y planilla',TRUE);

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r CROSS JOIN seguridad.permisos p WHERE r.nombre = 'ADMIN';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('INV_VER_STOCK','INV_GESTIONAR_INSUMOS','INV_REGISTRAR_MERMA','INV_VER_COSTOS','POS_CREAR_ORDEN','POS_VER_COLA_PREPARACION','POS_COBRAR',
  'POS_EMITIR_CCF','POS_APLICAR_DESCUENTO','POS_ANULAR_VENTA','POS_GESTIONAR_CLIENTES','CAJA_ABRIR_TURNO','CAJA_CERRAR_TURNO','CAJA_MOVIMIENTOS',
  'CAJA_VER_CUADRES','COM_REGISTRAR_COMPRA','COM_VER_CXP','RRHH_VER_PLANILLA','REP_VER_DASHBOARD')
WHERE r.nombre = 'GERENTE_SUCURSAL';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('POS_CREAR_ORDEN','POS_COBRAR','POS_EMITIR_CCF','POS_GESTIONAR_CLIENTES','CAJA_ABRIR_TURNO','CAJA_CERRAR_TURNO','CAJA_MOVIMIENTOS','INV_VER_STOCK')
WHERE r.nombre = 'CAJERO';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('POS_VER_COLA_PREPARACION','INV_VER_STOCK','INV_REGISTRAR_MERMA')
WHERE r.nombre = 'BARISTA';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('INV_VER_STOCK','INV_GESTIONAR_INSUMOS','INV_REGISTRAR_MERMA','INV_VER_COSTOS','COM_GESTIONAR_PROVEEDORES','COM_REGISTRAR_COMPRA','COM_VER_CXP')
WHERE r.nombre = 'BODEGUERO';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('COM_REGISTRAR_COMPRA','COM_PAGAR_PROVEEDOR','COM_VER_CXP','CAJA_VER_CUADRES','RRHH_VER_PLANILLA','RRHH_VER_SALARIOS','REP_VER_DASHBOARD','INV_VER_COSTOS')
WHERE r.nombre = 'CONTADOR';

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r JOIN seguridad.permisos p ON p.codigo IN
 ('RRHH_GESTIONAR_EMPLEADOS','RRHH_VER_SALARIOS','RRHH_CALCULAR_PLANILLA','RRHH_VER_PLANILLA')
WHERE r.nombre = 'RRHH';

-- 9.5 Sucursales, cajas y series
INSERT INTO empresa.sucursales(codigo_establecimiento, nombre, direccion, departamento, telefono) VALUES
 ('M001','Orígenes Centro Histórico','Calle Delgado, Centro Histórico, San Salvador','San Salvador','2222-0001'),
 ('M002','Orígenes Escalón','Paseo General Escalón, San Salvador','San Salvador','2222-0002');
INSERT INTO pos.cajas(id_sucursal, codigo_punto_venta, nombre_identificador) VALUES (1,'P001','Caja Principal 01'), (2,'P001','Caja Principal 01');

-- 9.6 Usuarios demo (contraseña "Cambiar123*": en el backend usen bcrypt; pgcrypto genera hashes $2a$ compatibles)
INSERT INTO seguridad.usuarios(id_rol, username, password_hash)
SELECT r.id_rol, v.u, crypt('Cambiar123*', gen_salt('bf', 10))
FROM (VALUES ('admin','ADMIN'),('gerente1','GERENTE_SUCURSAL'),('cajero1','CAJERO'),('barista1','BARISTA'),('bodega1','BODEGUERO')) v(u, rol)
JOIN seguridad.roles r ON r.nombre = v.rol;
INSERT INTO seguridad.usuario_sucursal SELECT id_usuario, 1 FROM seguridad.usuarios WHERE username <> 'admin';
INSERT INTO seguridad.usuario_sucursal SELECT id_usuario, s FROM seguridad.usuarios, (VALUES (1),(2)) x(s) WHERE username = 'admin';

-- 9.7 Catálogo: unidades, categorías, insumos
INSERT INTO inventario.unidades_medida(codigo, nombre) VALUES ('GR','Gramos'), ('ML','Mililitros'), ('UND','Unidad');
INSERT INTO inventario.categorias_producto(nombre) VALUES ('Bebidas calientes'), ('Bebidas frías'), ('Alimentos'), ('Reventa');

INSERT INTO inventario.insumos(nombre, tipo_insumo, id_unidad_base, costo_promedio)
SELECT v.n, v.t, u.id_unidad, v.c FROM (VALUES
 ('Café Grano Especialidad','INGREDIENTE','GR',0.0330), ('Leche Entera','INGREDIENTE','ML',0.0012), ('Agua Purificada','INGREDIENTE','ML',0.0003),
 ('Chocolate en Polvo','INGREDIENTE','GR',0.0100), ('Jarabe de Vainilla','INGREDIENTE','ML',0.0150), ('Jarabe de Caramelo','INGREDIENTE','ML',0.0150),
 ('Concentrado Té Chai','INGREDIENTE','ML',0.0090), ('Hielo','INGREDIENTE','GR',0.0005), ('Crema Batida','INGREDIENTE','GR',0.0080),
 ('Pan de Sándwich','INGREDIENTE','UND',0.2500), ('Jamón','INGREDIENTE','GR',0.0110), ('Queso','INGREDIENTE','GR',0.0100),
 ('Vaso 8oz','EMPAQUE','UND',0.0600), ('Vaso 16oz','EMPAQUE','UND',0.0900), ('Tapadera','EMPAQUE','UND',0.0300),
 ('Viñeta','EMPAQUE','UND',0.0100), ('Bolsa Kraft','EMPAQUE','UND',0.0500),
 ('Galleta de Avena Empacada','REVENTA','UND',0.5500), ('Agua Embotellada 500ml','REVENTA','UND',0.3500), ('Café Molido 340g (Bolsa)','REVENTA','UND',5.2000)
) v(n, t, u, c) JOIN inventario.unidades_medida u ON u.codigo = v.u;

-- 9.8 Productos: 12 elaborados + 3 de reventa
INSERT INTO inventario.productos(id_categoria, nombre, codigo_barra, precio_venta, es_elaborado, id_insumo_reventa)
SELECT c.id_categoria, v.n, v.cb, v.p, v.e, i.id_insumo
FROM (VALUES
 ('Bebidas calientes','Espresso',NULL,2.00,TRUE,NULL), ('Bebidas calientes','Americano Grande',NULL,2.50,TRUE,NULL),
 ('Bebidas calientes','Latte Grande',NULL,3.75,TRUE,NULL), ('Bebidas calientes','Cappuccino',NULL,3.25,TRUE,NULL),
 ('Bebidas calientes','Mocca Grande',NULL,4.25,TRUE,NULL), ('Bebidas calientes','Latte Vainilla Grande',NULL,4.25,TRUE,NULL),
 ('Bebidas calientes','Caramel Macchiato Grande',NULL,4.50,TRUE,NULL), ('Bebidas calientes','Chai Latte Grande',NULL,3.95,TRUE,NULL),
 ('Bebidas calientes','Chocolate Caliente',NULL,3.50,TRUE,NULL),
 ('Bebidas frías','Frappé de Café Grande',NULL,4.75,TRUE,NULL), ('Bebidas frías','Cold Brew',NULL,3.50,TRUE,NULL),
 ('Alimentos','Sándwich Jamón y Queso',NULL,4.50,TRUE,NULL),
 ('Reventa','Galleta de Avena','7412345000011',1.50,FALSE,'Galleta de Avena Empacada'),
 ('Reventa','Agua Embotellada 500ml','7412345000028',1.00,FALSE,'Agua Embotellada 500ml'),
 ('Reventa','Café Molido 340g','7412345000035',9.50,FALSE,'Café Molido 340g (Bolsa)')
) v(cat, n, cb, p, e, ins)
JOIN inventario.categorias_producto c ON c.nombre = v.cat
LEFT JOIN inventario.insumos i ON i.nombre = v.ins;

-- 9.9 Recetas
INSERT INTO inventario.recetas(id_producto, id_insumo, cantidad_requerida)
SELECT p.id_producto, i.id_insumo, v.c FROM (VALUES
 ('Espresso','Café Grano Especialidad',18),('Espresso','Vaso 8oz',1),('Espresso','Tapadera',1),('Espresso','Viñeta',1),
 ('Americano Grande','Café Grano Especialidad',18),('Americano Grande','Agua Purificada',300),('Americano Grande','Vaso 16oz',1),('Americano Grande','Tapadera',1),('Americano Grande','Viñeta',1),
 ('Latte Grande','Café Grano Especialidad',18),('Latte Grande','Leche Entera',250),('Latte Grande','Vaso 16oz',1),('Latte Grande','Tapadera',1),('Latte Grande','Viñeta',1),
 ('Cappuccino','Café Grano Especialidad',18),('Cappuccino','Leche Entera',180),('Cappuccino','Vaso 8oz',1),('Cappuccino','Tapadera',1),('Cappuccino','Viñeta',1),
 ('Mocca Grande','Café Grano Especialidad',18),('Mocca Grande','Leche Entera',200),('Mocca Grande','Chocolate en Polvo',25),('Mocca Grande','Vaso 16oz',1),('Mocca Grande','Tapadera',1),('Mocca Grande','Viñeta',1),
 ('Latte Vainilla Grande','Café Grano Especialidad',18),('Latte Vainilla Grande','Leche Entera',250),('Latte Vainilla Grande','Jarabe de Vainilla',20),('Latte Vainilla Grande','Vaso 16oz',1),('Latte Vainilla Grande','Tapadera',1),('Latte Vainilla Grande','Viñeta',1),
 ('Caramel Macchiato Grande','Café Grano Especialidad',18),('Caramel Macchiato Grande','Leche Entera',250),('Caramel Macchiato Grande','Jarabe de Caramelo',25),('Caramel Macchiato Grande','Vaso 16oz',1),('Caramel Macchiato Grande','Tapadera',1),('Caramel Macchiato Grande','Viñeta',1),
 ('Chai Latte Grande','Concentrado Té Chai',120),('Chai Latte Grande','Leche Entera',150),('Chai Latte Grande','Vaso 16oz',1),('Chai Latte Grande','Tapadera',1),('Chai Latte Grande','Viñeta',1),
 ('Chocolate Caliente','Chocolate en Polvo',30),('Chocolate Caliente','Leche Entera',250),('Chocolate Caliente','Vaso 16oz',1),('Chocolate Caliente','Tapadera',1),('Chocolate Caliente','Viñeta',1),
 ('Frappé de Café Grande','Café Grano Especialidad',18),('Frappé de Café Grande','Leche Entera',150),('Frappé de Café Grande','Hielo',200),('Frappé de Café Grande','Crema Batida',20),('Frappé de Café Grande','Vaso 16oz',1),('Frappé de Café Grande','Tapadera',1),('Frappé de Café Grande','Viñeta',1),
 ('Cold Brew','Café Grano Especialidad',25),('Cold Brew','Agua Purificada',300),('Cold Brew','Hielo',150),('Cold Brew','Vaso 16oz',1),('Cold Brew','Tapadera',1),('Cold Brew','Viñeta',1),
 ('Sándwich Jamón y Queso','Pan de Sándwich',2),('Sándwich Jamón y Queso','Jamón',40),('Sándwich Jamón y Queso','Queso',30),('Sándwich Jamón y Queso','Bolsa Kraft',1),('Sándwich Jamón y Queso','Viñeta',1)
) v(prod, ins, c)
JOIN inventario.productos p ON p.nombre = v.prod JOIN inventario.insumos i ON i.nombre = v.ins;

-- 9.10 Stock inicial por sucursal (pasa por fn_mover_stock => queda en el kardex) y stock mínimo = 20% del inicial
DO $$
DECLARE r RECORD; s INT;
BEGIN
    FOR s IN SELECT id_sucursal FROM empresa.sucursales LOOP
        FOR r IN SELECT i.id_insumo, i.nombre, i.tipo_insumo FROM inventario.insumos i LOOP
            PERFORM inventario.fn_mover_stock(s, r.id_insumo,
                CASE WHEN r.nombre IN ('Café Grano Especialidad','Leche Entera','Agua Purificada','Hielo') THEN 20000
                     WHEN r.tipo_insumo = 'EMPAQUE' THEN 500
                     WHEN r.tipo_insumo = 'REVENTA' THEN 40
                     ELSE 3000 END,
                'INVENTARIO_INICIAL', NULL, NULL, NULL, NULL, 'Carga inicial');
        END LOOP;
    END LOOP;
    UPDATE inventario.stock_sucursal SET stock_minimo = stock_actual * 0.20;
END $$;

-- 9.11 Proveedores
INSERT INTO compras.proveedores(razon_social, nrc, nit, contacto, telefono, dias_credito) VALUES
 ('Distribuidora de Café La Cumbre, S.A. de C.V.','123456-7','0614-010190-101-1','Carlos Rivas','2260-1000',30),
 ('Lácteos del Valle, S.A. de C.V.','234567-8','0614-020285-102-2','Ana Mejía','2270-2000',15),
 ('Empaques y Desechables SV, S.A. de C.V.','345678-9','0614-030392-103-3','Luis Pineda','2280-3000',0);

-- 9.12 RRHH
INSERT INTO rrhh.puestos(nombre, salario_base) VALUES ('GERENTE',900.00), ('CAJERO',450.00), ('BARISTA',420.00), ('BODEGUERO',430.00);
INSERT INTO rrhh.empleados(id_sucursal, id_puesto, id_usuario, nombres, apellidos, dui, nit, salario_nominal)
SELECT 1, p.id_puesto, u.id_usuario, v.n, v.a, v.dui, v.nit, v.sal
FROM (VALUES ('GERENTE','gerente1','Marta','Hernández','01234567-8','0614-150488-101-1',900.00),
             ('CAJERO','cajero1','José','Martínez','02345678-9','0614-230195-102-2',450.00),
             ('BARISTA','barista1','Daniela','Rivera','03456789-0','0614-110997-103-3',420.00),
             ('BODEGUERO','bodega1','Roberto','Alas','04567890-1','0614-050190-104-4',430.00)) v(pu, us, n, a, dui, nit, sal)
JOIN rrhh.puestos p ON p.nombre = v.pu JOIN seguridad.usuarios u ON u.username = v.us;
