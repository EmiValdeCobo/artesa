import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

const opciones = [
  { valor: 'light', Icono: Sun, texto: 'Claro' },
  { valor: 'dark', Icono: Moon, texto: 'Oscuro' },
  { valor: 'system', Icono: Monitor, texto: 'Sistema' },
];

export default function ThemeToggle() {
  const { tema, elegir } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="flex rounded-md border border-on-sidebar/15 bg-on-sidebar/5 p-0.5">
      {opciones.map(({ valor, Icono, texto }) => (
        <button key={valor} type="button" role="radio" aria-checked={tema === valor} title={texto} onClick={() => elegir(valor)}
          className={`flex flex-1 justify-center rounded-sm p-1.5 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-sidebar ${tema === valor ? 'bg-on-sidebar/15 text-on-sidebar' : 'text-on-sidebar-muted hover:text-on-sidebar'}`}>
          <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">{texto}</span>
        </button>
      ))}
    </div>
  );
}
