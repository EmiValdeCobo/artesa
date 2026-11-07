import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PanelAdmin, CabeceraMovilAdmin } from './AuthPanelAdmin.jsx';
import { PanelCliente } from './AuthPanelCliente.jsx';

/* ---------------------------------------------------------------------------
   Pantallas de acceso de artesa. Un mismo esqueleto, dos personalidades:

   ADMINISTRATIVA — "abrir el servicio": panel Espresso a la izquierda, acento Terracota,
   saludo + fecha y hora, tono de control.
   CLIENTE — "la mesa": panel Terracota con mantel a la derecha, acento Ocre (.tema-cliente),
   invitación según la hora del día, tono de hospitalidad.
   --------------------------------------------------------------------------- */

const CONFIG = {
  admin: {
    eyebrow: 'Área administrativa',
    rejilla: 'lg:grid-cols-[1.1fr_1fr]',
    orden: 'lg:order-2', // el formulario va a la derecha
    tema: 'auth-admin',
    pie: { texto: '¿Eres cliente?', enlace: 'Portal de clientes', a: '/cliente/login' },
  },
  cliente: {
    eyebrow: 'Portal de clientes',
    rejilla: 'lg:grid-cols-[1fr_1.1fr]',
    orden: 'lg:order-1', // el formulario va a la izquierda
    tema: 'tema-cliente',
    pie: { texto: '¿Eres del equipo?', enlace: 'Área administrativa', a: '/admin/login' },
  },
};

function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const saludoAdmin = (h) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches');
// El cliente recibe una invitación según el momento del día.
const invitacion = (h) => (h < 11 ? ['Buen día.', '¿Desayunamos?']
  : h < 15 ? ['Buen día.', '¿Almorzamos?']
  : h < 19 ? ['Buenas tardes.', '¿Un cafecito?']
  : ['Buenas noches.', '¿Cenamos?']);

const retardo = (ms) => ({ '--retardo': `${ms}ms` });

function Cabecera({ variante, ahora }) {
  if (variante === 'cliente') {
    const [saludo, pregunta] = invitacion(ahora.getHours());
    return (
      <>
        <h1 className="anim-subir mt-3 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight" style={retardo(80)}>
          {saludo}<br /><em className="font-medium italic text-primary-text">{pregunta}</em>
        </h1>
        <p className="anim-subir mt-3 text-sm text-fg-muted" style={retardo(140)}>Ingresa para ver tus pedidos y tu cuenta.</p>
      </>
    );
  }
  const fecha = mayuscula(ahora.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' }));
  const hora = ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <>
      <h1 className="anim-subir mt-3 font-display text-[2.6rem] font-semibold leading-none tracking-tight" style={retardo(80)}>
        {saludoAdmin(ahora.getHours())}.
      </h1>
      <p className="anim-subir mt-3 text-sm tabular-nums text-fg-muted" style={retardo(140)}>{fecha} · {hora}</p>
    </>
  );
}

export default function AuthLayout({ variante = 'admin', children }) {
  const c = CONFIG[variante];
  const ahora = useAhora();

  return (
    <div className={`flex min-h-dvh flex-col bg-background text-fg lg:grid ${c.rejilla} ${c.tema}`}>
      <main className={`relative flex flex-1 flex-col overflow-hidden px-6 sm:px-10 lg:min-h-dvh ${c.orden}`}>
        {variante === 'admin' && <CabeceraMovilAdmin />}

        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[24rem]">
            <p className="anim-subir flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-text">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" /> {c.eyebrow}
            </p>
            <Cabecera variante={variante} ahora={ahora} />

            <div className="anim-subir mt-9" style={retardo(220)}>{children}</div>

            <div className="anim-subir mt-9 flex items-center justify-between border-t border-line pt-5 text-sm" style={retardo(320)}>
              <span className="text-fg-muted">{c.pie.texto}</span>
              <Link to={c.pie.a} className="group inline-flex items-center gap-1 rounded-md font-medium text-primary-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                {c.pie.enlace}
                <ArrowUpRight size={15} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        <footer className="relative mx-auto w-full max-w-[24rem] pb-6 text-xs text-fg-muted">© 2026 artesa · Sistema ERP &amp; POS</footer>
      </main>

      {variante === 'admin' ? <PanelAdmin /> : <PanelCliente />}
    </div>
  );
}