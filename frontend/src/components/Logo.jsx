// Logo de artesa. SVG en /public/brand (vectorizados desde el manual de marca).
// variante: 'completo' (isotipo + nombre + descriptor) | 'isotipo' | 'logotipo' (solo texto)
// tema: 'auto' (cambia con .dark) | 'claro' (para fondos claros) | 'oscuro' (para fondos oscuros, p. ej. sidebar)
const archivo = { completo: 'logo-principal', isotipo: 'isotipo', logotipo: 'logotipo' };

export default function Logo({ variante = 'completo', tema = 'auto', className = 'h-12', alt = 'artesa' }) {
  const base = `/brand/${archivo[variante]}`;
  if (tema === 'claro') return <img src={`${base}.svg`} alt={alt} className={className} />;
  if (tema === 'oscuro') return <img src={`${base}-oscuro.svg`} alt={alt} className={className} />;
  return (
    <>
      <img src={`${base}.svg`} alt={alt} className={`${className} dark:hidden`} />
      <img src={`${base}-oscuro.svg`} alt={alt} className={`${className} hidden dark:block`} />
    </>
  );
}
// Uso: <Logo variante="isotipo" tema="oscuro" className="h-8" />
