import { useCallback, useState } from 'react';

const KEY = 'artesa-sidebar';

function leerEstado() {
  try { return localStorage.getItem(KEY) !== 'collapsed'; } catch { return true; }
}

export function useSidebar() {
  const [expandido, setExpandido] = useState(leerEstado);
  const cambiar = useCallback((valor) => setExpandido((actual) => {
    const siguiente = typeof valor === 'boolean' ? valor : !actual;
    try { localStorage.setItem(KEY, siguiente ? 'expanded' : 'collapsed'); } catch { /* no disponible */ }
    return siguiente;
  }), []);
  return { expandido, cambiar };
}
