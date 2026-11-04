import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleAlert, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../layout/AuthLayout.jsx';
import CampoTexto from '../components/CampoTexto.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { HiloSpinner } from '../components/Espiral.jsx';

export default function LoginPage() {
  const { usuario, tipoSesion, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invalido, setInvalido] = useState(null); // 'usuario' | 'password' | 'ambos' | null
  const [sacudir, setSacudir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const refUsuario = useRef(null);
  const refPassword = useRef(null);

  if (usuario) return <Navigate to={tipoSesion === 'cliente' ? '/cliente' : '/'} replace />;

  function fallar(mensaje, campo, ref) {
    setError(mensaje); setInvalido(campo); setSacudir(true);
    setTimeout(() => setSacudir(false), 500);
    ref?.current?.focus();
  }
  const limpiar = () => { if (error) { setError(''); setInvalido(null); } };

  async function manejarEnvio(e) {
    e.preventDefault();
    if (enviando) return;
    if (!username.trim()) return fallar('Escribe tu usuario para continuar.', 'usuario', refUsuario);
    if (!password) return fallar('Escribe tu contraseña para continuar.', 'password', refPassword);
    setError(''); setInvalido(null); setEnviando(true);
    try {
      await login(username, password, 'admin');
      navigate('/');
    } catch (err) {
      fallar(err.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.', 'ambos', refPassword);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout variante="admin">
      <form onSubmit={manejarEnvio} noValidate>
        <div className={`space-y-5 ${sacudir ? 'anim-sacudir' : ''}`}>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="username">Usuario</label>
            <CampoTexto ref={refUsuario} id="username" icono={UserRound} value={username} autoFocus autoComplete="username"
              autoCapitalize="none" spellCheck={false} invalid={invalido === 'usuario' || invalido === 'ambos'}
              onChange={(e) => { setUsername(e.target.value); limpiar(); }} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="password">Contraseña</label>
            <PasswordInput ref={refPassword} id="password" value={password} invalid={invalido === 'password' || invalido === 'ambos'}
              onChange={(e) => { setPassword(e.target.value); limpiar(); }} />
          </div>
        </div>

        {error && (
          <p role="alert" className="anim-subir mt-5 flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <CircleAlert size={17} aria-hidden="true" className="mt-px shrink-0" /> {error}
          </p>
        )}

        <button type="submit" disabled={enviando}
          className="btn-primary group mt-6 h-12 w-full rounded-xl text-[15px] shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/10 active:translate-y-px">
          {enviando ? <><HiloSpinner /> Ingresando…</> : <>Ingresar <ArrowRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></>}
        </button>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
          <ShieldCheck size={15} aria-hidden="true" className="mt-px shrink-0" />
          Acceso solo para personal autorizado. Los cambios que hagas quedan registrados en la bitácora.
        </p>
      </form>
    </AuthLayout>
  );
}