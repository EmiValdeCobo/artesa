// frontend/src/modules/pos/preparacionDnd.js
// Lógica pura de arrastrar y soltar (DnD) para la cola de preparación (KDS).
// Sin dependencias de React para permitir pruebas unitarias con node:test.

export const ESTADOS_ORDEN = ['ABIERTA', 'EN_PREPARACION', 'LISTA', 'ENTREGADA'];
export const COLUMNAS_KDS = ['ABIERTA', 'EN_PREPARACION', 'LISTA'];
export const RETARDO_SINCRONIZACION_MS = 600;

export const MENSAJES_DND = {
  MOVIMIENTO_INVALIDO: 'Solo se puede avanzar el estado de la orden',
  ORDEN_ENTREGADA: 'Orden entregada y retirada de la cola activa',
};

export const ETIQUETAS_ESTADO = {
  ABIERTA: 'Nueva',
  EN_PREPARACION: 'En preparación',
  LISTA: 'Lista',
  ENTREGADA: 'Entregada',
};

/**
 * Valida si la transición de estado es válida según las reglas del KDS:
 * - Solo hacia adelante: ABIERTA -> EN_PREPARACION, ABIERTA -> LISTA, EN_PREPARACION -> LISTA
 * - LISTA -> ENTREGADA únicamente desde LISTA
 * - No se permite retroceder ni soltar en la misma columna
 * @param {string} origen
 * @param {string} destino
 * @returns {boolean}
 */
export function esMovimientoValido(origen, destino) {
  if (!origen || !destino || origen === destino) return false;
  if (!ESTADOS_ORDEN.includes(origen) || !ESTADOS_ORDEN.includes(destino)) return false;

  if (origen === 'ABIERTA') {
    return destino === 'EN_PREPARACION' || destino === 'LISTA';
  }

  if (origen === 'EN_PREPARACION') {
    return destino === 'LISTA';
  }

  if (origen === 'LISTA') {
    return destino === 'ENTREGADA';
  }

  return false;
}

/**
 * Calcula la secuencia de estados intermedios requeridos por la API del backend.
 * Dado que el backend exige avanzar paso a paso (409 si se salta un paso),
 * saltar de ABIERTA a LISTA requiere llamar EN_PREPARACION y luego LISTA.
 * @param {string} origen
 * @param {string} destino
 * @returns {string[]} Lista de estados a invocar secuencialmente
 */
export function rutaDeEstados(origen, destino) {
  if (!esMovimientoValido(origen, destino)) return [];

  const indiceOrigen = ESTADOS_ORDEN.indexOf(origen);
  const indiceDestino = ESTADOS_ORDEN.indexOf(destino);

  const ruta = [];
  for (let i = indiceOrigen + 1; i <= indiceDestino; i++) {
    ruta.push(ESTADOS_ORDEN[i]);
  }
  return ruta;
}

/**
 * Aplica el movimiento optimista a la lista de órdenes local:
 * - Si el nuevo estado es ENTREGADA, retira la orden de la cola (no hay columna ENTREGADA en KDS).
 * - En otro caso, actualiza el estado de la orden especificada.
 * @param {Array<object>} cola
 * @param {number} idOrden
 * @param {string} nuevoEstado
 * @returns {Array<object>} Nueva copia inmutable de la cola
 */
export function moverOrdenOptimista(cola, idOrden, nuevoEstado) {
  if (!Array.isArray(cola)) return [];

  if (nuevoEstado === 'ENTREGADA') {
    return cola.filter((o) => o.id_orden !== idOrden);
  }

  return cola.map((o) => {
    if (o.id_orden === idOrden) {
      return { ...o, estado: nuevoEstado };
    }
    return o;
  });
}

/**
 * Reconcilia la cola local con la respuesta del servidor tras un polling,
 * preservando las órdenes que aún están pendientes de sincronización o en progreso.
 * @param {Array<object>} colaLocal
 * @param {Array<object>} colaServidor
 * @param {Set<number>} idsPendientes Set con los IDs de órdenes con sincronización pendiente o en curso
 * @returns {Array<object>}
 */
export function reconciliarCola(colaLocal, colaServidor, idsPendientes) {
  if (!Array.isArray(colaServidor)) return Array.isArray(colaLocal) ? colaLocal : [];
  if (!idsPendientes || idsPendientes.size === 0) return colaServidor;

  const mapaLocal = new Map((colaLocal || []).map((o) => [o.id_orden, o]));

  const resultado = [];
  const procesadas = new Set();

  for (const ordenServidor of colaServidor) {
    const id = ordenServidor.id_orden;
    procesadas.add(id);

    if (idsPendientes.has(id)) {
      const ordenLocal = mapaLocal.get(id);
      if (ordenLocal) {
        resultado.push(ordenLocal);
      }
      // Si la orden local no existe (p. ej. se marcó optimista como ENTREGADA), no se añade
    } else {
      resultado.push(ordenServidor);
    }
  }

  // Si hay alguna orden local pendiente que no venía en servidor (raro, salvo alta concurrente)
  for (const [id, ordenLocal] of mapaLocal.entries()) {
    if (idsPendientes.has(id) && !procesadas.has(id) && ordenLocal.estado !== 'ENTREGADA') {
      resultado.push(ordenLocal);
    }
  }

  return resultado;
}

