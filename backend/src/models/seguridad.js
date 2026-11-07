import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Rol = sequelize.define('Rol', {
  id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  descripcion: DataTypes.TEXT,
  es_sistema: { type: DataTypes.BOOLEAN, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false },
  deleted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'roles', schema: 'seguridad', timestamps: true, createdAt: 'creado_en', updatedAt: 'modificado_en', paranoid: true, deletedAt: 'deleted_at' });

export const Permiso = sequelize.define('Permiso', {
  id_permiso: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(80), allowNull: false },
  modulo: { type: DataTypes.STRING(50), allowNull: false },
  descripcion: DataTypes.TEXT,
}, { tableName: 'permisos', schema: 'seguridad', timestamps: false });

export const RolPermiso = sequelize.define('RolPermiso', {
  id_rol: { type: DataTypes.INTEGER, primaryKey: true },
  id_permiso: { type: DataTypes.INTEGER, primaryKey: true },
}, { tableName: 'roles_permisos', schema: 'seguridad', timestamps: false });
export const Usuario = sequelize.define('Usuario', { id_usuario: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 }, id_rol: { type: DataTypes.INTEGER, allowNull: false }, username: { type: DataTypes.STRING(50), allowNull: false }, password_hash: { type: DataTypes.STRING(255), allowNull: false }, activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, ultimo_login: DataTypes.DATE, deleted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null } }, { tableName: 'usuarios', schema: 'seguridad', timestamps: true, createdAt: 'creado_en', updatedAt: 'modificado_en', paranoid: true, deletedAt: 'deleted_at' });
export const UsuarioSucursal = sequelize.define('UsuarioSucursal', { id_usuario: { type: DataTypes.UUID, primaryKey: true }, id_sucursal: { type: DataTypes.INTEGER, primaryKey: true } }, { tableName: 'usuario_sucursal', schema: 'seguridad', timestamps: false });
