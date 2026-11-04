import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut, Monitor, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menu, filtrarMenu } from '../config/menu.js';
import { useSidebar } from '../hooks/useSidebar.js';
import { useTheme } from '../hooks/useTheme.js';
import Logo from '../components/Logo.jsx';

/* ---------------------------------------------------------------------------
   Sidebar de artesa
   - Fijo: ocupa el alto de la ventana; solo el <main> hace scroll.
   - Compacto: ítems de 36 px para que el menú completo quepa sin scroll en
     pantallas de laptop. Si aun así no cabe, el scroll es "invisible" y se
     avisa con un degradado + flecha en el borde (nadie se pierde).
   - Colapsado: solo iconos; tooltips y flyouts van en un portal (no se recortan).
   --------------------------------------------------------------------------- */

const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const ITEM = 'relative flex items-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';
const ITEM_INACTIVO = 'text-on-sidebar/75 hover:bg-white/10 hover:text-on-sidebar';
const ITEM_ACTIVO = 'bg-primary text-on-accent shadow-sm';

const esActivo = (ruta, actual, end) => (end ? actual === ruta : actual === ruta || actual.startsWith(`${ruta}/`));

/* ---- Utilidades ---------------------------------------------------------- */

// Abrir/cerrar con retardo corto: permite cruzar el hueco entre el icono y su flyout.
function useAbrirAlPasar() {
  const [abierto, setAbierto] = useState(false);
  const temporizador = useRef(null);
  const abrir = useCallback(() => { clearTimeout(temporizador.current); setAbierto(true); }, []);
  const cerrar = useCallback((demora = 120) => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAbierto(false), demora);
  }, []);
  const cerrarYa = useCallback(() => { clearTimeout(temporizador.current); setAbierto(false); }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return { abierto, abrir, cerrar, cerrarYa, setAbierto };
}

// Cierra un flotante con Esc, scroll, resize o click fuera.
function useCerrarFlotante(abierto, ancla, cerrarYa) {
  useEffect(() => {
    if (!abierto) return undefined;
    const alTecla = (e) => { if (e.key === 'Escape') cerrarYa(); };
    const alClick = (e) => {
      if (ancla.current?.contains(e.target) || e.target.closest?.('[data-flotante]')) return;
      cerrarYa();
    };
    document.addEventListener('keydown', alTecla);
    document.addEventListener('mousedown', alClick);
    window.addEventListener('scroll', cerrarYa, true);
    window.addEventListener('resize', cerrarYa);
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.removeEventListener('mousedown', alClick);
      window.removeEventListener('scroll', cerrarYa, true);
      window.removeEventListener('resize', cerrarYa);
    };
  }, [abierto, ancla, cerrarYa]);
}

// Flotante en un portal con position:fixed: no lo recorta el overflow del nav.
function Flotante({ ancla, centrado = false, children, className = '', ...resto }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const a = ancla.current; const el = ref.current;
    if (!a || !el) return;
    const r = a.getBoundingClientRect();
    const alto = el.offsetHeight;
    const ideal = centrado ? r.top + r.height / 2 - alto / 2 : r.top;
    setPos({ top: Math.max(8, Math.min(ideal, window.innerHeight - alto - 8)), left: r.right + 10 });
  }, [ancla, centrado]);
  return createPortal(
    <div ref={ref} data-flotante style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className={`z-[60] ${className}`} {...resto}>{children}</div>,
    document.body,
  );
}

const Tooltip = ({ ancla, texto }) => (
  <Flotante ancla={ancla} centrado role="tooltip"
    className="pointer-events-none whitespace-nowrap rounded-md bg-espresso-950 px-2.5 py-1.5 text-xs font-medium text-espresso-50 shadow-lg ring-1 ring-white/10">
    {texto}
  </Flotante>
);

// Indica si hay contenido oculto arriba/abajo del nav (sustituye a la barra de scroll).
function useIndicadoresScroll(ref) {
  const [estado, setEstado] = useState({ arriba: false, abajo: false });
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const arriba = el.scrollTop > 4;
    const abajo = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setEstado((p) => (p.arriba === arriba && p.abajo === abajo ? p : { arriba, abajo }));
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener('scroll', medir); ro.disconnect(); };
  }, [ref, medir]);
  return estado;
}

/* ---- Piezas -------------------------------------------------------------- */

function Enlace({ item, colapsado, onNavigate }) {
  const Icono = item.icono;
  const ref = useRef(null);
  const tip = useAbrirAlPasar();
  return <>
    <NavLink ref={ref} to={item.ruta} end={item.end} aria-label={item.texto}
      onClick={() => { tip.cerrarYa(); onNavigate?.(); }}
      onMouseEnter={colapsado ? tip.abrir : undefined} onMouseLeave={() => tip.cerrar(0)}
      onFocus={colapsado ? tip.abrir : undefined} onBlur={tip.cerrarYa}
      className={({ isActive }) => `${ITEM} h-9 ${colapsado ? 'justify-center' : 'gap-3 px-3'} ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`}>
      <Icono size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
      {!colapsado && <span className="truncate">{item.texto}</span>}
    </NavLink>
    {colapsado && tip.abierto && <Tooltip ancla={ref} texto={item.texto} />}
  </>;
}

