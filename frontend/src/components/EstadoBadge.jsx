import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';

// Estados semánticos: úsalo para ventas, stock, turnos, pagos, DTE...
const estilos = {
  exito:    { Icono: CheckCircle2,  clase: 'bg-success-soft text-success' }, // EMITIDA, ACEPTADO, PAGADA
  alerta:   { Icono: AlertTriangle, clase: 'bg-warning-soft text-warning' }, // stock bajo, PENDIENTE
  error:    { Icono: XCircle,       clase: 'bg-danger-soft text-danger' },   // ANULADA, RECHAZADO
  info:     { Icono: Info,          clase: 'bg-info-soft text-info' },       // ABIERTO, CONTINGENCIA
  cargando: { Icono: Loader2,       clase: 'bg-muted text-fg-muted' },
};

export default function EstadoBadge({ tipo = 'info', children }) {
  const { Icono, clase } = estilos[tipo];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      <Icono size={14} aria-hidden="true" className={tipo === 'cargando' ? 'animate-spin' : ''} />
      {children}
    </span>
  );
}
// Ejemplo: <EstadoBadge tipo="exito">Emitida</EstadoBadge>
