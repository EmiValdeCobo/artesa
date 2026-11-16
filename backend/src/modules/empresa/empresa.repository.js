import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const select = (sql, bind = [], transaction) => sequelize.query(sql, { bind, type: QueryTypes.SELECT, transaction });
const write = (sql, bind, transaction) => sequelize.query(sql, { bind, type: QueryTypes.SELECT, transaction });
export const listarSucursales = () => select('SELECT id_sucursal, codigo_establecimiento, nombre, direccion, departamento, telefono, activa FROM empresa.sucursales ORDER BY id_sucursal');
export const buscarSucursal = (id, t) => select('SELECT id_sucursal, codigo_establecimiento, nombre, activa FROM empresa.sucursales WHERE id_sucursal=$1 FOR UPDATE', [id], t).then((x) => x[0] ?? null);
export const crearSucursal = (d, t) => write('INSERT INTO empresa.sucursales(codigo_establecimiento,nombre,direccion,departamento,telefono,activa) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [d.codigoEstablecimiento,d.nombre,d.direccion ?? null,d.departamento ?? null,d.telefono ?? null,d.activa], t).then((x) => x[0]);
export const crearCajaPorDefecto = (idSucursal, t) => write('INSERT INTO pos.cajas(id_sucursal, codigo_punto_venta, nombre_identificador) VALUES($1, $2, $3) RETURNING *', [idSucursal, 'P001', 'Caja Principal 01'], t).then((x) => x[0]);
export const asignarSucursalAUsuario = (idUsuario, idSucursal, t) => write('INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal) VALUES($1, $2) ON CONFLICT DO NOTHING RETURNING *', [idUsuario, idSucursal], t);
// El rol ADMIN tiene gestión global: toda sucursal nueva queda asignada a sus cuentas activas.
export const asignarAdministradores = (idSucursal, t) => write(`INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
  SELECT u.id_usuario, $1 FROM seguridad.usuarios u JOIN seguridad.roles r ON r.id_rol = u.id_rol
   WHERE r.nombre = 'ADMIN' AND u.activo AND u.deleted_at IS NULL
  ON CONFLICT DO NOTHING RETURNING id_usuario`, [idSucursal], t);
export const actualizarSucursal = (id, d, t) => write('UPDATE empresa.sucursales SET codigo_establecimiento=$2,nombre=$3,direccion=$4,departamento=$5,telefono=$6,activa=$7 WHERE id_sucursal=$1 RETURNING *', [id,d.codigoEstablecimiento,d.nombre,d.direccion ?? null,d.departamento ?? null,d.telefono ?? null,d.activa], t).then((x) => x[0]);
export const cambiarEstadoSucursal = (id, activa, t) => write('UPDATE empresa.sucursales SET activa=$2 WHERE id_sucursal=$1 RETURNING *', [id,activa], t).then((x) => x[0]);
export const listarParametros = () => select('SELECT clave, valor, descripcion FROM empresa.parametros ORDER BY clave');
export const actualizarParametro = (clave, valor, t) => write('UPDATE empresa.parametros SET valor=$2 WHERE clave=$1 RETURNING clave,valor,descripcion', [clave,valor], t).then((x) => x[0]);

// ── Apertura de sucursal ─────────────────────────────────────────────────────
export const usuariosDeSucursal = (id, t) => select(`SELECT u.username, r.nombre AS rol FROM seguridad.usuario_sucursal us
  JOIN seguridad.usuarios u ON u.id_usuario = us.id_usuario JOIN seguridad.roles r ON r.id_rol = u.id_rol
  WHERE us.id_sucursal = $1 AND u.activo AND u.deleted_at IS NULL ORDER BY (r.nombre = 'ADMIN') DESC, u.username`, [id], t);
export const cajasDeSucursal = (id, t) => select('SELECT id_caja, codigo_punto_venta, nombre_identificador FROM pos.cajas WHERE id_sucursal = $1 ORDER BY codigo_punto_venta', [id], t);
// Insumos que exige el catálogo activo (recetas + reventa). El sugerido es el mayor mínimo vigente en otras sucursales activas.
export const insumosParaOperar = (id, t) => select(`WITH requeridos AS (
    SELECT r.id_insumo FROM inventario.recetas r JOIN inventario.productos p USING (id_producto) WHERE p.activo AND p.deleted_at IS NULL
    UNION
    SELECT p.id_insumo_reventa FROM inventario.productos p WHERE p.activo AND p.deleted_at IS NULL AND p.id_insumo_reventa IS NOT NULL
  )
  SELECT i.id_insumo, i.nombre AS insumo, i.tipo_insumo, u.codigo AS unidad,
         COALESCE(ss.stock_actual, 0) AS stock_actual, COALESCE(ss.stock_minimo, 0) AS stock_minimo,
         COALESCE((SELECT MAX(o.stock_minimo) FROM inventario.stock_sucursal o JOIN empresa.sucursales so ON so.id_sucursal = o.id_sucursal
                    WHERE o.id_insumo = i.id_insumo AND o.id_sucursal <> $1 AND so.activa), 0) AS stock_minimo_sugerido,
         (COALESCE(ss.stock_minimo, 0) > 0 AND COALESCE(ss.stock_actual, 0) >= ss.stock_minimo) AS cubierto
    FROM requeridos q JOIN inventario.insumos i ON i.id_insumo = q.id_insumo
    JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base
    LEFT JOIN inventario.stock_sucursal ss ON ss.id_sucursal = $1 AND ss.id_insumo = i.id_insumo
   WHERE i.activo AND i.deleted_at IS NULL
   ORDER BY i.tipo_insumo, i.nombre`, [id], t);
export const configurarMinimo = (idSucursal, idInsumo, stockMinimo, t) => write(`INSERT INTO inventario.stock_sucursal(id_sucursal,id_insumo,stock_minimo) VALUES ($1,$2,$3)
  ON CONFLICT (id_sucursal,id_insumo) DO UPDATE SET stock_minimo=EXCLUDED.stock_minimo RETURNING *`, [idSucursal, idInsumo, stockMinimo], t);
export const cargarStockInicial = (idSucursal, idInsumo, cantidad, idUsuario, t) => write("SELECT inventario.fn_mover_stock($1,$2,$3,'INVENTARIO_INICIAL',NULL,NULL,$4,NULL,'Apertura de sucursal') AS stock_actual", [idSucursal, idInsumo, cantidad, idUsuario], t);
