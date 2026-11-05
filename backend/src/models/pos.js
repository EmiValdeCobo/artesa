import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Cliente = sequelize.define('Cliente', { id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, nombre_razon_social: { type: DataTypes.STRING(150), allowNull: false }, email: DataTypes.STRING(120), username: DataTypes.STRING(80), password_hash: DataTypes.STRING(255), activo: DataTypes.BOOLEAN }, { tableName: 'clientes', schema: 'pos', timestamps: false });

export const Caja = sequelize.define('Caja', {
  id_caja: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_sucursal: { type: DataTypes.INTEGER, allowNull: false },
  codigo_punto_venta: { type: DataTypes.STRING(4), allowNull: false },
  nombre_identificador: { type: DataTypes.STRING(50), allowNull: false },
}, { tableName: 'cajas', schema: 'pos', timestamps: false });

// DECIMAL llega como string desde pg: el dinero nunca se convierte a float.
export const TurnoCaja = sequelize.define('TurnoCaja', {
  id_turno: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  id_caja: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: { type: DataTypes.UUID, allowNull: false },
  monto_apertura: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  abierto_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  cerrado_en: DataTypes.DATE,
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ABIERTO' },
}, { tableName: 'turnos_caja', schema: 'pos', timestamps: false });

export const MovimientoCaja = sequelize.define('MovimientoCaja', {
  id_movimiento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_turno: { type: DataTypes.UUID, allowNull: false },
  tipo: { type: DataTypes.STRING(10), allowNull: false },
  concepto: { type: DataTypes.STRING(150), allowNull: false },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  id_usuario: { type: DataTypes.UUID, allowNull: false },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'movimientos_caja', schema: 'pos', timestamps: false });
