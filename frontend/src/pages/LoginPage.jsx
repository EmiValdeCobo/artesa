import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleAlert, ConciergeBell, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import CampoBorde from '../components/CampoBorde.jsx';
import Marca from '../layout/Marca.jsx';
import { HiloSpinner } from '../components/Espiral.jsx';
import { EscenaBarra, RastroServicio, SiluetaDerecha, SiluetaIzquierda } from '../layout/LoginAdminArte.jsx';

const retardo = (ms) => ({ '--retardo': `${ms}ms` });

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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 overflow-hidden bg-terracota-500 px-3 py-3 dark:bg-terracota-800 sm:gap-6 sm:px-8 sm:py-8">
      <div className="relative flex min-h-0 w-full max-w-[68rem]">
        {/* círculos que asoman detrás de la tarjeta */}
        <span aria-hidden="true" className="absolute -left-7 -top-7 hidden h-24 w-24 rounded-full bg-ocre-400 sm:block" />
        <span aria-hidden="true" className="absolute -bottom-8 -right-8 hidden h-28 w-28 rounded-full bg-espresso-50 sm:block" />

        <div className="relative z-10 grid min-h-0 w-full overflow-hidden rounded-[1.25rem] bg-surface shadow-2xl shadow-espresso-950/40 sm:rounded-[1.75rem] lg:h-[min(40rem,calc(100dvh-6rem))] lg:grid-cols-2">
          {/* Panel de marca: escena ilustrada */}
          <aside className="relative hidden overflow-hidden bg-terracota-600 text-on-sidebar lg:block">
            <EscenaBarra className="absolute inset-0 h-full w-full" />
            <div className="relative px-10 pt-10">
              <Marca className="anim-subir" />
              <p className="anim-subir mt-6 max-w-[17rem] text-lg font-semibold leading-snug" style={retardo(120)}>
                Una cocina ordenada empieza antes de abrir la puerta.
              </p>
            </div>
          </aside>

          {/* Formulario */}
          <main className="relative flex min-h-0 flex-col items-center px-5 pb-7 pt-7 sm:px-12 sm:pb-10 sm:pt-10 lg:pb-12 lg:pt-12">
            <div aria-hidden="true" className="absolute right-0 top-8 hidden w-60 text-primary sm:block">
              <RastroServicio className="w-full" />
              <ConciergeBell size={30} strokeWidth={1.75} className="absolute left-2 top-7 -rotate-12 fill-primary/15" />
            </div>

            <Marca tema="auto" className="mb-5 self-start lg:hidden" />

            <h1 className="anim-subir font-display text-[3.25rem] font-bold leading-none tracking-tight text-primary-text sm:text-6xl">Bienvenido</h1>
            <p className="anim-subir mt-3 text-sm text-fg-muted" style={retardo(80)}>Ingresa con tu usuario</p>

            <form onSubmit={manejarEnvio} noValidate className="anim-subir mt-7 w-full max-w-[26rem]" style={retardo(160)}>
              <div className={`space-y-4 sm:space-y-6 ${sacudir ? 'anim-sacudir' : ''}`}>
                <CampoBorde ref={refUsuario} id="username" etiqueta="Usuario" icono={UserRound} value={username} autoFocus autoComplete="username"
                  autoCapitalize="none" spellCheck={false} invalid={invalido === 'usuario' || invalido === 'ambos'}
                  onChange={(e) => { setUsername(e.target.value); limpiar(); }} />
                <CampoBorde ref={refPassword} id="password" etiqueta="Contraseña" icono={LockKeyhole} type="password" value={password}
                  autoComplete="current-password" invalid={invalido === 'password' || invalido === 'ambos'}
                  onChange={(e) => { setPassword(e.target.value); limpiar(); }} />
              </div>

              {error && (
                <p role="alert" className="anim-subir mt-5 flex items-start gap-2 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-danger">
                  <CircleAlert size={17} aria-hidden="true" className="mt-px shrink-0" /> {error}
                </p>
              )}

              <div className="mt-6 flex justify-center sm:mt-8">
                <button type="submit" disabled={enviando}
                  className="group inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-lg bg-primary px-9 text-[15px] font-semibold text-on-accent shadow-lg shadow-primary/30 outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-px disabled:opacity-70">
                  {enviando ? <><HiloSpinner /> Ingresando…</> : <>Ingresar <ArrowRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></>}
                </button>
              </div>
            </form>

            <SiluetaIzquierda className="pointer-events-none absolute bottom-0 left-0 hidden h-28 text-primary sm:block lg:h-32" />
            <SiluetaDerecha className="pointer-events-none absolute bottom-0 right-6 hidden h-28 text-primary sm:block lg:h-32" />
          </main>
        </div>
      </div>
      <p className="text-xs text-on-accent/80">© 2026 artesa · Sistema ERP &amp; POS</p>
    </div>
  );
}
