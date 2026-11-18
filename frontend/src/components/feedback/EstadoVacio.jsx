// Mensaje para listas vacías o sin resultados: qué pasa + qué hacer. Sobrio, sin ilustraciones.
//   <EstadoVacio icono={Search} titulo="Sin resultados">Prueba con otro término.</EstadoVacio>
export default function EstadoVacio({ icono: Icono, titulo, tono = 'text-fg-muted', className = '', accion = null, children }) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {Icono && (
        <span className={`grid size-control-lg place-items-center rounded-lg bg-muted ${tono}`}>
          <Icono size={24} strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <h3 className="mt-4 text-h3">{titulo}</h3>
      {children && <p className="mt-1 max-w-sm text-body text-fg-muted">{children}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
