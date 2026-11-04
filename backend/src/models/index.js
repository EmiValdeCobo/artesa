// Índice público de modelos; cada módulo mantiene sus definiciones aisladas.
import { Rol, Usuario, UsuarioSucursal } from './seguridad.js';
import { Sucursal } from './empresa.js';
import { Cliente } from './pos.js';

Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'id_rol', as: 'usuarios' });
Usuario.belongsToMany(Sucursal, { through: UsuarioSucursal, foreignKey: 'id_usuario', otherKey: 'id_sucursal', as: 'sucursales' });
Sucursal.belongsToMany(Usuario, { through: UsuarioSucursal, foreignKey: 'id_sucursal', otherKey: 'id_usuario', as: 'usuarios' });

export { Rol, Usuario, UsuarioSucursal, Sucursal, Cliente };
