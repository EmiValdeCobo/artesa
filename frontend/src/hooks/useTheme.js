import { useCallback, useEffect, useState } from 'react';

const KEY = 'artesa-theme'; // 'light' | 'dark' | 'system'
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function aplicar(tema) {
  const oscuro = tema === 'dark' || (tema === 'system' && mq().matches);
  document.documentElement.classList.toggle('dark', oscuro);
}

export function useTheme() {
  const [tema, setTema] = useState(() => localStorage.getItem(KEY) || 'system');

  useEffect(() => {
    aplicar(tema);
    if (tema !== 'system') return;
    const m = mq();
    const alCambiar = () => aplicar('system');
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, [tema]);

  const elegir = useCallback((t) => { localStorage.setItem(KEY, t); setTema(t); }, []);
  return { tema, elegir };
}
