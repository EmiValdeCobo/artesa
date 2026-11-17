// frontend/src/utils/tabla.js
// Lógica pura de ordenamiento, comparación sin float y paginación para tablas de artesa.

const collatorTexto = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const esVacio = (v) => v === null || v === undefined || v === '';

/**
 * Compara dos cadenas numéricas o monetarias (PostgreSQL NUMERIC) sin usar jamás parseFloat.
 * Previene pérdidas de precisión en cálculos y comparaciones de dinero.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {-1|0|1}
 */
export function compararStringsNumericos(a, b) {
  let sA = String(a ?? '').trim();
  let sB = String(b ?? '').trim();

  if (sA.startsWith('+')) sA = sA.slice(1).trim();
  if (sB.startsWith('+')) sB = sB.slice(1).trim();

  const negA = sA.startsWith('-');
  const negB = sB.startsWith('-');

  const rawA = negA ? sA.slice(1).trim() : sA;
  const rawB = negB ? sB.slice(1).trim() : sB;

  const [entAStr = '0', decA = ''] = rawA.split('.');
  const [entBStr = '0', decB = ''] = rawB.split('.');

  // Limpiar ceros a la izquierda
  const entA = entAStr.replace(/^0+(?!$)/, '') || '0';
  const entB = entBStr.replace(/^0+(?!$)/, '') || '0';

  // Normalizar decimales rellenando con ceros a la derecha
  const maxDecLen = Math.max(decA.length, decB.length);
  const decANorm = decA.padEnd(maxDecLen, '0');
  const decBNorm = decB.padEnd(maxDecLen, '0');

  // Detectar si numéricamente ambos representan 0 (ej. -0.00 vs 0)
  const esCeroA = entA === '0' && /^0*$/.test(decA);
  const esCeroB = entB === '0' && /^0*$/.test(decB);

  if (esCeroA && esCeroB) return 0;
  if (negA && !negB) return -1;
  if (!negA && negB) return 1;

  // Ambos positivos o ambos negativos: comparar magnitud
  let cmpMag = 0;
  if (entA.length !== entB.length) {
    cmpMag = entA.length < entB.length ? -1 : 1;
  } else if (entA !== entB) {
    cmpMag = entA < entB ? -1 : 1;
  } else if (decANorm !== decBNorm) {
    cmpMag = decANorm < decBNorm ? -1 : 1;
  } else {
    cmpMag = 0;
  }

  if (cmpMag === 0) return 0;
  return negA ? -cmpMag : cmpMag;
}

/**
 * Compara dos valores según el tipo de dato especificado.
 * Manejo de vacíos: si un valor es nulo/vacío va después (+1). Si ambos son vacíos, 0.
 * @param {any} a
 * @param {any} b
 * @param {'texto'|'numero'|'dinero'|'fecha'|'booleano'} tipo
 * @returns {-1|0|1}
 */
export function compararValores(a, b, tipo = 'texto') {
  const vacioA = esVacio(a);
  const vacioB = esVacio(b);

  if (vacioA && !vacioB) return 1;
  if (!vacioA && vacioB) return -1;
  if (vacioA && vacioB) return 0;

  switch (tipo) {
    case 'numero':
    case 'dinero':
      return compararStringsNumericos(a, b);

    case 'fecha': {
      const tsA = Date.parse(a);
      const tsB = Date.parse(b);
      if (!Number.isNaN(tsA) && !Number.isNaN(tsB)) {
        if (tsA < tsB) return -1;
        if (tsA > tsB) return 1;
        return 0;
      }
      return String(a).localeCompare(String(b));
    }

    case 'booleano': {
      const valA = Boolean(a) ? 1 : 0;
      const valB = Boolean(b) ? 1 : 0;
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    }

    case 'texto':
    default:
      return collatorTexto.compare(String(a), String(b));
  }
}

/**
 * Ordena un arreglo de filas de forma estable preservando empates.
 * Los valores vacíos (null, undefined, '') quedan SIEMPRE al final tanto en 'asc' como en 'desc'.
 * @param {Array<object>} filas
 * @param {string} clave
 * @param {'asc'|'desc'} direccion
 * @param {'texto'|'numero'|'dinero'|'fecha'|'booleano'} tipo
 * @param {((fila: object) => any)|null} valorOrden
 * @returns {Array<object>}
 */
