import { useEffect, useState } from 'react';

// Reloj de baja frecuencia para textos relativos ("hace 3 min") y para cambiar de día sin recargar.
export function useAhora(cadaMs = 30000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);
  return ahora;
}
