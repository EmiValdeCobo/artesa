import { useEffect } from 'react';

// Trampa de foco para paneles modales que no usan <Dialogo> (drawers laterales).
// Misma lógica que Dialogo.jsx: foco inicial dentro del panel, Tab/Shift+Tab circulan sin
// escapar "detrás" del modal y, al cerrar, el foco vuelve al elemento que lo abrió.
const FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useTrampaFoco(panelRef, activo = true) {
  useEffect(() => {
    if (!activo) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;
    const previo = document.activeElement;
    (panel.querySelector(FOCALIZABLES) || panel).focus();

    const alPresionar = (evento) => {
      if (evento.key !== 'Tab') return;
      // Si hay un diálogo apilado encima (portal fuera del panel), él gestiona su propio foco.
      const activoEl = document.activeElement;
      if (activoEl && activoEl !== document.body && !panel.contains(activoEl)) return;
      const elementos = [...panel.querySelectorAll(FOCALIZABLES)];
      if (!elementos.length) { evento.preventDefault(); panel.focus(); return; }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && (activoEl === primero || activoEl === panel)) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && activoEl === ultimo) { evento.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      if (previo?.isConnected) previo.focus?.();
    };
  // Solo al abrir/cerrar el panel.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}
