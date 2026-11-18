// Espiral de Arquímedes: el "hilo" de la marca (la voluta del isotipo) como línea continua.
// Se usa como arte del login; HiloSpinner (abajo) es el indicador de carga de los botones.
export function rutaEspiral({ cx = 0, cy = 0, r0 = 0, r1 = 100, vueltas = 3, fase = 0, pasos = 360 }) {
  const total = vueltas * Math.PI * 2;
  let d = '';
  for (let i = 0; i <= pasos; i += 1) {
    const t = (i / pasos) * total;
    const r = r0 + ((r1 - r0) * t) / total;
    const x = cx + r * Math.cos(t + fase);
    const y = cy + r * Math.sin(t + fase);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}

// Indicador de carga de los botones (nombre conservado por compatibilidad). Ya no gira:
// tres puntos que laten y heredan el color del texto. `size` (px, base 18) escala el grupo.
export function HiloSpinner({ size = 18, className = '' }) {
  return (
    <span aria-hidden="true" className={`puntos-carga ${className}`.trim()} style={{ zoom: size / 18 }}>
      <span /><span /><span />
    </span>
  );
}