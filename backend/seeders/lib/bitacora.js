// Bitácora sintética con el mismo formato que seguridad.fn_auditar y auth.repository (LOGIN).
// Cada cambio registrado coincide con el estado final de los datos (precios, recetas, usuarios, permisos).
import {
  CAMBIOS_PERMISOS, CAMBIOS_PRECIO, CAMBIOS_RECETA, PRODUCTO_DESACTIVADO, PRODUCTO_ELIMINADO, SUCURSALES, USUARIOS,
} from '../datos/catalogo.js';
import { DIA_MS, fmtMicros } from './simulacion.js';

const HORA_MS = 3_600_000;
const MIN_MS = 60_000;
const AGENTES = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
];
const num = (x) => (x === null || x === undefined ? null : Number(x));
const marca = (msLocal) => new Date(msLocal).toISOString().slice(0, 19);

export function construirBitacora({ rnd, dias, inicioMs, ahoraLocalMs, ids, filas, sim }) {
  const filasBit = [];
  const usuarios = Object.fromEntries(USUARIOS.map((u) => [u.username, u]));
  const ultimoLogin = {};
  const sucPrincipal = (username) => usuarios[username].sucursales[0];
  const hostDe = {};
  USUARIOS.forEach((u, i) => { hostDe[u.username] = 20 + i; });
  const agenteDe = (username) => AGENTES[hostDe[username] % AGENTES.length];
  const ipDe = (username) => (username === 'admin' && rnd.prob(0.35) ? `190.86.${rnd.entero(10, 250)}.${rnd.entero(2, 250)}` : `${SUCURSALES[sucPrincipal(username) - 1].lan}${hostDe[username]}`);

  const agregar = (ms, { usuario = null, accion, entidad, antes = null, despues = null, severidad = 'INFO', ip, agente }) => {
    if (ms > ahoraLocalMs) return;
    filasBit.push({
      id_usuario: usuario ? ids.usuarios[usuario] : null, accion, entidad,
      datos_antes: antes ? JSON.stringify(antes) : null, datos_despues: despues ? JSON.stringify(despues) : null,
      creado_en: new Date(ms), ip_cliente: ip ?? (usuario ? ipDe(usuario) : null), agente_cliente: agente ?? (usuario ? agenteDe(usuario) : null), severidad,
    });
  };
  const severidadPorDml = (accion, entidad) => (accion === 'DELETE' || entidad === 'seguridad.roles_permisos' ? 'CRITICAL' : 'INFO');
  const auditar = (ms, usuario, accion, entidad, antes, despues) => agregar(ms, { usuario, accion, entidad, antes, despues, severidad: severidadPorDml(accion, entidad) });
  const login = (ms, username) => {
    if (ms > ahoraLocalMs) return;
    const hora = new Date(ms).getUTCHours();
    agregar(ms, { usuario: username, accion: 'LOGIN', entidad: 'seguridad.usuarios', despues: { resultado: 'EXITOSO' }, severidad: hora < 6 || hora >= 22 ? 'WARNING' : 'INFO' });
    if (!ultimoLogin[username] || ultimoLogin[username] < ms) ultimoLogin[username] = ms;
  };
  const loginFallido = (ms, username, ip, agente) => agregar(ms, {
    accion: 'LOGIN', entidad: 'seguridad.usuarios', despues: { usuario: username, resultado: 'FALLIDO' }, severidad: 'WARNING', ip, agente,
  });

  // ---- Instantáneas como to_jsonb(fila) (sin password_hash).
  const snapProducto = (p, cambios = {}) => ({
    id_producto: p.id_producto, id_categoria: p.id_categoria, nombre: p.nombre, codigo_barra: p.codigo_barra, precio_venta: num(p.precio_venta),
    es_elaborado: p.es_elaborado, id_insumo_reventa: p.id_insumo_reventa, activo: true, deleted_at: null, modificado_en: null, ...cambios,
  });
  const snapUsuario = (u, cambios = {}) => ({
    id_usuario: u.id_usuario, id_rol: u.id_rol, username: u.username, activo: true, ultimo_login: null, creado_en: marca(u.creadoLocal), modificado_en: null, deleted_at: null, ...cambios,
  });
  const snapInsumo = (i, costo) => ({
    id_insumo: i.id_insumo, nombre: i.nombre, tipo_insumo: i.tipo_insumo, id_unidad_base: i.id_unidad_base, costo_promedio: Number(fmtMicros(costo)), activo: true, deleted_at: null, modificado_en: null,
  });

  // ---- 1. Configuración inicial del sistema (dos días antes del historial), hecha por admin.
  let ms = inicioMs - 2 * DIA_MS + 8 * HORA_MS;
  const paso = () => { ms += rnd.entero(4, 40) * 1000; return ms; };
  login(ms, 'admin');
  const preciosIniciales = Object.fromEntries(CAMBIOS_PRECIO.map((c) => [ids.productos[c.producto], c.antes]));
  const recetaInicial = Object.fromEntries(CAMBIOS_RECETA.map((c) => [`${ids.productos[c.producto]}-${ids.insumos[c.insumo].id}`, c.antes]));
  for (const u of filas.unidades) auditar(paso(), 'admin', 'INSERT', 'inventario.unidades_medida', null, { id_unidad: u.id_unidad, codigo: u.codigo, nombre: u.nombre, factor_conversion: num(u.factor_conversion), activo: true, deleted_at: null, modificado_en: null });
  for (const i of filas.insumos) auditar(paso(), 'admin', 'INSERT', 'inventario.insumos', null, snapInsumo(i, Math.round(Number(i.costoInicial) * 1e6)));
  for (const p of filas.productos) auditar(paso(), 'admin', 'INSERT', 'inventario.productos', null, snapProducto(p, { precio_venta: num(preciosIniciales[p.id_producto] ?? p.precio_venta) }));
  for (const r of filas.recetas) {
    const cant = recetaInicial[`${r.id_producto}-${r.id_insumo}`] ?? r.cantidad_requerida;
    auditar(paso(), 'admin', 'INSERT', 'inventario.recetas', null, { id_producto: r.id_producto, id_insumo: r.id_insumo, cantidad_requerida: num(cant) });
  }
  for (const p of filas.proveedores) auditar(paso(), 'bodega1', 'INSERT', 'compras.proveedores', null, { ...p, activo: true, deleted_at: null, modificado_en: null });
  const permisosIniciales = filas.rolesPermisos.filter((rp) => rp.id_rol !== 8);
  for (const rp of [...permisosIniciales, ...filas.permisosRetirados]) auditar(paso(), 'admin', 'INSERT', 'seguridad.roles_permisos', null, rp);
  for (const u of filas.usuarios.filter((x) => usuarios[x.username].creado === undefined)) {
    auditar(paso(), 'admin', 'INSERT', 'seguridad.usuarios', null, snapUsuario(u));
    for (const s of usuarios[u.username].sucursales) auditar(paso(), 'admin', 'INSERT', 'seguridad.usuario_sucursal', null, { id_usuario: u.id_usuario, id_sucursal: s });
  }

  // ---- 2. Cambios posteriores (dia = días antes de hoy).
  const enDia = (diasAntes, hora) => inicioMs + (dias - diasAntes) * DIA_MS + hora * HORA_MS + rnd.entero(0, 50) * MIN_MS;
  const productoPorClave = (clave) => filas.productos.find((p) => p.id_producto === ids.productos[clave]);
  for (const c of CAMBIOS_PRECIO) {
    const p = productoPorClave(c.producto);
    const t = enDia(c.dia, 16.5);
    login(t - 3 * MIN_MS, c.usuario);
    auditar(t, c.usuario, 'UPDATE', 'inventario.productos', snapProducto(p, { precio_venta: num(c.antes) }), snapProducto(p, { modificado_en: marca(t) }));
  }
  for (const c of CAMBIOS_RECETA) {
    const t = enDia(c.dia, 15);
    const r = { id_producto: ids.productos[c.producto], id_insumo: ids.insumos[c.insumo].id };
    const actual = filas.recetas.find((x) => x.id_producto === r.id_producto && x.id_insumo === r.id_insumo);
    auditar(t, c.usuario, 'UPDATE', 'inventario.recetas', { ...r, cantidad_requerida: c.antes }, { ...r, cantidad_requerida: num(actual.cantidad_requerida) });
  }
  {
    const p = productoPorClave(PRODUCTO_DESACTIVADO.producto);
    const t = enDia(PRODUCTO_DESACTIVADO.dia, 7.75);
    auditar(t, PRODUCTO_DESACTIVADO.usuario, 'UPDATE', 'inventario.productos', snapProducto(p), snapProducto(p, { activo: false, modificado_en: marca(t) }));
  }
  {
    const p = productoPorClave(PRODUCTO_ELIMINADO.producto);
    const t = enDia(PRODUCTO_ELIMINADO.dia, 17);
    auditar(t, PRODUCTO_ELIMINADO.usuario, 'DELETE', 'inventario.productos', snapProducto(p), snapProducto(p, { activo: false, deleted_at: p.deleted_at.toISOString(), modificado_en: marca(t) }));
  }
  for (const c of CAMBIOS_PERMISOS) {
    const t = enDia(c.dia, 10);
    const idRol = filas.roles.find((r) => r.nombre === c.rol).id_rol;
    for (const codigo of c.permisos) {
      const idPermiso = filas.permisos[codigo];
      if (!idPermiso) continue;
      const fila = { id_rol: idRol, id_permiso: idPermiso };
      auditar(t + rnd.entero(1, 30) * 1000, 'admin', c.accion, 'seguridad.roles_permisos', c.accion === 'DELETE' ? fila : null, c.accion === 'INSERT' ? fila : null);
    }
  }
  for (const u of filas.usuarios) {
    const def = usuarios[u.username];
    if (def.creado !== undefined) {
      auditar(u.creadoLocal, 'admin', 'INSERT', 'seguridad.usuarios', null, snapUsuario(u));
      for (const s of def.sucursales) auditar(u.creadoLocal + 20_000, 'admin', 'INSERT', 'seguridad.usuario_sucursal', null, { id_usuario: u.id_usuario, id_sucursal: s });
    }
    if (def.desactivado !== undefined) {
      const t = enDia(def.desactivado, 18.5);
      auditar(t, 'admin', 'UPDATE', 'seguridad.usuarios', snapUsuario(u), snapUsuario(u, { activo: false, modificado_en: marca(t) }));
    }
    if (def.eliminado !== undefined) {
      const t = enDia(def.eliminado, 18);
      auditar(t, 'admin', 'DELETE', 'seguridad.usuarios', snapUsuario(u), snapUsuario(u, { deleted_at: u.deleted_at.toISOString(), modificado_en: marca(t) }));
    }
  }
  {
    const p = filas.proveedores.find((x) => x.id_proveedor === 5);
    const t = enDia(70, 11);
    auditar(t, 'bodega1', 'UPDATE', 'compras.proveedores', { ...p, contacto: 'Julio César Mejía', activo: true, deleted_at: null, modificado_en: null }, { ...p, activo: true, deleted_at: null, modificado_en: marca(t) });
    const g = filas.usuarios.find((x) => x.username === 'gerente2');
    const t2 = enDia(20, 9);
    auditar(t2, 'admin', 'UPDATE', 'seguridad.usuarios', snapUsuario(g), snapUsuario(g, { modificado_en: marca(t2) }));
  }

  // ---- 3. Recalculo de costo promedio al registrar compras (trigger de compras sobre inventario.insumos).
  const insumoPorId = Object.fromEntries(filas.insumos.map((i) => [i.id_insumo, i]));
  for (const a of sim.compras.auditoriaCostos) {
    if (a.antes === a.despues) continue;
    const i = insumoPorId[a.idInsumo];
    agregar(a.ms + 2000, { usuario: a.usuario, accion: 'UPDATE', entidad: 'inventario.insumos', antes: snapInsumo(i, a.antes), despues: snapInsumo(i, a.despues), severidad: 'INFO' });
  }

  // ---- 4. Inicios de sesión.
  for (const t of sim.turnosInfo) login(t.inicioLocal - rnd.entero(2, 10) * MIN_MS, t.username);
  const comprasPorDia = new Set(sim.compras.facturas.map((f) => `${f.fecha_emision}|${f.id_usuario}`));
  for (let d = 0; d <= dias; d += 1) {
    const msDia = inicioMs + d * DIA_MS;
    const diasAntes = dias - d;
    const dow = new Date(msDia).getUTCDay();
    const fecha = new Date(msDia).toISOString().slice(0, 10);
    const activo = (username) => {
      const u = usuarios[username];
      return !(u.creado !== undefined && diasAntes >= u.creado) && !(u.eliminado !== undefined && diasAntes <= u.eliminado) && !(u.desactivado !== undefined && diasAntes <= u.desactivado);
    };
    for (const g of ['gerente1', 'gerente2', 'gerente3']) if (dow !== (g === 'gerente3' ? 0 : 2) || rnd.prob(0.2)) login(msDia + rnd.entre(7, 8.2) * HORA_MS, g);
    for (const b of ['barista1', 'barista2', 'barista3', 'barista4']) if (rnd.prob(0.82)) login(msDia + rnd.entre(6.3, 7.1) * HORA_MS, b);
    for (const b of ['bodega1', 'bodega2']) if (comprasPorDia.has(`${fecha}|${ids.usuarios[b]}`)) login(msDia + rnd.entre(6.1, 6.4) * HORA_MS, b);
    if ([1, 3, 5].includes(dow) || new Date(msDia).getUTCDate() === 5) login(msDia + rnd.entre(8.2, 9) * HORA_MS, 'contador1');
    if ([2, 4].includes(dow) && rnd.prob(0.8)) login(msDia + rnd.entre(8, 10) * HORA_MS, 'rrhh1');
    if (activo('supervisor1') && [1, 3, 5].includes(dow)) login(msDia + rnd.entre(9, 11) * HORA_MS, 'supervisor1');
    if (rnd.prob(0.6)) login(msDia + rnd.entre(8, 18) * HORA_MS, 'admin');
    if (rnd.prob(0.1)) login(msDia + rnd.entre(22.2, 23.8) * HORA_MS, 'admin');
    if (rnd.prob(0.04)) login(msDia + rnd.entre(4.5, 5.9) * HORA_MS, rnd.elegir(['gerente1', 'gerente2']));
    // Contraseña mal escrita y luego acceso correcto.
    if (rnd.prob(0.3)) {
      const quien = rnd.elegir(USUARIOS.filter((u) => activo(u.username)).map((u) => u.username));
      const t = msDia + rnd.entre(7, 19) * HORA_MS;
      loginFallido(t, quien, ipDe(quien), agenteDe(quien));
      if (rnd.prob(0.85)) login(t + rnd.entero(20, 90) * 1000, quien);
    }
    // Intentos con cuentas dadas de baja o inexistentes.
    if (diasAntes === 59 || diasAntes === 24) loginFallido(msDia + 7 * HORA_MS, diasAntes === 59 ? 'cajero5' : 'cajero10', `${SUCURSALES[diasAntes === 59 ? 0 : 2].lan}77`, AGENTES[0]);
    // Intento de fuerza bruta nocturno contra admin desde una IP externa.
    if (diasAntes === 9) {
      const ip = '45.227.253.18';
      for (let k = 0; k < 7; k += 1) loginFallido(msDia + 3 * HORA_MS + 12 * MIN_MS + k * 23_000, k % 3 === 2 ? 'administrador' : 'admin', ip, 'python-requests/2.32.3');
    }
  }

  filasBit.sort((a, b) => a.creado_en - b.creado_en);
  return { filas: filasBit, ultimoLogin };
}
