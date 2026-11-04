import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { rutaEspiral } from '../components/Espiral.jsx';

/* ---------------------------------------------------------------------------
   Pantallas de acceso de artesa — concepto: "abrir el servicio".
   Dos mitades: a la izquierda la marca (el hilo de la voluta, una lista tipo
   comanda con puntos guía); a la derecha el formulario, sin tarjeta, con el
   saludo del momento del día. Los colores salen de los tokens, así que
   respeta el tema claro/oscuro.
   --------------------------------------------------------------------------- */

const CONTENIDO = {
    admin: {
        eyebrow: 'Área administrativa',
        titulo: <>De la cocina a la caja, sin perder el <em className="font-medium italic text-ocre-400">hilo</em>.</>,
        listaTitulo: 'Todo el servicio, en un solo lugar',
        lista: [
            ['Punto de venta', 'Cobro y comandas'],
            ['Preparación', 'Cola de cocina'],
            ['Caja y turnos', 'Aperturas y cuadres'],
            ['Inventario', 'Stock, recetas y mermas'],
            ['Compras', 'Proveedores y pagos'],
        ],
        pie: { texto: '¿Eres cliente?', enlace: 'Portal de clientes', a: '/cliente/login' },
    },
    cliente: {
        eyebrow: 'Portal de clientes',
        titulo: <>Tu mesa te estaba <em className="font-medium italic text-ocre-400">esperando</em>.</>,
        listaTitulo: 'Lo que encontrarás aquí',
        lista: [
            ['Mis pedidos', 'Estado e historial'],
            ['Mi perfil', 'Tus datos y tu cuenta'],
        ],
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

const saludoDe = (hora) => (hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches');
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function Marca({ tema = 'oscuro', className = '' }) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <Logo variante="isotipo" tema={tema} className="h-10 w-auto shrink-0" />
            <div className="leading-none">
                <p className="text-xl font-extrabold tracking-wide">artesa</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] opacity-60">ERP &amp; POS</p>
            </div>
        </div>
    );
}

// El hilo: una sola línea en espiral que se dibuja al cargar. Recortada por el borde del contenedor.
const HILO_PRINCIPAL = rutaEspiral({ cx: 400, cy: 400, r0: 8, r1: 640, vueltas: 8, pasos: 720 });
const HILO_SOMBRA = rutaEspiral({ cx: 400, cy: 400, r0: 8, r1: 640, vueltas: 8, fase: Math.PI, pasos: 720 });

function ArteHilo({ className = '' }) {
    // ids únicos: el arte se renderiza dos veces (desktop y móvil) y un degradado dentro de un SVG oculto no resuelve
    const uid = useId().replace(/:/g, '');
    const color = `hilo-color-${uid}`;
    const brillo = `hilo-brillo-${uid}`;
    return (
        <svg viewBox="0 0 800 800" aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
            <defs>
                <radialGradient id={color} cx="400" cy="400" r="560" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#edc173" />
                    <stop offset="0.45" stopColor="#c97752" />
                    <stop offset="1" stopColor="#7b3b27" />
                </radialGradient>
                <radialGradient id={brillo} cx="400" cy="400" r="260" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#e1a651" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#e1a651" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="400" cy="400" r="260" fill={`url(#${brillo})`} />
            <path d={HILO_SOMBRA} pathLength="1" fill="none" stroke={`url(#${color})`} strokeWidth="1" strokeOpacity="0.25" className="hilo-trazo" style={{ animationDelay: '0.3s' }} />
            <path d={HILO_PRINCIPAL} pathLength="1" fill="none" stroke={`url(#${color})`} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.9" className="hilo-trazo" />
            <circle cx="400" cy="400" r="7" fill="#e8b866" />
        </svg>
    );
}

// Textura de grano muy sutil para que el fondo no se vea plano.
function Grano() {
    return (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay">
            <filter id="grano"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#grano)" />
        </svg>
    );
}

const retardo = (ms) => ({ '--retardo': `${ms}ms` });

export default function AuthLayout({ variante = 'admin', children }) {
    const c = CONTENIDO[variante];
    const ahora = useAhora();
    const fecha = mayuscula(ahora.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' }));
    const hora = ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div className="grid min-h-dvh bg-background text-fg lg:grid-cols-[1.1fr_1fr]">
            {/* ---- Marca ---- */}
            <aside className="relative hidden overflow-hidden border-r border-white/5 bg-sidebar p-12 text-on-sidebar lg:flex lg:flex-col lg:justify-between xl:p-16">
                <Grano />
                <ArteHilo className="-right-[43%] -top-[34%] w-[118%] max-w-none [mask-image:radial-gradient(circle_closest-side,black_38%,transparent)]" />
                <Marca className="relative anim-subir" />
                <div className="relative max-w-xl">
                    <h2 className="anim-subir font-display text-5xl font-semibold leading-[1.04] tracking-tight xl:text-[3.5rem]" style={retardo(120)}>
                        {c.titulo}
                    </h2>
                    <div className="anim-subir mt-10 max-w-md border-t border-dashed border-white/20 pt-5" style={retardo(260)}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-sidebar/55">{c.listaTitulo}</p>
                        <ul className="mt-3">
                            {c.lista.map(([nombre, detalle]) => (
                                <li key={nombre} className="flex items-baseline gap-3 py-1.5 text-sm">
                                    <span className="font-medium">{nombre}</span>
                                    <span aria-hidden="true" className="h-px flex-1 border-b border-dotted border-white/25" />
                                    <span className="text-xs text-ocre-300">{detalle}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </aside>

            {/* ---- Formulario ---- */}
            <main className="relative flex min-h-dvh flex-col overflow-hidden px-6 sm:px-10">
                <ArteHilo className="-right-48 -top-48 w-[34rem] max-w-none opacity-60 lg:hidden [mask-image:radial-gradient(circle_closest-side,black_38%,transparent)]" />
                <header className="relative pt-7 lg:hidden"><Marca tema="auto" /></header>

                <div className="relative flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-[24rem]">
                        <p className="anim-subir flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-text">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" /> {c.eyebrow}
                        </p>
                        <h1 className="anim-subir mt-3 font-display text-[2.6rem] font-semibold leading-none tracking-tight" style={retardo(80)}>
                            {saludoDe(ahora.getHours())}.
                        </h1>
                        <p className="anim-subir mt-3 text-sm tabular-nums text-fg-muted" style={retardo(140)}>{fecha} · {hora}</p>

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
        </div>
    );
}