/**
 * Gestor de sincronización diferida (debounce) por orden.
 * Agrupa movimientos sucesivos sobre una misma orden en un único envío final,
 * ejecuta los pasos de la FSM secuencialmente y notifica el resultado.
 */
export class GestorSincronizacion {
  /**
   * @param {object} opciones
   * @param {(idOrden: number, estado: string) => Promise<any>} opciones.apiCambiarEstado
   * @param {(idOrden: number) => void} [opciones.alIniciar]
   * @param {(idOrden: number) => void} [opciones.alFinalizar]
   * @param {(idOrden: number, estadoFinal: string) => void} [opciones.alExito]
   * @param {(idOrden: number, error: any, estadoOriginal: string) => void} [opciones.alError]
   * @param {number} [opciones.retardoMs]
   */
  constructor({
    apiCambiarEstado,
    alIniciar = () => {},
    alFinalizar = () => {},
    alExito = () => {},
    alError = () => {},
    retardoMs = RETARDO_SINCRONIZACION_MS,
  }) {
    this.apiCambiarEstado = apiCambiarEstado;
    this.alIniciar = alIniciar;
    this.alFinalizar = alFinalizar;
    this.alExito = alExito;
    this.alError = alError;
    this.retardoMs = retardoMs;

    /** @type {Map<number, { timer: any, estadoConfirmado: string, estadoDestino: string, enEjecucion?: boolean }>} */
    this.pendientes = new Map();
  }

  /**
   * Programa un movimiento con debounce. Si la misma orden se vuelve a mover
   * antes de que expire el temporizador, se reinicia y solo cuenta el estado final.
   * @param {number} idOrden
   * @param {string} estadoOrigen Estado actual confirmado o último conocido
   * @param {string} estadoDestino Nuevo estado deseado
   */
  programar(idOrden, estadoOrigen, estadoDestino) {
    const previo = this.pendientes.get(idOrden);

    if (previo?.timer) {
      clearTimeout(previo.timer);
    }

    const estadoConfirmado = previo ? previo.estadoConfirmado : estadoOrigen;

    // Si el usuario devolvió la orden a su estado inicial antes de sincronizar, se anula
    if (estadoConfirmado === estadoDestino) {
      this.pendientes.delete(idOrden);
      return;
    }

    const timer = setTimeout(() => {
      this._ejecutar(idOrden);
    }, this.retardoMs);

    this.pendientes.set(idOrden, {
      timer,
      estadoConfirmado,
      estadoDestino,
      enEjecucion: false,
    });
  }

  /**
   * Ejecuta la sincronización paso a paso hacia el backend.
   * @private
   * @param {number} idOrden
   */
  async _ejecutar(idOrden) {
    const item = this.pendientes.get(idOrden);
    if (!item) return;

    item.timer = null;
    item.enEjecucion = true;

    const { estadoConfirmado, estadoDestino } = item;
    const ruta = rutaDeEstados(estadoConfirmado, estadoDestino);

    this.alIniciar(idOrden);

    try {
      for (const paso of ruta) {
        await this.apiCambiarEstado(idOrden, paso);
      }
      this.pendientes.delete(idOrden);
      this.alExito(idOrden, estadoDestino);
    } catch (err) {
      this.pendientes.delete(idOrden);
      this.alError(idOrden, err, estadoConfirmado);
    } finally {
      this.alFinalizar(idOrden);
    }
  }

  /**
   * Envía de inmediato todos los movimientos pendientes con temporizador activo.
   * Se invoca en desmontaje de componente para no perder cambios recientes.
   */
  ejecutarPendientes() {
    const ids = Array.from(this.pendientes.keys());
    for (const id of ids) {
      const item = this.pendientes.get(id);
      if (item?.timer) {
        clearTimeout(item.timer);
        item.timer = null;
        this._ejecutar(id);
      }
    }
  }

  /**
   * Cancela el temporizador y descarta la sincronización pendiente de una orden.
   * @param {number} idOrden
   */
  cancelar(idOrden) {
    const item = this.pendientes.get(idOrden);
    if (item?.timer) {
      clearTimeout(item.timer);
    }
    this.pendientes.delete(idOrden);
  }

  /**
   * Cancela todos los temporizadores pendientes.
   */
  cancelarTodos() {
    for (const item of this.pendientes.values()) {
      if (item?.timer) clearTimeout(item.timer);
    }
    this.pendientes.clear();
  }

  /**
   * Indica si hay movimientos pendientes o en ejecución.
   * @returns {boolean}
   */
  tienePendientes() {
    return this.pendientes.size > 0;
  }

  /**
   * Devuelve un Set con los IDs de órdenes pendientes o en ejecución.
   * @returns {Set<number>}
   */
  obtenerIdsPendientes() {
    return new Set(this.pendientes.keys());
  }

  /**
   * Verifica si una orden específica tiene sincronización pendiente o en curso.
   * @param {number} idOrden
   * @returns {boolean}
   */
  esPendiente(idOrden) {
    return this.pendientes.has(idOrden);
  }
}
