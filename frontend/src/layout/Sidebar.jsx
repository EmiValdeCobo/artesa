import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut, Monitor, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { menu, filtrarMenu, esRutaActiva as esActivo, grupoDeRuta } from '../config/menu.js';
import { useSidebar } from '../hooks/useSidebar.js';
import { useTheme } from '../hooks/useTheme.js';
import Logo from '../components/branding/Logo.jsx';

/* ---------------------------------------------------------------------------
   Sidebar de artesa
   - Escritorio: sticky y a la altura de la ventana; móvil: panel fijo deslizable.
   - Compacto: ítems de 36 px para que el menú completo quepa sin scroll en
     pantallas de laptop. Si aun así no cabe, el scroll es "invisible" y se
     avisa con un degradado + flecha en el borde (nadie se pierde).
   - Colapsado: solo iconos; tooltips y flyouts van en un portal (no se recortan).
   --------------------------------------------------------------------------- */

const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const FOCO = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-sidebar';
const ITEM = `relative flex items-center rounded-md text-label transition-colors ${FOCO}`;
const ITEM_INACTIVO = 'text-on-sidebar-muted hover:bg-on-sidebar/10 hover:text-on-sidebar';
// Activo: tinte Terracota suave + barra Ocre a la izquierda (sin relleno sólido para hijos).
const ITEM_ACTIVO = 'bg-primary/15 text-on-sidebar before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-ring-sidebar';

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
function useCerrarFlotante(abierto, ancla, cerrarYa, alEscape) {
  useEffect(() => {
    if (!abierto) return undefined;
    const alTecla = (e) => { if (e.key === 'Escape') { cerrarYa(); alEscape?.(); } };
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
  }, [abierto, ancla, cerrarYa, alEscape]);
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
    className="pointer-events-none whitespace-nowrap rounded-sm bg-espresso-950 px-2.5 py-1.5 text-label-sm text-espresso-50 shadow-md ring-1 ring-on-sidebar/10">
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
      className={({ isActive }) => `${ITEM} h-nav-item ${colapsado ? 'justify-center' : 'gap-3 px-3'} ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`}>
      <Icono size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      {!colapsado && <span className="truncate">{item.texto}</span>}
    </NavLink>
    {colapsado && tip.abierto && <Tooltip ancla={ref} texto={item.texto} />}
  </>;
}

