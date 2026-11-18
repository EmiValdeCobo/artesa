import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircleAlert, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { traducirError } from '../errors/traducirError.js';
import PasswordInput from '../components/forms/PasswordInput.jsx';
import Logo from '../components/branding/Logo.jsx';
import { HiloSpinner } from '../components/branding/Espiral.jsx';

/* Acceso del ÁREA ADMINISTRATIVA. Panel dividido: a la izquierda la marca sobre Espresso con
   una ilustración plana cálida (Terracota/Ocre/Alabastro); a la derecha el formulario sobre blanco. */

// Ilustración plana de un mostrador de cafetería/panadería. Formas geométricas, una sola capa de sombras.
function IlustracionMostrador() {
  return (
    <svg viewBox="0 0 320 280" role="img" aria-label="Mostrador de cafetería artesanal"
      className="h-auto w-full max-w-sm" xmlns="http://www.w3.org/2000/svg">
      {/* Ventana circular con sol/luz cálida detrás */}
      <circle cx="160" cy="92" r="70" fill="#5f2e20" />
      <circle cx="160" cy="92" r="52" fill="#7b3b27" />
      <circle cx="160" cy="80" r="30" fill="#e8b866" />
      <circle cx="160" cy="80" r="30" fill="#e1a651" opacity="0.5" />
      {/* Lámpara colgante */}
      <line x1="112" y1="0" x2="112" y2="34" stroke="#f4d79c" strokeWidth="2" />
      <path d="M100 34 h24 l-6 16 h-12 z" fill="#e1a651" />
      <ellipse cx="112" cy="51" rx="9" ry="3" fill="#f7f5f0" opacity="0.85" />
      {/* Estante con hogazas y frascos */}
      <rect x="196" y="40" width="96" height="6" rx="3" fill="#44211a" />
      <ellipse cx="216" cy="34" rx="15" ry="9" fill="#c97752" />
      <path d="M208 33 q8 -7 16 0" stroke="#5f2e20" strokeWidth="2" fill="none" />
      <rect x="240" y="18" width="16" height="22" rx="3" fill="#de9776" />
      <rect x="240" y="18" width="16" height="6" rx="3" fill="#b15c3d" />
      <circle cx="276" cy="30" r="10" fill="#edc173" />
      {/* Mostrador */}
      <rect x="24" y="176" width="272" height="20" rx="4" fill="#f7f5f0" />
      <rect x="40" y="196" width="240" height="60" fill="#5f2e20" />
      <rect x="40" y="196" width="240" height="60" fill="#44211a" opacity="0.4" />
      <rect x="64" y="212" width="40" height="44" rx="2" fill="#7b3b27" />
      <rect x="216" y="212" width="40" height="44" rx="2" fill="#7b3b27" />
      {/* Taza de café con vapor */}
      <path d="M96 150 q6 -12 0 -22" stroke="#f4d79c" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M108 150 q6 -12 0 -22" stroke="#f4d79c" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M84 156 h40 v10 a20 20 0 0 1 -40 0 z" fill="#f7f5f0" />
      <ellipse cx="104" cy="156" rx="20" ry="5" fill="#583b1d" />
      <path d="M124 158 a10 10 0 0 1 0 14" stroke="#f7f5f0" strokeWidth="4" fill="none" />
      {/* Croissant */}
      <path d="M196 158 q22 -6 40 6 q-18 10 -40 -6 z" fill="#e1a651" />
      <path d="M204 160 q14 -2 24 4" stroke="#b15c3d" strokeWidth="2" fill="none" />
      {/* Pastel/rebanada sobre plato */}
      <ellipse cx="160" cy="170" rx="22" ry="5" fill="#f7f5f0" />
      <path d="M148 168 l12 -22 l12 22 z" fill="#c97752" />
      <path d="M152 160 h16" stroke="#f7f5f0" strokeWidth="2" />
    </svg>
  );
}

