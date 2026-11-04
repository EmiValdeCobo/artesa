import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Cliente = sequelize.define('Cliente', { id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, nombre_razon_social: { type: DataTypes.STRING(150), allowNull: false }, email: DataTypes.STRING(120), username: DataTypes.STRING(80), password_hash: DataTypes.STRING(255), activo: DataTypes.BOOLEAN }, { tableName: 'clientes', schema: 'pos', timestamps: false });
