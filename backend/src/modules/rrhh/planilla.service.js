import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './planilla.repository.js';
import { generarPdf } from './planilla.pdf.js';
import { centavos, formatoDinero } from './planilla.calculos.js';

const pgError = (e) => {
  const pg = e.original ?? e.parent ?? e;
  if (pg.code === '23505') return new AppError('Ya existe una planilla para esa sucursal y período', 409);
  if (pg.code === '23503') return new AppError('La sucursal o empleado indicado no existe', 400);
  if (pg.code === '22003') return new AppError('Un monto excede el máximo admitido', 400);
  if (pg.code === 'P0001') return new AppError(pg.message, 409);
  return e;
};
// Fechas del período: mes completo, quincena 1 (1-15) o quincena 2 (16 a último día del mes).
export function rangoPeriodo({ periodo, tipoPeriodo = 'MENSUAL', quincena }) {
  const [year, month] = periodo.split('-').map(Number);
  const ultimo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  if (tipoPeriodo !== 'QUINCENAL') return { inicio: `${periodo}-01`, fin: ultimo };
  return Number(quincena) === 1
    ? { inicio: `${periodo}-01`, fin: `${periodo}-15` }
    : { inicio: `${periodo}-16`, fin: ultimo };
}
export async function crear(datos, userId) {
  const { inicio, fin } = rangoPeriodo(datos);
  try {
    return await withTransaction(async (t) => {
      if (!(await repo.sucursalActiva(datos.idSucursal, t))) throw new AppError('La sucursal no existe o está inactiva', 400);
      const ids = datos.ajustes.map((a) => a.idEmpleado);
      if (new Set(ids).size !== ids.length) throw new AppError('No repita empleados en ajustes', 400);
      if (ids.length && (await repo.empleadosActivos(datos.idSucursal, ids, t)).length !== ids.length)
        throw new AppError('Cada ajuste debe pertenecer a un empleado activo de la sucursal', 400);
      return { idPlanilla: await repo.crear({ idSucursal: datos.idSucursal, inicio, fin, tipoPeriodo: datos.tipoPeriodo, userId, ajustes: datos.ajustes }, t) };
    }, userId);
  } catch (e) { throw pgError(e); }
}
export async function calcular(id, userId) {
  try { return await withTransaction(async (t) => {
    const p = await repo.bloquear(id, t);
    if (!p) throw new AppError('Planilla no encontrada', 404);
    if (p.procesada) throw new AppError('La planilla ya fue procesada', 409);
    const cantidad = await repo.calcular(id, t);
    if (!cantidad) throw new AppError('No hay empleados activos para calcular en esta sucursal', 409);
    return { idPlanilla: id, empleados: cantidad, estado: 'CALCULADA' };
  }, userId); } catch (e) { throw pgError(e); }
}
export async function guardarAjuste(idPlanilla, idEmpleado, { bonificaciones, otrosDescuentos, detalle }, userId) {
  try {
    return await withTransaction(async (t) => {
      const p = await repo.bloquear(idPlanilla, t);
      if (!p) throw new AppError('Planilla no encontrada', 404);
      if (p.procesada) throw new AppError('La planilla ya fue procesada y no admite cambios', 409);

      const emp = await repo.empleadosActivos(p.id_sucursal, [idEmpleado], t);
      if (!emp.length) throw new AppError('El empleado no pertenece a la sucursal o no está activo', 400);

      await repo.guardarAjuste(idPlanilla, idEmpleado, { bonificaciones, otrosDescuentos, detalle }, t);

      const conteo = await repo.conteoDetalles(idPlanilla, t);
      let recalculada = false;
      if (conteo > 0) {
        await repo.calcular(idPlanilla, t);
        recalculada = true;
      }
      return { ok: true, idPlanilla, idEmpleado, bonificaciones, recalculada };
    }, userId);
  } catch (e) { throw pgError(e); }
}
export async function procesar(id, userId) {
  try { return await withTransaction(async (t) => {
    const p = await repo.bloquear(id, t);
    if (!p) throw new AppError('Planilla no encontrada', 404);
    if (p.procesada) throw new AppError('La planilla ya fue procesada', 409);
    if (!(await repo.conteoDetalles(id, t))) throw new AppError('Primero debe calcular la planilla', 409);
    const resultado = await repo.procesar(id, userId, t);
    if (!resultado) throw new AppError('La planilla cambió de estado; vuelva a consultar', 409);
    return { idPlanilla: id, estado: 'PROCESADA' };
  }, userId); } catch (e) { throw pgError(e); }
}
export const listar = (filtros) => repo.listar(filtros.idSucursal, filtros.desde, filtros.hasta);
export async function obtener(id) {
  const planilla = await repo.unaPlanilla(id);
  if (!planilla) throw new AppError('Planilla no encontrada', 404);
  const [empleados, totales] = await Promise.all([repo.detalle(id), repo.totalesDetalle(id)]);
  return { planilla, empleados, totales };
}
const usd = (v) => `$${Number(v).toFixed(2)}`;
export async function pdfPlanilla(id) {
  const { planilla, empleados } = await obtener(id);
  if (!planilla.procesada) throw new AppError('Procese la planilla antes de descargar el PDF', 409);
  const totalNetoCentavos = empleados.reduce(
    (total, empleado) => total + centavos(empleado.salario_neto),
    0,
  );
  const totalNeto = formatoDinero(totalNetoCentavos);
  const lines = [`Planilla ${(planilla.tipo_periodo ?? 'MENSUAL').toLowerCase()} ${planilla.periodo_inicio} al ${planilla.periodo_fin}`, `Sucursal: ${empleados[0]?.sucursal ?? planilla.id_sucursal}`, 'ID | Nombre | Base | Bono | ISSS | AFP | Renta | Neto'];
  for (const e of empleados) lines.push(`${e.id_empleado.slice(0,8)} | ${(e.nombres+' '+e.apellidos).slice(0,24)} | ${usd(e.salario_bruto)} | ${usd(e.bonificaciones)} | ${usd(e.isss_laboral)} | ${usd(e.afp_laboral)} | ${usd(e.renta_retenida)} | ${usd(e.salario_neto)}`);
  lines.push(`TOTAL NETO | | | | | | | ${usd(totalNeto)}`);
  return generarPdf(lines);
}
export async function pdfBoleta(id, empleadoId) {
  const { planilla, empleados } = await obtener(id);
  if (!planilla.procesada) throw new AppError('Procese la planilla antes de descargar el PDF', 409);
  const e = empleados.find((item) => item.id_empleado === empleadoId);
  if (!e) throw new AppError('Boleta no encontrada para esa planilla', 404);
  const descBono = Array.isArray(e.detalle) && e.detalle.length ? ` (${e.detalle[0]})` : '';
  return generarPdf([`Boleta de pago - ${planilla.tipo_periodo === 'QUINCENAL' ? `${planilla.periodo_inicio} al ${planilla.periodo_fin}` : planilla.periodo_inicio.slice(0,7)}`, `${e.nombres} ${e.apellidos}`, `DUI: ${e.dui}`, `Salario base bruto: ${usd(e.salario_bruto)}`, `Bonificaciones${descBono}: ${usd(e.bonificaciones)}`, `ISSS laboral: ${usd(e.isss_laboral)}`, `AFP laboral: ${usd(e.afp_laboral)}`, `Retencion de renta: ${usd(e.renta_retenida)}`, `Otros descuentos: ${usd(e.otros_descuentos)}`, `Salario liquido: ${usd(e.salario_neto)}`]);
}
