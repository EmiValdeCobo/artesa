import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';
import { MovimientoCaja, TurnoCaja, UsuarioSucursal } from '../../models/index.js';

// Lectura parametrizada ($1…); acepta una transacción opcional.
const consultar = (sql, bind, transaction = null) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });

// ---------- Cajas ----------
export const listarCajasDeUsuario = (idUsuario) => consultar(
  `SELECT c.id_caja, c.id_sucursal, s.nombre AS sucursal, c.codigo_punto_venta, c.nombre_identificador,
          EXISTS (SELECT 1 FROM pos.turnos_caja t WHERE t.id_caja = c.id_caja AND t.estado = 'ABIERTO') AS ocupada
   FROM pos.cajas c
   JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
   JOIN seguridad.usuario_sucursal us ON us.id_sucursal = c.id_sucursal
   WHERE us.id_usuario = $1::uuid AND s.activa
   ORDER BY s.nombre, c.nombre_identificador`,
  [idUsuario],
);

export async function buscarCaja(idCaja, transaction) {
  const [caja] = await consultar(
    `SELECT c.id_caja, c.id_sucursal, s.activa AS sucursal_activa
     FROM pos.cajas c JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
     WHERE c.id_caja = $1`,
    [idCaja],
    transaction,
  );
  return caja ?? null;
}

export const usuarioTieneSucursal = async (idUsuario, idSucursal, transaction) => (
  (await UsuarioSucursal.count({ where: { id_usuario: idUsuario, id_sucursal: idSucursal }, transaction })) > 0
);

// ---------- Turnos ----------
// filtro: { id_caja } o { id_usuario }. Devuelve el turno ABIERTO o null.
export async function buscarTurnoAbierto(filtro, transaction) {
  const turno = await TurnoCaja.findOne({ where: { ...filtro, estado: 'ABIERTO' }, transaction });
  return turno ? turno.get({ plain: true }) : null;
}

export async function crearTurno(transaction, { idCaja, idUsuario, montoApertura }) {
  const turno = await TurnoCaja.create(
    { id_caja: idCaja, id_usuario: idUsuario, monto_apertura: montoApertura },
    { transaction },
  );
  return turno.id_turno;
}

// Turno con su caja, sucursal y el resumen de efectivo calculado por la vista de cuadre.
const SELECT_TURNO = `
  SELECT t.id_turno, t.id_caja, c.nombre_identificador AS caja, c.id_sucursal, s.nombre AS sucursal,
         t.id_usuario, t.monto_apertura, t.abierto_en, t.estado,
         v.ventas_efectivo, v.ventas_tarjeta, v.ventas_digital,
         v.ingresos_caja, v.egresos_caja, v.esperado_efectivo
  FROM pos.turnos_caja t
  JOIN pos.cajas c ON c.id_caja = t.id_caja
  JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
  JOIN reportes.vw_cuadre_turno v ON v.id_turno = t.id_turno`;

export async function buscarTurno(idTurno, transaction) {
  const [turno] = await consultar(`${SELECT_TURNO} WHERE t.id_turno = $1::uuid`, [idTurno], transaction);
  return turno ?? null;
}

export async function buscarTurnoActual(idUsuario) {
  const [turno] = await consultar(`${SELECT_TURNO} WHERE t.id_usuario = $1::uuid AND t.estado = 'ABIERTO'`, [idUsuario]);
  return turno ?? null;
}

// Bloquea la fila del turno hasta terminar la transacción: serializa movimientos concurrentes.
export async function bloquearTurno(transaction, idTurno) {
  const [turno] = await consultar(
    'SELECT id_turno, id_usuario, estado FROM pos.turnos_caja WHERE id_turno = $1::uuid FOR UPDATE',
    [idTurno],
    transaction,
  );
  return turno ?? null;
}

// ---------- Movimientos ----------
// La comparación se hace en SQL (NUMERIC) para no usar float en dinero.
export async function efectivoEnCaja(transaction, idTurno, monto) {
  const [fila] = await consultar(
    'SELECT esperado_efectivo, esperado_efectivo >= $2::numeric AS alcanza FROM reportes.vw_cuadre_turno WHERE id_turno = $1::uuid',
    [idTurno, monto],
    transaction,
  );
  return fila;
}

export async function crearMovimiento(transaction, { idTurno, tipo, concepto, monto, idUsuario }) {
  const movimiento = await MovimientoCaja.create(
    { id_turno: idTurno, tipo, concepto, monto, id_usuario: idUsuario },
    { transaction },
  );
  return movimiento.get({ plain: true });
}

export const listarMovimientos = (idTurno) => consultar(
  `SELECT m.id_movimiento, m.id_turno, m.tipo, m.concepto, m.monto, m.creado_en, u.username AS usuario
   FROM pos.movimientos_caja m JOIN seguridad.usuarios u ON u.id_usuario = m.id_usuario
   WHERE m.id_turno = $1::uuid
   ORDER BY m.creado_en DESC, m.id_movimiento DESC`,
  [idTurno],
);

export async function usuarioTienePermiso(idUsuario, codigo) {
  const [fila] = await consultar('SELECT seguridad.fn_tiene_permiso($1::uuid, $2) AS tiene', [idUsuario, codigo]);
  return fila.tiene === true;
}
