// Índice público de modelos; cada módulo mantiene sus definiciones aisladas.
import { Permiso, Rol, RolPermiso, Usuario, UsuarioSucursal } from './seguridad.js';
import { Sucursal } from './empresa.js';
import { Caja, Cliente, MovimientoCaja, TurnoCaja } from './pos.js';
import { CategoriaProducto, Insumo, Producto, Receta, UnidadMedida } from './inventario.js';

Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'id_rol', as: 'usuarios' });
Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'id_rol', otherKey: 'id_permiso', as: 'permisos' });
Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'id_permiso', otherKey: 'id_rol', as: 'roles' });
Usuario.belongsToMany(Sucursal, { through: UsuarioSucursal, foreignKey: 'id_usuario', otherKey: 'id_sucursal', as: 'sucursales' });
Sucursal.belongsToMany(Usuario, { through: UsuarioSucursal, foreignKey: 'id_sucursal', otherKey: 'id_usuario', as: 'usuarios' });

export { Rol, Usuario, UsuarioSucursal, Sucursal, Cliente, Caja, TurnoCaja, MovimientoCaja, UnidadMedida, Insumo, CategoriaProducto, Producto, Receta };
