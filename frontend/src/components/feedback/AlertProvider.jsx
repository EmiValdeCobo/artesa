import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CircleHelp, Info, Lightbulb, LifeBuoy, TriangleAlert } from 'lucide-react';
import Dialogo from '../Dialogo.jsx';
import Toasts from './Toasts.jsx';
import { EVENTO_SESION_EXPIRADA } from '../../api/client.js';
import { errorUsuarioDeId, traducirError } from '../../errors/traducirError.js';
import { enlaceSoporte } from '../../errors/soporte.js';

// Sistema único de avisos de la aplicación. Dos canales, con reglas distintas:
//
//   DIÁLOGOS (bloquean y exigen una respuesta)       TOASTS (no bloquean, se pueden ignorar)
//   · confirm()  → ¿seguro? (sí/no)                  · notificar.exito / info / advertencia / error
//   · prompt()   → pedir un dato                     · notificarError(err, { reintentar })
//   · alert()    → informar algo que debe leerse
//   · mostrarError(err) → solo errores críticos
//
// Los errores por campo y los de carga de una pantalla NO pasan por aquí: van en línea (BannerError / CampoError).
// Guía completa: docs/errores-frontend.md

const AlertContext = createContext(null);

const VISUAL = {
  pregunta: { Icono: CircleHelp, color: 'text-primary-text', fondo: 'bg-primary-soft' },
  informacion: { Icono: Info, color: 'text-info', fondo: 'bg-info-soft' },
  exito: { Icono: CircleCheck, color: 'text-success', fondo: 'bg-success-soft' },
  advertencia: { Icono: TriangleAlert, color: 'text-warning', fondo: 'bg-warning-soft' },
  error: { Icono: CircleAlert, color: 'text-danger', fondo: 'bg-danger-soft' },
};
VISUAL.confirmacion = VISUAL.pregunta;

const DURACION_TOAST = { exito: 5000, informacion: 6000, advertencia: 10000, error: 12000 };
const MAX_TOASTS = 4;

