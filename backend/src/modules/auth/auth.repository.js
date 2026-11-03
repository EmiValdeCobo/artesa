import { query } from '../../config/db.js';

export async function buscarUsuarioPorUsername(username) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.username, u.password_hash, u.activo, r.nombre AS rol
     FROM seguridad.usuarios u JOIN seguridad.roles r USING (id_rol)
     WHERE u.username = $1 AND r.activo`,
    [username],
  );
  return rows[0] ?? null;
}

export async function buscarClientePorUsername(username) {
  const { rows } = await query(
    `SELECT id_cliente, username, password_hash, activo, nombre_razon_social, email
     FROM pos.clientes
     WHERE username = $1 AND activo AND password_hash IS NOT NULL`,
    [username],
  );
  return rows[0] ?? null;
}

export async function buscarClientePorId(idCliente) {
  const { rows } = await query(
    `SELECT id_cliente, username, activo, nombre_razon_social, email
     FROM pos.clientes WHERE id_cliente = $1 AND activo`,
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function buscarUsuarioPorId(idUsuario) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.username, r.nombre AS rol
     FROM seguridad.usuarios u JOIN seguridad.roles r USING (id_rol)
     WHERE u.id_usuario = $1 AND u.activo`,
    [idUsuario],
  );
  return rows[0] ?? null;
}

export async function listarPermisos(idUsuario) {
  const { rows } = await query('SELECT permiso FROM reportes.vw_permisos_usuario WHERE id_usuario = $1 ORDER BY permiso', [idUsuario]);
  return rows.map((r) => r.permiso);
}

export async function listarSucursales(idUsuario) {
  const { rows } = await query(
    `SELECT s.id_sucursal, s.nombre FROM seguridad.usuario_sucursal us
     JOIN empresa.sucursales s USING (id_sucursal) WHERE us.id_usuario = $1 AND s.activa ORDER BY s.id_sucursal`,
    [idUsuario],
  );
  return rows;
}

export const registrarLogin = (idUsuario) => query('UPDATE seguridad.usuarios SET ultimo_login = now() WHERE id_usuario = $1', [idUsuario]);
