import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const UnidadMedida = sequelize.define('UnidadMedida', {
  id_unidad: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, codigo: { type: DataTypes.STRING(10), allowNull: false }, nombre: { type: DataTypes.STRING(50), allowNull: false },
}, { tableName: 'unidades_medida', schema: 'inventario', timestamps: false });
export const Insumo = sequelize.define('Insumo', {
  id_insumo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, nombre: { type: DataTypes.STRING(100), allowNull: false }, tipo_insumo: { type: DataTypes.STRING(15), allowNull: false }, id_unidad_base: { type: DataTypes.INTEGER, allowNull: false }, costo_promedio: { type: DataTypes.DECIMAL(12, 6), allowNull: false }, activo: { type: DataTypes.BOOLEAN, allowNull: false },
}, { tableName: 'insumos', schema: 'inventario', timestamps: false });
export const CategoriaProducto = sequelize.define('CategoriaProducto', {
  id_categoria: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, nombre: { type: DataTypes.STRING(60), allowNull: false },
}, { tableName: 'categorias_producto', schema: 'inventario', timestamps: false });
export const Producto = sequelize.define('Producto', {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, id_categoria: DataTypes.INTEGER, nombre: { type: DataTypes.STRING(120), allowNull: false }, codigo_barra: DataTypes.STRING(50), precio_venta: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, es_elaborado: { type: DataTypes.BOOLEAN, allowNull: false }, id_insumo_reventa: DataTypes.INTEGER, activo: { type: DataTypes.BOOLEAN, allowNull: false },
}, { tableName: 'productos', schema: 'inventario', timestamps: false });
export const Receta = sequelize.define('Receta', {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true }, id_insumo: { type: DataTypes.INTEGER, primaryKey: true }, cantidad_requerida: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
}, { tableName: 'recetas', schema: 'inventario', timestamps: false });
