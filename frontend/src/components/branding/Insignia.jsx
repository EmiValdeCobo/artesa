// Píldora de texto corto para etiquetar algo (Sistema, Inactivo, Tu rol, conteos…).
// Para el estado de una operación con icono (EMITIDA, PENDIENTE…) usa EstadoBadge.
//
//   variante: neutro · primario · exito · aviso · info · peligro   (usan solo tokens semánticos)
//   <Insignia variante="aviso">Inactivo</Insignia>
const VARIANTES = {
  neutro: 'bg-muted text-fg-muted',
  primario: 'bg-primary-soft text-primary-text',
  exito: 'bg-success-soft text-success',
  aviso: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  peligro: 'bg-danger-soft text-danger',
};

export default function Insignia({ variante = 'neutro', icono: Icono, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${VARIANTES[variante] || VARIANTES.neutro} ${className}`}>
      {Icono && <Icono size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}
