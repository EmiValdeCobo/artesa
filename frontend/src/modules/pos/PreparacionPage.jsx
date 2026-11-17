import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  GripVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import { Button, Spinner } from '../../components/ui/index.js';
import Metrica from '../../components/display/Metrica.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import { preparacionApi } from '../../api/preparacion.api.js';
import { horaDe, haceCuanto } from '../../utils/formato.js';
import {
  COLUMNAS_KDS,
  RETARDO_SINCRONIZACION_MS,
  MENSAJES_DND,
  ETIQUETAS_ESTADO,
  moverOrdenOptimista,
  reconciliarCola,
  GestorSincronizacion,
} from './preparacionDnd.js';
import { useArrastrarTarjetas } from './useArrastrarTarjetas.js';

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

const COLUMNAS = COLUMNAS_KDS;
// Tono del resumen (convención de Metrica): pendiente = aviso, en curso = info, lista = éxito
const TONO_METRICA = { ABIERTA: 'aviso', EN_PREPARACION: 'info', LISTA: 'exito' };

// Intervalo de polling en ms
const INTERVALO_POLLING = 15_000;

// Clasifica urgencia por minutos de espera
function urgencia(minutos) {
  if (minutos >= 15) return 'text-danger font-bold';
  if (minutos >= 8) return 'text-warning font-semibold';
  return 'text-fg-muted';
}

