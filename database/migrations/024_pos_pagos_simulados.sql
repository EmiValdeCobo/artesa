-- 024_pos_pagos_simulados.sql
-- Pagos SIMULADOS de tarjeta y transferencia (sin pasarela real).
-- Solo se guardan datos no sensibles: marca y últimos 4 dígitos de la tarjeta. NUNCA número completo,
-- CVV ni vencimiento. La autorización simulada va en referencia (6-12 dígitos) y, en transferencia,
-- monto_recibido guarda lo transferido (el excedente no es vuelto en efectivo).
-- pos.fn_registrar_venta no cambia: el backend marca estas columnas en la misma transacción.

ALTER TABLE pos.pagos ADD COLUMN IF NOT EXISTS simulado      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pos.pagos ADD COLUMN IF NOT EXISTS marca_tarjeta VARCHAR(20);
ALTER TABLE pos.pagos ADD COLUMN IF NOT EXISTS ultimos4      CHAR(4);

ALTER TABLE pos.pagos DROP CONSTRAINT IF EXISTS ck_pagos_marca_tarjeta;
ALTER TABLE pos.pagos ADD CONSTRAINT ck_pagos_marca_tarjeta
    CHECK (marca_tarjeta IS NULL OR marca_tarjeta IN ('VISA','MASTERCARD','AMEX'));

ALTER TABLE pos.pagos DROP CONSTRAINT IF EXISTS ck_pagos_ultimos4;
ALTER TABLE pos.pagos ADD CONSTRAINT ck_pagos_ultimos4
    CHECK (ultimos4 IS NULL OR ultimos4 ~ '^[0-9]{4}$');

-- Marca/últimos 4 solo en tarjeta; simulado solo en tarjeta o transferencia.
ALTER TABLE pos.pagos DROP CONSTRAINT IF EXISTS ck_pagos_datos_tarjeta;
ALTER TABLE pos.pagos ADD CONSTRAINT ck_pagos_datos_tarjeta
    CHECK (metodo = 'TARJETA' OR (marca_tarjeta IS NULL AND ultimos4 IS NULL));

ALTER TABLE pos.pagos DROP CONSTRAINT IF EXISTS ck_pagos_simulado_metodo;
ALTER TABLE pos.pagos ADD CONSTRAINT ck_pagos_simulado_metodo
    CHECK (NOT simulado OR metodo IN ('TARJETA','TRANSFERENCIA'));

COMMENT ON COLUMN pos.pagos.simulado IS 'TRUE si el pago se hizo con la pasarela simulada (no es dinero real).';
COMMENT ON COLUMN pos.pagos.ultimos4 IS 'Últimos 4 dígitos de la tarjeta; jamás se guarda el número completo.';
