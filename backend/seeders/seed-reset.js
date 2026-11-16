// Reinicia los datos de demostración de artesa en un solo paso: `pnpm seed:reset` (o `npm run seed:reset`).
// Vacía SOLO las tablas de datos (no toca esquema, migraciones, permisos, parámetros ni tablas legales)
// y carga un set determinista dentro de una única transacción: si algo falla, se revierte todo.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { crearAleatorio, semillaDeTexto } from './lib/aleatorio.js';
import { construirBitacora } from './lib/bitacora.js';
import { aUtc, DIA_MS, FALTANTES, fmtMicros, simularHistoria } from './lib/simulacion.js';
import {
  CATEGORIAS, CAMBIOS_PERMISOS, CLIENTES, CONTRASENA_CLIENTE_DEMO, CONTRASENA_DEMO, EMPLEADOS, INSUMOS, PRODUCTO_DESACTIVADO,
  PRODUCTO_ELIMINADO, PRODUCTOS, PROVEEDORES, PUESTOS, ROLES, SUCURSALES, UNIDADES, USUARIOS,
} from './datos/catalogo.js';

const SEMILLA = 'artesa-seed-v1';
const DIAS_HISTORIAL = 120;
const TAMANO_LOTE = 1000;
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);

// ---- 1. Protección de entorno.
dotenv.config({ path: path.join(raiz, '.env'), quiet: true });
dotenv.config({ path: path.join(raiz, 'backend/.env'), quiet: true });
if (process.env.NODE_ENV === 'production' && !args.includes('--confirmar-produccion')) {
  console.error('ABORTADO: NODE_ENV=production. Este comando BORRA los datos operativos.');
  console.error('Si realmente quieres hacerlo, vuelve a ejecutar con --confirmar-produccion.');
  process.exit(1);
}

// ---- 2. Conexión administrativa (web_user no tiene permiso de TRUNCATE), igual que scripts/db.js.
const urlAdmin = process.env.DATABASE_ADMIN_URL ? new URL(process.env.DATABASE_ADMIN_URL) : null;
const admin = urlAdmin
  ? { host: urlAdmin.hostname, port: urlAdmin.port || '5432', user: decodeURIComponent(urlAdmin.username), password: decodeURIComponent(urlAdmin.password), db: urlAdmin.pathname.slice(1) }
  : { host: process.env.POSTGRES_HOST || 'localhost', port: process.env.POSTGRES_PORT || '5432', user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD, db: process.env.POSTGRES_DB };
if (!admin.user || !admin.password || !admin.db) {
  console.error('Faltan credenciales de administrador: define DATABASE_ADMIN_URL o POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB en .env');
  process.exit(1);
}
Object.assign(process.env, { DB_HOST: admin.host, DB_PORT: String(admin.port), DB_USER: admin.user, DB_PASSWORD: admin.password, DB_NAME: admin.db });
process.env.JWT_SECRET ||= 'seed-sin-uso-de-jwt';

const { sequelize, withTransaction } = await import('../src/config/db.js');
const {
  Caja, CategoriaProducto, Empleado, Insumo, Producto, Puesto, Receta, Rol, RolPermiso, UnidadMedida, Usuario, UsuarioSucursal,
} = await import('../src/models/index.js');
const { QueryTypes } = await import('sequelize');
const qi = sequelize.getQueryInterface();
const tabla = (nombre) => { const [schema, tableName] = nombre.split('.'); return { schema, tableName }; };
const consultar = (sql, bind = [], transaction = undefined) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });

