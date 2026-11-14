import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const select = (sql, bind, transaction) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });
export const sucursalActiva = (id, t) => select('SELECT 1 FROM empresa.sucursales WHERE id_sucursal=$1 AND activa', [id], t).then((x) => x.length > 0);
export const empleadosActivos = (sucursal, ids, t) => select(
  'SELECT id_empleado FROM rrhh.empleados WHERE id_sucursal=$1 AND activo AND id_empleado=ANY($2::uuid[])', [sucursal, ids], t,
);
export async function crear({ idSucursal, inicio, fin, userId, ajustes }, t) {
  const [planilla] = await select(`INSERT INTO rrhh.planillas(id_sucursal,periodo_inicio,periodo_fin,tipo_periodo,id_usuario)
    VALUES($1,$2,$3,'MENSUAL',$4) RETURNING id_planilla`, [idSucursal, inicio, fin, userId], t);
  for (const a of ajustes) await select(`INSERT INTO rrhh.planilla_ajustes(id_planilla,id_empleado,bonificaciones,otros_descuentos,detalle)
    VALUES($1,$2,$3,$4,$5::jsonb)`, [planilla.id_planilla, a.idEmpleado, a.bonificaciones, a.otrosDescuentos, JSON.stringify(a.detalle)], t);
  return planilla.id_planilla;
}
export async function bloquear(id, t) {
  return select('SELECT * FROM rrhh.planillas WHERE id_planilla=$1 FOR UPDATE', [id], t).then((x) => x[0] ?? null);
}
export async function calcular(id, t) {
  return select('SELECT rrhh.fn_calcular_planilla($1) AS cantidad', [id], t).then((x) => Number(x[0].cantidad));
}
export const conteoDetalles = (id, t) => select('SELECT count(*)::int AS cantidad FROM rrhh.planilla_detalles WHERE id_planilla=$1', [id], t).then((x) => x[0].cantidad);
export const procesar = (id, userId, t) => select(`UPDATE rrhh.planillas SET procesada=true,procesada_en=now(),id_usuario=$2
  WHERE id_planilla=$1 AND NOT procesada RETURNING id_planilla`, [id, userId], t).then((x) => x[0] ?? null);
export const listar = (sucursal, desde, hasta) => select(`SELECT p.*, s.nombre AS sucursal,
  count(d.id_detalle)::int AS empleados,
  COALESCE(sum(d.salario_bruto+d.bonificaciones),0)::numeric(12,2)::text AS total_bruto,
  COALESCE(sum(d.salario_neto),0)::numeric(12,2)::text AS total_neto
  FROM rrhh.planillas p JOIN empresa.sucursales s USING(id_sucursal)
  LEFT JOIN rrhh.planilla_detalles d USING(id_planilla)
  WHERE ($1::int IS NULL OR p.id_sucursal=$1) AND ($2::date IS NULL OR p.periodo_inicio>=$2)
    AND ($3::date IS NULL OR p.periodo_inicio<=$3)
  GROUP BY p.id_planilla,s.nombre ORDER BY p.periodo_inicio DESC,p.id_planilla DESC`, [sucursal ?? null, desde ?? null, hasta ?? null]);
export const detalle = (id) => select(`SELECT p.*,s.nombre AS sucursal, e.id_empleado,e.nombres,e.apellidos,e.dui,e.nit,
  d.salario_bruto::text,d.bonificaciones::text,d.isss_laboral::text,d.afp_laboral::text,d.renta_retenida::text,
  d.otros_descuentos::text,d.total_descuentos::text,d.salario_neto::text,d.isss_patronal::text,d.afp_patronal::text,
  d.insaforp_patronal::text, a.detalle
  FROM rrhh.planillas p JOIN empresa.sucursales s USING(id_sucursal)
  JOIN rrhh.planilla_detalles d USING(id_planilla) JOIN rrhh.empleados e USING(id_empleado)
  LEFT JOIN rrhh.planilla_ajustes a USING(id_planilla,id_empleado)
  WHERE p.id_planilla=$1 ORDER BY e.apellidos,e.nombres`, [id]);
export const unaPlanilla = (id) => select('SELECT * FROM rrhh.planillas WHERE id_planilla=$1', [id]).then((x) => x[0] ?? null);
