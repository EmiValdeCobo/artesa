import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// AUDITORIA D1: 01_schema.sql siembra usuarios demo con una contraseña pública.
// El schema no se edita (regla del proyecto), así que el backend se niega a arrancar en
// producción mientras algún usuario activo conserve esa contraseña.
export const CONTRASENA_DEMO = 'Cambiar123*';

export async function usuariosConContrasenaDemo() {
  const usuarios = await sequelize.query(
    'SELECT username, password_hash FROM seguridad.usuarios WHERE activo = true',
    { type: QueryTypes.SELECT },
  );
  const expuestos = [];
  for (const u of usuarios) {
    if (u.password_hash && await bcrypt.compare(CONTRASENA_DEMO, u.password_hash)) expuestos.push(u.username);
  }
  return expuestos;
}

export async function exigirSinContrasenasDemo({ esProduccion }) {
  if (!esProduccion) return;
  const expuestos = await usuariosConContrasenaDemo();
  if (expuestos.length) {
    throw new Error(
      `Arranque bloqueado: ${expuestos.length} usuario(s) activos usan la contraseña de demostración `
      + `(${expuestos.join(', ')}). Cámbiala o desactívalos antes de desplegar en producción.`,
    );
  }
}
