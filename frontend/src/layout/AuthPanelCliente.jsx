import { useId } from 'react';
import { ShoppingBag, UserRound } from 'lucide-react';
import Marca from './Marca.jsx';
import { rutaEspiral } from '../components/branding/Espiral.jsx';

/* Panel de marca del PORTAL DE CLIENTES — "la mesa".
   Terracota con mantel de cuadros y, vista desde arriba, la voluta del isotipo hecha pan dulce sobre un plato.
   En móvil se convierte en una franja superior con el plato asomando. */

// Mantel de cuadros (gingham) con dos bandas translúcidas que se cruzan.
const MANTEL = {
  backgroundImage: 'linear-gradient(90deg, rgb(255 255 255 / .07) 50%, transparent 50%), linear-gradient(rgb(255 255 255 / .07) 50%, transparent 50%)',
  backgroundSize: '72px 72px',
};

// Pan dulce: espiral gruesa en capas (sombra, corteza, miga, brillo).
const ROLLO = { cx: 300, cy: 300, r0: 12, r1: 170, vueltas: 3.3, pasos: 300 };
const RUTA_ROLLO = rutaEspiral(ROLLO);
const RUTA_BRILLO = rutaEspiral({ ...ROLLO, r0: 3, r1: 161 });
const RUTA_SOMBRA = rutaEspiral({ ...ROLLO, cx: 305, cy: 307 });

function Plato({ className = '' }) {
  const uid = useId().replace(/:/g, '');
  const loza = `loza-${uid}`;
  const desenfoque = `desenfoque-${uid}`;
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
      <defs>
        <radialGradient id={loza} cx="300" cy="300" r="215" gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#f7f5f0" />
          <stop offset="1" stopColor="#e6dfd3" />
        </radialGradient>
        <filter id={desenfoque} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      {/* sombra del plato sobre el mantel */}
      <circle cx="318" cy="332" r="282" fill="#1f120e" opacity="0.28" filter={`url(#${desenfoque})`} />
      {/* plato: borde y fondo hondo */}
      <circle cx="300" cy="300" r="280" fill="#f7f5f0" />
      <circle cx="300" cy="300" r="266" fill="none" stroke="#ddd6cb" strokeWidth="1.5" />
      <circle cx="300" cy="300" r="215" fill={`url(#${loza})`} stroke="#ddd6cb" strokeWidth="1.5" />
      {/* pan dulce */}
      <path d={RUTA_SOMBRA} fill="none" stroke="#44211a" strokeOpacity="0.22" strokeWidth="46" strokeLinecap="round" />
      <path d={RUTA_ROLLO} pathLength="1" fill="none" stroke="#984a2f" strokeWidth="44" strokeLinecap="round" className="hilo-trazo" />
      <path d={RUTA_ROLLO} pathLength="1" fill="none" stroke="#edc173" strokeWidth="35" strokeLinecap="round" className="hilo-trazo" style={{ animationDelay: '0.15s' }} />
      <path d={RUTA_BRILLO} pathLength="1" fill="none" stroke="#faebc9" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" className="hilo-trazo" style={{ animationDelay: '0.3s' }} />
    </svg>
  );
}

const retardo = (ms) => ({ '--retardo': `${ms}ms` });

const pastilla = 'inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium ring-1 ring-inset ring-white/20 backdrop-blur-sm';

export function PanelCliente() {
  return (
    <aside style={MANTEL} className="relative order-first flex h-44 shrink-0 flex-col overflow-hidden bg-terracota-600 p-6 text-espresso-50 lg:order-2 lg:h-auto lg:justify-between lg:p-12 xl:p-16 dark:bg-terracota-700">
      <Plato className="-right-14 -top-10 w-56 lg:-right-[12%] lg:top-[3%] lg:w-[58%]" />
      <Marca tema="mono" className="relative anim-subir" />
      <div className="relative hidden max-w-xl lg:block">
        <h2 className="anim-subir font-display text-5xl font-semibold leading-[1.04] tracking-tight xl:text-[3.5rem]" style={retardo(120)}>
          Tu mesa te estaba <em className="font-medium italic text-ocre-200">esperando</em>.
        </h2>
        <div className="anim-subir mt-8 flex flex-wrap gap-3" style={retardo(260)}>
          <span className={pastilla}>
            <ShoppingBag size={16} aria-hidden="true" /> Mis pedidos
            <span className="rounded-full bg-ocre-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-espresso-900">Pronto</span>
          </span>
          <span className={pastilla}><UserRound size={16} aria-hidden="true" /> Mi perfil</span>
        </div>
      </div>
    </aside>
  );
}
