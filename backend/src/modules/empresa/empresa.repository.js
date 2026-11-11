import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const select = (sql, bind = [], transaction) => sequelize.query(sql, { bind, type: QueryTypes.SELECT, transaction });
const write = (sql, bind, transaction) => sequelize.query(sql, { bind, type: QueryTypes.SELECT, transaction });
export const listarSucursales = () => select('SELECT id_sucursal, codigo_establecimiento, nombre, direccion, departamento, telefono, activa FROM empresa.sucursales ORDER BY id_sucursal');
export const crearSucursal = (d, t) => write('INSERT INTO empresa.sucursales(codigo_establecimiento,nombre,direccion,departamento,telefono,activa) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [d.codigoEstablecimiento,d.nombre,d.direccion ?? null,d.departamento ?? null,d.telefono ?? null,d.activa], t).then((x) => x[0]);
export const actualizarSucursal = (id, d, t) => write('UPDATE empresa.sucursales SET codigo_establecimiento=$2,nombre=$3,direccion=$4,departamento=$5,telefono=$6,activa=$7 WHERE id_sucursal=$1 RETURNING *', [id,d.codigoEstablecimiento,d.nombre,d.direccion ?? null,d.departamento ?? null,d.telefono ?? null,d.activa], t).then((x) => x[0]);
export const cambiarEstadoSucursal = (id, activa, t) => write('UPDATE empresa.sucursales SET activa=$2 WHERE id_sucursal=$1 RETURNING *', [id,activa], t).then((x) => x[0]);
export const listarParametros = () => select('SELECT clave, valor, descripcion FROM empresa.parametros ORDER BY clave');
export const actualizarParametro = (clave, valor, t) => write('UPDATE empresa.parametros SET valor=$2 WHERE clave=$1 RETURNING clave,valor,descripcion', [clave,valor], t).then((x) => x[0]);
