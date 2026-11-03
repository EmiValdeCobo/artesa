import { query } from '../../config/db.js';

const usuarioSelect = `
  SELECT u.id_usuario, u.username, u.id_rol, r.nombre AS rol, u.activo,
         COALESCE(
           json_agg(json_build_object('id_sucursal', s.id_sucursal, 'nombre', s.nombre)
             ORDER BY s.id_sucursal) FILTER (WHERE s.id_sucursal IS NOT NULL),
           '[]'::json
         ) AS sucursales
  FROM seguridad.usuarios u
  JOIN seguridad.roles r ON r.id_rol = u.id_rol
  LEFT JOIN seguridad.usuario_sucursal us ON us.id_usuario = u.id_usuario
  LEFT JOIN empresa.sucursales s ON s.id_sucursal = us.id_sucursal
`;

export async function listarUsuarios() {
  const { rows } = await query(`${usuarioSelect} GROUP BY u.id_usuario, r.nombre ORDER BY u.activo DESC, u.username`);
  return rows;
}

export async function listarRoles() {
  const { rows } = await query(
    'SELECT id_rol, nombre, descripcion FROM seguridad.roles WHERE activo ORDER BY nombre',
  );
  return rows;
}

export async function listarSucursales() {
  const { rows } = await query(
    'SELECT id_sucursal, nombre, codigo_establecimiento FROM empresa.sucursales WHERE activa ORDER BY id_sucursal',
  );
  return rows;
}

export async function buscarUsuario(idUsuario, client = null) {
  const ejecutar = client ?? { query };
  const { rows } = await ejecutar.query(`${usuarioSelect} WHERE u.id_usuario = $1 GROUP BY u.id_usuario, r.nombre`, [idUsuario]);
  return rows[0] ?? null;
}

export async function crearUsuario(client, { username, passwordHash, idRol }) {
  const { rows } = await client.query(
    `INSERT INTO seguridad.usuarios(username, password_hash, id_rol)
     VALUES ($1, $2, $3)
     RETURNING id_usuario`,
    [username, passwordHash, idRol],
  );
  return rows[0].id_usuario;
}

export async function asignarSucursales(client, idUsuario, sucursales) {
  await client.query('DELETE FROM seguridad.usuario_sucursal WHERE id_usuario = $1', [idUsuario]);
  await client.query(
    `INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
     SELECT $1, unnest($2::int[])`,
    [idUsuario, sucursales],
  );
}

export async function actualizarUsuario(client, idUsuario, { username, passwordHash, idRol }) {
  const campos = ['username = $1', 'id_rol = $2'];
  const valores = [username, idRol, idUsuario];
  if (passwordHash) {
    campos.push('password_hash = $3');
    valores.splice(2, 0, passwordHash);
  }
  const indiceId = valores.length;
  valores[indiceId - 1] = idUsuario;
  const { rowCount } = await client.query(
    `UPDATE seguridad.usuarios SET ${campos.join(', ')} WHERE id_usuario = $${indiceId} RETURNING id_usuario`,
    valores,
  );
  return rowCount;
}

export async function desactivarUsuario(client, idUsuario) {
  const { rowCount } = await client.query(
    'UPDATE seguridad.usuarios SET activo = FALSE WHERE id_usuario = $1 AND activo RETURNING id_usuario',
    [idUsuario],
  );
  return rowCount;
}