function Grupo({ item, colapsado, actual, abierto, onToggle, onNavigate }) {
  const Icono = item.icono;
  const activo = item.hijos.some((h) => esActivo(h.ruta, actual, h.end));
  const ref = useRef(null);
  const primerEnlaceRef = useRef(null);
  const enfocarPrimerEnlace = useRef(false);
  const fly = useAbrirAlPasar();
  const idSubmenu = `submenu-${item.id}`;
  const devolverFoco = useCallback(() => ref.current?.focus(), []);
  useCerrarFlotante(fly.abierto, ref, fly.cerrarYa, devolverFoco);
  useEffect(() => {
    if (fly.abierto && enfocarPrimerEnlace.current) {
      primerEnlaceRef.current?.focus();
      enfocarPrimerEnlace.current = false;
    }
  }, [fly.abierto]);

  const claseBoton = `${ITEM} h-nav-item w-full ${activo ? (abierto && !colapsado ? 'text-on-sidebar' : ITEM_ACTIVO) : ITEM_INACTIVO}`;

  if (colapsado) {
    return <>
      <button ref={ref} type="button" aria-label={item.texto} aria-expanded={fly.abierto} aria-controls={idSubmenu}
        onClick={(event) => { if (!fly.abierto && event.detail === 0) enfocarPrimerEnlace.current = true; fly.setAbierto((v) => !v); }} onMouseEnter={fly.abrir} onMouseLeave={() => fly.cerrar()}
        className={`${claseBoton} justify-center`}>
        <Icono size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {fly.abierto && <Flotante ancla={ref} onMouseEnter={fly.abrir} onMouseLeave={() => fly.cerrar()}
        className="min-w-48 rounded-md border border-line bg-surface p-1 text-fg shadow-lg">
        <ul id={idSubmenu} aria-label={item.texto} onKeyDown={(event) => {
          const enlaces = [...event.currentTarget.querySelectorAll('a[href]')];
          const primero = enlaces[0]; const ultimo = enlaces.at(-1);
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const indice = enlaces.indexOf(document.activeElement);
            const siguiente = event.key === 'Home' ? 0
              : event.key === 'End' ? enlaces.length - 1
                : (indice + (event.key === 'ArrowDown' ? 1 : -1) + enlaces.length) % enlaces.length;
            enlaces[siguiente]?.focus();
            return;
          }
          if (event.key !== 'Tab') return;
          if ((event.shiftKey && document.activeElement === primero) || (!event.shiftKey && document.activeElement === ultimo)) {
            event.preventDefault(); fly.cerrarYa(); devolverFoco();
          }
        }}>
          {item.hijos.map((h, i) => (
            <li key={h.ruta}><NavLink ref={i === 0 ? primerEnlaceRef : undefined} to={h.ruta} end={h.end} onClick={() => { fly.cerrarYa(); onNavigate?.(); }}
              className={({ isActive }) => `block rounded-sm px-3 py-2 text-body-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive ? 'bg-primary-soft font-medium text-primary-text' : 'hover:bg-muted'}`}>
              {h.texto}
            </NavLink></li>
          ))}
        </ul>
      </Flotante>}
    </>;
  }

  return <div>
    <button type="button" aria-expanded={abierto} aria-controls={idSubmenu} onClick={onToggle}
      className={`${claseBoton} gap-3 px-3 text-left`}>
      <Icono size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 truncate">{item.texto}</span>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 text-on-sidebar-muted transition-transform motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`} />
    </button>
    {abierto && <ul id={idSubmenu} className="ml-5 mt-0.5 space-y-0.5 border-l border-on-sidebar/15 pl-2">
      {item.hijos.map((h) => (
        <li key={h.ruta}><NavLink to={h.ruta} end={h.end} onClick={onNavigate}
          className={({ isActive }) => `${ITEM} h-nav-subitem px-3 text-body-sm font-normal ${isActive ? 'font-medium text-on-sidebar before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-ring-sidebar' : ITEM_INACTIVO}`}>
          <span className="truncate">{h.texto}</span>
        </NavLink></li>
      ))}
    </ul>}
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
      className={`flex size-control-sm shrink-0 items-center justify-center rounded-md text-on-sidebar-muted transition-colors hover:bg-on-sidebar/10 hover:text-on-sidebar ${FOCO}`}>
      <Icono size={18} strokeWidth={1.75} aria-hidden="true" />
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
    className="flex size-control-sm shrink-0 items-center justify-center rounded-full bg-on-sidebar/10 text-label text-on-sidebar ring-1 ring-on-sidebar/15">
    {usuario?.username?.charAt(0).toUpperCase() || '?'}
  </div>;

  return <footer className="shrink-0 border-t border-on-sidebar/10 px-3 py-2.5">
    {colapsado
      ? <div className="flex flex-col items-center gap-1">{avatar}{botonTema}{botonSalir}</div>
      : <div className="flex items-center gap-2">
        {avatar}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-label text-on-sidebar">{usuario?.username}</p>
          <p className="truncate text-label-sm text-on-sidebar-muted">{usuario?.rol}</p>
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
  const [grupoAbierto, setGrupoAbierto] = useState(() => grupoDeRuta(items, pathname));

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

  // Al navegar, se despliega el grupo de la página actual y se pliegan los demás.
  useEffect(() => { setGrupoAbierto(grupoDeRuta(items, pathname)); }, [pathname, items]);

  // Si el ítem activo quedó fuera de la vista, lo trae a la vista.
  useEffect(() => {
    const id = setTimeout(() => navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' }), 60);
    return () => clearTimeout(id);
  }, [pathname, colapsado]);

  const desplazar = (dy) => navRef.current?.scrollBy({ top: dy, behavior: 'smooth' });
  const navegar = () => onClose?.();

  const renderItem = (item) => (item.hijos
    ? <Grupo key={item.id} item={item} colapsado={colapsado} actual={pathname} abierto={grupoAbierto === item.id}
      onToggle={() => setGrupoAbierto((g) => (g === item.id ? null : item.id))} onNavigate={navegar} />
    : <Enlace key={item.ruta} item={item} colapsado={colapsado} onNavigate={navegar} />);

  const flecha = 'pointer-events-auto flex size-6 items-center justify-center rounded-full bg-on-sidebar/10 text-on-sidebar-muted hover:bg-on-sidebar/20 hover:text-on-sidebar';

  return <>
    {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onClose} className="fixed inset-0 z-40 bg-overlay lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col bg-sidebar text-on-sidebar shadow-lg transition-[width,transform] duration-300 motion-reduce:transition-none lg:sticky lg:top-0 lg:bottom-auto lg:h-dvh lg:self-start lg:z-20 lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${colapsado ? 'w-sidebar-colapsada' : 'w-sidebar'}`}>

      {/* Área de respeto del logo ≈ 25 % del alto del símbolo (28 px → 7 px; px-5 la cumple) */}
      <header className={`relative flex h-header shrink-0 items-center border-b border-on-sidebar/10 ${colapsado ? 'justify-center' : 'gap-3 px-5'}`}>
        {colapsado
          ? <Logo variante="isotipo" tema="oscuro" alto={28} className="shrink-0" />
          : <Logo variante="completo" tema="oscuro" alto={28} className="shrink-0" />}
        <button type="button" onClick={onClose} aria-label="Cerrar navegación" className={`ml-auto flex size-control-sm items-center justify-center rounded-md text-on-sidebar-muted hover:bg-on-sidebar/10 hover:text-on-sidebar lg:hidden ${FOCO}`}><X size={20} strokeWidth={1.75} aria-hidden="true" /></button>
        <button type="button" onClick={() => cambiar()} aria-label={colapsado ? 'Expandir navegación' : 'Colapsar navegación'} aria-expanded={!colapsado}
          className={`absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-on-sidebar/20 bg-sidebar text-on-sidebar-muted shadow-sm transition-colors hover:text-on-sidebar ${FOCO} lg:flex`}>
          {colapsado ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </header>

      {/* Nav sin barra de scroll visible; si hay más contenido, degradado + flecha en el borde */}
      <div className="relative min-h-0 flex-1">
        <nav ref={navRef} aria-label="Navegación principal" className={`h-full overflow-y-auto px-3 py-4 ${SIN_BARRA}`}>
          <ul className="space-y-0.5" aria-label="Navegación">
            {items.map((entrada, i) => {
              if (!entrada.seccion) return <li key={entrada.ruta}>{renderItem(entrada)}</li>;
              const idRotulo = `seccion-${entrada.seccion.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              return <li key={entrada.seccion} className="space-y-0.5">
                {colapsado
                  ? <>
                    <p id={idRotulo} className="sr-only">{entrada.seccion}</p>
                    <div className="mx-3 !my-3 border-t border-on-sidebar/10" aria-hidden="true" />
                  </>
                  : <p id={idRotulo} className={`px-3 pb-1.5 text-label-sm uppercase tracking-wider text-on-sidebar-muted ${i === 0 ? 'pt-1' : 'pt-5'}`}>{entrada.seccion}</p>}
                <ul aria-labelledby={idRotulo} className="space-y-0.5">{entrada.items.map((item) => <li key={item.id ?? item.ruta}>{renderItem(item)}</li>)}</ul>
              </li>;
            })}
          </ul>
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
