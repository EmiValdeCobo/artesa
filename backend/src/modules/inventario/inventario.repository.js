import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';
import { CategoriaProducto, Insumo, Producto, Receta, UnidadMedida } from '../../models/index.js';

const select = (sql, bind = [], transaction = null) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });
const plain = (model) => model?.get({ plain: true }) ?? null;
export const listarUnidades = () => select(`SELECT id_unidad, codigo, nombre, factor_conversion, activo, deleted_at, modificado_en FROM inventario.unidades_medida WHERE deleted_at IS NULL ORDER BY nombre ASC`);
export const buscarUnidad = (id, transaction) => select(`SELECT id_unidad, codigo, nombre, factor_conversion, activo, deleted_at, modificado_en FROM inventario.unidades_medida WHERE id_unidad = $1`, [id], transaction).then((xs) => xs[0] ?? null);
export const crearUnidad = (data, transaction) => UnidadMedida.create({ codigo: data.codigo, nombre: data.nombre, factor_conversion: data.factor_conversion ?? data.factorConversion ?? '1.0000', activo: data.activo ?? true }, { transaction }).then(plain);
export const actualizarUnidad = async (id, data, transaction) => { const row = await UnidadMedida.findByPk(id, { transaction }); if (!row) return null; const values = {}; if (data.codigo !== undefined) values.codigo = data.codigo; if (data.nombre !== undefined) values.nombre = data.nombre; if (data.factor_conversion !== undefined || data.factorConversion !== undefined) values.factor_conversion = data.factor_conversion ?? data.factorConversion; if (data.activo !== undefined) values.activo = data.activo; await row.update(values, { transaction }); return plain(row); };
export const desactivarUnidad = async (id, transaction) => { const row = await UnidadMedida.findByPk(id, { transaction }); if (!row) return false; await row.update({ activo: false }, { transaction }); return true; };
export const eliminarUnidad = async (id, transaction) => { const row = await UnidadMedida.findByPk(id, { transaction }); if (!row) return false; await row.update({ activo: false, deleted_at: new Date() }, { transaction }); return true; };
export const listarInsumos = (verCostos = false) => select(`SELECT i.id_insumo, i.nombre, i.tipo_insumo, i.id_unidad_base, ${verCostos ? 'i.costo_promedio' : 'NULL::numeric AS costo_promedio'}, i.activo, u.codigo AS unidad_codigo, u.codigo AS codigo_unidad, u.nombre AS unidad FROM inventario.insumos i JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base ORDER BY i.nombre`);
export const buscarInsumo = (id, transaction) => Insumo.findByPk(id, { transaction }).then(plain);
export const crearInsumo = (data, transaction) => Insumo.create({ nombre: data.nombre, tipo_insumo: data.tipoInsumo, id_unidad_base: data.idUnidadBase, costo_promedio: data.costoPromedio, activo: data.activo }, { transaction }).then(plain);
export const actualizarInsumo = async (id, data, transaction) => { const row = await Insumo.findByPk(id, { transaction }); if (!row) return null; const values = { nombre: data.nombre, tipo_insumo: data.tipoInsumo, id_unidad_base: data.idUnidadBase, activo: data.activo }; if (data.costoPromedio !== undefined) values.costo_promedio = data.costoPromedio; await row.update(values, { transaction }); return plain(row); };
export const desactivarInsumo = async (id, transaction) => { const row = await Insumo.findByPk(id, { transaction }); if (!row) return false; await row.update({ activo: false }, { transaction }); return true; };
export const listarCategorias = () => CategoriaProducto.findAll({ order: [['nombre', 'ASC']] }).then((xs) => xs.map(plain));
export const listarProductos = () => select(`SELECT p.*, c.nombre AS categoria, i.nombre AS insumo_reventa, CASE WHEN p.es_elaborado THEN (SELECT COUNT(*)::int FROM inventario.recetas r WHERE r.id_producto = p.id_producto) ELSE 0::int END AS n_ingredientes FROM inventario.productos p LEFT JOIN inventario.categorias_producto c USING (id_categoria) LEFT JOIN inventario.insumos i ON i.id_insumo = p.id_insumo_reventa ORDER BY p.nombre`);
export const buscarProducto = (id, transaction) => Producto.findByPk(id, { transaction }).then(plain);
export const escribirProducto = async (data, transaction, id = null) => {
  const values = { id_categoria: data.idCategoria ?? null, nombre: data.nombre, codigo_barra: data.codigoBarra ?? null, precio_venta: data.precioVenta, es_elaborado: data.esElaborado, id_insumo_reventa: data.esElaborado ? null : data.idInsumoReventa, activo: data.activo };
  if (id) { const row = await Producto.findByPk(id, { transaction }); if (!row) return null; await row.update(values, { transaction }); return plain(row); }
  return Producto.create(values, { transaction }).then(plain);
};
export const desactivarProducto = async (id, transaction) => { const row = await Producto.findByPk(id, { transaction }); if (!row) return false; await row.update({ activo: false }, { transaction }); return true; };
export const recetaActual = (id, transaction) => select(`SELECT r.id_producto, r.id_insumo, i.nombre AS insumo, i.nombre AS nombre_insumo, r.cantidad_requerida, u.codigo AS unidad, u.codigo AS codigo_unidad, i.costo_promedio FROM inventario.recetas r JOIN inventario.insumos i USING (id_insumo) JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base WHERE r.id_producto = $1 ORDER BY i.nombre`, [id], transaction);
export const guardarReceta = async (id, componentes, transaction) => {
  await Receta.destroy({ where: { id_producto: id }, transaction });
  await Receta.bulkCreate(componentes.map((x) => ({ id_producto: id, id_insumo: x.idInsumo, cantidad_requerida: x.cantidadRequerida })), { transaction });
};
export const stockSucursal = (idSucursal = null) => select(`SELECT ss.id_sucursal, s.nombre AS sucursal, ss.id_insumo, i.nombre AS insumo, u.codigo AS unidad, ss.stock_actual, ss.stock_minimo FROM inventario.stock_sucursal ss JOIN empresa.sucursales s USING (id_sucursal) JOIN inventario.insumos i USING (id_insumo) JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base WHERE ($1::int IS NULL OR ss.id_sucursal = $1) ORDER BY s.nombre, i.nombre`, [idSucursal]);
export const alertas = (idSucursal = null) => select(`SELECT ss.id_sucursal, a.* FROM reportes.vw_alertas_stock a JOIN empresa.sucursales s ON s.nombre = a.sucursal JOIN inventario.insumos i ON i.nombre = a.insumo JOIN inventario.stock_sucursal ss ON ss.id_sucursal = s.id_sucursal AND ss.id_insumo = i.id_insumo WHERE ($1::int IS NULL OR ss.id_sucursal = $1) ORDER BY a.sucursal, a.insumo`, [idSucursal]);
const SQL_MOVIMIENTOS_SIN_COSTO = `
  SELECT m.id_movimiento, m.id_sucursal, m.id_insumo, i.nombre AS insumo,
         s.nombre AS sucursal, m.tipo, m.cantidad, m.stock_resultante,
         m.referencia_tipo, m.referencia_id, m.motivo, m.id_usuario,
         u.username AS usuario, m.creado_en
  FROM inventario.movimientos_inventario m
  JOIN inventario.insumos i USING (id_insumo)
  JOIN empresa.sucursales s USING (id_sucursal)
  LEFT JOIN seguridad.usuarios u USING (id_usuario)
  WHERE EXISTS (
    SELECT 1 FROM seguridad.usuario_sucursal us
    WHERE us.id_usuario = $1::uuid AND us.id_sucursal = m.id_sucursal
  )
    AND ($2::int IS NULL OR m.id_sucursal = $2::int)
    AND ($3::int IS NULL OR m.id_insumo = $3::int)
  ORDER BY m.creado_en DESC, m.id_movimiento DESC
  LIMIT 500`;