export default function LoginPage() {
  const { usuario, login, cargando } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invalido, setInvalido] = useState(null); // 'usuario' | 'password' | 'ambos' | null
  const [sacudir, setSacudir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const refUsuario = useRef(null);
  const refPassword = useRef(null);

  if (usuario) return <Navigate to="/" replace />;

  function fallar(mensaje, campo, ref) {
    setError(mensaje); setInvalido(campo);
    if (campo) { setSacudir(true); setTimeout(() => setSacudir(false), 500); }
    ref?.current?.focus();
  }
  const limpiar = () => { if (error) { setError(''); setInvalido(null); } };

  async function manejarEnvio(e) {
    e.preventDefault();
    if (enviando || cargando) return;
    if (!username.trim()) return fallar('Escribe tu usuario para continuar.', 'usuario', refUsuario);
    if (!password) return fallar('Escribe tu contraseña para continuar.', 'password', refPassword);
    setError(''); setInvalido(null); setEnviando(true);
    try {
      await login(username, password, 'admin');
      navigate('/');
    } catch (err) {
      // Credenciales incorrectas marcan los campos; un fallo de red o del servidor solo informa.
      const u = traducirError(err);
      const credenciales = u.id === 'CREDENCIALES';
      fallar(u.mensajeCompleto, credenciales ? 'ambos' : null, credenciales ? refPassword : null);
    } finally {
      setEnviando(false);
    }
  }

  const usuarioInvalido = invalido === 'usuario' || invalido === 'ambos';
  const passwordInvalido = invalido === 'password' || invalido === 'ambos';

  return (
    <div className="auth-admin flex min-h-dvh flex-col bg-surface text-fg lg:flex-row">
      {/* Panel de marca (izquierda, 45 %) — oculto en móvil */}
      <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-sidebar p-10 text-on-sidebar lg:flex lg:w-[45%] xl:p-14">
        <Logo variante="completo" tema="oscuro" alto={32} alt="artesa · ERP & POS" className="anim-subir" />
        <div className="anim-subir flex flex-1 items-center justify-center py-8" style={{ '--retardo': '120ms' }}>
          <IlustracionMostrador />
        </div>
        <p className="anim-subir font-display text-xl italic text-secondary" style={{ '--retardo': '220ms' }}>
          Hecho con dedicación.
        </p>
      </aside>

      {/* Formulario (derecha) sobre blanco */}
      <main className="flex flex-1 flex-col px-6 sm:px-10">
        {/* Lockup para móvil, donde el panel no aparece */}
        <header className="pt-8 lg:hidden">
          <Logo variante="completo" tema="auto" alto={32} alt="artesa · ERP & POS" />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[24rem]">
            <p className="anim-subir rotulo">Área administrativa</p>
            <h1 className="anim-subir mt-2 font-display text-display-sm text-fg" style={{ '--retardo': '80ms' }}>
              Bienvenido de nuevo
            </h1>
            <p className="anim-subir mt-2 text-body text-fg-muted" style={{ '--retardo': '140ms' }}>
              Ingresa con tu usuario para abrir el servicio.
            </p>

            <form onSubmit={manejarEnvio} noValidate aria-describedby={error ? 'login-error' : undefined}
              className="anim-subir mt-9" style={{ '--retardo': '220ms' }}>
              <div className={`space-y-5 ${sacudir ? 'anim-sacudir' : ''}`}>
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-label text-fg">Usuario</label>
                  <div className="group relative">
                    <UserRound size={18} strokeWidth={1.75} aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-primary-text" />
                    <input ref={refUsuario} id="username" type="text" value={username} autoFocus autoComplete="username"
                      autoCapitalize="none" spellCheck={false} aria-invalid={usuarioInvalido || undefined}
                      className={`input input-auth pl-11 ${usuarioInvalido ? 'border-danger' : ''}`}
                      onChange={(e) => { setUsername(e.target.value); limpiar(); }} />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-label text-fg">Contraseña</label>
                  <PasswordInput ref={refPassword} id="password" value={password} invalid={passwordInvalido}
                    className={passwordInvalido ? 'border-danger' : ''}
                    onChange={(e) => { setPassword(e.target.value); limpiar(); }} />
                </div>
              </div>

              {error && (
                <p id="login-error" role="alert" aria-live="assertive" className="mt-5 flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger-soft px-4 py-3 text-body text-fg">
                  <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-danger-text" /> {error}
                </p>
              )}

              <button type="submit" disabled={enviando || cargando} aria-busy={enviando || undefined}
                className="btn-primary btn-lg mt-7 w-full">
                {enviando ? <><HiloSpinner /> Ingresando…</> : <>Ingresar</>}
              </button>
            </form>
          </div>
        </div>

        <footer className="mx-auto w-full max-w-[24rem] pb-6 text-xs text-fg-muted">© 2026 artesa · Sistema ERP &amp; POS</footer>
      </main>
    </div>
  );
}
