import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function LoginPage() {
  const { usuario, tipoSesion, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={tipoSesion === 'cliente' ? '/cliente' : '/'} replace />;

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(username, password, 'admin');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-5 flex justify-center"><Logo variante="completo" className="h-24" /></div>
        <h1 className="text-center text-xl font-bold">Área administrativa</h1>
        <p className="mb-6 text-center text-sm text-fg-muted">ERP y terminal gastronómica</p>
        <form onSubmit={manejarEnvio}>
        <label className="mb-1 block text-sm font-medium" htmlFor="username">Usuario</label>
        <div className="relative mb-4">
          <UserRound size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus className="input pl-10" />
        </div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">Contraseña</label>
        <div className="relative mb-4">
          <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" />
        </div>
        {error && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={enviando} className="btn-primary w-full">
          {enviando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        </form>
        <a href="/cliente/login" className="mt-4 block text-center text-xs text-primary-text hover:underline">Ingresar como cliente</a>
      </div>
    </div>
  );
}