const SQL_MOVIMIENTOS_CON_COSTO = `
  SELECT m.id_movimiento, m.id_sucursal, m.id_insumo, i.nombre AS insumo,
         s.nombre AS sucursal, m.tipo, m.cantidad, m.costo_unitario,
         m.stock_resultante, m.referencia_tipo, m.referencia_id, m.motivo,
         m.id_usuario, u.username AS usuario, m.creado_en
  FROM inventario.movimientos_inventario m
  JOIN inventario.insumos i USING (id_insumo)
  JOIN empresa.sucursales s USING (id_sucursal)
  LEFT JOIN seguridad.usuarios u USING (id_usuario)
  WHERE EXISTS (
    SELECT 1 FROM seguridad.usuario_sucursal us
    WHERE us.id_usuario = $1::uuid AND us.id_sucursal = m.id_sucursal
  )
    AND ($2::int IS NULL OR m.id_sucursal = $2::int)
    AND ($3::int IS NULL OR m.id_insumo = $3::int)
  ORDER BY m.creado_en DESC, m.id_movimiento DESC
  LIMIT 500`;

export const movimientos = (idUsuario, idSucursal = null, idInsumo = null, verCostos = false) => select(
  verCostos ? SQL_MOVIMIENTOS_CON_COSTO : SQL_MOVIMIENTOS_SIN_COSTO,
  [idUsuario, idSucursal, idInsumo],
);
export const sucursalAsignada = async (idUsuario, idSucursal, transaction = null) => (await select('SELECT 1 FROM seguridad.usuario_sucursal WHERE id_usuario = $1::uuid AND id_sucursal = $2', [idUsuario, idSucursal], transaction)).length > 0;
export const sucursalesAsignadas = (idUsuario) => select('SELECT id_sucursal FROM seguridad.usuario_sucursal WHERE id_usuario = $1::uuid', [idUsuario]);
export const usuarioTienePermiso = async (idUsuario, codigo) => (await select('SELECT seguridad.fn_tiene_permiso($1::uuid,$2) AS tiene', [idUsuario, codigo]))[0]?.tiene === true;
export const configurarMinimo = (idSucursal, idInsumo, stockMinimo, transaction) => select(`INSERT INTO inventario.stock_sucursal(id_sucursal,id_insumo,stock_minimo) VALUES ($1,$2,$3) ON CONFLICT (id_sucursal,id_insumo) DO UPDATE SET stock_minimo=EXCLUDED.stock_minimo RETURNING *`, [idSucursal, idInsumo, stockMinimo], transaction).then((x) => x[0]);
export const moverStock = (transaction, { idSucursal, idInsumo, cantidad, tipo, idUsuario, motivo }) => select('SELECT inventario.fn_mover_stock($1,$2,$3,$4,NULL,NULL,$5,NULL,$6) AS stock_actual', [idSucursal, idInsumo, cantidad, tipo, idUsuario, motivo], transaction).then((x) => x[0]);
export const registrarMerma = (transaction, { idSucursal, idInsumo, cantidad, motivo, idUsuario }) => select('SELECT inventario.fn_registrar_merma($1,$2,$3,$4,$5)', [idSucursal, idInsumo, cantidad, motivo, idUsuario], transaction);
