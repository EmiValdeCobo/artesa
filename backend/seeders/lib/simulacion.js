// Simulación cronológica del historial: compras, ventas, anulaciones, mermas y ajustes.
// El stock se lleva en memoria con las mismas reglas que inventario.fn_mover_stock (nunca negativo),
// así cada movimiento del kárdex y su stock_resultante cuadran con el stock final.
import {
  CAJEROS_POR_SUCURSAL, CAMBIOS_PRECIO, CAMBIOS_RECETA, PRODUCTO_DESACTIVADO, PRODUCTO_ELIMINADO, PRODUCTOS, PROVEEDORES, SUCURSALES, USUARIOS,
} from '../datos/catalogo.js';

export const DIA_MS = 86_400_000;
const HORA_MS = 3_600_000;
const MIN_MS = 60_000;
const DESFASE_UTC_MS = 6 * HORA_MS; // America/El_Salvador = UTC-6 sin horario de verano

// Insumos que dejan de reponerse en los últimos N días (proveedor atrasado, temporada, etc.)
// para que las alertas de stock bajo/agotado del dashboard tengan casos reales.
export const FALTANTES = [
  { suc: 1, insumo: 'vaso16', dias: 6, motivo: 'Proveedor de empaques con retraso' },
  { suc: 1, insumo: 'jarabe_caramelo', dias: 14, motivo: 'Producto descontinuado por el distribuidor' },
  { suc: 1, insumo: 'leche_almendra', dias: 12, motivo: 'Sin existencia en el proveedor' },
  { suc: 2, insumo: 'loroco', dias: 10, motivo: 'Fin de temporada de loroco' },
  { suc: 2, insumo: 'crema_batida', dias: 7, motivo: 'Pedido incompleto del proveedor' },
  { suc: 2, insumo: 'mozzarella', dias: 8, motivo: 'Pedido incompleto del proveedor' },
  { suc: 3, insumo: 'cafe_grano', dias: 12, motivo: 'Compra retenida por presupuesto' },
  { suc: 3, insumo: 'gaseosa', dias: 12, motivo: 'Distribuidor sin ruta al centro' },
  { suc: 3, insumo: 'pan_baguette', dias: 3, motivo: 'Panificadora sin entrega' },
];

const PERECEDEROS = ['leche', 'crema_batida', 'fresa', 'lechuga', 'tomate', 'pan_baguette', 'pan_sandwich', 'aguacate', 'platano', 'quesillo', 'crema_acida'];
const MOTIVOS_MERMA = ['Producto vencido', 'Derrame durante la preparación', 'Producto en mal estado al recibir', 'Caída accidental', 'Cadena de frío interrumpida'];
const MOTIVOS_ANULACION = ['Error de digitación', 'Cliente cambió el pedido', 'Cobro duplicado', 'Producto no disponible', 'Cliente se retiró sin recibir el pedido'];
const NOTAS = { cafe: ['sin azúcar', 'extra caliente', 'para llevar', 'poca azúcar'], frio: ['sin crema', 'poco hielo', 'para llevar'], pupusa: ['sin curtido', 'bien doradas', 'para llevar'] };
const EGRESOS_CAJA = [['Compra de hielo de emergencia', 3, 8], ['Compra de limones en mercado', 2, 6], ['Pago de gas propano (cilindro)', 12, 18], ['Compra de servilletas urgentes', 3, 7]];

const MULT_FRANJA = [
  { hasta: 11, m: { cafe: 1.6, desayuno: 2.6, comida: 0.25, pupusa: 0.5, frio: 0.5, postre: 0.8, reventa: 0.9 } },
  { hasta: 15, m: { cafe: 0.7, desayuno: 0.25, comida: 2.2, pupusa: 1.6, frio: 1.4, postre: 0.8, reventa: 1.2 } },
  { hasta: 18, m: { cafe: 1.3, desayuno: 0.1, comida: 0.8, pupusa: 1.1, frio: 1.3, postre: 1.9, reventa: 1.0 } },
  { hasta: 24, m: { cafe: 0.8, desayuno: 0.05, comida: 0.9, pupusa: 2.3, frio: 1.1, postre: 1.1, reventa: 1.1 } },
];
const PAGOS = { 1: [34, 48, 3, 15], 2: [45, 40, 4, 11], 3: [66, 24, 5, 5] };
const METODOS = ['EFECTIVO', 'TARJETA', 'BITCOIN_CHIVO', 'TRANSFERENCIA'];

export const centavos = (texto) => Math.round(Number(texto) * 100);
export const micros = (texto) => Math.round(Number(texto) * 1e6);
export const fmtCentavos = (c) => `${c < 0 ? '-' : ''}${Math.floor(Math.abs(c) / 100)}.${String(Math.abs(c) % 100).padStart(2, '0')}`;
export const fmtMicros = (u) => `${Math.floor(u / 1e6)}.${String(u % 1e6).padStart(6, '0')}`;
export const aUtc = (msLocal) => new Date(msLocal + DESFASE_UTC_MS);
export const fechaTexto = (msLocal) => new Date(msLocal).toISOString().slice(0, 10);
// ROUND(a / b) de PostgreSQL (mitad lejos de cero) con enteros positivos.
const dividirRedondeo = (a, b) => Math.floor((2 * a + b) / (2 * b));

