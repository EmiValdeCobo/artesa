-- Espejo de database/migrations/005_rbac_roles_activos.sql para instalaciones nuevas.
ALTER TABLE seguridad.roles DROP CONSTRAINT IF EXISTS roles_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_nombre_activos
  ON seguridad.roles(nombre)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION seguridad.fn_tiene_permiso(p_id_usuario UUID, p_codigo TEXT) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM seguridad.usuarios u
        JOIN seguridad.roles r ON r.id_rol = u.id_rol
        JOIN seguridad.roles_permisos rp ON rp.id_rol = r.id_rol
        JOIN seguridad.permisos p ON p.id_permiso = rp.id_permiso
        WHERE u.id_usuario = p_id_usuario
          AND u.activo
          AND u.deleted_at IS NULL
          AND r.activo
          AND r.deleted_at IS NULL
          AND p.codigo = p_codigo
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE VIEW reportes.vw_permisos_usuario AS
SELECT u.id_usuario, u.username, r.nombre AS rol, p.modulo, p.codigo AS permiso
FROM seguridad.usuarios u
JOIN seguridad.roles r USING (id_rol)
JOIN seguridad.roles_permisos rp USING (id_rol)
JOIN seguridad.permisos p USING (id_permiso)
WHERE u.activo
  AND u.deleted_at IS NULL
  AND r.activo
  AND r.deleted_at IS NULL;
