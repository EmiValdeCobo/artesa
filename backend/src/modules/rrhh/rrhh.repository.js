import { Empleado, Puesto, Sucursal, Usuario } from '../../models/index.js';

const plano = (modelo) => modelo?.get({ plain: true }) ?? null;

const incluirEmpleado = [
  { model: Puesto, as: 'puesto', attributes: ['id_puesto', 'nombre', 'salario_base', 'activo'] },
  { model: Sucursal, as: 'sucursal', attributes: ['id_sucursal', 'nombre'] },
  { model: Usuario, as: 'usuario', attributes: ['id_usuario', 'username'], required: false },
];

export const listarPuestos = () =>
  Puesto.findAll({
    order: [
      ['activo', 'DESC'],
      ['nombre', 'ASC'],
    ],
  }).then((xs) => xs.map(plano));
export const buscarPuesto = (id, transaction = null) => Puesto.findByPk(id, { transaction }).then(plano);
export const crearPuesto = (datos, transaction) =>
  Puesto.create({ nombre: datos.nombre, salario_base: datos.salarioBase }, { transaction }).then(plano);
export const actualizarPuesto = async (id, datos, transaction) => {
  const puesto = await Puesto.findByPk(id, { transaction });
  if (!puesto) return null;
  await puesto.update({ nombre: datos.nombre, salario_base: datos.salarioBase }, { transaction });
  return plano(puesto);
};
export const desactivarPuesto = (id, transaction) =>
  Puesto.update({ activo: false }, { where: { id_puesto: id, activo: true }, transaction }).then(([n]) => n);
export const activarPuesto = (id, transaction) =>
  Puesto.update({ activo: true }, { where: { id_puesto: id, activo: false }, transaction }).then(([n]) => n);
export const contarEmpleadosPorPuesto = (id, transaction) => Empleado.count({ where: { id_puesto: id }, transaction });

export const listarEmpleados = () =>
  Empleado.findAll({
    include: incluirEmpleado,
    order: [
      ['activo', 'DESC'],
      ['apellidos', 'ASC'],
      ['nombres', 'ASC'],
    ],
  }).then((xs) => xs.map(plano));
export const buscarEmpleado = (id, transaction = null) =>
  Empleado.findByPk(id, { include: incluirEmpleado, transaction }).then(plano);
export const crearEmpleado = (datos, transaction) =>
  Empleado.create(
    {
      id_sucursal: datos.idSucursal,
      id_puesto: datos.idPuesto,
      id_usuario: datos.idUsuario ?? null,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dui: datos.dui,
      nit: datos.nit ?? null,
      fecha_ingreso: datos.fechaIngreso,
      salario_nominal: datos.salarioNominal,
      activo: datos.activo,
    },
    { transaction },
  ).then(plano);
export const actualizarEmpleado = async (id, datos, transaction) => {
  const empleado = await Empleado.findByPk(id, { transaction });
  if (!empleado) return null;
  await empleado.update(
    {
      id_sucursal: datos.idSucursal,
      id_puesto: datos.idPuesto,
      id_usuario: datos.idUsuario ?? null,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dui: datos.dui,
      nit: datos.nit ?? null,
      fecha_ingreso: datos.fechaIngreso,
      salario_nominal: datos.salarioNominal,
      activo: datos.activo,
    },
    { transaction },
  );
  return buscarEmpleado(id, transaction);
};
export const cambiarEstadoEmpleado = (id, activo, transaction) =>
  Empleado.update({ activo }, { where: { id_empleado: id, activo: !activo }, transaction }).then(([n]) => n);
export const buscarSucursalActiva = (id, transaction) =>
  Sucursal.findOne({ where: { id_sucursal: id, activa: true }, transaction }).then(plano);
export const buscarPuestoActivo = (id, transaction) =>
  Puesto.findOne({ where: { id_puesto: id, activo: true }, transaction }).then(plano);