// Orden inverso a las dependencias: hijos primero. Sin CASCADE: si existiera otra tabla que
// referencie a alguna de estas, PostgreSQL rechaza el TRUNCATE en lugar de borrar de más.
const TABLAS_DATOS = [
  'seguridad.bitacora', 'rrhh.planilla_detalles', 'rrhh.planilla_ajustes', 'rrhh.planillas', 'rrhh.empleados', 'rrhh.puestos',
  'compras.pagos_proveedor', 'compras.compra_detalles', 'compras.facturas_compra', 'compras.proveedores',
  'pos.pagos', 'pos.venta_detalles', 'pos.ventas', 'pos.orden_detalles', 'pos.ordenes', 'pos.movimientos_caja', 'pos.turnos_caja',
  'pos.series_documento', 'pos.cajas', 'pos.clientes',
  'inventario.movimientos_inventario', 'inventario.stock_sucursal', 'inventario.recetas', 'inventario.productos', 'inventario.categorias_producto',
  'inventario.insumos', 'inventario.unidades_medida',
  'seguridad.usuario_sucursal', 'seguridad.usuarios', 'seguridad.roles_permisos', 'seguridad.roles', 'empresa.sucursales',
];

// Inserción por lotes respetando FK: al vaciar una tabla, antes se vacían sus padres pendientes.
class InsercionPorLotes {
  constructor(transaction, orden) {
    this.transaction = transaction;
    this.orden = orden;
    this.buffers = Object.fromEntries(orden.map((t) => [t, []]));
    this.conteo = Object.fromEntries(orden.map((t) => [t, 0]));
  }

  async agregar(nombre, fila) {
    this.buffers[nombre].push(fila);
    if (this.buffers[nombre].length >= TAMANO_LOTE) await this.vaciar(nombre);
  }

  async vaciar(hasta = this.orden[this.orden.length - 1]) {
    for (const nombre of this.orden.slice(0, this.orden.indexOf(hasta) + 1)) {
      const filas = this.buffers[nombre];
      if (!filas.length) continue;
      this.buffers[nombre] = [];
      await qi.bulkInsert(tabla(`${nombre === 'movimientos_inventario' ? 'inventario' : 'pos'}.${nombre}`), filas, { transaction: this.transaction });
      this.conteo[nombre] += filas.length;
    }
  }
}

async function insertarEnLotes(nombre, filas, transaction) {
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) await qi.bulkInsert(tabla(nombre), filas.slice(i, i + TAMANO_LOTE), { transaction });
}

// bcrypt (costo 10, igual que seguridad.service) con sal derivada de la semilla: mismo hash en cada ejecución.
const ALFABETO_BCRYPT = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function hashDeterminista(contrasena, etiqueta) {
  const r = crearAleatorio(semillaDeTexto(`${SEMILLA}|bcrypt|${etiqueta}`));
  const sal = Array.from({ length: 22 }, () => ALFABETO_BCRYPT[r.entero(0, 63)]).join('');
  return bcrypt.hashSync(contrasena, `$2b$10$${sal}`);
}

// DUI con dígito verificador válido (pesos 9..2, módulo 10).
function duiValido(r) {
  const d = Array.from({ length: 8 }, (_, i) => (i === 0 ? r.entero(0, 6) : r.entero(0, 9)));
  const suma = d.reduce((a, x, i) => a + x * (9 - i), 0);
  return `${d.join('')}-${(10 - (suma % 10)) % 10}`;
}

async function migracionesPendientes() {
  const archivos = (await readdir(path.join(raiz, 'database/migrations'))).filter((f) => f.endsWith('.sql'));
  const existe = await consultar("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS ok");
  if (!existe[0].ok) return archivos;
  const aplicadas = new Set((await consultar('SELECT nombre FROM public.schema_migrations')).map((x) => x.nombre));
  return archivos.filter((f) => !aplicadas.has(f)).sort();
}

