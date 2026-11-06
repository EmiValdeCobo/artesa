/* Ilustración vectorial del login administrativo (sin fotografía ni imágenes generadas).
   Todo son formas planas en la paleta de marca. */

// Panel izquierdo: una campana de servicio (cloche) sobre la barra, con el plato de fondo como un sol.
// La escena ocupa SOLO su propio espacio (debajo del texto) y se escala completa con "meet":
// nunca se recorta ni se sube detrás del mensaje. La barra se extiende a los lados para llegar a los bordes del panel.
export function EscenaBarra({ className = '' }) {
  return (
    <svg
      viewBox="0 345 560 395"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className={`overflow-visible ${className}`}
    >
      {/* El plato (sol) queda medio oculto tras la barra y la campana apoya su base justo sobre la mesa. */}
      <g transform="translate(100 177) scale(.72)">
        <circle cx="280" cy="470" r="214" fill="#e8b866" />
        <circle cx="280" cy="470" r="176" fill="none" stroke="#c58a38" strokeWidth="2" />
        <circle
          cx="280"
          cy="470"
          r="150"
          fill="none"
          stroke="#c58a38"
          strokeWidth="1"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        {/* vapor */}
        <g fill="none" stroke="#f7f5f0" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" transform="translate(0 62)">
          <path d="M232 322c-16-18 16-34 0-52s16-34 0-52" />
          <path d="M280 306c-16-18 16-34 0-52s16-34 0-52" />
          <path d="M328 322c-16-18 16-34 0-52s16-34 0-52" />
        </g>
        {/* cloche */}
        <circle cx="280" cy="408" r="16" fill="#f7f5f0" />
        <rect x="270" y="418" width="20" height="16" fill="#f7f5f0" />
        <path d="M126 580A154 154 0 0 1 434 580Z" fill="#f7f5f0" />
        <path d="M168 560A116 116 0 0 1 262 450" fill="none" stroke="#ebbca7" strokeWidth="9" strokeLinecap="round" />
        <rect x="96" y="580" width="368" height="16" rx="8" fill="#f7f5f0" />
      </g>
      {/* barra (se extiende más allá del viewBox para cubrir todo el ancho del panel) */}
      <rect x="-2000" y="604" width="4560" height="400" fill="#321f19" />
      <rect x="-2000" y="604" width="4560" height="5" fill="#e1a651" />
      <path d="M-2000 650H2560M-2000 690H2560" stroke="#44362d" strokeWidth="2" />
      {/* botella y frasco sobre la barra */}
      <g fill="#321f19" stroke="#e1a651" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="36" y="528" width="34" height="76" rx="5" />
        <rect x="46" y="486" width="14" height="46" />
        <rect x="45" y="476" width="16" height="12" rx="3" />
        <rect x="486" y="548" width="44" height="56" rx="8" />
        <rect x="484" y="538" width="48" height="12" rx="5" />
      </g>
      <rect x="36" y="556" width="34" height="22" fill="#e1a651" />
    </svg>
  );
}

// Esquina inferior izquierda: olla, tapa y campana. Esquina inferior derecha: gorro, botella y copa.
export function SiluetaIzquierda({ className = '' }) {
  return (
    <svg viewBox="0 0 230 150" aria-hidden="true" className={className} fill="currentColor">
      <rect x="0" y="86" width="14" height="9" rx="4.5" />
      <rect x="96" y="86" width="14" height="9" rx="4.5" />
      <rect x="8" y="72" width="94" height="78" rx="7" />
      <rect x="4" y="64" width="102" height="11" rx="5.5" />
      <rect x="45" y="52" width="20" height="14" rx="5" />
      <rect x="8" y="108" width="94" height="4" fill="var(--bg-surface)" />
      <path d="M122 150v-4a46 46 0 0 1 92 0v4Z" />
      <circle cx="168" cy="92" r="7" />
      <rect x="114" y="140" width="108" height="10" rx="5" />
    </svg>
  );
}

export function SiluetaDerecha({ className = '' }) {
  return (
    <svg viewBox="0 0 270 160" aria-hidden="true" className={className} fill="currentColor">
      <circle cx="46" cy="62" r="22" />
      <circle cx="78" cy="46" r="27" />
      <circle cx="112" cy="62" r="22" />
      <rect x="30" y="68" width="98" height="58" rx="6" />
      <rect x="30" y="122" width="98" height="38" rx="3" />
      <rect x="30" y="130" width="98" height="4" fill="var(--bg-surface)" />
      <rect x="154" y="72" width="26" height="88" rx="5" />
      <rect x="162" y="30" width="10" height="46" />
      <rect x="160" y="20" width="14" height="12" rx="3" />
      <rect x="154" y="110" width="26" height="24" fill="var(--bg-surface)" />
      <path d="M200 84h42c0 30-8 44-21 44s-21-14-21-44Z" />
      <rect x="219" y="126" width="4" height="28" />
      <rect x="203" y="154" width="36" height="6" rx="3" />
    </svg>
  );
}

// Trazo punteado que sale de la campana de servicio, como el recorrido del avión de la referencia.
export function RastroServicio({ className = '' }) {
  return (
    <svg viewBox="0 0 260 90" aria-hidden="true" className={className} fill="none">
      <path
        d="M44 40C90 6 170 -6 258 40"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
    </svg>
  );
}