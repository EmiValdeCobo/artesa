-- Registra en la bitácora las altas, cambios y desactivaciones lógicas de proveedores.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_aud_proveedores'
      AND tgrelid = 'compras.proveedores'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_aud_proveedores
      AFTER INSERT OR UPDATE OR DELETE ON compras.proveedores
      FOR EACH ROW EXECUTE FUNCTION seguridad.fn_auditar();
  END IF;
END $$;
