import * as service from './empresa.service.js';
import { z } from 'zod';

const id = (v) => z.coerce.number().int().positive().parse(v);
export const listarSucursales = async (_req, res) => res.json(await service.listarSucursales());
export const listarParametros = async (_req, res) => res.json(await service.listarParametros());
export const crearSucursal = async (req, res) => res.status(201).json(await service.crearSucursal(req.body, req.user.id));
export const actualizarSucursal = async (req, res) => res.json(await service.actualizarSucursal(id(req.params.id), req.body, req.user.id));
export const cambiarEstadoSucursal = async (req, res) => res.json(await service.cambiarEstadoSucursal(id(req.params.id), z.boolean().parse(req.body.activa), req.user.id));
export const actualizarParametro = async (req, res) => res.json(await service.actualizarParametro(req.body, req.user.id));
