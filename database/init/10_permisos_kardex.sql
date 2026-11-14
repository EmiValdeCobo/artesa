INSERT INTO seguridad.permisos (codigo, modulo, descripcion)
VALUES (
  'INV_VER_KARDEX',
  'INVENTARIO',
  'Consultar el historial de movimientos de inventario'
)
ON CONFLICT (codigo) DO NOTHING;

DELETE FROM seguridad.roles_permisos rp
USING seguridad.roles r, seguridad.permisos p
WHERE rp.id_rol = r.id_rol
  AND rp.id_permiso = p.id_permiso
  AND p.codigo = 'INV_VER_KARDEX'
  AND r.nombre NOT IN ('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO');

INSERT INTO seguridad.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.nombre IN ('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO')
  AND p.codigo = 'INV_VER_KARDEX'
ON CONFLICT DO NOTHING;

DELETE FROM seguridad.roles_permisos rp
USING seguridad.roles r, seguridad.permisos p
WHERE rp.id_rol = r.id_rol
  AND rp.id_permiso = p.id_permiso
  AND r.nombre = 'BODEGUERO'
  AND p.codigo = 'INV_VER_COSTOS';
