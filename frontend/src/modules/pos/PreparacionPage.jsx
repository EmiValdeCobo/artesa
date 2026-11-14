import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Store,
  Package,
  AlertCircle,
  Flame,
  CircleCheck,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import { Spinner } from '../../components/ui/index.js';
import { preparacionApi } from '../../api/preparacion.api.js';
import { horaDe, haceCuanto } from '../../utils/formato.js';

// ----- Configuración de estados -----
const ESTADOS = {
  ABIERTA: {
    label: 'Nueva',
    siguiente: 'EN_PREPARACION',
    accion: 'Iniciar preparación',
    color: 'border-amber-300 dark:border-amber-600/50 bg-surface',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    icono: ClipboardList,
    iconoAccion: Flame,
    boton: 'bg-terracota-500 hover:bg-terracota-600 active:bg-terracota-700 text-white shadow-sm',
  },
  EN_PREPARACION: {
    label: 'En preparación',
    siguiente: 'LISTA',
    accion: 'Marcar como lista',
    color: 'border-blue-300 dark:border-blue-600/50 bg-surface',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
    icono: Flame,
    iconoAccion: CheckCircle2,
    boton: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm',
  },
  LISTA: {
    label: 'Lista para entregar',
    siguiente: 'ENTREGADA',
    accion: 'Marcar entregada',
    color: 'border-emerald-300 dark:border-emerald-600/50 bg-surface',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    icono: CheckCircle2,
    iconoAccion: CircleCheck,
    boton: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm',
  },
};

const COLUMNAS = ['ABIERTA', 'EN_PREPARACION', 'LISTA'];

// Intervalo de polling en ms
const INTERVALO_POLLING = 15_000;

// Clasifica urgencia por minutos de espera
function urgencia(minutos) {
  if (minutos >= 15) return 'text-danger font-bold';
  if (minutos >= 8) return 'text-warning font-semibold';
  return 'text-fg-muted';
}

