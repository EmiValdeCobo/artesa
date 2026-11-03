-- Seeder de prueba: ejecutar después de init/01_schema.sql y migrations/001_portal_clientes.sql.
-- Credenciales demo: admin / Cambiar123* y cliente.demo / Cliente123*.
INSERT INTO seguridad.usuarios(id_rol, username, password_hash)
SELECT r.id_rol, 'admin', crypt('Cambiar123*', gen_salt('bf', 10))
FROM seguridad.roles r
WHERE r.nombre = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM seguridad.usuarios WHERE username = 'admin');

INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
SELECT u.id_usuario, s.id_sucursal
FROM seguridad.usuarios u CROSS JOIN empresa.sucursales s
WHERE u.username = 'admin'
  AND NOT EXISTS (SELECT 1 FROM seguridad.usuario_sucursal us WHERE us.id_usuario = u.id_usuario AND us.id_sucursal = s.id_sucursal);

INSERT INTO pos.clientes(nombre_razon_social, email, username, password_hash)
SELECT 'Cliente Demo', 'cliente.demo@artesa.local', 'cliente.demo', crypt('Cliente123*', gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM pos.clientes WHERE username = 'cliente.demo');
