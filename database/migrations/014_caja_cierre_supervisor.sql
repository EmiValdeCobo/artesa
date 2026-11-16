-- Permite que un supervisor cierre el turno abierto de otro cajero de sus sucursales
-- (turnos que quedaron abiertos de días anteriores y bloquean la apertura de la caja).
INSERT INTO seguridad.permisos(codigo, modulo, descripcion) VALUES
 ('CAJA_CERRAR_CUALQUIER_TURNO', 'CAJA', 'Cerrar el turno abierto de otro cajero de sus sucursales')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM (VALUES ('ADMIN', 'CAJA_CERRAR_CUALQUIER_TURNO'), ('GERENTE_SUCURSAL', 'CAJA_CERRAR_CUALQUIER_TURNO')) m(rol, permiso)
JOIN seguridad.roles r ON r.nombre = m.rol
JOIN seguridad.permisos p ON p.codigo = m.permiso
ON CONFLICT DO NOTHING;
