import { LogOut, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function ClienteHomePage() {
  const { usuario, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface px-6 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between"><Logo variante="completo" className="h-12" /><button onClick={logout} className="btn-ghost"><LogOut size={16} /> Salir</button></div></header>
      <main className="mx-auto max-w-5xl p-6"><p className="text-sm text-fg-muted">Portal de cliente</p><h1 className="mt-1 text-3xl font-bold">Hola, {usuario.nombre || usuario.username}</h1><p className="mt-2 text-fg-muted">Tu experiencia artesa empieza aquí.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2"><div className="card"><ShoppingBag className="text-primary" /><h2 className="mt-4 font-semibold">Mis pedidos</h2><p className="mt-1 text-sm text-fg-muted">Próximamente podrás consultar el estado y el historial de tus pedidos.</p></div><div className="card"><UserRound className="text-secondary-text" /><h2 className="mt-4 font-semibold">Mi perfil</h2><p className="mt-1 text-sm text-fg-muted">Cuenta activa con {usuario.email || 'tus datos registrados'}.</p></div></div>
      </main>
    </div>
  );
}