// ----- Tarjeta de orden -----
function TarjetaOrden({
  orden,
  enProgreso,
  onAvanzar,
  onPointerDown,
  estaSiendoArrastrada = false,
  regresando = false,
  esClonFlotante = false,
}) {
  const cfg = ESTADOS[orden.estado];
  const IconoAccion = cfg?.iconoAccion ?? ArrowRight;

  return (
    <article
      onPointerDown={!enProgreso && !esClonFlotante ? (e) => onPointerDown?.(e, orden) : undefined}
      aria-grabbed={estaSiendoArrastrada ? 'true' : 'false'}
      className={`relative flex flex-col gap-3 rounded-xl border-2 p-4 shadow-sm select-none touch-none ${
        cfg?.color ?? ''
      } ${
        esClonFlotante
          ? 'shadow-2xl border-primary ring-2 ring-primary/40 opacity-95 motion-safe:rotate-2'
          : estaSiendoArrastrada
            ? 'opacity-30 border-dashed scale-[0.98] pointer-events-none'
            : regresando
              ? 'transition-transform duration-300 ease-out scale-100'
              : 'cursor-grab active:cursor-grabbing hover:shadow-md transition-all'
      } ${enProgreso ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">
        Orden #{orden.id_orden}. Estado actual: {cfg?.label}. Puedes arrastrarla hacia adelante o
        usar el botón para {cfg?.accion}.
      </span>

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5">
          {!esClonFlotante && !enProgreso && (
            <GripVertical
              size={15}
              className="mt-0.5 shrink-0 text-fg-muted/60 hover:text-fg transition-colors"
              aria-hidden="true"
            />
          )}
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                cfg?.badge ?? ''
              }`}
            >
              {cfg?.label}
            </span>
            <p className="mt-1 text-xs font-medium text-fg-muted">
              #{orden.id_orden}
              {orden.etiqueta ? ` · ${orden.etiqueta}` : ''}
              {orden.canal ? ` · ${orden.canal}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="text-fg-muted">{horaDe(orden.creado_en)}</p>
          <p className={`mt-0.5 ${urgencia(orden.minutos_espera)}`}>
            {orden.minutos_espera === 0 ? 'Recién llegada' : `${orden.minutos_espera} min`}
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
              <span className="font-semibold">{item.cantidad}×</span> {item.producto}
              {item.nota && (
                <span className="ml-1 text-xs text-fg-muted italic">— {item.nota}</span>
              )}
            </span>
          </li>
        ))}
        {orden.items.length === 0 && (
          <li className="text-xs text-fg-muted italic">Sin productos registrados</li>
        )}
      </ul>

      {/* Acción accesible */}
      {cfg?.siguiente && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAvanzar(orden.id_orden, cfg.siguiente);
          }}
          disabled={enProgreso || estaSiendoArrastrada || esClonFlotante}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            cfg.boton ?? 'bg-terracota-500 hover:bg-terracota-600'
          }`}
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
function Columna({
  estado,
  ordenes,
  enProgreso,
  onAvanzar,
  onPointerDown,
  idArrastrado,
  regresandoId,
  esColumnaDestino = false,
  esDestinoValido = false,
}) {
  const cfg = ESTADOS[estado];
  const Icono = cfg?.icono ?? ChefHat;

  const resaltarColumna = esColumnaDestino && esDestinoValido;

  return (
    <section
      data-zona-drop={estado}
      className={`flex min-w-0 flex-1 flex-col gap-3 rounded-2xl p-3 border-2 transition-all duration-200 ${
        resaltarColumna
          ? 'border-primary/60 bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/30'
          : 'border-transparent bg-muted/40'
      }`}
    >
      {/* Cabecera de columna */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <Icono size={16} className="text-fg-muted" />
        <h2 className="font-semibold text-fg">{cfg?.label}</h2>
        <span className="ml-auto rounded-full bg-line px-2 py-0.5 text-xs font-bold text-fg-muted">
          {ordenes.length}
        </span>
      </div>

      {/* Tarjetas */}
      <div className="flex flex-col gap-3 min-h-[140px]">
        {/* Marcador de posición (placeholder) si el cursor está sobre esta columna válida */}
        {resaltarColumna && (
          <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 p-4 text-center text-xs font-semibold text-primary transition-all motion-safe:animate-pulse">
            Soltar aquí para mover a {cfg?.label}
          </div>
        )}

        {ordenes.map((o) => (
          <TarjetaOrden
            key={o.id_orden}
            orden={o}
            enProgreso={enProgreso.has(o.id_orden)}
            onAvanzar={onAvanzar}
            onPointerDown={onPointerDown}
            estaSiendoArrastrada={idArrastrado === o.id_orden}
            regresando={regresandoId === o.id_orden}
          />
        ))}

        {ordenes.length === 0 && !resaltarColumna && (
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
  const { notificar, notificarError } = useAlert();

  const puedeVer = tiene('POS_VER_COLA_PREPARACION');

  const [cola, setCola] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [enProgreso, setEnProgreso] = useState(new Set());
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  const intervalRef = useRef(null);
  const gestorRef = useRef(null);
  const colaRef = useRef(cola);
  colaRef.current = cola;

  // ----- Carga de cola -----
  const cargar = useCallback(
    async (silencioso = false) => {
      if (!puedeVer) return;
      if (!silencioso) setCargando(true);
      else setActualizando(true);
      try {
        const data = await preparacionApi.listarCola();
        const listaServidor = Array.isArray(data) ? data : [];
        const idsPendientes = gestorRef.current
          ? gestorRef.current.obtenerIdsPendientes()
          : new Set();

        // Si hay órdenes con cambios locales pendientes o en vuelo, se preservan
        setCola((prev) => reconciliarCola(prev, listaServidor, idsPendientes));
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

  // Inicialización del gestor de sincronización diferida (debounce)
  if (!gestorRef.current) {
    gestorRef.current = new GestorSincronizacion({
      apiCambiarEstado: (id, estado) => preparacionApi.cambiarEstado(id, estado),
      retardoMs: RETARDO_SINCRONIZACION_MS,
      alIniciar: (idOrden) => {
        setEnProgreso((prev) => new Set(prev).add(idOrden));
      },
      alFinalizar: (idOrden) => {
        setEnProgreso((prev) => {
          const s = new Set(prev);
          s.delete(idOrden);
          return s;
        });
      },
      alExito: (idOrden, estadoFinal) => {
        const etiqueta = ETIQUETAS_ESTADO[estadoFinal] ?? estadoFinal;
        notificar.exito(`Orden #${idOrden} → ${etiqueta}`);
        cargar(true);
      },
      alError: (idOrden, err) => {
        notificarError(err);
        cargar(true);
      },
    });
  }

  // Carga inicial
  useEffect(() => {
    cargar();
  }, [cargar]);

  // Polling cada INTERVALO_POLLING ms
  useEffect(() => {
    if (!puedeVer) return;
    intervalRef.current = setInterval(() => {
      // Si hay un arrastre activo o cambios locales pendientes de enviar, el polling no pisa
      cargar(true);
    }, INTERVALO_POLLING);
    return () => clearInterval(intervalRef.current);
  }, [puedeVer, cargar]);

  // Limpieza al desmontar: enviar cualquier cambio pendiente antes de salir
  useEffect(() => {
    const gestor = gestorRef.current;
    return () => {
      if (gestor) {
        gestor.ejecutarPendientes();
      }
    };
  }, []);

  // Avance directo (vía botón accesible)
  const avanzar = useCallback(
    (idOrden, nuevoEstado) => {
      const ordenActual = colaRef.current.find((o) => o.id_orden === idOrden);
      if (!ordenActual) return;

      // Actualización optimista inmediata
      setCola((prev) => moverOrdenOptimista(prev, idOrden, nuevoEstado));

      // Programar sincronización con debounce
      gestorRef.current.programar(idOrden, ordenActual.estado, nuevoEstado);
    },
    [],
  );

  // Callback al soltar en zona válida
  const onSoltarValido = useCallback(
    (orden, columnaDestino) => {
      // Actualización optimista inmediata en pantalla
      setCola((prev) => moverOrdenOptimista(prev, orden.id_orden, columnaDestino));

      // Envío diferido con debounce de 600 ms
      gestorRef.current.programar(orden.id_orden, orden.estado, columnaDestino);
    },
    [],
  );

  // Callback al soltar en zona inválida
  const onSoltarInvalido = useCallback(
    (orden, destino) => {
      if (destino) {
        notificar.advertencia(MENSAJES_DND.MOVIMIENTO_INVALIDO);
      }
    },
    [notificar],
  );

  // Hook nativo de Pointer Events
  const { arrastre, iniciarArrastre } = useArrastrarTarjetas({
    onSoltarValido,
    onSoltarInvalido,
    enProgreso,
  });

  // Agrupar por estado
  const columnas = useMemo(() => {
    return COLUMNAS.reduce((acc, estado) => {
      acc[estado] = cola.filter((o) => o.estado === estado);
      return acc;
    }, {});
  }, [cola]);

  const totalActivas = cola.length;

  // Sin permiso
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

  // Carga inicial
  if (cargando) {
    return <Spinner texto="Cargando cola de preparación…" />;
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Operación · Preparación"
        titulo="Cola de preparación"
        descripcion="Pantalla de barra y cocina. Arrastra las tarjetas o usa los botones para avanzar el estado."
        icono={ChefHat}
        acciones={
          <div className="flex items-center gap-3">
            {ultimaActualizacion && (
              <p className="text-xs text-fg-muted">
                <Clock size={12} className="mr-1 inline" />
                Actualizado {haceCuanto(ultimaActualizacion)}
              </p>
            )}
            <Button
              variante="ghost"
              icono={RefreshCw}
              cargando={actualizando}
              onClick={() => cargar()}
            >
              Actualizar
            </Button>
          </div>
        }
      />

      {/* Resumen global */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map((estado) => (
          <Metrica
            key={estado}
            icono={ESTADOS[estado].icono}
            etiqueta={ESTADOS[estado].label}
            valor={columnas[estado]?.length ?? 0}
            tono={TONO_METRICA[estado]}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <BannerError
          error={{
            titulo: 'No se pudo cargar la cola de preparación',
            mensaje: error.mensaje ?? 'Revisa tu conexión.',
            accion: '',
          }}
        />
      )}

      {/* Estado vacío total */}
      {!error && totalActivas === 0 && (
        <EstadoVacio
          icono={ChefHat}
          titulo="Sin órdenes activas"
          descripcion="No hay órdenes en preparación en este momento. Se actualizará automáticamente."
        />
      )}

      {/* Zona de soltado para marcar como ENTREGADA (solo visible y activa al arrastrar una orden LISTA) */}
      {arrastre.activo && arrastre.orden?.estado === 'LISTA' && (
        <div
          data-zona-drop="ENTREGADA"
          className={`flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-5 transition-all duration-200 ${
            arrastre.columnaSobre === 'ENTREGADA'
              ? 'border-emerald-500 bg-emerald-500/20 scale-[1.01] shadow-lg ring-2 ring-emerald-500/40 text-emerald-900 dark:text-emerald-100'
              : 'border-emerald-500/50 bg-emerald-50/70 text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          <CircleCheck
            size={24}
            className={
              arrastre.columnaSobre === 'ENTREGADA'
                ? 'text-emerald-600 dark:text-emerald-400 motion-safe:animate-bounce'
                : 'text-emerald-600 dark:text-emerald-400'
            }
          />
          <div>
            <p className="font-bold text-sm">
              Soltar aquí para marcar como ENTREGADA
            </p>
            <p className="text-xs opacity-80">
              La orden saldrá de la cola activa de barra/cocina
            </p>
          </div>
        </div>
      )}

      {/* Tablero Kanban */}
      {totalActivas > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNAS.map((estado) => (
            <Columna
              key={estado}
              estado={estado}
              ordenes={columnas[estado] || []}
              enProgreso={enProgreso}
              onAvanzar={avanzar}
              onPointerDown={iniciarArrastre}
              idArrastrado={arrastre.orden?.id_orden}
              regresandoId={arrastre.regresandoId}
              esColumnaDestino={arrastre.columnaSobre === estado}
              esDestinoValido={arrastre.esValido}
            />
          ))}
        </div>
      )}

      {/* Clon flotante de la tarjeta que sigue al puntero */}
      {arrastre.activo && arrastre.orden && (
        <div
          className="fixed pointer-events-none z-50 transition-none"
          style={{
            left: `${arrastre.posicion.x}px`,
            top: `${arrastre.posicion.y}px`,
            width: `${arrastre.dimensiones.ancho}px`,
          }}
        >
          <TarjetaOrden
            orden={arrastre.orden}
            enProgreso={false}
            onAvanzar={() => {}}
            esClonFlotante={true}
          />
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
