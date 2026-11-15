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

// ---------- Cierre y cuadre ----------
// Llama la función SQL (no se reimplementa el cuadre en JS). Su jsonb de retorno se ignora a propósito:
// los montos se leen después de la vista como NUMERIC (string) para no pasar por float.
export const cerrarTurno = (transaction, { idTurno, efectivo, tarjeta, digital }) => consultar(
  'SELECT pos.fn_cerrar_turno($1::uuid, $2::numeric, $3::numeric, $4::numeric)',
  [idTurno, efectivo, tarjeta, digital],
  transaction,
);

// Tolerancia de descuadre: parámetro `tolerancia_cuadre` (empresa.parametros, en dólares). Si no existe se usa
// el valor por defecto; si existe pero no es un monto válido se avisa, para no cerrar cajas con un límite roto.
export const TOLERANCIA_CUADRE_DEFECTO = '1.00';
export async function obtenerToleranciaCuadre(transaction) {
  const [fila] = await consultar("SELECT empresa.fn_param('tolerancia_cuadre') AS valor", [], transaction);
  return fila?.valor ?? TOLERANCIA_CUADRE_DEFECTO;
}

// Diferencia (contado - esperado) por método usando lo esperado EN VIVO de la vista, y si |dif| supera el límite.
// Todo en NUMERIC dentro de la BD: nada pasa por float.
export async function calcularDescuadre(transaction, { idTurno, efectivo, tarjeta, digital, tolerancia }) {
  const [fila] = await consultar(
    `SELECT ($2::numeric - v.esperado_efectivo)::text AS dif_efectivo, ABS($2::numeric - v.esperado_efectivo) > $5::numeric AS excede_efectivo,
            ($3::numeric - v.esperado_tarjeta)::text  AS dif_tarjeta,  ABS($3::numeric - v.esperado_tarjeta)  > $5::numeric AS excede_tarjeta,
            ($4::numeric - v.esperado_digital)::text  AS dif_digital,  ABS($4::numeric - v.esperado_digital)  > $5::numeric AS excede_digital
     FROM reportes.vw_cuadre_turno v WHERE v.id_turno = $1::uuid`,
    [idTurno, efectivo, tarjeta, digital, tolerancia],
    transaction,
  );
  return fila ?? null;
}

// Turno + lo esperado (frozen al cerrar, en vivo mientras está abierto) + lo contado + diferencias.
const SELECT_CUADRE = `
  SELECT t.id_turno, t.id_caja, c.nombre_identificador AS caja, c.id_sucursal, s.nombre AS sucursal,
         t.id_usuario, u.username AS cajero, t.estado, t.abierto_en, t.cerrado_en, t.monto_apertura,
         v.ventas_efectivo, v.ventas_tarjeta, v.ventas_digital, v.ingresos_caja, v.egresos_caja,
         COALESCE(t.esperado_efectivo, v.esperado_efectivo) AS esperado_efectivo,
         COALESCE(t.esperado_tarjeta, v.esperado_tarjeta) AS esperado_tarjeta,
         COALESCE(t.esperado_digital, v.esperado_digital) AS esperado_digital,
         t.monto_cierre_efectivo AS contado_efectivo, t.monto_cierre_pos_tarjeta AS contado_tarjeta,
         t.monto_cierre_digital AS contado_digital,
         t.dif_efectivo, t.dif_tarjeta, t.dif_digital
  FROM pos.turnos_caja t
  JOIN pos.cajas c ON c.id_caja = t.id_caja
  JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
  JOIN seguridad.usuarios u ON u.id_usuario = t.id_usuario
  JOIN reportes.vw_cuadre_turno v ON v.id_turno = t.id_turno`;

export async function buscarCuadre(idTurno, transaction) {
  const [fila] = await consultar(`${SELECT_CUADRE} WHERE t.id_turno = $1::uuid`, [idTurno], transaction);
  return fila ?? null;
}

// Cuadres de las sucursales del usuario. Sin fechas: últimos 30 días (por fecha de apertura).
export const listarCuadres = (idUsuario, { estado, desde, hasta, idSucursal }) => consultar(
  `${SELECT_CUADRE}
   WHERE c.id_sucursal IN (SELECT id_sucursal FROM seguridad.usuario_sucursal WHERE id_usuario = $1::uuid)
     AND ($2::text IS NULL OR t.estado = $2::text)
     AND ($5::int IS NULL OR c.id_sucursal = $5::int)
     AND t.abierto_en::date BETWEEN COALESCE($3::date, CURRENT_DATE - 29) AND COALESCE($4::date, CURRENT_DATE)
   ORDER BY t.abierto_en DESC
   LIMIT 200`,
  [idUsuario, estado ?? null, desde ?? null, hasta ?? null, idSucursal ?? null],
);
