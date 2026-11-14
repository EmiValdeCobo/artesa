-- 010_auditoria_extendida.sql
-- Auditoría extendida:
-- 1. Actualiza seguridad.fn_auditar() para detectar borrado lógico (UPDATE con deleted_at)
--    y registrarlo como DELETE con severidad CRITICAL.
-- 2. Asegura triggers de auditoría en inventario.insumos, inventario.unidades_medida y seguridad.usuario_sucursal.

CREATE OR REPLACE FUNCTION seguridad.fn_auditar() RETURNS TRIGGER AS $$
DECLARE
  v_antes JSONB;
  v_despues JSONB;
  v_severidad VARCHAR(12);
  v_accion VARCHAR(10);
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

  v_accion := TG_OP;
  v_severidad := CASE
    WHEN TG_OP = 'DELETE' OR (TG_TABLE_SCHEMA = 'seguridad' AND TG_TABLE_NAME = 'roles_permisos') THEN 'CRITICAL'
    ELSE 'INFO'
  END;

  -- Si es un UPDATE que establece deleted_at (borrado lógico), registrar como DELETE con severidad CRITICAL
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) ? 'deleted_at') THEN
    IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
      v_accion := 'DELETE';
      v_severidad := 'CRITICAL';
    END IF;
  END IF;

  INSERT INTO seguridad.bitacora(id_usuario, accion, entidad, datos_antes, datos_despues,
                                 ip_cliente, agente_cliente, severidad)
  VALUES (
    NULLIF(current_setting('app.user_id', true), '')::UUID,
    v_accion,
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

-- Triggers de auditoría
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_aud_insumos'
      AND tgrelid = 'inventario.insumos'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_aud_insumos
      AFTER INSERT OR UPDATE OR DELETE ON inventario.insumos
      FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_aud_unidades_medida'
      AND tgrelid = 'inventario.unidades_medida'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_aud_unidades_medida
      AFTER INSERT OR UPDATE OR DELETE ON inventario.unidades_medida
      FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_aud_usuario_sucursal'
      AND tgrelid = 'seguridad.usuario_sucursal'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_aud_usuario_sucursal
      AFTER INSERT OR UPDATE OR DELETE ON seguridad.usuario_sucursal
      FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
  END IF;
END $$;
