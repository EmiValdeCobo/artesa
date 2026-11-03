import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menu } from '../config/menu.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Logo from '../components/Logo.jsx';

export default function AppLayout() {
  const { usuario, tiene, logout } = useAuth();
  const items = menu.filter((i) => !i.permiso || tiene(i.permiso));

  return (
    <div className="flex min-h-screen bg-background text-fg">
      <aside className="flex w-60 flex-col bg-sidebar text-on-sidebar">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo variante="isotipo" tema="oscuro" className="h-9" />
          <div className="text-xl font-extrabold leading-none tracking-wide">
            artesa
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-on-sidebar/60">ERP &amp; POS</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navegación principal">
          {items.map(({ ruta, texto, icono: Icono }) => (
            <NavLink key={ruta} to={ruta} end={ruta === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-primary text-on-accent' : 'text-on-sidebar/80 hover:bg-white/10'}`}>
              <Icono size={18} aria-hidden="true" /> {texto}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-white/10 p-4 text-sm">
          <ThemeToggle />
          <div>
            <p className="font-medium">{usuario.username}</p>
            <p className="text-on-sidebar/60">{usuario.rol}</p>
          </div>
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-md bg-white/10 py-1.5 hover:bg-white/20">
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8"><Outlet /></main>
    </div>
  );
}
