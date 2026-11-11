import { Op, QueryTypes } from 'sequelize';
import { query, sequelize, withTransaction } from '../../config/db.js';
import { Cliente, Rol, Sucursal, Usuario } from '../../models/index.js';

export async function buscarUsuarioPorUsername(username) {
  const usuario = await Usuario.findOne({
    attributes: ['id_usuario', 'username', 'password_hash', 'activo'],
    where: { username },
    include: [{ model: Rol, as: 'rol', attributes: ['nombre'], where: { activo: true }, required: true }],
  });
  if (!usuario) return null;
  return { ...usuario.get({ plain: true }), rol: usuario.rol.nombre };
}

export async function buscarClientePorUsername(username) {
  return Cliente.findOne({
    attributes: ['id_cliente', 'username', 'password_hash', 'activo', 'nombre_razon_social', 'email'],
    where: { username, activo: true, password_hash: { [Op.not]: null } },
    raw: true,
  });
}

export async function buscarClientePorId(idCliente) {
  return Cliente.findOne({
    attributes: ['id_cliente', 'username', 'activo', 'nombre_razon_social', 'email'],
    where: { id_cliente: idCliente, activo: true },
    raw: true,
  });
}

export async function buscarUsuarioPorId(idUsuario) {
  const usuario = await Usuario.findOne({
    attributes: ['id_usuario', 'username'],
    where: { id_usuario: idUsuario, activo: true },
    include: [{ model: Rol, as: 'rol', attributes: ['nombre'], where: { activo: true }, required: true }],
  });
  if (!usuario) return null;
  return { ...usuario.get({ plain: true }), rol: usuario.rol.nombre };
}

export async function listarPermisos(idUsuario) {
  const rows = await query('SELECT permiso FROM reportes.vw_permisos_usuario WHERE id_usuario = $1 ORDER BY permiso', [idUsuario]);
  return rows.map((r) => r.permiso);
}

export async function listarSucursales(idUsuario) {
  return Sucursal.findAll({
    attributes: ['id_sucursal', 'nombre'],
    where: { activa: true },
    include: [{ model: Usuario, as: 'usuarios', attributes: [], where: { id_usuario: idUsuario }, through: { attributes: [] } }],
    order: [['id_sucursal', 'ASC']],
    raw: true,
  });
}

export const registrarLogin = (idUsuario) => withTransaction(async (transaction) => {
  await Usuario.update({ ultimo_login: new Date() }, { where: { id_usuario: idUsuario }, transaction });
  await sequelize.query(
    `INSERT INTO seguridad.bitacora(id_usuario, accion, entidad, datos_despues, ip_cliente, agente_cliente, severidad)
     VALUES ($1::uuid, 'LOGIN', 'seguridad.usuarios', jsonb_build_object('resultado','EXITOSO'),
             NULLIF(current_setting('app.client_ip', true), ''), NULLIF(current_setting('app.user_agent', true), ''),
             CASE WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'America/El_Salvador')::time < TIME '06:00'
                       OR (CURRENT_TIMESTAMP AT TIME ZONE 'America/El_Salvador')::time >= TIME '22:00'
                  THEN 'WARNING' ELSE 'INFO' END)
     RETURNING id_bitacora`,
    { bind: [idUsuario], transaction, type: QueryTypes.SELECT },
  );
}, idUsuario);

export const registrarIntentoLogin = (username) => withTransaction((transaction) => sequelize.query(
  `INSERT INTO seguridad.bitacora(accion, entidad, datos_despues, ip_cliente, agente_cliente, severidad)
   VALUES ('LOGIN', 'seguridad.usuarios', jsonb_build_object('usuario', $1::text, 'resultado', 'FALLIDO'),
           NULLIF(current_setting('app.client_ip', true), ''), NULLIF(current_setting('app.user_agent', true), ''), 'WARNING')
   RETURNING id_bitacora`,
  { bind: [username], transaction, type: QueryTypes.SELECT },
));
