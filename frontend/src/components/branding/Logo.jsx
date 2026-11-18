// Logo de artesa (kit concepto A, archivos en /public/brand, fuente en docs/brand/kit).
//   variante: 'completo' (lockup horizontal) | 'isotipo' (símbolo) | 'logotipo' (solo wordmark) | 'apilado'
//   tema: 'auto' (cambia con .dark) | 'claro' (fondos claros) | 'oscuro' (fondos oscuros: Ocre + Alabastro)
//         | 'mono-claro' (una tinta Alabastro, p. ej. sobre Terracota) | 'mono-oscuro' (una tinta Espresso)
//   alto: altura en px. Con él se aplican las reglas del manual:
//     · isotipo por debajo de 32 px → corte pequeño (isotipo-pequeno, trazos reforzados)
//     · lockup horizontal que mediría menos de 120 px de ancho → solo el símbolo
//   respeto: añade el área de respeto alrededor (≈ ⅓ del alto del símbolo; el manual pide ≥ 25 %).
// Sin `alto`, el tamaño lo decide `className` (compatibilidad con el uso anterior).
const ARCHIVO = { completo: 'logo-principal', isotipo: 'isotipo', logotipo: 'logotipo', apilado: 'logo-apilado' };
const PROPORCION = { completo: 1442.8 / 300, isotipo: 266.7 / 266, logotipo: 1052 / 300, apilado: 1052 / 850.7 };
const SUFIJO = { claro: '', oscuro: '-oscuro', 'mono-claro': '-mono-claro', 'mono-oscuro': '-mono-oscuro' };
const ISOTIPO_MIN = 32;
const LOCKUP_MIN_ANCHO = 120;

function resolverVariante(variante, alto) {
  if (!alto) return variante;
  if (variante === 'completo' && alto * PROPORCION.completo < LOCKUP_MIN_ANCHO) return 'isotipo';
  return variante;
}

function rutaArchivo(variante, alto, sufijo) {
  const pequeno = variante === 'isotipo' && alto && alto < ISOTIPO_MIN;
  return `/brand/${pequeno ? 'isotipo-pequeno' : ARCHIVO[variante] || ARCHIVO.completo}${sufijo}.svg`;
}

export default function Logo({ variante = 'completo', tema = 'auto', alto, respeto = false, className = 'h-12', alt = 'artesa' }) {
  const efectiva = resolverVariante(variante, alto);
  const estilo = alto ? { height: alto, width: 'auto' } : undefined;
  const clase = `${alto ? '' : className} ${alto ? className : ''}`.trim();
  const imagen = (sufijo, extra = '') => (
    <img src={rutaArchivo(efectiva, alto, sufijo)} alt={alt} style={estilo} className={`${clase} ${extra}`.trim()} />
  );

  const contenido = tema === 'auto'
    ? <>{imagen('', 'dark:hidden')}{imagen('-oscuro', 'hidden dark:block')}</>
    : imagen(SUFIJO[tema] ?? '');

  if (!respeto) return contenido;
  return <span className="inline-flex" style={{ padding: alto ? Math.round(alto / 3) : '0.33em' }}>{contenido}</span>;
}
// Uso: <Logo variante="isotipo" tema="oscuro" alto={28} />  → usa el corte pequeño
