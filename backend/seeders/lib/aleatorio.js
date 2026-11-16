// Generador pseudoaleatorio determinista (mulberry32): misma semilla => mismos datos para todo el equipo.
export function crearAleatorio(semilla) {
  let estado = semilla >>> 0;
  const entero32 = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const siguiente = () => entero32() / 4294967296;
  let normalGuardada = null;

  return {
    siguiente,
    entre: (min, max) => min + siguiente() * (max - min),
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    prob: (p) => siguiente() < p,
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    // Elige un elemento según pesos (pesos <= 0 nunca salen).
    ponderado(lista, pesos) {
      let total = 0;
      for (const p of pesos) total += p > 0 ? p : 0;
      let r = siguiente() * total;
      for (let i = 0; i < lista.length; i += 1) {
        if (pesos[i] <= 0) continue;
        r -= pesos[i];
        if (r < 0) return lista[i];
      }
      return lista[lista.length - 1];
    },
    // Distribución normal estándar (Box-Muller).
    normal() {
      if (normalGuardada !== null) {
        const v = normalGuardada;
        normalGuardada = null;
        return v;
      }
      const u = Math.max(siguiente(), 1e-12);
      const v = siguiente();
      const r = Math.sqrt(-2 * Math.log(u));
      normalGuardada = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
    // UUID con formato v4 generado desde la semilla (no usa crypto para ser reproducible).
    uuid() {
      const h = [entero32(), entero32(), entero32(), entero32()].map((n) => n.toString(16).padStart(8, '0')).join('');
      const variante = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variante}${h.slice(17, 20)}-${h.slice(20, 32)}`;
    },
  };
}

// Deriva una semilla numérica estable a partir de un texto (FNV-1a).
export function semillaDeTexto(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
