import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Cascarón accesible para TODOS los diálogos modales de la app (alertas, confirmaciones, formularios).
// Se encarga de lo que no debe repetirse en cada popup:
//   · role="dialog" / "alertdialog" + aria-modal y nombres accesibles (aria-labelledby / aria-describedby)
//   · foco inicial controlado, foco atrapado con Tab y devuelto al elemento que lo abrió al cerrar
//   · cierre con Escape y con clic en el fondo (opcional), sin cerrar el diálogo de abajo si hay uno apilado
//   · bloqueo del scroll de la página
//   · móvil: hoja inferior a todo el ancho · escritorio: tarjeta centrada

const FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const TAMANOS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-xl' };

const pila = []; // diálogos abiertos; solo el de arriba reacciona al teclado

export default function Dialogo({
  onCerrar,
  rol = 'dialog',
  tamano = 'md',
  cerrarConEscape = true,
  cerrarConFondo = true,
  enfoqueInicial,
  labelledBy,
  describedBy,
  children,
}) {
  const panelRef = useRef(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  const opcionesRef = useRef({ cerrarConEscape });
  opcionesRef.current = { cerrarConEscape };

  useEffect(() => {
    const panel = panelRef.current;
    const previo = document.activeElement;
    const marca = Symbol('dialogo');
    pila.push(marca);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const foco = enfoqueInicial?.current || panel.querySelector(FOCALIZABLES) || panel;
    foco.focus();

    const alPresionar = (evento) => {
      if (pila[pila.length - 1] !== marca) return;
      if (evento.key === 'Escape' && opcionesRef.current.cerrarConEscape) {
        evento.preventDefault();
        evento.stopPropagation();
        cerrarRef.current?.();
        return;
      }
      if (evento.key !== 'Tab') return;
      const elementos = [...panel.querySelectorAll(FOCALIZABLES)];
      if (!elementos.length) { evento.preventDefault(); panel.focus(); return; }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && (document.activeElement === primero || document.activeElement === panel)) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', alPresionar);

    return () => {
      document.removeEventListener('keydown', alPresionar);
      pila.splice(pila.indexOf(marca), 1);
      if (!pila.length) document.body.style.overflow = overflowPrevio;
      if (previo?.isConnected) previo.focus?.();
    };
  // El foco inicial solo se decide al abrir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="anim-scrim fixed inset-0 z-[60] flex items-end justify-center bg-espresso-950/60 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(evento) => { if (cerrarConFondo && evento.target === evento.currentTarget) cerrarRef.current?.(); }}
    >
      <div
        ref={panelRef}
        role={rol}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`anim-dialogo max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface pb-[env(safe-area-inset-bottom)] text-fg shadow-2xl outline-none sm:max-h-[90dvh] sm:rounded-2xl sm:pb-0 ${TAMANOS[tamano] || TAMANOS.md}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
