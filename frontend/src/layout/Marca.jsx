import Logo from '../components/Logo.jsx';

// Marca de artesa: isotipo + nombre + descriptor.
// tema: 'oscuro' (para fondos oscuros) | 'auto' (sigue el tema claro/oscuro) | 'mono' (todo alabastro, p. ej. sobre terracota)
export default function Marca({ tema = 'oscuro', className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {tema === 'mono'
        ? <img src="/brand/isotipo-mono-claro.svg" alt="artesa" className="h-10 w-auto shrink-0" />
        : <Logo variante="isotipo" tema={tema} className="h-10 w-auto shrink-0" />}
      <div className="leading-none">
        <p className="text-xl font-extrabold tracking-wide">artesa</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] opacity-60">ERP &amp; POS</p>
      </div>
    </div>
  );
}