function Grupo({ item, colapsado, actual, onNavigate }) {
  const Icono = item.icono;
  const activo = item.hijos.some((h) => esActivo(h.ruta, actual, h.end));
  const [abierto, setAbierto] = useState(activo);
  const ref = useRef(null);
  const fly = useAbrirAlPasar();
  const idSubmenu = `submenu-${item.texto.replaceAll(' ', '-')}`;
  useEffect(() => { if (activo) setAbierto(true); }, [activo]);
  useCerrarFlotante(fly.abierto, ref, fly.cerrarYa);

  const claseBoton = `${ITEM} h-9 w-full ${activo ? 'bg-white/10 text-on-sidebar' : ITEM_INACTIVO}`;

  if (colapsado) {
    return <>
      <button ref={ref} type="button" aria-label={item.texto} aria-haspopup="menu" aria-expanded={fly.abierto}
        onClick={() => fly.setAbierto((v) => !v)} onMouseEnter={fly.abrir} onMouseLeave={() => fly.cerrar()}
        className={`${claseBoton} justify-center`}>
        <Icono size={18} strokeWidth={1.8} aria-hidden="true" />
        {activo && <span aria-hidden="true" className="absolute -right-0.5 top-1.5 h-1.5 w-1.5 rounded-full bg-secondary" />}
      </button>
      {fly.abierto && <Flotante ancla={ref} role="menu" onMouseEnter={fly.abrir} onMouseLeave={() => fly.cerrar()}
        className="min-w-48 rounded-xl border border-line bg-surface p-1.5 text-fg shadow-xl">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">{item.texto}</p>
        {item.hijos.map((h) => (
          <NavLink key={h.ruta} to={h.ruta} end={h.end} role="menuitem" onClick={() => { fly.cerrarYa(); onNavigate?.(); }}
            className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-primary text-on-accent' : 'hover:bg-muted'}`}>
            {h.texto}
          </NavLink>
        ))}
      </Flotante>}
    </>;
  }

  return <div>
    <button type="button" aria-expanded={abierto} aria-controls={idSubmenu} onClick={() => setAbierto((v) => !v)}
      className={`${claseBoton} gap-3 px-3 text-left`}>
      <Icono size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 truncate">{item.texto}</span>
      <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
    </button>
    {abierto && <div id={idSubmenu} className="ml-[1.4rem] mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
      {item.hijos.map((h) => (
        <NavLink key={h.ruta} to={h.ruta} end={h.end} onClick={onNavigate}
          className={({ isActive }) => `${ITEM} h-8 px-3 ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`}>
          <span className="truncate">{h.texto}</span>
        </NavLink>
      ))}
    </div>}
  </div>;
}

function BotonIcono({ icono: Icono, etiqueta, onClick, conTooltip = true }) {
  const ref = useRef(null);
  const tip = useAbrirAlPasar();
  return <>
    <button ref={ref} type="button" aria-label={etiqueta} onClick={() => { tip.cerrarYa(); onClick(); }}
      title={conTooltip ? undefined : etiqueta}
      onMouseEnter={conTooltip ? tip.abrir : undefined} onMouseLeave={() => tip.cerrar(0)}
      onFocus={conTooltip ? tip.abrir : undefined} onBlur={tip.cerrarYa}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-sidebar/75 outline-none transition-colors hover:bg-white/10 hover:text-on-sidebar focus-visible:ring-2 focus-visible:ring-ring">
      <Icono size={17} strokeWidth={1.8} aria-hidden="true" />
    </button>
    {tip.abierto && <Tooltip ancla={ref} texto={etiqueta} />}
  </>;
}

const TEMAS = {
  light: { icono: Sun, nombre: 'Claro', siguiente: 'dark' },
  dark: { icono: Moon, nombre: 'Oscuro', siguiente: 'system' },
  system: { icono: Monitor, nombre: 'Sistema', siguiente: 'light' },
};

function Pie({ colapsado }) {
  const { usuario, logout } = useAuth();
  const { tema, elegir } = useTheme();
  const actual = TEMAS[tema] ?? TEMAS.system;
  const siguiente = TEMAS[actual.siguiente];
  const botonTema = <BotonIcono icono={actual.icono} etiqueta={`Tema: ${actual.nombre}. Cambiar a ${siguiente.nombre}`} onClick={() => elegir(actual.siguiente)} />;
  const botonSalir = <BotonIcono icono={LogOut} etiqueta="Cerrar sesión" onClick={logout} />;
  const avatar = <div title={usuario?.username} aria-hidden="true"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-accent">
    {usuario?.username?.charAt(0).toUpperCase() || '?'}
  </div>;

  return <footer className="shrink-0 border-t border-white/10 p-3">
    {colapsado
      ? <div className="flex flex-col items-center gap-1">{avatar}{botonTema}{botonSalir}</div>
      : <div className="flex items-center gap-2">
        {avatar}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{usuario?.username}</p>
          <p className="truncate text-xs text-on-sidebar/60">{usuario?.rol}</p>
        </div>
        {botonTema}{botonSalir}
      </div>}
  </footer>;
}

