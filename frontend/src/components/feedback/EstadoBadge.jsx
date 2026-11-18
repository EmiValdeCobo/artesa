import { CheckCircle2, AlertTriangle, XCircle, Info, Clock3 } from 'lucide-react';

// Estados semánticos: úsalo para ventas, stock, turnos, pagos, DTE...
// Fondo suave + texto oscuro del mismo tono (-text) para cumplir AA en ambos temas.
const estilos = {
  exito:    { Icono: CheckCircle2,  clase: 'bg-success-soft text-success-text' }, // EMITIDA, ACEPTADO, PAGADA
  alerta:   { Icono: AlertTriangle, clase: 'bg-warning-soft text-warning-text' }, // stock bajo, PENDIENTE
  aviso:    { Icono: AlertTriangle, clase: 'bg-warning-soft text-warning-text' }, // alias de alerta
  error:    { Icono: XCircle,       clase: 'bg-danger-soft text-danger-text' },   // ANULADA, RECHAZADO
  peligro:  { Icono: XCircle,       clase: 'bg-danger-soft text-danger-text' },   // alias de error
  info:     { Icono: Info,          clase: 'bg-info-soft text-info-text' },       // ABIERTO, CONTINGENCIA
  inactivo: { Icono: XCircle,       clase: 'bg-muted text-fg-muted' },            // inactivos / deshabilitados
  cargando: { Icono: Clock3,        clase: 'bg-muted text-fg-muted' },            // en proceso (sin girar)
};

export default function EstadoBadge({ tipo = 'info', children }) {
  const { Icono, clase } = estilos[tipo] || estilos.info;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${clase}`}>
      <Icono size={12} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}
// Ejemplo: <EstadoBadge tipo="exito">Emitida</EstadoBadge>
