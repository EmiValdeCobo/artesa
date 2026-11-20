import { Menu } from 'lucide-react';
import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Logo from '../components/branding/Logo.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import IndicadorTurno from './IndicadorTurno.jsx';

function CargandoModulo() {
  return (
    <div className="flex min-h-80 items-center justify-center">
      <Spinner texto="Cargando módulo…" />
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-fg">
      {/* WCAG 2.4.1: permite saltar la navegación lateral con el teclado. */}
      <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-fg focus:shadow-md focus:outline-2 focus:outline-primary">Saltar al contenido</a>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-header items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" className="flex size-control-md items-center justify-center rounded-md text-fg transition-colors hover:bg-muted"><Menu size={20} strokeWidth={1.75} aria-hidden="true" /></button>
          <Logo variante="isotipo" alto={28} />
          <span className="text-label text-fg">artesa</span>
        </header>
        <main id="contenido-principal" tabIndex={-1} className="focus:outline-none min-h-[calc(100dvh-var(--spacing-header))] p-4 sm:p-6 lg:min-h-screen lg:p-8">
          {/* Turno de caja activo: visible en todas las pantallas (sucursal, caja, cajero y hora). */}
          <div className="mb-4 flex justify-end empty:hidden"><IndicadorTurno /></div>
          <Suspense fallback={<CargandoModulo />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
