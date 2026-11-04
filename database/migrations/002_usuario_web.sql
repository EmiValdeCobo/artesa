-- Crea/ajusta el rol global usado por la aplicación web.
DO $$
DECLARE
  clave text := current_setting('app.web_db_password', true);
BEGIN
  IF clave IS NULL OR clave = '' THEN
    RAISE EXCEPTION 'WEB_DB_PASSWORD es requerido para esta migración';
  END IF;
  EXECUTE format('ALTER ROLE web_user LOGIN PASSWORD %L', clave);
END $$;
GRANT USAGE ON SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
