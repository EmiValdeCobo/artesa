import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Sucursal = sequelize.define('Sucursal', { id_sucursal: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, codigo_establecimiento: { type: DataTypes.STRING(4), allowNull: false }, nombre: { type: DataTypes.STRING(100), allowNull: false }, activa: { type: DataTypes.BOOLEAN, allowNull: false } }, { tableName: 'sucursales', schema: 'empresa', timestamps: false });
