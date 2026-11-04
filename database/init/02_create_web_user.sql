-- Rol global de aplicación. Este archivo se ejecuta solo al crear el volumen.
-- La contraseña llega desde WEB_DB_PASSWORD del servicio db, nunca se versiona.
\getenv web_db_password WEB_DB_PASSWORD

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
    CREATE ROLE web_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE web_user LOGIN PASSWORD :'web_db_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS;

SELECT format('GRANT CONNECT ON DATABASE %I TO web_user', current_database()) \gexec
GRANT USAGE ON SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes TO web_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO web_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA seguridad, empresa, inventario, pos, compras, rrhh, reportes
  GRANT EXECUTE ON FUNCTIONS TO web_user;
