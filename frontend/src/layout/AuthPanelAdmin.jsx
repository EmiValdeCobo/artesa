import { useId } from 'react';
import Marca from './Marca.jsx';
import { rutaEspiral } from '../components/Espiral.jsx';

/* Panel de marca del ÁREA ADMINISTRATIVA — "abrir el servicio".
   Espresso, el hilo (la voluta del isotipo) y un índice de módulos numerado, tipo comanda. */

const LISTA = [
  ['Punto de venta', 'Cobro y comandas'],
  ['Preparación', 'Cola de cocina'],
  ['Caja y turnos', 'Aperturas y cuadres'],
  ['Inventario', 'Stock, recetas y mermas'],
  ['Compras', 'Proveedores y pagos'],
];

const HILO_PRINCIPAL = rutaEspiral({ cx: 400, cy: 400, r0: 8, r1: 640, vueltas: 8, pasos: 720 });
const HILO_SOMBRA = rutaEspiral({ cx: 400, cy: 400, r0: 8, r1: 640, vueltas: 8, fase: Math.PI, pasos: 720 });
const DESVANECER = '[mask-image:radial-gradient(circle_closest-side,black_38%,transparent)]';

// El hilo: una sola línea en espiral que se dibuja al cargar. Se desvanece hacia los bordes.
function ArteHilo({ className = '' }) {
  // ids únicos: el arte se renderiza dos veces (panel y cabecera móvil) y un degradado dentro de un SVG oculto no resuelve
  const uid = useId().replace(/:/g, '');
  const color = `hilo-color-${uid}`;
  const brillo = `hilo-brillo-${uid}`;
  return (
    <svg viewBox="0 0 800 800" aria-hidden="true" className={`pointer-events-none absolute ${DESVANECER} ${className}`}>
      <defs>
        <radialGradient id={color} cx="400" cy="400" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#edc173" />
          <stop offset="0.45" stopColor="#c97752" />
          <stop offset="1" stopColor="#7b3b27" />
        </radialGradient>
        <radialGradient id={brillo} cx="400" cy="400" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e1a651" stopOpacity="0.28" />
          <stop offset="1" stopColor="#e1a651" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="400" cy="400" r="260" fill={`url(#${brillo})`} />
      <path
        d={HILO_SOMBRA}
        pathLength="1"
        fill="none"
        stroke={`url(#${color})`}
        strokeWidth="1"
        strokeOpacity="0.25"
        className="hilo-trazo"
        style={{ animationDelay: '0.3s' }}
      />
      <path
        d={HILO_PRINCIPAL}
        pathLength="1"
        fill="none"
        stroke={`url(#${color})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.9"
        className="hilo-trazo"
      />
      <circle cx="400" cy="400" r="7" fill="#e8b866" />
    </svg>
  );
}

// Textura de grano muy sutil para que el fondo no se vea plano.
function Grano() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay"
    >
      <filter id="grano">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grano)" />
    </svg>
  );
}

const retardo = (ms) => ({ '--retardo': `${ms}ms` });

export function PanelAdmin() {
  return (
    <aside className="relative hidden overflow-hidden lg:order-1 border-r border-white/5 bg-sidebar p-12 text-on-sidebar lg:flex lg:flex-col lg:justify-between xl:p-16">
      <Grano />
      <ArteHilo className="-right-[43%] -top-[34%] w-[118%] max-w-none" />
      <Marca className="relative anim-subir" />
      <div className="relative max-w-xl">
        <h2
          className="anim-subir font-display text-5xl font-semibold leading-[1.04] tracking-tight xl:text-[3.5rem]"
          style={retardo(120)}
        >
          De la cocina a la caja, sin perder el <em className="font-medium italic text-ocre-400">hilo</em>.
        </h2>
        <ol className="anim-subir mt-10 max-w-md border-t-2 border-on-sidebar/70" style={retardo(260)}>
          {LISTA.map(([nombre, detalle], n) => (
            <li key={nombre} className="flex items-baseline gap-3 border-b border-white/15 py-2.5 text-sm">
              <span className="w-6 text-xs tabular-nums text-ocre-300">{String(n + 1).padStart(2, '0')}</span>
              <span className="font-semibold">{nombre}</span>
              <span aria-hidden="true" className="h-px flex-1 border-b border-dotted border-white/25" />
              <span className="text-xs text-on-sidebar/65">{detalle}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

// En móvil el panel no cabe: queda la marca arriba y el hilo asomando en la esquina.
export function CabeceraMovilAdmin() {
  return (
    <>
      <ArteHilo className="-right-48 -top-48 w-[34rem] max-w-none opacity-60 lg:hidden" />
      <header className="relative pt-7 lg:hidden">
        <Marca tema="auto" />
      </header>
    </>
  );
}