function AlertDialog({ dialogo, cerrar }) {
  const { id, modo, tipo, titulo, mensaje, accion, destructivo, etiquetaAceptar, etiquetaCancelar, placeholder, valorInicial, puedeReintentar, soporte } = dialogo;
  const [valor, setValor] = useState(valorInicial ?? '');
  const entradaRef = useRef(null);
  const cancelarRef = useRef(null);
  const principalRef = useRef(null);

  const visual = destructivo ? { ...VISUAL.error, Icono: TriangleAlert } : (VISUAL[tipo] || VISUAL.informacion);
  const { Icono } = visual;
  const tituloId = `dialogo-${id}-titulo`;
  const mensajeId = `dialogo-${id}-mensaje`;
  const pregunta = modo === 'confirmar' || modo === 'entrada';

  const aceptar = () => cerrar(id, modo === 'entrada' ? valor : true);
  const cancelar = () => cerrar(id, modo === 'entrada' ? null : false);
  const cerrarAviso = () => cerrar(id, modo !== 'error'); // alert() resuelve true; un error cerrado, false

  // Foco inicial: en acciones destructivas, el botón seguro (Cancelar); en el resto, la acción principal.
  const enfoque = modo === 'entrada' ? entradaRef : destructivo ? cancelarRef : principalRef;

  return (
    <Dialogo
      rol="alertdialog"
      tamano="sm"
      labelledBy={tituloId}
      describedBy={mensaje ? mensajeId : undefined}
      enfoqueInicial={enfoque}
      cerrarConFondo={!pregunta && modo !== 'error'}
      onCerrar={pregunta ? cancelar : cerrarAviso}
    >
      <form className="p-5 sm:p-6" onSubmit={(evento) => { evento.preventDefault(); aceptar(); }}>
        <div className="flex items-start gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${visual.fondo} ${visual.color}`}><Icono size={22} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={tituloId} className="text-lg font-semibold leading-snug">{titulo}</h2>
            {mensaje && <p id={mensajeId} className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{mensaje}</p>}
          </div>
        </div>

        {accion && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted px-3.5 py-3 text-sm leading-relaxed">
            <Lightbulb size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-secondary-text" />
            <p><span className="font-semibold">Qué puedes hacer: </span>{accion}</p>
          </div>
        )}

        {modo === 'entrada' && (
          <input ref={entradaRef} className="input mt-5" value={valor} onChange={(evento) => setValor(evento.target.value)} placeholder={placeholder} aria-labelledby={tituloId} />
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          {pregunta && (
            <>
              <button ref={cancelarRef} type="button" className="btn-ghost min-h-11 sm:min-h-10" onClick={cancelar}>{etiquetaCancelar || 'Cancelar'}</button>
              <button ref={principalRef} type="submit" className={`${destructivo ? 'btn-danger' : 'btn-primary'} min-h-11 sm:min-h-10`}>{etiquetaAceptar || 'Aceptar'}</button>
            </>
          )}
          {modo === 'error' && (
            <>
              {soporte && <a href={soporte} className="btn-ghost min-h-11 sm:min-h-10"><LifeBuoy size={16} aria-hidden="true" /> Contactar a soporte</a>}
              <button ref={puedeReintentar ? undefined : principalRef} type="button" className="btn-ghost min-h-11 sm:min-h-10" onClick={() => cerrar(id, false)}>Cerrar</button>
              {puedeReintentar && <button ref={principalRef} type="button" className="btn-primary min-h-11 sm:min-h-10" onClick={() => cerrar(id, 'reintentar')}>Reintentar</button>}
            </>
          )}
          {modo === 'aviso' && <button ref={principalRef} type="button" className="btn-primary min-h-11 sm:min-h-10" onClick={() => cerrar(id, true)}>{etiquetaAceptar || 'Entendido'}</button>}
        </div>
      </form>
    </Dialogo>
  );
}

export function AlertProvider({ children }) {
  const [cola, setCola] = useState([]);
  const [toasts, setToasts] = useState([]);
  const colaRef = useRef([]);
  const contador = useRef(0);

  // ── Diálogos (uno a la vez; si llegan varios, se encolan) ──────────────────
  const abrir = useCallback((opciones) => new Promise((resolver) => {
    colaRef.current = [...colaRef.current, { id: ++contador.current, modo: 'aviso', tipo: 'informacion', titulo: 'Aviso', mensaje: '', ...opciones, resolver }];
    setCola(colaRef.current);
  }), []);

  const cerrarDialogo = useCallback((id, resultado) => {
    const dialogo = colaRef.current.find((item) => item.id === id);
    if (!dialogo) return;
    colaRef.current = colaRef.current.filter((item) => item.id !== id);
    setCola(colaRef.current);
    dialogo.resolver(resultado);
  }, []);

  // ── Toasts ──────────────────────────────────────────────────────────────────
  const cerrarToast = useCallback((id) => setToasts((actuales) => actuales.filter((toast) => toast.id !== id)), []);

  const mostrarToast = useCallback(({ tipo = 'informacion', clave, acciones, duracion, ...resto }) => {
    const id = ++contador.current;
    const nuevo = { id, tipo, clave, acciones, duracion: duracion ?? (acciones?.length ? 0 : DURACION_TOAST[tipo]), ...resto };
    // Un aviso con la misma clave reemplaza al anterior (evita apilar 3 veces "sesión terminó").
    setToasts((actuales) => [...actuales.filter((toast) => !clave || toast.clave !== clave), nuevo].slice(-MAX_TOASTS));
    return id;
  }, []);

  // ── Errores ─────────────────────────────────────────────────────────────────
  const mostrarError = useCallback((error, { reintentar } = {}) => {
    const u = traducirError(error);
    return abrir({
      modo: 'error', tipo: 'error', titulo: u.titulo, mensaje: u.mensaje, accion: u.accion,
      puedeReintentar: Boolean(u.reintentable && reintentar), soporte: u.categoria === 'sistema' ? enlaceSoporte() : null,
    }).then((respuesta) => { if (respuesta === 'reintentar') reintentar?.(); return respuesta; });
  }, [abrir]);

  // Elige el canal según el tipo de error: modal solo si el catálogo lo marca como crítico; si no, toast.
  const notificarError = useCallback((error, { reintentar } = {}) => {
    const u = traducirError(error);
    if (u.canal === 'modal') { mostrarError(u, { reintentar }); return u; }
    const acciones = [];
    if (u.reintentable && reintentar) acciones.push({ etiqueta: 'Reintentar', onClick: reintentar });
    const soporte = u.categoria === 'sistema' ? enlaceSoporte() : null;
    if (soporte) acciones.push({ etiqueta: 'Contactar a soporte', href: soporte });
    mostrarToast({ tipo: u.categoria === 'usuario' ? 'advertencia' : 'error', titulo: u.titulo, mensaje: u.mensaje, accion: u.accion, clave: u.clave, acciones });
    return u;
  }, [mostrarError, mostrarToast]);

  // La sesión venció a mitad de uso (lo emite api/client.js): un solo aviso, sin importar cuántas peticiones fallaron.
  useEffect(() => {
    const alVencer = () => notificarError(errorUsuarioDeId('SESION_EXPIRADA'));
    window.addEventListener(EVENTO_SESION_EXPIRADA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alVencer);
  }, [notificarError]);

  const valor = useMemo(() => {
    const nuevoToast = (tipo) => (titulo, opciones = {}) => mostrarToast({ tipo, titulo, ...opciones });
    const notificar = {
      exito: nuevoToast('exito'),
      info: nuevoToast('informacion'),
      advertencia: nuevoToast('advertencia'),
      // Acepta un texto simple o cualquier error (ErrorApi, Error…): los errores se traducen solos.
      error: (error, opciones = {}) => (typeof error === 'string' ? mostrarToast({ tipo: 'error', titulo: error, ...opciones }) : notificarError(error, opciones)),
    };
    const aviso = (tipo, tituloPorDefecto) => (mensaje, opciones = {}) => {
      mostrarToast({ tipo, titulo: opciones.titulo || tituloPorDefecto, mensaje, duracion: opciones.duracion });
      return Promise.resolve(true);
    };
    return {
      confirm: (mensaje, opciones = {}) => abrir({ ...opciones, modo: 'confirmar', tipo: opciones.tipo || 'confirmacion', titulo: opciones.titulo || 'Confirmar acción', mensaje, destructivo: opciones.destructivo ?? opciones.tipo === 'error' }),
      prompt: (mensaje, opciones = {}) => abrir({ ...opciones, modo: 'entrada', tipo: 'pregunta', titulo: opciones.titulo || 'Ingresa un valor', mensaje }),
      alert: (mensaje, opciones = {}) => abrir({ ...opciones, modo: 'aviso', mensaje }),
      showAlert: (opciones) => abrir({ modo: opciones.tipo === 'prompt' ? 'entrada' : ['pregunta', 'confirmacion'].includes(opciones.tipo) ? 'confirmar' : 'aviso', ...opciones }),
      notificar,
      notificarError,
      mostrarError,
      // Compatibilidad con la primera versión: ya no bloquean, son avisos no bloqueantes.
      success: aviso('exito', 'Operación exitosa'),
      info: aviso('informacion', 'Información'),
      warning: aviso('advertencia', 'Advertencia'),
      error: (mensaje, opciones = {}) => { notificar.error(mensaje, opciones); return Promise.resolve(true); },
    };
  }, [abrir, mostrarToast, notificarError, mostrarError]);

  const actual = cola[0];
  return (
    <AlertContext.Provider value={valor}>
      {children}
      {actual && <AlertDialog key={actual.id} dialogo={actual} cerrar={cerrarDialogo} />}
      <Toasts toasts={toasts} cerrar={cerrarToast} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const contexto = useContext(AlertContext);
  if (!contexto) throw new Error('useAlert debe usarse dentro de AlertProvider');
  return contexto;
}
