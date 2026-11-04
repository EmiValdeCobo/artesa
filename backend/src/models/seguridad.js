import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Rol = sequelize.define('Rol', { id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, nombre: { type: DataTypes.STRING(50), allowNull: false }, descripcion: DataTypes.TEXT, activo: { type: DataTypes.BOOLEAN, allowNull: false } }, { tableName: 'roles', schema: 'seguridad', timestamps: false });
export const Usuario = sequelize.define('Usuario', { id_usuario: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 }, id_rol: { type: DataTypes.INTEGER, allowNull: false }, username: { type: DataTypes.STRING(50), allowNull: false }, password_hash: { type: DataTypes.STRING(255), allowNull: false }, activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, ultimo_login: DataTypes.DATE }, { tableName: 'usuarios', schema: 'seguridad', timestamps: false });
export const UsuarioSucursal = sequelize.define('UsuarioSucursal', { id_usuario: { type: DataTypes.UUID, primaryKey: true }, id_sucursal: { type: DataTypes.INTEGER, primaryKey: true } }, { tableName: 'usuario_sucursal', schema: 'seguridad', timestamps: false });
