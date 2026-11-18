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
import { Button } from '../../components/ui/index.js';
import Insignia from '../../components/branding/Insignia.jsx';
import Skeleton, { PuntosCarga } from '../../components/feedback/Skeleton.jsx';
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
    icono: ClipboardList,
    iconoAccion: Flame,
  },
  EN_PREPARACION: {
    label: 'En preparación',
    siguiente: 'LISTA',
    accion: 'Marcar como lista',
    icono: Flame,
    iconoAccion: CheckCircle2,
  },
  LISTA: {
    label: 'Lista para entregar',
    siguiente: 'ENTREGADA',
    accion: 'Marcar entregada',
    icono: CheckCircle2,
    iconoAccion: CircleCheck,
  },
};

const COLUMNAS = COLUMNAS_KDS;
// Tono del resumen (convención de Metrica): pendiente = aviso, en curso = info, lista = éxito
const TONO_METRICA = { ABIERTA: 'aviso', EN_PREPARACION: 'info', LISTA: 'exito' };

// Intervalo de polling en ms
const INTERVALO_POLLING = 15_000;

// Clasifica urgencia por minutos de espera
function urgencia(minutos) {
  if (minutos >= 15) return 'text-danger-text font-semibold';
  if (minutos >= 8) return 'text-warning-text font-medium';
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
      className={`relative flex flex-col gap-3 rounded-md border border-line bg-surface p-3 select-none touch-none ${
        esClonFlotante
          ? 'shadow-md ring-2 ring-primary/40 motion-safe:rotate-1'
          : estaSiendoArrastrada
            ? 'opacity-40 border-dashed pointer-events-none shadow-xs'
            : regresando
              ? 'shadow-xs transition-transform duration-200 ease-out'
              : 'shadow-xs cursor-grab active:cursor-grabbing hover:border-line-strong transition-colors'
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
              size={16}
              strokeWidth={1.75}
              className="mt-1 shrink-0 text-fg-subtle"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="font-mono text-h3 tabular-nums text-fg">#{orden.id_orden}</p>
            {(orden.etiqueta || orden.canal) && (
              <p className="text-body-sm text-fg-muted">
                {[orden.etiqueta, orden.canal].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right text-label-sm tabular-nums">
          <p className="text-fg-muted">{horaDe(orden.creado_en)}</p>
          <p className={`mt-0.5 ${urgencia(orden.minutos_espera)}`}>
            {orden.minutos_espera === 0 ? 'Recién llegada' : `${orden.minutos_espera} min`}
          </p>
        </div>
      </div>

      {/* Sucursal */}
      <div className="flex items-center gap-1.5 text-body-sm text-fg-muted">
        <Store size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>{orden.sucursal}</span>
      </div>

      {/* Ítems */}
      <ul className="space-y-1">
        {orden.items.map((item) => (
          <li key={item.id_detalle} className="flex items-start gap-2 text-body text-fg">
            <Package size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="flex-1">
              <span className="font-semibold tabular-nums">{item.cantidad}×</span> {item.producto}
              {item.nota && (
                <span className="ml-1 text-body-sm text-fg-muted">— {item.nota}</span>
              )}
            </span>
          </li>
        ))}
        {orden.items.length === 0 && (
          <li className="text-body-sm text-fg-muted">Sin productos registrados</li>
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
          className="btn-secondary btn-sm mt-auto w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enProgreso ? (
            <PuntosCarga />
          ) : (
            <>
              <IconoAccion size={16} strokeWidth={1.75} aria-hidden="true" />
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
      className={`flex min-w-0 flex-1 flex-col gap-3 rounded-lg p-3 transition-colors duration-200 ${
        resaltarColumna ? 'bg-primary-soft/60' : 'bg-muted'
      }`}
    >
      {/* Cabecera de columna */}
      <div className="flex items-center gap-2 px-1 py-1">
        <Icono size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden="true" />
        <h2 className="text-label text-fg">{cfg?.label}</h2>
        <Insignia className="ml-auto">{ordenes.length}</Insignia>
      </div>

      {/* Tarjetas */}
      <div className="flex min-h-36 flex-col gap-3">
        {/* Marcador de posición (placeholder) si el cursor está sobre esta columna válida */}
        {resaltarColumna && (
          <div className="rounded-md border-2 border-dashed border-primary/50 bg-primary-soft p-4 text-center text-label-sm text-primary-text">
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
          <p className="rounded-md border border-dashed border-line-strong py-8 text-center text-body-sm text-fg-muted">
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
      if (!document.hidden) cargar(true);
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
    const grupos = Object.fromEntries(COLUMNAS.map((estado) => [estado, []]));
    for (const orden of cola) grupos[orden.estado]?.push(orden);
    return grupos;
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
    return (
      <div role="status" className="space-y-6">
        <span className="sr-only">Cargando cola de preparación…</span>
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNAS.map((estado) => (
            <div key={estado} className="space-y-3 rounded-lg bg-muted p-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-32 w-full rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
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
              <p className="text-body-sm text-fg-muted">
                <Clock size={16} strokeWidth={1.75} className="mr-1 inline align-text-bottom" aria-hidden="true" />
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
          className={`flex items-center justify-center gap-3 rounded-lg border-2 border-dashed p-5 transition-colors duration-200 ${
            arrastre.columnaSobre === 'ENTREGADA'
              ? 'border-success bg-success-soft text-success-text ring-2 ring-success/40'
              : 'border-success/50 bg-surface text-success-text'
          }`}
        >
          <CircleCheck
            size={24}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <p className="text-label">
              Soltar aquí para marcar como ENTREGADA
            </p>
            <p className="text-body-sm">
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
      <p className="text-center text-body-sm text-fg-muted">
        La cola se recarga automáticamente cada {INTERVALO_POLLING / 1000} segundos.
        {actualizando && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-fg-muted">
            <PuntosCarga /> Actualizando…
          </span>
        )}
      </p>
    </div>
  );
}
