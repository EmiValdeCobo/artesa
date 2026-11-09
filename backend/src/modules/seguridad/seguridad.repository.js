import { Permiso, Rol, RolPermiso, Sucursal, Usuario, UsuarioSucursal } from '../../models/index.js';

function formatearUsuario(usuario) {
  if (!usuario) return null;
  const plano = usuario.get({ plain: true });
  return {
    id_usuario: plano.id_usuario,
    username: plano.username,
    id_rol: plano.id_rol,
    rol: plano.rol?.nombre,
    activo: plano.activo,
    deleted_at: plano.deleted_at ?? null,
    sucursales: (plano.sucursales ?? []).map(({ id_sucursal, nombre }) => ({ id_sucursal, nombre })),
  };
}

const incluirUsuario = [
  { model: Rol, as: 'rol', attributes: ['nombre'] },
  { model: Sucursal, as: 'sucursales', attributes: ['id_sucursal', 'nombre'], through: { attributes: [] } },
];

export async function listarUsuarios() {
  const usuarios = await Usuario.findAll({
    attributes: ['id_usuario', 'username', 'id_rol', 'activo', 'deleted_at'],
    include: incluirUsuario,
    order: [['activo', 'DESC'], ['username', 'ASC']],
  });
  return usuarios.map(formatearUsuario);
}

export const listarRoles = () => Rol.findAll({
  attributes: ['id_rol', 'nombre', 'descripcion', 'es_sistema', 'activo'],
  where: { activo: true },
  order: [['nombre', 'ASC']],
  raw: true,
});

const incluirPermisos = { model: Permiso, as: 'permisos', attributes: ['id_permiso', 'codigo', 'modulo', 'descripcion'], through: { attributes: [] } };

function formatearRol(rol) {
  if (!rol) return null;
  const plano = rol.get ? rol.get({ plain: true }) : rol;
  return { ...plano, permisos: plano.permisos ?? [] };
}

export async function listarRolesGestion() {
  const roles = await Rol.findAll({ attributes: ['id_rol', 'nombre', 'descripcion', 'es_sistema', 'activo'], include: [incluirPermisos], order: [['nombre', 'ASC']] });
  return roles.map(formatearRol);
}

export async function buscarRol(idRol, transaction = null) {
  const rol = await Rol.findByPk(idRol, { attributes: ['id_rol', 'nombre', 'descripcion', 'es_sistema', 'activo'], include: [incluirPermisos], transaction });
  return formatearRol(rol);
}

export async function crearRol(transaction, datos) {
  const rol = await Rol.create({ nombre: datos.nombre, descripcion: datos.descripcion ?? null, es_sistema: false, activo: true }, { transaction });
  return rol.id_rol;
}

export async function actualizarRol(transaction, idRol, datos) {
  const [afectados] = await Rol.update({ nombre: datos.nombre, descripcion: datos.descripcion ?? null }, { where: { id_rol: idRol }, transaction });
  return afectados;
}

export async function eliminarRol(transaction, idRol) {
  return Rol.destroy({ where: { id_rol: idRol }, transaction });
}

export const listarPermisos = () => Permiso.findAll({ attributes: ['id_permiso', 'codigo', 'modulo', 'descripcion'], order: [['modulo', 'ASC'], ['codigo', 'ASC']], raw: true });

export const buscarPermiso = (idPermiso, transaction = null) => Permiso.findByPk(idPermiso, { attributes: ['id_permiso', 'codigo', 'modulo', 'descripcion'], transaction, raw: true });

export async function crearPermiso(transaction, datos) {
  const permiso = await Permiso.create({ codigo: datos.codigo, modulo: datos.modulo, descripcion: datos.descripcion ?? null }, { transaction });
  return permiso.get({ plain: true });
}

export async function actualizarPermiso(transaction, idPermiso, datos) {
  const [afectados] = await Permiso.update({ codigo: datos.codigo, modulo: datos.modulo, descripcion: datos.descripcion ?? null }, { where: { id_permiso: idPermiso }, transaction });
  return afectados;
}

export const eliminarPermiso = (transaction, idPermiso) => Permiso.destroy({ where: { id_permiso: idPermiso }, transaction });

export const listarPermisosRol = async (idRol, transaction = null) => {
  const rol = await Rol.findByPk(idRol, { attributes: ['id_rol'], include: [incluirPermisos], transaction });
  return rol ? rol.permisos : null;
};

export const contarPermisos = (transaction, idsPermisos) => Permiso.count({ where: { id_permiso: idsPermisos }, transaction });

export async function asignarPermiso(transaction, idRol, idPermiso) {
  await RolPermiso.create({ id_rol: idRol, id_permiso: idPermiso }, { transaction });
}

export const revocarPermiso = (transaction, idRol, idPermiso) => RolPermiso.destroy({ where: { id_rol: idRol, id_permiso: idPermiso }, transaction });

export async function reemplazarPermisos(transaction, idRol, idsPermisos) {
  await RolPermiso.destroy({ where: { id_rol: idRol }, transaction });
  if (idsPermisos.length) await RolPermiso.bulkCreate(idsPermisos.map((id_permiso) => ({ id_rol: idRol, id_permiso })), { transaction });
}

export const listarSucursales = () => Sucursal.findAll({
  attributes: ['id_sucursal', 'nombre', 'codigo_establecimiento'],
  where: { activa: true },
  order: [['id_sucursal', 'ASC']],
  raw: true,
});

export async function buscarUsuario(idUsuario, transaction = null) {
  const usuario = await Usuario.findByPk(idUsuario, {
    attributes: ['id_usuario', 'username', 'id_rol', 'activo', 'deleted_at'],
    include: incluirUsuario,
    transaction,
  });
  return formatearUsuario(usuario);
}

export async function crearUsuario(transaction, { username, passwordHash, idRol }) {
  const usuario = await Usuario.create({
    username,
    password_hash: passwordHash,
    id_rol: idRol,
  }, { transaction });
  return usuario.id_usuario;
}

export async function asignarSucursales(transaction, idUsuario, sucursales) {
  await UsuarioSucursal.destroy({ where: { id_usuario: idUsuario }, transaction });
  await UsuarioSucursal.bulkCreate(
    sucursales.map((id_sucursal) => ({ id_usuario: idUsuario, id_sucursal })),
    { transaction },
  );
}

export async function actualizarUsuario(transaction, idUsuario, { username, passwordHash, idRol }) {
  const valores = { username, id_rol: idRol };
  if (passwordHash) valores.password_hash = passwordHash;
  const [afectados] = await Usuario.update(valores, { where: { id_usuario: idUsuario }, transaction });
  return afectados;
}

export async function desactivarUsuario(transaction, idUsuario) {
  const [afectados] = await Usuario.update(
    { activo: false },
    { where: { id_usuario: idUsuario, activo: true }, transaction },
  );
  return afectados;
}

export async function activarUsuario(transaction, idUsuario) {
  const [afectados] = await Usuario.update(
    { activo: true },
    { where: { id_usuario: idUsuario, activo: false }, transaction },
  );
  return afectados;
}

export async function eliminarUsuario(transaction, idUsuario) {
  // Paranoid delete: Sequelize pone deleted_at automaticamente
  const afectados = await Usuario.destroy({ where: { id_usuario: idUsuario }, transaction });
  return afectados;
}
