-- Amplía la auditoría para analítica operativa. No altera los datos históricos.
ALTER TABLE seguridad.bitacora
  ADD COLUMN IF NOT EXISTS ip_cliente TEXT,
  ADD COLUMN IF NOT EXISTS agente_cliente TEXT,
  ADD COLUMN IF NOT EXISTS severidad VARCHAR(12) NOT NULL DEFAULT 'INFO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bitacora_severidad_check'
      AND conrelid = 'seguridad.bitacora'::regclass
  ) THEN
    ALTER TABLE seguridad.bitacora
      ADD CONSTRAINT bitacora_severidad_check
      CHECK (severidad IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'));
  END IF;
END $$;

ALTER TABLE seguridad.bitacora
  ALTER COLUMN creado_en SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/El_Salvador');

UPDATE seguridad.bitacora
SET severidad = CASE
  WHEN accion = 'DELETE' OR entidad = 'seguridad.roles_permisos' THEN 'CRITICAL'
  ELSE 'INFO'
END;

CREATE INDEX IF NOT EXISTS idx_bitacora_fecha_id
  ON seguridad.bitacora (creado_en DESC, id_bitacora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad_fecha
  ON seguridad.bitacora (entidad, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo_fecha
  ON seguridad.bitacora ((split_part(entidad, '.', 1)), creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario_fecha
  ON seguridad.bitacora (id_usuario, creado_en DESC);

CREATE OR REPLACE FUNCTION seguridad.fn_auditar() RETURNS TRIGGER AS $$
DECLARE
  v_antes JSONB;
  v_despues JSONB;
  v_severidad VARCHAR(12);
BEGIN
  -- El cambio aislado de ultimo_login se representa con el evento LOGIN explícito,
  -- evitando duplicar cada acceso como un UPDATE de la fila de usuario.
  IF TG_TABLE_SCHEMA = 'seguridad' AND TG_TABLE_NAME = 'usuarios' AND TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'ultimo_login' - 'modificado_en') = (to_jsonb(OLD) - 'ultimo_login' - 'modificado_en') THEN
    RETURN NEW;
  END IF;

  v_antes := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_despues := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;

  -- Nunca copiar credenciales ni hashes a la bitácora consultable.
  v_antes := v_antes - 'password_hash' - 'token' - 'refresh_token';
  v_despues := v_despues - 'password_hash' - 'token' - 'refresh_token';
  v_severidad := CASE
    WHEN TG_OP = 'DELETE' OR (TG_TABLE_SCHEMA = 'seguridad' AND TG_TABLE_NAME = 'roles_permisos') THEN 'CRITICAL'
    ELSE 'INFO'
  END;

  INSERT INTO seguridad.bitacora(id_usuario, accion, entidad, datos_antes, datos_despues,
                                 ip_cliente, agente_cliente, severidad)
  VALUES (
    NULLIF(current_setting('app.user_id', true), '')::UUID,
    TG_OP,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_antes,
    v_despues,
    NULLIF(current_setting('app.client_ip', true), ''),
    NULLIF(current_setting('app.user_agent', true), ''),
    v_severidad
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
