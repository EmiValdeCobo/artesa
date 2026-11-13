import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Puesto = sequelize.define(
  'Puesto',
  {
    id_puesto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false },
    salario_base: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'puestos', schema: 'rrhh', timestamps: false },
);

export const Empleado = sequelize.define(
  'Empleado',
  {
    id_empleado: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    id_sucursal: { type: DataTypes.INTEGER, allowNull: false },
    id_puesto: { type: DataTypes.INTEGER, allowNull: false },
    id_usuario: { type: DataTypes.UUID, allowNull: true },
    nombres: { type: DataTypes.STRING(100), allowNull: false },
    apellidos: { type: DataTypes.STRING(100), allowNull: false },
    dui: { type: DataTypes.STRING(10), allowNull: false },
    nit: DataTypes.STRING(17),
    fecha_ingreso: { type: DataTypes.DATEONLY, allowNull: false },
    salario_nominal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'empleados', schema: 'rrhh', timestamps: false },
);