/* ---- Sidebar ------------------------------------------------------------- */

export default function Sidebar({ mobileOpen, onClose }) {
  const { tiene } = useAuth();
  const { expandido, cambiar } = useSidebar();
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const [esMovil, setEsMovil] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const items = useMemo(() => filtrarMenu(menu, tiene), [tiene]);
  const { arriba, abajo } = useIndicadoresScroll(navRef);
  const colapsado = !esMovil && !expandido;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const actualizar = () => setEsMovil(media.matches);
    media.addEventListener('change', actualizar);
    return () => media.removeEventListener('change', actualizar);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const alTecla = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [mobileOpen, onClose]);

  // Si el ítem activo quedó fuera de la vista, lo trae a la vista.
  useEffect(() => {
    const id = setTimeout(() => navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' }), 60);
    return () => clearTimeout(id);
  }, [pathname, colapsado]);

  const desplazar = (dy) => navRef.current?.scrollBy({ top: dy, behavior: 'smooth' });
  const navegar = () => onClose?.();

  const renderItem = (item) => (item.hijos
    ? <Grupo key={item.texto} item={item} colapsado={colapsado} actual={pathname} onNavigate={navegar} />
    : <Enlace key={item.ruta} item={item} colapsado={colapsado} onNavigate={navegar} />);

  const flecha = 'pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-on-sidebar/80 hover:bg-white/20 hover:text-on-sidebar';

  return <>
    {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onClose} className="fixed inset-0 z-40 bg-sidebar/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col bg-sidebar text-on-sidebar shadow-xl transition-[width,transform] duration-300 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${colapsado ? 'w-[4.5rem]' : 'w-64'}`}>

      <header className={`relative flex h-16 shrink-0 items-center border-b border-white/10 ${colapsado ? 'justify-center' : 'gap-3 px-4'}`}>
        <Logo variante="isotipo" tema="oscuro" className="h-9 w-auto shrink-0" />
        {!colapsado && <div className="min-w-0 leading-none">
          <p className="text-lg font-extrabold tracking-wide">artesa</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-on-sidebar/60">ERP &amp; POS</p>
        </div>}
        <button type="button" onClick={onClose} aria-label="Cerrar navegación" className="ml-auto rounded-lg p-2 text-on-sidebar/70 hover:bg-white/10 lg:hidden"><X size={19} /></button>
        <button type="button" onClick={() => cambiar()} aria-label={colapsado ? 'Expandir navegación' : 'Colapsar navegación'} aria-expanded={!colapsado}
          className="absolute -right-3 top-5 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-sidebar text-on-sidebar shadow-sm transition-colors hover:bg-primary focus-visible:ring-2 focus-visible:ring-ring lg:flex">
          {colapsado ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </header>

      {/* Nav sin barra de scroll visible; si hay más contenido, degradado + flecha en el borde */}
      <div className="relative min-h-0 flex-1">
        <nav ref={navRef} aria-label="Navegación principal" className={`h-full overflow-y-auto px-3 py-3 ${SIN_BARRA}`}>
          <div className="space-y-0.5">
            {items.map((entrada, i) => {
              if (!entrada.seccion) return renderItem(entrada);
              return <div key={entrada.seccion} className="space-y-0.5">
                {colapsado
                  ? <div className="mx-3 !my-2 border-t border-white/10" aria-hidden="true" />
                  : <p className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-sidebar/55 ${i === 0 ? 'pt-1' : 'pt-4'}`}>{entrada.seccion}</p>}
                {entrada.items.map(renderItem)}
              </div>;
            })}
          </div>
        </nav>
        {arriba && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-9 justify-center pt-0.5"
          style={{ background: 'linear-gradient(to bottom, var(--bg-sidebar) 35%, transparent)' }}>
          <button type="button" tabIndex={-1} onClick={() => desplazar(-160)} className={flecha}><ChevronUp size={14} /></button>
        </div>}
        {abajo && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-center pb-0.5"
          style={{ background: 'linear-gradient(to top, var(--bg-sidebar) 35%, transparent)' }}>
          <button type="button" tabIndex={-1} onClick={() => desplazar(160)} className={flecha}><ChevronDown size={14} /></button>
        </div>}
      </div>

      <Pie colapsado={colapsado} />
    </aside>
  </>;
}