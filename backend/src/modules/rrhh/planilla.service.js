import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './planilla.repository.js';
import { generarPdf } from './planilla.pdf.js';

const pgError = (e) => {
  const pg = e.original ?? e.parent ?? e;
  if (pg.code === '23505') return new AppError('Ya existe una planilla para esa sucursal y mes', 409);
  if (pg.code === '23503') return new AppError('La sucursal o empleado indicado no existe', 400);
  if (pg.code === '22003') return new AppError('Un monto excede el máximo admitido', 400);
  if (pg.code === 'P0001') return new AppError(pg.message, 409);
  return e;
};
export async function crear(datos, userId) {
  const [year, month] = datos.periodo.split('-').map(Number);
  const inicio = `${datos.periodo}-01`;
  const fin = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  try {
    return await withTransaction(async (t) => {
      if (!(await repo.sucursalActiva(datos.idSucursal, t))) throw new AppError('La sucursal no existe o está inactiva', 400);
      const ids = datos.ajustes.map((a) => a.idEmpleado);
      if (new Set(ids).size !== ids.length) throw new AppError('No repita empleados en ajustes', 400);
      if (ids.length && (await repo.empleadosActivos(datos.idSucursal, ids, t)).length !== ids.length)
        throw new AppError('Cada ajuste debe pertenecer a un empleado activo de la sucursal', 400);
      return { idPlanilla: await repo.crear({ idSucursal: datos.idSucursal, inicio, fin, userId, ajustes: datos.ajustes }, t) };
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
  return { planilla, empleados: await repo.detalle(id) };
}
const usd = (v) => `$${Number(v).toFixed(2)}`;
export async function pdfPlanilla(id) {
  const { planilla, empleados } = await obtener(id);
  if (!planilla.procesada) throw new AppError('Procese la planilla antes de descargar el PDF', 409);
  const lines = [`Planilla mensual ${planilla.periodo_inicio}`, `Sucursal: ${empleados[0]?.sucursal ?? planilla.id_sucursal}`, 'ID | Nombre | Base | Bono | ISSS | AFP | Renta | Neto'];
  for (const e of empleados) lines.push(`${e.id_empleado.slice(0,8)} | ${(e.nombres+' '+e.apellidos).slice(0,24)} | ${usd(e.salario_bruto)} | ${usd(e.bonificaciones)} | ${usd(e.isss_laboral)} | ${usd(e.afp_laboral)} | ${usd(e.renta_retenida)} | ${usd(e.salario_neto)}`);
  return generarPdf(lines);
}
export async function pdfBoleta(id, empleadoId) {
  const { planilla, empleados } = await obtener(id);
  if (!planilla.procesada) throw new AppError('Procese la planilla antes de descargar el PDF', 409);
  const e = empleados.find((item) => item.id_empleado === empleadoId);
  if (!e) throw new AppError('Boleta no encontrada para esa planilla', 404);
  return generarPdf([`Boleta de pago - ${planilla.periodo_inicio.slice(0,7)}`, `${e.nombres} ${e.apellidos}`, `DUI: ${e.dui}`, `Salario base bruto: ${usd(e.salario_bruto)}`, `Bonificaciones: ${usd(e.bonificaciones)}`, `ISSS laboral: ${usd(e.isss_laboral)}`, `AFP laboral: ${usd(e.afp_laboral)}`, `Retencion de renta: ${usd(e.renta_retenida)}`, `Otros descuentos: ${usd(e.otros_descuentos)}`, `Salario liquido: ${usd(e.salario_neto)}`]);
}