// ----- Tarjeta de orden -----
function TarjetaOrden({ orden, enProgreso, onAvanzar }) {
  const cfg = ESTADOS[orden.estado];
  const IconoAccion = cfg?.iconoAccion ?? ArrowRight;

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border-2 p-4 shadow-sm transition-all ${cfg?.color ?? ''}`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg?.badge ?? ''}`}
          >
            {cfg?.label}
          </span>
          <p className="mt-1 text-xs font-medium text-fg-muted">
            #{orden.id_orden}
            {orden.etiqueta ? ` · ${orden.etiqueta}` : ''}
            {orden.canal ? ` · ${orden.canal}` : ''}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-fg-muted">{horaDe(orden.creado_en)}</p>
          <p className={`mt-0.5 ${urgencia(orden.minutos_espera)}`}>
            {orden.minutos_espera === 0
              ? 'Recién llegada'
              : `${orden.minutos_espera} min`}
          </p>
        </div>
      </div>

      {/* Sucursal */}
      <div className="flex items-center gap-1 text-xs text-fg-muted">
        <Store size={12} />
        <span>{orden.sucursal}</span>
      </div>

      {/* Ítems */}
      <ul className="space-y-1">
        {orden.items.map((item) => (
          <li key={item.id_detalle} className="flex items-start gap-2 text-sm">
            <Package size={13} className="mt-0.5 shrink-0 text-fg-muted" />
            <span className="flex-1">
              <span className="font-semibold">{item.cantidad}×</span>{' '}
              {item.producto}
              {item.nota && (
                <span className="ml-1 text-xs text-fg-muted italic">
                  — {item.nota}
                </span>
              )}
            </span>
          </li>
        ))}
        {orden.items.length === 0 && (
          <li className="text-xs text-fg-muted italic">Sin productos registrados</li>
        )}
      </ul>

      {/* Acción */}
      {cfg?.siguiente && (
        <button
          type="button"
          onClick={() => onAvanzar(orden.id_orden, cfg.siguiente)}
          disabled={enProgreso}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${cfg.boton ?? 'bg-terracota-500 hover:bg-terracota-600'}`}
        >
          {enProgreso ? (
            <Spinner size={16} />
          ) : (
            <>
              <IconoAccion size={16} />
              <span>{cfg.accion}</span>
            </>
          )}
        </button>
      )}
    </article>
  );
}

// ----- Columna kanban -----
function Columna({ estado, ordenes, enProgreso, onAvanzar }) {
  const cfg = ESTADOS[estado];
  const Icono = cfg?.icono ?? ChefHat;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Cabecera de columna */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <Icono size={16} className="text-fg-muted" />
        <h2 className="font-semibold text-fg">{cfg?.label}</h2>
        <span className="ml-auto rounded-full bg-line px-2 py-0.5 text-xs font-bold text-fg-muted">
          {ordenes.length}
        </span>
      </div>

      {/* Tarjetas */}
      <div className="flex flex-col gap-3">
        {ordenes.map((o) => (
          <TarjetaOrden
            key={o.id_orden}
            orden={o}
            enProgreso={enProgreso.has(o.id_orden)}
            onAvanzar={onAvanzar}
          />
        ))}
        {ordenes.length === 0 && (
          <p className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-fg-muted">
            Sin órdenes
          </p>
        )}
      </div>
    </section>
  );
}

// ----- Página principal -----
export default function PreparacionPage() {
  const { tiene } = useAuth();
  const { notificar } = useAlert();

  const puedeVer = tiene('POS_VER_COLA_PREPARACION');

  const [cola, setCola] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [enProgreso, setEnProgreso] = useState(new Set());
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  const intervalRef = useRef(null);

  // ----- Carga de cola -----
  const cargar = useCallback(
    async (silencioso = false) => {
      if (!puedeVer) return;
      if (!silencioso) setCargando(true);
      else setActualizando(true);
      try {
        const data = await preparacionApi.listarCola();
        setCola(Array.isArray(data) ? data : []);
        setError(null);
        setUltimaActualizacion(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [puedeVer],
  );

  // Carga inicial
  useEffect(() => {
    cargar();
  }, [cargar]);

  // Polling cada INTERVALO_POLLING ms
  useEffect(() => {
    if (!puedeVer) return;
    intervalRef.current = setInterval(() => cargar(true), INTERVALO_POLLING);
    return () => clearInterval(intervalRef.current);
  }, [puedeVer, cargar]);

  // ----- Avanzar estado -----
  const avanzar = useCallback(
    async (idOrden, nuevoEstado) => {
      setEnProgreso((prev) => new Set(prev).add(idOrden));
      try {
        await preparacionApi.cambiarEstado(idOrden, nuevoEstado);
        await cargar(true);
        const etiquetas = { EN_PREPARACION: 'En preparación', LISTA: 'Lista', ENTREGADA: 'Entregada' };
        notificar({
          titulo: 'Estado actualizado',
          mensaje: `Orden #${idOrden} → ${etiquetas[nuevoEstado] ?? nuevoEstado}`,
          tipo: 'exito',
        });
      } catch (e) {
        notificar({
          titulo: 'Error al actualizar',
          mensaje: e?.mensaje ?? 'No se pudo cambiar el estado de la orden.',
          tipo: 'error',
        });
      } finally {
        setEnProgreso((prev) => {
          const s = new Set(prev);
          s.delete(idOrden);
          return s;
        });
      }
    },
    [cargar, notificar],
  );

  // ----- Agrupar por estado -----
  const columnas = COLUMNAS.reduce((acc, estado) => {
    acc[estado] = cola.filter((o) => o.estado === estado);
    return acc;
  }, {});

  const totalActivas = cola.length;

  // ----- Sin permiso -----
  if (!puedeVer) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EstadoVacio
          icono={AlertCircle}
          titulo="Acceso restringido"
          descripcion="Necesitas el permiso POS_VER_COLA_PREPARACION para ver esta pantalla."
        />
      </div>
    );
  }

  // ----- Carga inicial -----
  if (cargando) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Cola de preparación"
          descripcion="Pantalla de barra y cocina. Se actualiza automáticamente cada 15 s."
          icono={ChefHat}
        />
        <div className="flex items-center gap-3">
          {ultimaActualizacion && (
            <p className="text-xs text-fg-muted">
              <Clock size={12} className="mr-1 inline" />
              Actualizado {haceCuanto(ultimaActualizacion)}
            </p>
          )}
          <button
            onClick={() => cargar()}
            disabled={actualizando}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={14} className={actualizando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {COLUMNAS.map((estado) => {
          const cfg = ESTADOS[estado];
          const Icono = cfg.icono;
          return (
            <div
              key={estado}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm"
            >
              <span className={`rounded-lg p-2 ${cfg.badge}`}>
                <Icono size={18} />
              </span>
              <div>
                <p className="text-xs text-fg-muted">{cfg.label}</p>
                <p className="text-xl font-bold text-fg">{columnas[estado].length}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} />
          {error.mensaje ?? 'No se pudo cargar la cola de preparación. Revisa tu conexión.'}
        </div>
      )}

      {/* Estado vacío total */}
      {!error && totalActivas === 0 && (
        <EstadoVacio
          icono={ChefHat}
          titulo="Sin órdenes activas"
          descripcion="No hay órdenes en preparación en este momento. Se actualizará automáticamente."
        />
      )}

      {/* Tablero Kanban */}
      {totalActivas > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNAS.map((estado) => (
            <Columna
              key={estado}
              estado={estado}
              ordenes={columnas[estado]}
              enProgreso={enProgreso}
              onAvanzar={avanzar}
            />
          ))}
        </div>
      )}

      {/* Nota de polling */}
      <p className="text-center text-xs text-fg-muted">
        La cola se recarga automáticamente cada {INTERVALO_POLLING / 1000} segundos.
        {actualizando && (
          <span className="ml-2 inline-flex items-center gap-1 text-info">
            <RefreshCw size={11} className="animate-spin" /> Actualizando…
          </span>
        )}
      </p>
    </div>
  );
}