async function main() {
  const t0 = Date.now();
  await sequelize.authenticate();
  console.log(`Conectado a "${admin.db}" en ${admin.host}:${admin.port} como administrador.`);
  const pendientes = await migracionesPendientes();
  if (pendientes.length) console.warn(`AVISO: migraciones sin registrar en schema_migrations: ${pendientes.join(', ')}. Ejecuta "pnpm db:migrate" si corresponde.`);

  const [param] = await consultar("SELECT COALESCE(empresa.fn_param('zona_horaria'), 'America/El_Salvador') AS tz, empresa.fn_param('tasa_iva') AS iva");
  const ahoraTexto = process.env.SEED_AHORA
    ?? (await consultar("SELECT to_char(date_trunc('hour', CURRENT_TIMESTAMP AT TIME ZONE $1::text), 'YYYY-MM-DD\"T\"HH24:MI') AS t", [param.tz]))[0].t;
  const ahoraLocalMs = Date.parse(`${ahoraTexto}:00Z`);
  // Solo la cola de preparación usa el minuto real (los pedidos vivos deben verse recientes).
  const minutoReal = process.env.SEED_AHORA ?? (await consultar("SELECT to_char(CURRENT_TIMESTAMP AT TIME ZONE $1::text, 'YYYY-MM-DD\"T\"HH24:MI') AS t", [param.tz]))[0].t;
  const ahoraRealMs = Math.max(ahoraLocalMs, Date.parse(`${minutoReal}:00Z`));
  const hoyLocalMs = Date.parse(`${ahoraTexto.slice(0, 10)}T00:00:00Z`);
  const tasaIvaPct = Math.round(Number(param.iva) * 100);
  const permisos = Object.fromEntries((await consultar('SELECT codigo, id_permiso FROM seguridad.permisos')).map((p) => [p.codigo, p.id_permiso]));
  const inicioMs = hoyLocalMs - DIAS_HISTORIAL * DIA_MS;
  const setupMs = inicioMs - 2 * DIA_MS + 8 * 3_600_000;
  console.log(`Fecha de referencia local: ${ahoraTexto} (${param.tz}); historial de ${DIAS_HISTORIAL} días; IVA ${tasaIvaPct} %.`);

  // ---- Identificadores deterministas.
  const rIds = crearAleatorio(semillaDeTexto(`${SEMILLA}|ids`));
  const ids = { usuarios: {}, insumos: {}, productos: {}, clientesCcf: { 1: [], 2: [], 3: [] }, clientesFcf: { 1: [], 2: [], 3: [] } };
  USUARIOS.forEach((u) => { ids.usuarios[u.username] = rIds.uuid(); });
  INSUMOS.forEach((i, k) => { ids.insumos[i.clave] = { ...i, id: k + 1 }; });
  PRODUCTOS.forEach((p, k) => { ids.productos[p.clave] = k + 1; });
  CLIENTES.forEach((c, k) => {
    if (c.ccf) ids.clientesCcf[c.ccf].push(k + 1);
    if (c.fcf) ids.clientesFcf[c.fcf].push(k + 1);
  });
  const unidadPorCodigo = Object.fromEntries(UNIDADES.map((u) => [u.codigo, u.id]));
  const rolPorNombre = Object.fromEntries(ROLES.map((r) => [r.nombre, r.id]));
  const msDiasAntes = (d, hora = 9) => hoyLocalMs - d * DIA_MS + hora * 3_600_000;

  const resultado = await withTransaction(async (transaction) => {
    // ---- 3. Borrado (solo datos). RESTART IDENTITY reinicia los correlativos para obtener los mismos IDs.
    await sequelize.query(`TRUNCATE TABLE ${TABLAS_DATOS.join(', ')} RESTART IDENTITY`, { transaction });
    console.log(`Vaciadas ${TABLAS_DATOS.length} tablas de datos.`);

    // ---- 4. Estructura y catálogo (orden directo de dependencias).
    await qi.bulkInsert(tabla('empresa.sucursales'), SUCURSALES.map((s) => ({
      id_sucursal: s.id, codigo_establecimiento: s.codigo, nombre: s.nombre, direccion: s.direccion, departamento: s.departamento, telefono: s.telefono, activa: true, creado_en: new Date(setupMs + 6 * 3_600_000),
    })), { transaction });
    const filasUnidades = UNIDADES.map((u) => ({ id_unidad: u.id, codigo: u.codigo, nombre: u.nombre, factor_conversion: u.factor, activo: true }));
    await UnidadMedida.bulkCreate(filasUnidades, { transaction });
    await CategoriaProducto.bulkCreate(CATEGORIAS.map((c) => ({ id_categoria: c.id, nombre: c.nombre })), { transaction });
    const filasInsumos = INSUMOS.map((i, k) => ({ id_insumo: k + 1, nombre: i.nombre, tipo_insumo: i.tipo, id_unidad_base: unidadPorCodigo[i.unidad], costo_promedio: i.costo, activo: true }));
    await Insumo.bulkCreate(filasInsumos, { transaction });
    const filasProductos = PRODUCTOS.map((p, k) => ({
      id_producto: k + 1, id_categoria: p.cat, nombre: p.nombre, codigo_barra: p.reventa ? `741${String(1000000000 + (k + 1) * 7919).slice(0, 10)}` : null,
      precio_venta: p.precio, es_elaborado: !p.reventa, id_insumo_reventa: p.reventa ? ids.insumos[p.reventa].id : null,
      activo: !(p.clave === PRODUCTO_DESACTIVADO.producto || p.clave === PRODUCTO_ELIMINADO.producto),
      deleted_at: p.clave === PRODUCTO_ELIMINADO.producto ? aUtc(msDiasAntes(PRODUCTO_ELIMINADO.dia, 17)) : null,
    }));
    await Producto.bulkCreate(filasProductos, { transaction });
    const filasRecetas = PRODUCTOS.flatMap((p, k) => Object.entries(p.receta ?? {}).map(([clave, cant]) => ({ id_producto: k + 1, id_insumo: ids.insumos[clave].id, cantidad_requerida: String(cant) })));
    await Receta.bulkCreate(filasRecetas, { transaction });

    // Roles y matriz de permisos (se omiten códigos que aún no existan por una migración pendiente).
    await Rol.bulkCreate(ROLES.map((r) => ({
      id_rol: r.id, nombre: r.nombre, descripcion: r.descripcion, es_sistema: r.sistema, activo: true,
      creado_en: aUtc(r.sistema ? setupMs : msDiasAntes(50, 10)), modificado_en: aUtc(r.sistema ? setupMs : msDiasAntes(50, 10)),
    })), { transaction });
    const omitidos = new Set();
    const filasRolesPermisos = ROLES.flatMap((r) => (r.permisos === '*' ? Object.keys(permisos) : r.permisos).filter((c) => (permisos[c] ? true : (omitidos.add(c), false))).map((c) => ({ id_rol: r.id, id_permiso: permisos[c] })));
    if (omitidos.size) console.warn(`AVISO: permisos inexistentes en la BD (migración pendiente), no asignados: ${[...omitidos].join(', ')}`);
    await RolPermiso.bulkCreate(filasRolesPermisos, { transaction });
    const permisosRetirados = CAMBIOS_PERMISOS.filter((c) => c.accion === 'DELETE').flatMap((c) => c.permisos.filter((x) => permisos[x]).map((x) => ({ id_rol: rolPorNombre[c.rol], id_permiso: permisos[x] })));

    const hashDemo = hashDeterminista(CONTRASENA_DEMO, 'usuarios');
    if (!bcrypt.compareSync(CONTRASENA_DEMO, hashDemo)) throw new Error('El hash bcrypt generado no valida la contraseña demo');
    const filasUsuarios = USUARIOS.map((u) => {
      const creadoLocal = u.creado !== undefined ? msDiasAntes(u.creado, 9.5) : setupMs + 30 * 60_000;
      return {
        id_usuario: ids.usuarios[u.username], id_rol: rolPorNombre[u.rol], username: u.username, password_hash: hashDemo,
        activo: u.desactivado === undefined, creado_en: aUtc(creadoLocal), modificado_en: aUtc(creadoLocal),
        deleted_at: u.eliminado !== undefined ? aUtc(msDiasAntes(u.eliminado, 18)) : null, creadoLocal,
      };
    });
    await Usuario.bulkCreate(filasUsuarios.map(({ creadoLocal, ...f }) => f), { transaction });
    await UsuarioSucursal.bulkCreate(USUARIOS.flatMap((u) => u.sucursales.map((s) => ({ id_usuario: ids.usuarios[u.username], id_sucursal: s }))), { transaction });

    await Caja.bulkCreate(SUCURSALES.flatMap((s) => s.cajas.map((c) => ({ id_caja: c.id, id_sucursal: s.id, codigo_punto_venta: c.pv, nombre_identificador: c.nombre }))), { transaction });
    const hashCliente = hashDeterminista(CONTRASENA_CLIENTE_DEMO, 'clientes');
    await qi.bulkInsert(tabla('pos.clientes'), CLIENTES.map((c, k) => ({
      id_cliente: k + 1, nombre_razon_social: c.nombre, tipo_documento: c.doc ? c.tipo : null, num_documento: c.doc, nrc: c.nrc ?? null, giro_economico: c.giro ?? null,
      direccion: c.direccion ?? null, email: c.email, telefono: c.telefono, creado_en: aUtc(setupMs + (k + 60) * 60_000),
      username: c.username ?? null, password_hash: c.username ? hashCliente : null, activo: true,
    })), { transaction });
    const filasProveedores = PROVEEDORES.map((p) => ({ id_proveedor: p.id, razon_social: p.razon, nrc: p.nrc, nit: p.nit, contacto: p.contacto, telefono: p.telefono, dias_credito: p.credito }));
    await qi.bulkInsert(tabla('compras.proveedores'), filasProveedores.map((p) => ({ ...p, activo: true })), { transaction });

    const rRrhh = crearAleatorio(semillaDeTexto(`${SEMILLA}|rrhh`));
    await Puesto.bulkCreate(PUESTOS.map((p) => ({ id_puesto: p.id, nombre: p.nombre, salario_base: p.salario, activo: true })), { transaction });
    await Empleado.bulkCreate(EMPLEADOS.map((e) => ({
      id_empleado: rRrhh.uuid(), id_sucursal: e.suc, id_puesto: e.puesto, id_usuario: e.usuario ? ids.usuarios[e.usuario] : null, nombres: e.nombres, apellidos: e.apellidos,
      dui: duiValido(rRrhh), nit: null, fecha_ingreso: e.ingreso, salario_nominal: e.salario, activo: true,
    })), { transaction });

    // Los ID explícitos no avanzan las secuencias: se sincronizan para que la app siga numerando bien.
    for (const [t, col] of [['empresa.sucursales', 'id_sucursal'], ['inventario.unidades_medida', 'id_unidad'], ['inventario.categorias_producto', 'id_categoria'], ['inventario.insumos', 'id_insumo'],
      ['inventario.productos', 'id_producto'], ['seguridad.roles', 'id_rol'], ['pos.cajas', 'id_caja'], ['pos.clientes', 'id_cliente'], ['compras.proveedores', 'id_proveedor'], ['rrhh.puestos', 'id_puesto']]) {
      await sequelize.query(`SELECT setval(pg_get_serial_sequence('${t}', '${col}'), (SELECT MAX(${col}) FROM ${t}))`, { transaction });
    }
    console.log('Catálogo, usuarios, roles, clientes, proveedores y RRHH cargados.');

    // ---- 5. Historial (ventas, turnos, pagos, kárdex) insertado por lotes mientras se simula.
    const lotes = new InsercionPorLotes(transaction, ['turnos_caja', 'ventas', 'venta_detalles', 'pagos', 'movimientos_caja', 'movimientos_inventario']);
    const sim = await simularHistoria({ rnd: crearAleatorio(semillaDeTexto(`${SEMILLA}|historial`)), sink: lotes, ids, dias: DIAS_HISTORIAL, hoyLocalMs, ahoraLocalMs, tasaIvaPct });
    await lotes.vaciar();
    console.log(`Historial: ${lotes.conteo.ventas} ventas, ${lotes.conteo.venta_detalles} líneas, ${lotes.conteo.movimientos_inventario} movimientos de inventario.`);

    // ---- 6. Compras. Sus triggers mueven stock y costo con la fecha actual; como el kárdex simulado ya
    // contiene esas entradas con su fecha real, después se descartan solo los movimientos que generó el trigger.
    await insertarEnLotes('compras.facturas_compra', sim.compras.facturas, transaction);
    await insertarEnLotes('compras.compra_detalles', sim.compras.detalles, transaction);
    await insertarEnLotes('compras.pagos_proveedor', sim.compras.pagos, transaction);
    await sequelize.query('DELETE FROM inventario.movimientos_inventario WHERE id_movimiento > $1', { bind: [sim.totalMovimientos], transaction });
    await sequelize.query("SELECT setval(pg_get_serial_sequence('inventario.movimientos_inventario', 'id_movimiento'), $1)", { bind: [sim.totalMovimientos], transaction });

    // ---- 7. Stock final y costo promedio resultantes de la simulación.
    await sequelize.query('DELETE FROM inventario.stock_sucursal', { transaction });
    const filasStock = SUCURSALES.flatMap((s) => INSUMOS.map((_, k) => ({ id_sucursal: s.id, id_insumo: k + 1, stock_actual: String(sim.stock[s.id][k + 1] ?? 0), stock_minimo: String(sim.politica[s.id][k + 1].minimo) })));
    await insertarEnLotes('inventario.stock_sucursal', filasStock, transaction);
    const valores = INSUMOS.map((_, k) => `(${k + 1}, $${k + 1}::numeric)`).join(', ');
    await sequelize.query(`UPDATE inventario.insumos i SET costo_promedio = v.costo FROM (VALUES ${valores}) AS v(id, costo) WHERE i.id_insumo = v.id`, { bind: INSUMOS.map((_, k) => fmtMicros(sim.costo[k + 1])), transaction });

    // ---- 8. Correlativos DTE por caja para que la próxima venta real continúe la numeración.
    await qi.bulkInsert(tabla('pos.series_documento'), Object.entries(sim.correlativos).map(([clave, n]) => {
      const [idCaja, tipo] = clave.split('-');
      return { id_caja: Number(idCaja), tipo_comprobante: tipo, ultimo_numero: n };
    }), { transaction });

    // ---- 9. Órdenes vivas para la cola de preparación (una con demora para la alerta del dashboard).
    const rOrd = crearAleatorio(semillaDeTexto(`${SEMILLA}|ordenes`));
    const abiertos = sim.turnosInfo.filter((t) => t.estado === 'ABIERTO' && t.inicioLocal > hoyLocalMs);
    const plantillasOrden = { 1: [['MOSTRADOR', 'Mesa 3', 'ABIERTA', 4], ['PARA_LLEVAR', 'Para llevar - Andrea', 'EN_PREPARACION', 22], ['MOSTRADOR', 'Mesa 7', 'LISTA', 9]], 2: [['MOSTRADOR', 'Terraza 2', 'EN_PREPARACION', 6], ['DELIVERY', 'Delivery - Hugo', 'ABIERTA', 3]], 3: [['MOSTRADOR', 'Mostrador - Don Luis', 'EN_PREPARACION', 11]] };
    const vendibles = PRODUCTOS.map((p, k) => ({ ...p, id: k + 1 })).filter((p) => p.clave !== PRODUCTO_DESACTIVADO.producto && p.clave !== PRODUCTO_ELIMINADO.producto && p.peso >= 2);
    const filasOrdenes = [];
    const filasOrdenDet = [];
    for (const s of SUCURSALES) {
      const turno = abiertos.find((t) => t.suc === s.id);
      if (!turno) continue;
      for (const [canal, etiqueta, estado, minutos] of plantillasOrden[s.id]) {
        const creado = ahoraRealMs - minutos * 60_000;
        if (creado < turno.inicioLocal) continue;
        filasOrdenes.push({ id_orden: filasOrdenes.length + 1, id_turno: turno.idTurno, canal, etiqueta, estado, creado_en: aUtc(creado) });
        for (let k = rOrd.entero(1, 3); k > 0; k -= 1) {
          const p = rOrd.elegir(vendibles);
          filasOrdenDet.push({ id_orden: filasOrdenes.length, id_producto: p.id, cantidad: p.cantidad === 'pupusa' ? rOrd.entero(2, 4) : 1, precio_unitario: p.precio, nota: null });
        }
      }
    }
    if (filasOrdenes.length) {
      await qi.bulkInsert(tabla('pos.ordenes'), filasOrdenes, { transaction });
      await qi.bulkInsert(tabla('pos.orden_detalles'), filasOrdenDet, { transaction });
      await sequelize.query("SELECT setval(pg_get_serial_sequence('pos.ordenes', 'id_orden'), (SELECT MAX(id_orden) FROM pos.ordenes))", { transaction });
    }

    // ---- 10. Bitácora: se descartan las filas que los triggers escribieron durante esta carga
    // (todas con la hora actual) y se carga la bitácora histórica con fechas reales.
    const bit = construirBitacora({
      rnd: crearAleatorio(semillaDeTexto(`${SEMILLA}|bitacora`)), dias: DIAS_HISTORIAL, inicioMs, ahoraLocalMs, ids, sim,
      filas: {
        unidades: filasUnidades, insumos: filasInsumos.map((i) => ({ ...i, costoInicial: i.costo_promedio })), productos: filasProductos, recetas: filasRecetas,
        proveedores: filasProveedores, rolesPermisos: filasRolesPermisos, permisosRetirados, usuarios: filasUsuarios, roles: ROLES.map((r) => ({ id_rol: r.id, nombre: r.nombre })), permisos,
      },
    });
    for (const [username, ms] of Object.entries(bit.ultimoLogin)) {
      await sequelize.query('UPDATE seguridad.usuarios SET ultimo_login = $1 WHERE id_usuario = $2', { bind: [aUtc(ms).toISOString(), ids.usuarios[username]], transaction });
    }
    await sequelize.query('DELETE FROM seguridad.bitacora', { transaction });
    await sequelize.query("SELECT setval(pg_get_serial_sequence('seguridad.bitacora', 'id_bitacora'), 1, false)", { transaction });
    await insertarEnLotes('seguridad.bitacora', bit.filas, transaction);

    // ---- 11. Verificaciones de coherencia: si alguna falla se lanza error y se revierte todo.
    const [chk] = await consultar(`SELECT
      (SELECT COUNT(*) FROM pos.ventas v WHERE v.total <> (SELECT SUM(subtotal_linea) FROM pos.venta_detalles d WHERE d.id_venta = v.id_venta) - v.descuento)::int AS ventas_mal_total,
      (SELECT COUNT(*) FROM pos.ventas v WHERE v.total <> (SELECT SUM(monto) FROM pos.pagos p WHERE p.id_venta = v.id_venta))::int AS ventas_mal_pago,
      (SELECT COUNT(*) FROM inventario.stock_sucursal WHERE stock_actual < 0)::int AS stock_negativo,
      (SELECT COUNT(*) FROM inventario.stock_sucursal ss WHERE ss.stock_actual <> COALESCE((SELECT m.stock_resultante FROM inventario.movimientos_inventario m
         WHERE m.id_sucursal = ss.id_sucursal AND m.id_insumo = ss.id_insumo ORDER BY m.id_movimiento DESC LIMIT 1), 0))::int AS kardex_descuadrado,
      (SELECT COUNT(*) FROM inventario.productos p WHERE p.es_elaborado AND NOT EXISTS (SELECT 1 FROM inventario.recetas r WHERE r.id_producto = p.id_producto))::int AS elaborados_sin_receta,
      (SELECT COUNT(*) FROM compras.facturas_compra f WHERE f.estado_pago <> CASE WHEN COALESCE((SELECT SUM(monto) FROM compras.pagos_proveedor p WHERE p.id_compra = f.id_compra), 0) = 0 THEN 'PENDIENTE'
         WHEN (SELECT SUM(monto) FROM compras.pagos_proveedor p WHERE p.id_compra = f.id_compra) = f.total THEN 'PAGADO' ELSE 'PARCIAL' END)::int AS cxp_descuadradas`, [], transaction);
    const fallos = Object.entries(chk).filter(([, v]) => v > 0);
    if (fallos.length) throw new Error(`Verificación fallida: ${fallos.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    return { sim, lotes, bitacora: bit.filas.length };
  }, ids.usuarios.admin);

  console.log(`Carga confirmada (COMMIT) en ${((Date.now() - t0) / 1000).toFixed(1)} s. Bitácora: ${resultado.bitacora} registros.`);
  await imprimirResumen(resultado.sim, param.tz);
}

async function imprimirResumen(sim, tz) {
  const conteos = await consultar(`SELECT t AS tabla, (xpath('/row/c/text()', query_to_xml('SELECT COUNT(*) AS c FROM ' || t, false, true, '')))[1]::text::int AS filas
    FROM unnest($1::text[]) AS t`, [[...TABLAS_DATOS].reverse()]);
  console.log('\nRegistros por tabla:');
  console.table(Object.fromEntries(conteos.map((c) => [c.tabla, c.filas])));
  const [rango] = await consultar(`SELECT MIN((fecha_emision AT TIME ZONE 'UTC') AT TIME ZONE $1::text)::date::text AS desde, MAX((fecha_emision AT TIME ZONE 'UTC') AT TIME ZONE $1::text)::date::text AS hasta FROM pos.ventas`, [tz]);
  console.log(`Ventas desde ${rango.desde} hasta ${rango.hasta} (hora local).`);
  const semana = await consultar(`SELECT ((v.fecha_emision AT TIME ZONE 'UTC') AT TIME ZONE $1::text)::date::text AS fecha, s.nombre AS sucursal, SUM(v.total)::numeric(12,2)::text AS total
    FROM pos.ventas v JOIN empresa.sucursales s USING (id_sucursal) WHERE v.estado = 'EMITIDA'
      AND ((v.fecha_emision AT TIME ZONE 'UTC') AT TIME ZONE $1::text)::date > (CURRENT_TIMESTAMP AT TIME ZONE $1::text)::date - 7
    GROUP BY 1, 2 ORDER BY 1, 2`, [tz]);
  const pivote = {};
  for (const f of semana) (pivote[f.fecha] ??= {})[f.sucursal] = f.total;
  console.log('\nVentas emitidas de los últimos 7 días por sucursal ($):');
  console.table(pivote);
  const alertas = await consultar('SELECT sucursal, insumo, unidad, stock_actual::text, stock_minimo::text, nivel FROM reportes.vw_alertas_stock ORDER BY sucursal, nivel, insumo');
  console.log('\nAlertas de stock (reportes.vw_alertas_stock):');
  console.table(alertas);
  console.log(`Faltantes planificados: ${FALTANTES.map((f) => `${f.suc}:${f.insumo}`).join(', ')}`);
  console.log(`Eventos del calendario simulados: ${sim.resumenEventos.length} días con eventos especiales.`);
  console.log(`\nCredenciales: usuarios internos con contraseña "${CONTRASENA_DEMO}"; portal cliente "cliente.demo" / "${CONTRASENA_CLIENTE_DEMO}".`);
}

try {
  await main();
} catch (error) {
  console.error('\nERROR: se revirtió la transacción; la base quedó como estaba antes de ejecutar el seed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
