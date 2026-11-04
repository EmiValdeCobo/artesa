import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="flex min-h-screen bg-background text-fg">
    <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-line bg-background/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" className="rounded-lg p-2 text-fg hover:bg-muted"><Menu size={21} aria-hidden="true" /></button>
        <span className="ml-3 text-sm font-semibold">artesa</span>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:min-h-screen lg:p-8"><Outlet /></main>
    </div>
  </div>;
}
