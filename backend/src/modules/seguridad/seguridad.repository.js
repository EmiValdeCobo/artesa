import { Rol, Sucursal, Usuario, UsuarioSucursal } from '../../models/index.js';

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
  attributes: ['id_rol', 'nombre', 'descripcion'],
  where: { activo: true },
  order: [['nombre', 'ASC']],
  raw: true,
});

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
