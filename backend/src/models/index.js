import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Rol = sequelize.define('Rol', {
  id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  descripcion: DataTypes.TEXT,
  activo: { type: DataTypes.BOOLEAN, allowNull: false },
}, { tableName: 'roles', schema: 'seguridad', timestamps: false });

export const Usuario = sequelize.define('Usuario', {
  id_usuario: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  id_rol: { type: DataTypes.INTEGER, allowNull: false },
  username: { type: DataTypes.STRING(50), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false },
  ultimo_login: DataTypes.DATE,
}, { tableName: 'usuarios', schema: 'seguridad', timestamps: false });

export const Sucursal = sequelize.define('Sucursal', {
  id_sucursal: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo_establecimiento: { type: DataTypes.STRING(4), allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  activa: { type: DataTypes.BOOLEAN, allowNull: false },
}, { tableName: 'sucursales', schema: 'empresa', timestamps: false });

export const UsuarioSucursal = sequelize.define('UsuarioSucursal', {
  id_usuario: { type: DataTypes.UUID, primaryKey: true },
  id_sucursal: { type: DataTypes.INTEGER, primaryKey: true },
}, { tableName: 'usuario_sucursal', schema: 'seguridad', timestamps: false });

export const Cliente = sequelize.define('Cliente', {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_razon_social: { type: DataTypes.STRING(150), allowNull: false },
  email: DataTypes.STRING(120),
  username: DataTypes.STRING(80),
  password_hash: DataTypes.STRING(255),
  activo: DataTypes.BOOLEAN,
}, { tableName: 'clientes', schema: 'pos', timestamps: false });

Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'id_rol', as: 'usuarios' });
Usuario.belongsToMany(Sucursal, {
  through: UsuarioSucursal,
  foreignKey: 'id_usuario',
  otherKey: 'id_sucursal',
  as: 'sucursales',
});
Sucursal.belongsToMany(Usuario, {
  through: UsuarioSucursal,
  foreignKey: 'id_sucursal',
  otherKey: 'id_usuario',
  as: 'usuarios',
});
