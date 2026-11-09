import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { traducirError } from '../../errors/traducirError.js';

// Carga un bloque del dashboard con estados explícitos:
//   cargando  → primera carga (aún no hay datos)
//   error     → falló; si ya había datos se conservan (`datos`) y la pantalla avisa que están desactualizados
//   datos     → última respuesta válida
// `intervalo` (ms) refresca en segundo plano solo si la pestaña está visible.
export function useDashboardData(ruta, params = {}, { intervalo = 0 } = {}) {
  const [estado, setEstado] = useState({ datos: null, error: null });
  const [version, setVersion] = useState(0);
  const consulta = new URLSearchParams(params).toString();

  useEffect(() => {
    const control = new AbortController();
    api.get(`${ruta}${consulta ? `?${consulta}` : ''}`, { signal: control.signal })
      .then((datos) => setEstado({ datos, error: null }))
      .catch((falla) => {
        if (control.signal.aborted) return;
        setEstado((previo) => ({ datos: previo.datos, error: traducirError(falla) }));
      });
    return () => control.abort();
  }, [ruta, consulta, version]);

  useEffect(() => {
    if (!intervalo) return undefined;
    const id = setInterval(() => { if (!document.hidden) setVersion((v) => v + 1); }, intervalo);
    return () => clearInterval(id);
  }, [intervalo]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos: estado.datos, error: estado.error, cargando: !estado.datos && !estado.error, recargar };
}
