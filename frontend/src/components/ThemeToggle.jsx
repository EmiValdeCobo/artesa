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
    <div role="radiogroup" aria-label="Tema" className="flex rounded-md border border-white/15 p-0.5">
      {opciones.map(({ valor, Icono, texto }) => (
        <button key={valor} role="radio" aria-checked={tema === valor} title={texto} onClick={() => elegir(valor)}
          className={`flex flex-1 justify-center rounded p-1.5 ${tema === valor ? 'bg-primary text-on-accent' : 'text-on-sidebar/70 hover:text-on-sidebar'}`}>
          <Icono size={16} aria-hidden="true" />
          <span className="sr-only">{texto}</span>
        </button>
      ))}
    </div>
  );
}
