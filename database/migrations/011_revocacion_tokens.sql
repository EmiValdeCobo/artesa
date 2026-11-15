-- 011_revocacion_tokens.sql
-- Tabla para registrar tokens JWT revocados (logout o revocación de sesión)
-- Permite invalidar tokens antes de su tiempo de expiración (8h) usando su jti.

CREATE TABLE IF NOT EXISTS seguridad.tokens_revocados (
    jti VARCHAR(64) PRIMARY KEY,
    id_usuario VARCHAR(64),
    expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    revocado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_revocados_expiracion
    ON seguridad.tokens_revocados (expiracion);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON seguridad.tokens_revocados TO web_user;
  END IF;
END $$;