// costoConIvaMicros son millonésimas de dólar; importes de factura se trabajan en centavos.
export function calcularImporteCompraLinea(cantidad, costoConIvaMicros, tasaIvaPct) {
  const total = dividirRedondeo(cantidad * costoConIvaMicros, 10_000);
  const subtotal = dividirRedondeo(total * 100, 100 + tasaIvaPct);
  return {
    costoSinIvaMicros: dividirRedondeo(costoConIvaMicros * 100, 100 + tasaIvaPct),
    subtotal,
    iva: total - subtotal,
    total,
  };
}

function eventosDelDia(msDia, diasAntes, lluvia) {
  const f = new Date(msDia);
  const mes = f.getUTCMonth() + 1;
  const dia = f.getUTCDate();
  const dow = f.getUTCDay();
  const ultimo = new Date(Date.UTC(f.getUTCFullYear(), mes, 0)).getUTCDate();
  const ev = { factor: { 1: 1, 2: 1, 3: 1 }, impulso: {}, promo: null, etiquetas: [] };
  const todos = (x) => { for (const s of [1, 2, 3]) ev.factor[s] *= x; };
  const porSucursal = (m) => { for (const s of [1, 2, 3]) ev.factor[s] *= m[s]; };

  if (dia === 15 || dia === ultimo) { todos(1.15); ev.etiquetas.push('Quincena'); }
  else if (dia === 16 || dia === 1) todos(1.08);
  else if (dia === 13 || dia === 14 || dia >= ultimo - 2) todos(0.94);
  if (mes === 8 && dia <= 6) { porSucursal({ 1: 0.72, 2: 1.12, 3: 0.55 }); ev.etiquetas.push('Fiestas agostinas'); }
  if (mes === 9 && dia === 15) { porSucursal({ 1: 0.8, 2: 0.85, 3: 1.3 }); ev.etiquetas.push('Día de la Independencia'); }
  if (mes === 11 && dia === 2) { todos(0.62); ev.etiquetas.push('Día de los Difuntos (feriado)'); }
  if (mes === 12 && dia === 25) { todos(0.5); ev.etiquetas.push('Navidad'); }
  if (mes === 1 && dia === 1) { todos(0.45); ev.etiquetas.push('Año Nuevo'); }
  if (mes === 10 && dia === 1) { todos(1.3); ev.impulso.cafe = 1.7; ev.promo = 'DIA_CAFE'; ev.etiquetas.push('Día Internacional del Café (-10 % en bebidas calientes)'); }
  if (mes === 11 && dow === 0 && dia >= 8 && dia <= 14) { todos(1.25); ev.impulso.pupusa = 2.5; ev.etiquetas.push('Día Nacional de la Pupusa'); }
  if (mes === 10 && dia === 31) { porSucursal({ 1: 1.12, 2: 1.15, 3: 1 }); ev.etiquetas.push('Halloween'); }
  if (dow === 4 && diasAntes <= 42) { todos(1.06); ev.promo = ev.promo ?? 'FRAPPE_2X1'; ev.etiquetas.push('Jueves de frappé 2x1'); }
  if (diasAntes >= 34 && diasAntes <= 40) { todos(0.82); ev.etiquetas.push('Semana floja (obras viales en la zona)'); }
  if (diasAntes === 18) { todos(0.5); ev.etiquetas.push('Tormenta tropical'); }
  else if (lluvia) { porSucursal({ 1: 0.72, 2: 0.68, 3: 0.6 }); ev.etiquetas.push('Día lluvioso'); }
  return ev;
}

function usuarioDisponible(u, diasAntes) {
  if (u.creado !== undefined && diasAntes >= u.creado) return false;
  if (u.eliminado !== undefined && diasAntes <= u.eliminado) return false;
  if (u.desactivado !== undefined && diasAntes <= u.desactivado) return false;
  return true;
}

