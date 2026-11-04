// Espiral de Arquímedes: el "hilo" de la marca (la voluta del isotipo) como línea continua.
// Se usa como arte del login y como indicador de carga.
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

const RUTA_SPINNER = rutaEspiral({ cx: 12, cy: 12, r0: 1, r1: 9.5, vueltas: 2.2, pasos: 90 });

// Indicador de carga: la espiral de la marca girando.
export function HiloSpinner({ size = 18, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`animate-spin ${className}`}>
            <path d={RUTA_SPINNER} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}