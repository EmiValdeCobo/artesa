import { Op } from 'sequelize';
import { query } from '../../config/db.js';
import { Cliente, Rol, Sucursal, Usuario } from '../../models/index.js';

export async function buscarUsuarioPorUsername(username) {
  const usuario = await Usuario.findOne({
    attributes: ['id_usuario', 'username', 'password_hash', 'activo'],
    where: { username },
    include: [{ model: Rol, as: 'rol', attributes: ['nombre'], where: { activo: true } }],
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
    include: [{ model: Rol, as: 'rol', attributes: ['nombre'] }],
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

export const registrarLogin = (idUsuario) => Usuario.update({ ultimo_login: new Date() }, { where: { id_usuario: idUsuario } });
