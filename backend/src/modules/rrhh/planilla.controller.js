import * as service from './planilla.service.js';
import { idEmpleadoPlanillaSchema, idPlanillaSchema, periodoSchema } from './planilla.schemas.js';
import { AppError } from '../../utils/AppError.js';

const id = (value) => idPlanillaSchema.parse(value);
const pdf = (res, buffer, filename) => res.status(200).type('application/pdf').set('Content-Disposition', `inline; filename="${filename}"`).send(buffer);
export const crear = async (req, res) => res.status(201).json(await service.crear(periodoSchema.parse(req.body), req.user.id));
export const calcular = async (req, res) => res.json(await service.calcular(id(req.params.id), req.user.id));
export const procesar = async (req, res) => res.json(await service.procesar(id(req.params.id), req.user.id));
export const listar = async (req, res) => {
  const idSucursal = req.query.idSucursal == null ? undefined : Number(req.query.idSucursal);
  if (idSucursal !== undefined && (!Number.isInteger(idSucursal) || idSucursal < 1)) throw new AppError('idSucursal debe ser entero positivo', 400);
  const desde = req.query.desde;
  const hasta = req.query.hasta;
  const fechaValida = (v) => v === undefined || /^\d{4}-\d{2}$/.test(v);
  if (!fechaValida(desde) || !fechaValida(hasta) || (desde && hasta && desde > hasta)) throw new AppError('Use filtros de período AAAA-MM válidos', 400);
  return res.json(await service.listar({ idSucursal, desde: desde ? `${desde}-01` : undefined, hasta: hasta ? `${hasta}-01` : undefined }));
};
export const obtener = async (req, res) => res.json(await service.obtener(id(req.params.id)));
export const pdfPlanilla = async (req, res) => pdf(res, await service.pdfPlanilla(id(req.params.id)), `planilla-${req.params.id}.pdf`);
export const pdfBoleta = async (req, res) => {
  const empleadoId = idEmpleadoPlanillaSchema.parse(req.params.idEmpleado);
  return pdf(res, await service.pdfBoleta(id(req.params.id), empleadoId), `boleta-${empleadoId}.pdf`);
};
