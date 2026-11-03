import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, LogIn, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function ClienteLoginPage() {
  const { usuario, tipoSesion, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={tipoSesion === 'cliente' ? '/cliente' : '/'} replace />;

  async function manejarEnvio(e) {
    e.preventDefault(); setError(''); setEnviando(true);
    try { await login(username, password, 'cliente'); navigate('/cliente'); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-terracota-50 via-background to-ocre-50 p-4">
      <form onSubmit={manejarEnvio} className="card w-full max-w-sm p-8">
        <div className="mb-5 flex justify-center"><Logo variante="completo" className="h-24" /></div>
        <div className="mb-6 text-center"><h1 className="text-xl font-bold">Bienvenido a artesa</h1><p className="text-sm text-fg-muted">Consulta tus pedidos y beneficios</p></div>
        <label className="mb-1 block text-sm font-medium" htmlFor="cliente-username">Usuario o correo</label>
        <div className="relative mb-4">
          <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input id="cliente-username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required className="input pl-10" />
        </div>
        <label className="mb-1 block text-sm font-medium" htmlFor="cliente-password">Contraseña</label>
        <div className="relative mb-4">
          <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input id="cliente-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input pl-10" />
        </div>
        {error && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={enviando} className="btn-primary w-full">{enviando ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />} {enviando ? 'Ingresando…' : 'Ingresar como cliente'}</button>
        <a href="/admin/login" className="mt-4 block text-center text-xs text-primary-text hover:underline">Ingresar al área administrativa</a>
      </form>
    </div>
  );
}
