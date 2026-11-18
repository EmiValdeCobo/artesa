// Píldora de texto corto para etiquetar algo (Sistema, Inactivo, Tu rol, conteos…).
// Para el estado de una operación con icono (EMITIDA, PENDIENTE…) usa EstadoBadge.
//
//   variante: neutro · primario · exito · aviso · info · peligro   (usan solo tokens semánticos)
//   <Insignia variante="aviso">Inactivo</Insignia>
const VARIANTES = {
  neutro: 'bg-muted text-fg-muted',
  primario: 'bg-primary-soft text-primary-text',
  exito: 'bg-success-soft text-success-text',
  aviso: 'bg-warning-soft text-warning-text',
  info: 'bg-info-soft text-info-text',
  peligro: 'bg-danger-soft text-danger-text',
};

export default function Insignia({ variante = 'neutro', icono: Icono, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm tabular-nums ${VARIANTES[variante] || VARIANTES.neutro} ${className}`}>
      {Icono && <Icono size={12} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}