export async function simularHistoria({ rnd, sink, ids, dias, hoyLocalMs, ahoraLocalMs, tasaIvaPct }) {
  const inicioMs = hoyLocalMs - dias * DIA_MS;
  const usuarios = Object.fromEntries(USUARIOS.map((u) => [u.username, u]));
  const idUsuario = (username) => ids.usuarios[username];
  const insumosPorId = ids.insumos; // clave -> { id, unidad, costo, prov, paquete, tipo }
  const listaInsumos = Object.values(insumosPorId);
  const provPorClave = Object.fromEntries(PROVEEDORES.map((p) => [p.clave, p]));
  const sucIds = SUCURSALES.map((s) => s.id);

  // Recetas indexadas por id de insumo (ordenadas como fn_descontar_stock_por_venta: ORDER BY id_insumo).
  const productos = PRODUCTOS.map((p) => ({
    ...p,
    id: ids.productos[p.clave],
    precioCent: centavos(p.precio),
    receta: p.receta
      ? Object.entries(p.receta).map(([k, c]) => [insumosPorId[k].id, c]).sort((a, b) => a[0] - b[0])
      : [[insumosPorId[p.reventa].id, 1]],
  }));
  const cambiosPrecio = Object.fromEntries(CAMBIOS_PRECIO.map((c) => [c.producto, c]));
  const cambiosReceta = CAMBIOS_RECETA.map((c) => ({ ...c, idInsumo: insumosPorId[c.insumo].id }));
  const precioEn = (p, diasAntes) => (cambiosPrecio[p.clave] && diasAntes > cambiosPrecio[p.clave].dia ? centavos(cambiosPrecio[p.clave].antes) : p.precioCent);
  const recetaEn = (p, diasAntes) => {
    const cambio = cambiosReceta.find((c) => c.producto === p.clave && diasAntes > c.dia);
    return cambio ? p.receta.map(([i, c]) => [i, i === cambio.idInsumo ? cambio.antes : c]) : p.receta;
  };
  const vendible = (p, diasAntes) => !(p.clave === PRODUCTO_DESACTIVADO.producto && diasAntes <= PRODUCTO_DESACTIVADO.dia)
    && !(p.clave === PRODUCTO_ELIMINADO.producto && diasAntes <= PRODUCTO_ELIMINADO.dia);

  // ---- Política de inventario: consumo diario estimado -> mínimo, punto de reorden y objetivo.
  const politica = {};
  for (const suc of SUCURSALES) {
    const ticketsDia = suc.ticketsBase * (suc.semana.reduce((a, b) => a + b, 0) / 7);
    const pesos = productos.map((p) => p.peso * (p.suc?.[suc.id] ?? 1));
    const totalPeso = pesos.reduce((a, b) => a + b, 0);
    const consumo = {};
    productos.forEach((p, i) => {
      const unidades = ticketsDia * 1.9 * (pesos[i] / totalPeso) * (p.cantidad === 'pupusa' ? 2.7 : 1.15);
      for (const [idIns, cant] of p.receta) consumo[idIns] = (consumo[idIns] ?? 0) + unidades * cant;
    });
    politica[suc.id] = {};
    for (const ins of listaInsumos) {
      const diario = consumo[ins.id] ?? 0;
      const prov = provPorClave[ins.prov];
      const gap = maxBrecha(prov.dias);
      const pisoMin = ins.unidad === 'UND' ? (ins.tipo === 'REVENTA' ? 12 : 6) : 500;
      const redondear = (x, m) => Math.max(m, Math.ceil(x / m) * m);
      const multiplo = ins.unidad === 'UND' ? 1 : 100;
      const minimo = Math.max(pisoMin, redondear(diario * 2.5, multiplo));
      politica[suc.id][ins.id] = {
        diario,
        minimo,
        reorden: diario > 0 ? Math.max(minimo * 1.3, diario * (gap + 2.5)) : 0,
        objetivo: diario > 0 ? Math.max(minimo * 2.5, diario * (gap + 8)) : minimo * 2.5,
      };
    }
  }

  // ---- Estado
  const stock = Object.fromEntries(sucIds.map((s) => [s, {}]));
  const costo = Object.fromEntries(listaInsumos.map((i) => [i.id, micros(i.costo)]));
  const correlativos = {};
  const compras = { facturas: [], detalles: [], pagos: [], auditoriaCostos: [] };
  const seqFactura = Object.fromEntries(PROVEEDORES.map((p) => [p.clave, 1000 + p.id * 137]));
  const turnosInfo = [];
  const mermas = [];
  const resumenEventos = [];
  const ar = { 1: 0, 2: 0, 3: 0 };
  let totalMovimientos = 0;
  let turnoOlvidado = null;
  const sucursalPorId = Object.fromEntries(SUCURSALES.map((s) => [s.id, s]));
  const faltantes = FALTANTES.map((f) => ({ ...f, idInsumo: insumosPorId[f.insumo].id }));
  const bodegueroDe = (s) => (s === 1 ? 'bodega1' : 'bodega2');
  const gerenteDe = (s) => `gerente${s}`;

  let buffer = null;
  const mover = (s, idIns, cantidad, tipo, msLocal, { ref = null, refTipo = null, usuario = null, costoUnit = null, motivo = null } = {}) => {
    const nuevo = (stock[s][idIns] ?? 0) + cantidad;
    if (nuevo < 0) throw new Error(`Simulación inválida: stock negativo (suc ${s}, insumo ${idIns})`);
    stock[s][idIns] = nuevo;
    totalMovimientos += 1;
    buffer.movInv.push({
      id_sucursal: s, id_insumo: idIns, tipo, cantidad: String(cantidad), costo_unitario: fmtMicros(costoUnit ?? costo[idIns]),
      stock_resultante: String(nuevo), referencia_tipo: refTipo, referencia_id: ref, motivo, id_usuario: usuario, creado_en: aUtc(msLocal),
    });
  };
  const nuevoBuffer = () => ({ turnos: [], ventas: [], detalles: [], pagos: [], movCaja: [], movInv: [] });
  const volcar = async () => {
    for (const t of buffer.turnos) await sink.agregar('turnos_caja', t);
    for (const v of buffer.ventas) await sink.agregar('ventas', v);
    for (const d of buffer.detalles) await sink.agregar('venta_detalles', d);
    for (const p of buffer.pagos) await sink.agregar('pagos', p);
    for (const m of buffer.movCaja) await sink.agregar('movimientos_caja', m);
    for (const m of buffer.movInv) await sink.agregar('movimientos_inventario', m);
  };

  // ---- Inventario inicial (el día anterior al inicio del historial).
  buffer = nuevoBuffer();
  for (const s of sucIds) {
    let i = 0;
    for (const ins of listaInsumos) {
      const pol = politica[s][ins.id];
      const paquete = ins.paquete;
      const inicial = Math.max(paquete, Math.round((pol.objetivo * rnd.entre(0.85, 1.05)) / paquete) * paquete);
      mover(s, ins.id, inicial, 'INVENTARIO_INICIAL', inicioMs - DIA_MS + 6 * HORA_MS + (i += 1) * 5000,
        { usuario: idUsuario(bodegueroDe(s)), costoUnit: costo[ins.id], motivo: 'Conteo físico inicial de apertura del sistema' });
    }
  }
  await volcar();

  for (let d = 0; d <= dias; d += 1) {
    const msDia = inicioMs + d * DIA_MS;
    const diasAntes = dias - d;
    const esHoy = diasAntes === 0;
    const dow = new Date(msDia).getUTCDay();
    const mes = new Date(msDia).getUTCMonth() + 1;
    const lluvia = mes >= 5 && mes <= 10 ? rnd.prob(0.07) : rnd.prob(0.015);
    const ev = eventosDelDia(msDia, diasAntes, lluvia);
    if (ev.etiquetas.length) resumenEventos.push({ fecha: fechaTexto(msDia), eventos: ev.etiquetas });
    const tendencia = 0.94 + 0.12 * (d / dias) + 0.03 * Math.sin((2 * Math.PI * d) / 27);
    buffer = nuevoBuffer();

    // ---- Compras de la mañana (06:30) según día de entrega del proveedor.
    for (const s of sucIds) {
      let minuto = 0;
      for (const prov of PROVEEDORES) {
        if (!prov.dias.includes(dow)) continue;
        const items = [];
        for (const ins of listaInsumos.filter((x) => x.prov === prov.clave)) {
          const pol = politica[s][ins.id];
          const suspendido = faltantes.some((f) => f.suc === s && f.idInsumo === ins.id && diasAntes <= f.dias);
          const actual = stock[s][ins.id] ?? 0;
          if (suspendido || pol.diario === 0 || actual >= pol.reorden) continue;
          const cantidad = Math.ceil((pol.objetivo - actual) / ins.paquete) * ins.paquete;
          const cu = Math.round(micros(ins.costo) * (1 + 0.045 * (d / dias)) * (1 + 0.02 * rnd.normal()));
          items.push({ ins, cantidad, cu });
        }
        if (!items.length) continue;
        const msCompra = msDia + 6.5 * HORA_MS + (minuto += 7) * MIN_MS;
        registrarCompra({ prov, s, items, msCompra, usuario: bodegueroDe(s) });
      }
    }

    // ---- Gastos operativos: energía (día 5) y mantenimiento (días 1 y 16).
    const diaMes = new Date(msDia).getUTCDate();
    for (const s of sucIds) {
      if (diaMes === 5) {
        const base = { 1: 310, 2: 190, 3: 95 }[s];
        const monto = Math.round(base * (1 + 0.08 * rnd.normal()) * 100) * 10_000;
        registrarCompra({ prov: provPorClave.ENERGIA, s, items: [{ descripcion: `Servicio de energía eléctrica ${nombreMes(msDia - 10 * DIA_MS)}`, cantidad: 1, cu: monto }], msCompra: msDia + 9 * HORA_MS, usuario: 'contador1', gasto: true });
      }
      if (diaMes === 1 || diaMes === 16) {
        const desc = diaMes === 1 ? 'Limpieza profunda y fumigación' : 'Mantenimiento preventivo de máquina espresso';
        const monto = Math.round(rnd.entre(45, 120) * (s === 1 ? 1.4 : 1)) * 1e6;
        registrarCompra({ prov: provPorClave.MANTENIMIENTO, s, items: [{ descripcion: desc, cantidad: 1, cu: monto }], msCompra: msDia + 10 * HORA_MS, usuario: 'contador1', gasto: true });
      }
    }

    // ---- Ajuste por conteo físico semanal (lunes).
    if (dow === 1) {
      for (const s of sucIds) {
        for (let k = 0; k < 2; k += 1) {
          const ins = rnd.elegir(listaInsumos.filter((x) => x.tipo !== 'REVENTA'));
          const actual = stock[s][ins.id] ?? 0;
          if (actual < 200) continue;
          const delta = Math.max(1, Math.round(actual * rnd.entre(0.002, 0.01))) * (rnd.prob(0.65) ? -1 : 1);
          mover(s, ins.id, delta, 'AJUSTE', msDia + 6.25 * HORA_MS + k * MIN_MS, { usuario: idUsuario(bodegueroDe(s)), motivo: 'Ajuste por conteo físico semanal' });
        }
      }
    }

    // ---- Turnos y ventas por sucursal.
    for (const suc of SUCURSALES) {
      const s = suc.id;
      const cajas = suc.cajas.filter((c) => !(esHoy && turnoOlvidado && turnoOlvidado.idCaja === c.id));
      const excluir = new Set(esHoy && turnoOlvidado ? [turnoOlvidado.username] : []);
      const plantilla = CAJEROS_POR_SUCURSAL[s].filter((u) => usuarioDisponible(usuarios[u], diasAntes) && !excluir.has(u));
      const principales = plantilla.filter((u) => usuarios[u].rol === 'CAJERO');
      const apoyo = plantilla.filter((u) => usuarios[u].rol !== 'CAJERO');
      let orden = principales.map((_, i) => principales[(i + d) % principales.length]);
      if (cajas.length === 1 && suc.turnos.length === 1 && dow === 1 && apoyo.length) orden = [apoyo[0], ...orden];
      orden = [...orden, ...apoyo];

      // turnos[cajaId][franja]
      const turnos = {};
      cajas.forEach((caja, c) => {
        turnos[caja.id] = suc.turnos.map((franja, f) => {
          const inicio = msDia + franja.inicio * HORA_MS - rnd.entero(5, 15) * MIN_MS;
          if (esHoy && inicio > ahoraLocalMs) return null;
          const username = orden[f * cajas.length + c];
          return {
            id: rnd.uuid(), idCaja: caja.id, username, idUsuario: idUsuario(username), inicio,
            finVentas: msDia + franja.fin * HORA_MS, cierre: msDia + franja.fin * HORA_MS + rnd.entero(8, 25) * MIN_MS,
            efectivo: 0, tarjeta: 0, digital: 0, ingresos: 0, egresos: 0, ultimo: f === suc.turnos.length - 1,
          };
        });
      });

      ar[s] = 0.65 * ar[s] + 0.035 * rnd.normal();
      const factor = suc.semana[(dow + 6) % 7] * tendencia * ev.factor[s] * Math.exp(0.07 * rnd.normal()) * (1 + ar[s]);
      const nTickets = Math.max(3, Math.round(suc.ticketsBase * factor));
      const horas = Object.keys(suc.horas).map(Number);
      const pesosHora = horas.map((h) => suc.horas[h]);
      const primerInicio = msDia + suc.turnos[0].inicio * HORA_MS;
      const ultimoFin = msDia + suc.turnos[suc.turnos.length - 1].fin * HORA_MS;
      const tiempos = [];
      for (let k = 0; k < nTickets; k += 1) {
        const h = rnd.ponderado(horas, pesosHora);
        tiempos.push(Math.min(ultimoFin - MIN_MS, Math.max(primerInicio + MIN_MS, msDia + (h + rnd.siguiente()) * HORA_MS)));
      }
      tiempos.sort((a, b) => a - b);
      const anulacionesPendientes = [];
      const probAnular = esHoy && s === 1 ? 0.06 : 0.012;

      const procesarAnulaciones = (hasta) => {
        while (anulacionesPendientes.length && anulacionesPendientes[0].ms <= hasta) {
          const a = anulacionesPendientes.shift();
          for (const [idIns, cant] of [...a.consumo.entries()].sort((x, y) => x[0] - y[0])) {
            mover(s, idIns, cant, 'ANULACION_VENTA', a.ms, { ref: a.idVenta, refTipo: 'VENTA', usuario: a.anuladaPor });
          }
        }
      };

      for (const t of tiempos) {
        if (esHoy && t > ahoraLocalMs) break;
        procesarAnulaciones(t);
        const hora = Math.floor((t - msDia) / HORA_MS);
        const franjaIdx = suc.turnos.findIndex((x) => t < msDia + x.fin * HORA_MS);
        const caja = cajas.length > 1 && rnd.prob(0.38) ? cajas[1] : cajas[0];
        const turno = turnos[caja.id]?.[franjaIdx];
        if (!turno || t < turno.inicio) continue;

        // Selección de productos según popularidad, franja horaria, sucursal y eventos del día.
        const mFranja = MULT_FRANJA.find((x) => hora < x.hasta).m;
        const pesos = productos.map((p) => (vendible(p, diasAntes)
          ? p.peso * (p.suc?.[s] ?? 1) * mFranja[p.franja] * (ev.impulso[p.franja] ?? 1)
            * (ev.promo === 'FRAPPE_2X1' && p.clave.startsWith('frappe') ? 2 : 1)
          : 0));
        const nLineas = rnd.ponderado([1, 2, 3, 4], [42, 33, 17, 8]);
        const lineas = [];
        const consumo = new Map();
        for (let k = 0; k < nLineas; k += 1) {
          const p = rnd.ponderado(productos, pesos);
          if (lineas.some((l) => l.p === p)) continue;
          let cantidad = p.cantidad === 'pupusa' ? rnd.ponderado([1, 2, 3, 4, 5, 6], [18, 30, 24, 16, 7, 5]) : rnd.ponderado([1, 2, 3], [86, 11, 3]);
          if (ev.promo === 'FRAPPE_2X1' && p.clave.startsWith('frappe') && rnd.prob(0.6)) cantidad = Math.max(2, cantidad);
          const receta = recetaEn(p, diasAntes);
          const alcanza = (q) => receta.every(([i, c]) => (stock[s][i] ?? 0) >= c * q);
          if (!alcanza(cantidad)) {
            if (cantidad > 1 && alcanza(1)) cantidad = 1;
            else continue; // sin stock: el producto no se vende (igual que fn_mover_stock lo rechazaría)
          }
          for (const [i, c] of receta) {
            stock[s][i] -= c * cantidad; // reserva inmediata; el movimiento se registra abajo
            consumo.set(i, (consumo.get(i) ?? 0) + c * cantidad);
          }
          lineas.push({ p, cantidad, precio: precioEn(p, diasAntes), receta, nota: NOTAS[p.franja] && rnd.prob(0.08) ? rnd.elegir(NOTAS[p.franja]) : null });
        }
        if (!lineas.length) continue;
        for (const [i, c] of consumo) stock[s][i] += c; // se devuelve la reserva; mover() la descuenta con kárdex

        const bruto = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
        let descuento = 0;
        if (ev.promo === 'FRAPPE_2X1') descuento = lineas.filter((l) => l.p.clave.startsWith('frappe')).reduce((a, l) => a + Math.floor(l.cantidad / 2) * l.precio, 0);
        if (ev.promo === 'DIA_CAFE') descuento = Math.round(lineas.filter((l) => l.p.cat === 1).reduce((a, l) => a + l.precio * l.cantidad, 0) * 0.1);
        const total = bruto - descuento;
        const iva = dividirRedondeo(total * tasaIvaPct, 100 + tasaIvaPct);

        let tipo = 'FCF';
        let idCliente = null;
        const ccf = ids.clientesCcf[s];
        if (ccf.length && rnd.prob({ 1: 0.03, 2: 0.02, 3: 0.05 }[s])) { tipo = 'CCF'; idCliente = rnd.elegir(ccf); }
        else if (ids.clientesFcf[s].length && rnd.prob(0.04)) idCliente = rnd.elegir(ids.clientesFcf[s]);
        const clave = `${caja.id}-${tipo}`;
        correlativos[clave] = (correlativos[clave] ?? 0) + 1;
        const n = correlativos[clave];
        const est = `${suc.codigo}${caja.pv}`;
        const idVenta = rnd.uuid();
        const msVenta = t;

        // Pagos (mixto ocasional). El total de pagos siempre cuadra con el total de la venta.
        const pagos = [];
        const metodo = tipo === 'CCF' ? rnd.elegir(['TARJETA', 'TRANSFERENCIA']) : rnd.ponderado(METODOS, PAGOS[s]);
        if (metodo === 'EFECTIVO' && total >= 400 && rnd.prob(0.06)) {
          const efectivo = Math.floor(total / 200) * 100;
          pagos.push({ metodo: 'EFECTIVO', monto: efectivo, recibido: efectivo }, { metodo: 'TARJETA', monto: total - efectivo, recibido: null });
        } else {
          let recibido = null;
          if (metodo === 'EFECTIVO') {
            const redondeo = rnd.ponderado([0, 100, 500, 1000, 2000], [25, 25, 25, 15, 10]);
            recibido = redondeo === 0 ? total : Math.ceil(total / redondeo) * redondeo;
            if (recibido === total && redondeo > 0) recibido += redondeo;
          }
          pagos.push({ metodo, monto: total, recibido });
        }

        const anular = rnd.prob(probAnular);
        const msAnula = msVenta + rnd.entero(2, 20) * MIN_MS;
        const anulada = anular && !(esHoy && msAnula > ahoraLocalMs);
        const anuladaPor = anulada ? idUsuario(s !== 1 && usuarioDisponible(usuarios.supervisor1, diasAntes) && rnd.prob(0.3) ? 'supervisor1' : gerenteDe(s)) : null;

        buffer.ventas.push({
          id_venta: idVenta, id_turno: turno.id, id_sucursal: s, id_usuario: turno.idUsuario, id_cliente: idCliente, id_orden: null,
          tipo_comprobante: tipo, correlativo: `${tipo}-${est}-${String(n).padStart(8, '0')}`,
          numero_control: `DTE-${tipo === 'FCF' ? '01' : '03'}-${est}-${String(n).padStart(15, '0')}`,
          codigo_generacion: rnd.uuid(), sello_recepcion: `SIMULADO-${idVenta.slice(0, 8).toUpperCase()}`, estado_dte: 'ACEPTADO',
          subtotal: fmtCentavos(total - iva), descuento: fmtCentavos(descuento), iva: fmtCentavos(iva), total: fmtCentavos(total),
          estado: anulada ? 'ANULADA' : 'EMITIDA', motivo_anulacion: anulada ? rnd.elegir(MOTIVOS_ANULACION) : null,
          anulada_por: anuladaPor, anulada_en: anulada ? aUtc(msAnula) : null, fecha_emision: aUtc(msVenta),
        });
        for (const l of lineas) {
          buffer.detalles.push({ id_venta: idVenta, id_producto: l.p.id, cantidad: l.cantidad, precio_unitario: fmtCentavos(l.precio), subtotal_linea: fmtCentavos(l.precio * l.cantidad), nota: l.nota });
          for (const [i, c] of l.receta) mover(s, i, -c * l.cantidad, 'VENTA', msVenta, { ref: idVenta, refTipo: 'VENTA', usuario: turno.idUsuario });
        }
        for (const p of pagos) {
          const referencia = p.metodo === 'TARJETA' ? `AUTH-${rnd.entero(100000, 999999)}` : p.metodo === 'TRANSFERENCIA' ? `TRF-${rnd.entero(10000000, 99999999)}` : p.metodo === 'BITCOIN_CHIVO' ? `CHIVO-${idVenta.slice(0, 12)}` : null;
          buffer.pagos.push({ id_venta: idVenta, metodo: p.metodo, monto: fmtCentavos(p.monto), monto_recibido: p.recibido === null ? null : fmtCentavos(p.recibido), referencia });
          if (!anulada) {
            if (p.metodo === 'EFECTIVO') turno.efectivo += p.monto;
            else if (p.metodo === 'TARJETA') turno.tarjeta += p.monto;
            else turno.digital += p.monto;
          }
        }
        if (anulada) anulacionesPendientes.push({ ms: msAnula, idVenta, consumo, anuladaPor });
      }
      procesarAnulaciones(Number.MAX_SAFE_INTEGER);

      // ---- Movimientos de caja y cierre de turnos (cuadre como fn_cerrar_turno).
      for (const caja of cajas) {
        for (const turno of turnos[caja.id]) {
          if (!turno) continue;
          const msMov = turno.inicio + rnd.entero(60, 300) * MIN_MS;
          if (rnd.prob(0.22) && (!esHoy || msMov <= ahoraLocalMs)) {
            const [concepto, min, max] = rnd.elegir(EGRESOS_CAJA);
            const monto = rnd.entero(min * 4, max * 4) * 25;
            turno.egresos += monto;
            buffer.movCaja.push({ id_turno: turno.id, tipo: 'EGRESO', concepto, monto: fmtCentavos(monto), id_usuario: turno.idUsuario, creado_en: aUtc(msMov) });
          }
          if (rnd.prob(0.05) && (!esHoy || turno.inicio + 30 * MIN_MS <= ahoraLocalMs)) {
            const monto = rnd.elegir([2000, 2500]);
            turno.ingresos += monto;
            buffer.movCaja.push({ id_turno: turno.id, tipo: 'INGRESO', concepto: 'Fondo adicional de cambio', monto: fmtCentavos(monto), id_usuario: turno.idUsuario, creado_en: aUtc(turno.inicio + 30 * MIN_MS) });
          }
          const apertura = Math.round(suc.apertura * 100);
          const olvidado = diasAntes === 1 && s === 1 && caja.id === 2 && turno.ultimo;
          const abierto = olvidado || (esHoy && (turno.ultimo || turno.cierre > ahoraLocalMs));
          const fila = { id_turno: turno.id, id_caja: caja.id, id_usuario: turno.idUsuario, monto_apertura: fmtCentavos(apertura), abierto_en: aUtc(turno.inicio), estado: abierto ? 'ABIERTO' : 'CERRADO' };
          if (!abierto) {
            const esperado = apertura + turno.efectivo + turno.ingresos - turno.egresos;
            const r = rnd.siguiente();
            const dif = r < 0.8 ? 0 : r < 0.92 ? rnd.entero(-15, 15) * 5 : r < 0.98 ? rnd.entero(-60, 60) * 5 : -rnd.entero(100, 240) * 5;
            const difTarjeta = rnd.prob(0.03) ? rnd.entero(-40, 40) * 5 : 0;
            Object.assign(fila, {
              monto_cierre_efectivo: fmtCentavos(Math.max(0, esperado + dif)), monto_cierre_pos_tarjeta: fmtCentavos(Math.max(0, turno.tarjeta + difTarjeta)), monto_cierre_digital: fmtCentavos(turno.digital),
              esperado_efectivo: fmtCentavos(esperado), esperado_tarjeta: fmtCentavos(turno.tarjeta), esperado_digital: fmtCentavos(turno.digital),
              dif_efectivo: fmtCentavos(Math.max(0, esperado + dif) - esperado), dif_tarjeta: fmtCentavos(Math.max(0, turno.tarjeta + difTarjeta) - turno.tarjeta), dif_digital: '0.00',
              cerrado_en: aUtc(turno.cierre),
            });
          }
          if (olvidado) turnoOlvidado = { idCaja: caja.id, username: turno.username };
          buffer.turnos.push(fila);
          turnosInfo.push({ username: turno.username, suc: s, inicioLocal: turno.inicio, estado: fila.estado, idTurno: turno.id, idCaja: caja.id });
        }
      }

      // ---- Mermas de cierre (perecederos).
      if (rnd.prob(0.18) && !(esHoy && msDia + 20.5 * HORA_MS > ahoraLocalMs)) {
        const ins = insumosPorId[rnd.elegir(PERECEDEROS)];
        const actual = stock[s][ins.id] ?? 0;
        const cantidad = ins.unidad === 'UND' ? Math.min(actual, rnd.entero(1, 3)) : Math.round(actual * rnd.entre(0.02, 0.06));
        if (cantidad > 0) {
          const usuario = rnd.prob(0.5) ? bodegueroDe(s) : gerenteDe(s);
          const motivo = rnd.elegir(MOTIVOS_MERMA);
          const ms = msDia + 20.5 * HORA_MS;
          mover(s, ins.id, -cantidad, 'MERMA', ms, { usuario: idUsuario(usuario), motivo });
          mermas.push({ suc: s, idInsumo: ins.id, cantidad, ms, usuario, motivo });
        }
      }
    }
    await volcar();
  }

  return { stock, costo, politica, compras, correlativos, turnosInfo, mermas, resumenEventos, totalMovimientos, inicioMs, sucursalPorId };

  // ---- Compra: factura + detalles con los mismos cálculos que compras.fn_registrar_compra y su trigger.
  function registrarCompra({ prov, s, items, msCompra, usuario, gasto = false }) {
    const idCompra = rnd.uuid();
    const fecha = fechaTexto(msCompra);
    const condicion = prov.credito > 0 && rnd.prob(0.85) ? 'CREDITO' : 'CONTADO';
    const dias = condicion === 'CREDITO' ? prov.credito : 0;
    const lineas = items.map((it) => {
      const costoConIvaMicros = dividirRedondeo(it.cu * (100 + tasaIvaPct), 100);
      return { ...it, costoConIvaMicros, importe: calcularImporteCompraLinea(it.cantidad, costoConIvaMicros, tasaIvaPct) };
    });
    const subtotal = lineas.reduce((a, it) => a + it.importe.subtotal, 0);
    const iva = lineas.reduce((a, it) => a + it.importe.iva, 0);
    const total = lineas.reduce((a, it) => a + it.importe.total, 0);
    seqFactura[prov.clave] += 1;
    compras.facturas.push({
      id_compra: idCompra, id_proveedor: prov.id, id_sucursal: s, id_usuario: idUsuario(usuario), num_factura: `${prov.prefijo}-${String(seqFactura[prov.clave]).padStart(6, '0')}`,
      tipo_costo: gasto ? 'GASTO' : 'COSTO', fecha_emision: fecha, condicion_pago: condicion, fecha_vencimiento: fechaTexto(msCompra + dias * DIA_MS),
      subtotal: fmtCentavos(subtotal), iva_credito: fmtCentavos(iva), total: fmtCentavos(total), estado_pago: 'PENDIENTE',
      // El simulador separa IVA como crédito fiscal, por eso todas sus compras son CCF.
      tipo_documento: 'CCF',
    });
    for (const it of lineas) {
      compras.detalles.push({
        id_compra: idCompra, id_insumo: it.ins?.id ?? null, descripcion: it.descripcion ?? null, cantidad: String(it.cantidad),
        costo_unitario: fmtMicros(it.importe.costoSinIvaMicros), costo_unitario_con_iva: fmtMicros(it.costoConIvaMicros),
        subtotal: fmtCentavos(it.importe.subtotal),
      });
      if (!it.ins) continue;
      // Costo promedio ponderado global (mismo cálculo que compras.fn_trg_detalle_compra).
      const stockTotal = sucIds.reduce((a, x) => a + Math.max(0, stock[x][it.ins.id] ?? 0), 0);
      const antes = costo[it.ins.id];
      costo[it.ins.id] = Math.round((stockTotal * antes + it.cantidad * it.importe.costoSinIvaMicros) / (stockTotal + it.cantidad));
      compras.auditoriaCostos.push({ idInsumo: it.ins.id, antes, despues: costo[it.ins.id], ms: msCompra, usuario });
      mover(s, it.ins.id, it.cantidad, 'COMPRA', msCompra, { ref: idCompra, refTipo: 'COMPRA', usuario: idUsuario(usuario), costoUnit: it.importe.costoSinIvaMicros });
    }
    // Pagos: contado en efectivo el mismo día; crédito al vencer (algunos parciales o pendientes para CxP).
    const vence = msCompra + dias * DIA_MS;
    const hoyMs = hoyLocalMs;
    const pagar = (monto, ms, metodo, quien) => compras.pagos.push({ id_compra: idCompra, fecha_pago: fechaTexto(ms), monto: fmtCentavos(monto), metodo, referencia: metodo === 'EFECTIVO' ? null : `${metodo.slice(0, 3)}-${rnd.entero(100000, 999999)}`, id_usuario: idUsuario(quien) });
    if (condicion === 'CONTADO') { pagar(total, msCompra, 'EFECTIVO', usuario); return; }
    const r = rnd.siguiente();
    if (vence <= hoyMs) {
      const msPago = Math.min(hoyMs, Math.max(msCompra, vence + rnd.entero(-3, 4) * DIA_MS));
      if (r < 0.96 || vence < hoyMs - 30 * DIA_MS) pagar(total, msPago, rnd.prob(0.8) ? 'TRANSFERENCIA' : 'CHEQUE', 'contador1');
      else if (r < 0.985) pagar(Math.round(total * rnd.entre(0.4, 0.6)), msPago, 'TRANSFERENCIA', 'contador1');
    } else if (r < 0.2 && msCompra + 2 * DIA_MS <= hoyMs) {
      pagar(Math.round(total * rnd.entre(0.3, 0.5)), msCompra + 2 * DIA_MS, 'TRANSFERENCIA', 'contador1');
    }
  }
}

function maxBrecha(diasSemana) {
  if (!diasSemana.length) return 7;
  const orden = [...diasSemana].sort((a, b) => a - b);
  let max = 0;
  for (let i = 0; i < orden.length; i += 1) {
    const sig = i + 1 < orden.length ? orden[i + 1] : orden[0] + 7;
    max = Math.max(max, sig - orden[i]);
  }
  return max;
}

function nombreMes(msLocal) {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = new Date(msLocal);
  return `${meses[f.getUTCMonth()]} ${f.getUTCFullYear()}`;
}