export function ordenarFilas(filas, clave, direccion = 'asc', tipo = 'texto', valorOrden = null) {
  if (!Array.isArray(filas) || filas.length <= 1) {
    return Array.isArray(filas) ? [...filas] : [];
  }
  if (!clave && typeof valorOrden !== 'function') {
    return [...filas];
  }

  const extractor = typeof valorOrden === 'function' ? valorOrden : (f) => f?.[clave];
  const mapeado = filas.map((item, index) => ({ item, index, val: extractor(item) }));

  mapeado.sort((a, b) => {
    const vA = a.val;
    const vB = b.val;
    const vacioA = esVacio(vA);
    const vacioB = esVacio(vB);

    // Los nulos y vacíos van SIEMPRE al final en asc y desc
    if (vacioA && !vacioB) return 1;
    if (!vacioA && vacioB) return -1;
    if (vacioA && vacioB) return a.index - b.index;

    const cmp = compararValores(vA, vB, tipo);
    if (cmp !== 0) {
      return direccion === 'desc' ? -cmp : cmp;
    }
    return a.index - b.index;
  });

  return mapeado.map((m) => m.item);
}

/**
 * Calcula los índices y rangos para paginación.
 * @param {{ total: number, pagina: number, porPagina: number }} params
 * @returns {{ total: number, porPagina: number, totalPaginas: number, paginaValida: number, desde: number, hasta: number, offset: number }}
 */
export function calcularPaginacion({ total = 0, pagina = 1, porPagina = 10 } = {}) {
  const t = Math.max(0, Number(total) || 0);
  const pP = Math.max(1, Number(porPagina) || 10);
  const totalPaginas = Math.max(1, Math.ceil(t / pP));
  const paginaValida = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  const desde = t === 0 ? 0 : (paginaValida - 1) * pP + 1;
  const hasta = Math.min(paginaValida * pP, t);
  const offset = (paginaValida - 1) * pP;

  return { total: t, porPagina: pP, totalPaginas, paginaValida, desde, hasta, offset };
}

/**
 * Genera el arreglo de botones numéricos y separadores '...' para el paginador.
 * @param {number} paginaActual
 * @param {number} totalPaginas
 * @param {number} delta
 * @returns {Array<number|'...'>}
 */
export function obtenerRangoPaginas(paginaActual, totalPaginas, delta = 1) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }
  const actual = Math.min(Math.max(1, paginaActual), totalPaginas);
  const rangoIzquierdo = Math.max(1, actual - delta);
  const rangoDerecho = Math.min(totalPaginas, actual + delta);

  const mostrarPuntosIzquierda = rangoIzquierdo > 2;
  const mostrarPuntosDerecha = rangoDerecho < totalPaginas - 1;

  if (!mostrarPuntosIzquierda && mostrarPuntosDerecha) {
    const rangoFin = Math.max(actual + delta, 3 + delta);
    const paginas = [];
    for (let i = 1; i <= rangoFin && i < totalPaginas; i += 1) {
      paginas.push(i);
    }
    paginas.push('...');
    paginas.push(totalPaginas);
    return paginas;
  }

  if (mostrarPuntosIzquierda && !mostrarPuntosDerecha) {
    const rangoInicio = Math.min(actual - delta, totalPaginas - (2 + delta));
    const paginas = [1, '...'];
    for (let i = rangoInicio; i <= totalPaginas; i += 1) {
      paginas.push(i);
    }
    return paginas;
  }

  if (mostrarPuntosIzquierda && mostrarPuntosDerecha) {
    const paginas = [1, '...'];
    for (let i = rangoIzquierdo; i <= rangoDerecho; i += 1) {
      paginas.push(i);
    }
    paginas.push('...');
    paginas.push(totalPaginas);
    return paginas;
  }

  return Array.from({ length: totalPaginas }, (_, i) => i + 1);
}

/**
 * Obtiene el conjunto de identificadores de un arreglo de filas.
 * @param {Array<object>} filas
 * @param {string} idFila
 * @returns {Set<any>}
 */
export function obtenerIdsFilas(filas, idFila = 'id') {
  if (!Array.isArray(filas)) return new Set();
  const ids = new Set();
  for (const fila of filas) {
    if (fila && fila[idFila] !== undefined) {
      ids.add(fila[idFila]);
    }
  }
  return ids;
}

/**
 * Compara si dos arreglos de filas tienen exactamente los mismos identificadores.
 * Útil para evitar reiniciar la página al refrescar datos o actualizar una fila existente.
 * @param {Array<object>} filasPrevias
 * @param {Array<object>} filasNuevas
 * @param {string} idFila
 * @returns {boolean}
 */
export function mismosIds(filasPrevias, filasNuevas, idFila = 'id') {
  if (!Array.isArray(filasPrevias) || !Array.isArray(filasNuevas)) return false;
  if (filasPrevias.length !== filasNuevas.length) return false;
  const setA = obtenerIdsFilas(filasPrevias, idFila);
  const setB = obtenerIdsFilas(filasNuevas, idFila);
  if (setA.size !== setB.size) return false;
  for (const id of setA) {
    if (!setB.has(id)) return false;
  }
  return true;
}
