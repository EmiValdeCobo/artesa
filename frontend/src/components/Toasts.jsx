import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

// Avisos no bloqueantes. No quitan el foco ni impiden seguir trabajando.
//  · Errores/advertencias van a una región "assertive"; el resto a una "polite" (lectores de pantalla).
//  · Se pausan al pasar el mouse o enfocar con teclado (WCAG 2.2.1) y se cierran con Escape o con la X.
//  · Los que ofrecen una acción (p. ej. Reintentar) no desaparecen solos.

const VARIANTES = {
  exito: { Icono: CircleCheck, color: 'text-success', fondo: 'bg-success-soft' },
  informacion: { Icono: Info, color: 'text-info', fondo: 'bg-info-soft' },
  advertencia: { Icono: TriangleAlert, color: 'text-warning', fondo: 'bg-warning-soft' },
  error: { Icono: CircleAlert, color: 'text-danger', fondo: 'bg-danger-soft' },
};

function Toast({ toast, cerrar }) {
  const [pausado, setPausado] = useState(false);
  const { Icono, color, fondo } = VARIANTES[toast.tipo] || VARIANTES.informacion;

  useEffect(() => {
    if (!toast.duracion || pausado) return undefined;
    const temporizador = setTimeout(() => cerrar(toast.id), toast.duracion);
    return () => clearTimeout(temporizador);
  }, [toast.duracion, toast.id, pausado, cerrar]);

  return (
    <div
      className="anim-toast pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-4 text-fg shadow-lg"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onKeyDown={(evento) => { if (evento.key === 'Escape') cerrar(toast.id); }}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${fondo} ${color}`}><Icono size={19} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{toast.titulo}</p>
        {toast.mensaje && <p className="mt-0.5 text-sm leading-snug text-fg-muted">{toast.mensaje}</p>}
        {toast.accion && <p className="mt-1 text-sm leading-snug">{toast.accion}</p>}
        {toast.acciones?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {toast.acciones.map((accion) => accion.href
              ? <a key={accion.etiqueta} href={accion.href} className="btn-ghost min-h-9 !px-3 !py-1.5">{accion.etiqueta}</a>
              : <button key={accion.etiqueta} type="button" className="btn-primary min-h-9 !px-3 !py-1.5" onClick={() => { cerrar(toast.id); accion.onClick?.(); }}>{accion.etiqueta}</button>)}
          </div>
        )}
      </div>
      <button type="button" onClick={() => cerrar(toast.id)} aria-label="Cerrar notificación" className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-fg">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Toasts({ toasts, cerrar }) {
  const urgentes = toasts.filter((toast) => toast.tipo === 'error' || toast.tipo === 'advertencia');
  const normales = toasts.filter((toast) => !urgentes.includes(toast));
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem] sm:p-0">
      <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
        {urgentes.map((toast) => <Toast key={toast.id} toast={toast} cerrar={cerrar} />)}
      </div>
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {normales.map((toast) => <Toast key={toast.id} toast={toast} cerrar={cerrar} />)}
      </div>
    </div>
  );
}
