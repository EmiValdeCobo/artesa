import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Store, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { cajaApi, EVENTO_TURNO_CAMBIO } from '../api/caja.api.js';
import { horaDe } from '../utils/formato.js';

// Indicador persistente del turno de caja del usuario: a qué sucursal y caja quedó vinculado.
// Se recarga al cambiar de pantalla y cuando Caja avisa que se abrió o cerró un turno.
export default function IndicadorTurno() {
  const { tiene } = useAuth();
  const { pathname } = useLocation();
  const aplica = tiene('CAJA_ABRIR_TURNO');
  // undefined = cargando · null = sin turno · objeto = turno abierto
  const [turno, setTurno] = useState(undefined);

  const cargar = useCallback(async () => {
    if (!aplica) return;
    try {
      setTurno(await cajaApi.obtenerTurnoActual());
    } catch (err) {
      // 404 = no hay turno abierto; cualquier otro fallo no debe tapar la pantalla.
      setTurno(err?.status === 404 ? null : (prev) => prev ?? null);
    }
  }, [aplica]);

  useEffect(() => { cargar(); }, [cargar, pathname]);
  useEffect(() => {
    window.addEventListener(EVENTO_TURNO_CAMBIO, cargar);
    return () => window.removeEventListener(EVENTO_TURNO_CAMBIO, cargar);
  }, [cargar]);

  if (!aplica || turno === undefined) return null;

  if (!turno) {
    return (
      <div role="status" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-label-sm text-fg-muted shadow-xs">
        <span className="size-2 rounded-full bg-fg-subtle" aria-hidden="true" />
        Sin turno
        {!pathname.startsWith('/caja') && (
          <Link to="/caja" className="text-primary-text underline-offset-2 hover:underline">Abrir turno</Link>
        )}
      </div>
    );
  }

  return (
    <Link
      to="/caja"
      role="status"
      aria-label={`Turno abierto en ${turno.sucursal}, ${turno.caja}, cajero ${turno.cajero}, desde las ${horaDe(turno.abierto_en)}`}
      className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-line bg-surface px-3 py-1 text-label-sm text-fg shadow-xs transition-colors hover:border-line-strong"
    >
      <span className="inline-flex items-center gap-1.5 text-success-text">
        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        Turno abierto
      </span>
      <span className="inline-flex items-center gap-1"><Store size={14} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />{turno.sucursal}</span>
      <span className="inline-flex items-center gap-1"><Wallet size={14} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />{turno.caja}</span>
      <span className="inline-flex items-center gap-1"><User size={14} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />{turno.cajero}</span>
      <span className="inline-flex items-center gap-1 tabular-nums text-fg-muted"><Clock size={14} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />desde {horaDe(turno.abierto_en)}</span>
    </Link>
  );
}
