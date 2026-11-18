import { Menu } from 'lucide-react';
import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Logo from '../components/branding/Logo.jsx';
import Spinner from '../components/ui/Spinner.jsx';

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
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-header items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" className="flex size-control-md items-center justify-center rounded-md text-fg transition-colors hover:bg-muted"><Menu size={20} strokeWidth={1.75} aria-hidden="true" /></button>
          <Logo variante="isotipo" alto={28} />
          <span className="text-label text-fg">artesa</span>
        </header>
        <main className="min-h-[calc(100dvh-var(--spacing-header))] p-4 sm:p-6 lg:min-h-screen lg:p-8">
          <Suspense fallback={<CargandoModulo />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
