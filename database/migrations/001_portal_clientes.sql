-- Credenciales independientes para el portal de clientes.
ALTER TABLE pos.clientes ADD COLUMN IF NOT EXISTS username VARCHAR(80);
ALTER TABLE pos.clientes ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE pos.clientes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_username ON pos.clientes(username) WHERE username IS NOT NULL;
