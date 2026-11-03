import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(username, password);
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
        <div className="mb-6 flex justify-center"><Logo variante="completo" className="h-28" /></div>
        <p className="mb-6 text-center text-sm text-fg-muted">Inicia sesión para continuar</p>
        <label className="mb-1 block text-sm font-medium" htmlFor="username">Usuario</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus className="input mb-4" />
        <label className="mb-1 block text-sm font-medium" htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-4" />
        {error && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button onClick={manejarEnvio} disabled={enviando} className="btn-primary w-full">
          {enviando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}
