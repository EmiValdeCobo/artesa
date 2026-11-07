import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, CircleAlert, CircleHelp, Info, X } from 'lucide-react';

const AlertContext = createContext(null);

const configuracion = {
  pregunta: { Icono: CircleHelp, color: 'text-primary-text', fondo: 'bg-primary-soft', role: 'alertdialog' },
  confirmacion: { Icono: CircleHelp, color: 'text-primary-text', fondo: 'bg-primary-soft', role: 'alertdialog' },
  exito: { Icono: CheckCircle2, color: 'text-success', fondo: 'bg-success-soft', role: 'alertdialog' },
  error: { Icono: AlertCircle, color: 'text-danger', fondo: 'bg-danger-soft', role: 'alertdialog' },
  advertencia: { Icono: CircleAlert, color: 'text-warning', fondo: 'bg-warning-soft', role: 'alertdialog' },
  informacion: { Icono: Info, color: 'text-info', fondo: 'bg-info-soft', role: 'alertdialog' },
};

function AlertDialog({ alerta, cerrar }) {
  const [valor, setValor] = useState(alerta.valorInicial ?? '');
  const dialogRef = useRef(null);
  const primerElementoRef = useRef(null);
  const config = configuracion[alerta.tipo] || configuracion.informacion;
  const { Icono } = config;
  const esEntrada = alerta.tipo === 'prompt';
  const esPregunta = alerta.tipo === 'pregunta' || alerta.tipo === 'confirmacion' || esEntrada;

  useEffect(() => {
    primerElementoRef.current?.focus();
    const alPresionar = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); cerrar(esEntrada ? null : false); }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const elementos = dialogRef.current.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!elementos.length) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [cerrar, esEntrada]);

  const aceptar = () => cerrar(esEntrada ? valor : true);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso-950/55 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !esPregunta) cerrar(true); }}>
      <div ref={dialogRef} className="w-full max-w-lg rounded-t-2xl bg-surface p-5 shadow-2xl anim-subir sm:rounded-2xl sm:p-6" role={config.role} aria-modal="true" aria-labelledby="alerta-titulo" aria-describedby="alerta-mensaje">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${config.fondo} ${config.color}`}><Icono size={22} aria-hidden="true" /></div>
          <div className="min-w-0 flex-1"><h2 id="alerta-titulo" className="text-lg font-semibold text-fg">{alerta.titulo}</h2><p id="alerta-mensaje" className="mt-1 whitespace-pre-line text-sm text-fg-muted">{alerta.mensaje}</p></div>
          {!esPregunta && <button ref={primerElementoRef} type="button" className="btn-ghost !p-2" onClick={() => cerrar(true)} aria-label="Cerrar aviso"><X size={18} /></button>}
        </div>
        {esEntrada && <input ref={primerElementoRef} className="input mt-5" value={valor} onChange={(event) => setValor(event.target.value)} placeholder={alerta.placeholder} autoFocus />}
        {esPregunta && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn-ghost" onClick={() => cerrar(esEntrada ? null : false)}>Cancelar</button><button ref={!esEntrada ? primerElementoRef : undefined} type="button" className="btn-primary" onClick={aceptar}>{alerta.etiquetaAceptar || 'Aceptar'}</button></div>}
      </div>
    </div>
  );
}

export function AlertProvider({ children }) {
  const [alerta, setAlerta] = useState(null);
  const elementoActivo = useRef(null);
  const cerrar = useCallback((resultado) => { setAlerta(null); elementoActivo.current?.focus?.(); elementoActivo.current = null; alerta?.resolver(resultado); }, [alerta]);

  const mostrar = useCallback((opciones) => new Promise((resolver) => {
    elementoActivo.current = document.activeElement;
    setAlerta({ tipo: 'informacion', titulo: 'Aviso', mensaje: '', ...opciones, resolver });
  }), []);
  const api = {
    showAlert: mostrar,
    confirm: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: opciones.tipo || 'confirmacion', titulo: opciones.titulo || 'Confirmar acción', mensaje }),
    prompt: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: 'prompt', titulo: opciones.titulo || 'Ingresa un valor', mensaje }),
    alert: (mensaje, opciones = {}) => mostrar({ ...opciones, mensaje }),
    success: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: 'exito', titulo: opciones.titulo || 'Operación exitosa', mensaje, duracion: opciones.duracion ?? 3500 }),
    error: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: 'error', titulo: opciones.titulo || 'Ocurrió un error', mensaje }),
    warning: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: 'advertencia', titulo: opciones.titulo || 'Advertencia', mensaje }),
    info: (mensaje, opciones = {}) => mostrar({ ...opciones, tipo: 'informacion', titulo: opciones.titulo || 'Información', mensaje }),
  };

  useEffect(() => { if (!alerta?.duracion) return undefined; const temporizador = setTimeout(() => cerrar(true), alerta.duracion); return () => clearTimeout(temporizador); }, [alerta, cerrar]);
  return <AlertContext.Provider value={api}>{children}{alerta && <AlertDialog alerta={alerta} cerrar={cerrar} />}</AlertContext.Provider>;
}

export function useAlert() {
  const contexto = useContext(AlertContext);
  if (!contexto) throw new Error('useAlert debe usarse dentro de AlertProvider');
  return contexto;
}
