// Tarjeta de panel: icono + título + (como mucho) un filtro o acción en la cabecera.
//   <Card icono={Package} titulo="Productos más vendidos" acciones={<Select … />}>…</Card>
// sinPadding: el contenido (tabla/lista) llega a los bordes y la cabecera lleva divisor.
export default function Card({ titulo, descripcion, acciones, icono: Icono, sinPadding = false, className = '', children }) {
  return (
    <section className={`card ${sinPadding ? '!p-0' : ''} ${className}`}>
      {(titulo || acciones) && (
        <header className={`flex flex-wrap items-center justify-between gap-3 ${sinPadding ? 'border-b border-line px-5 py-4' : 'mb-4'}`}>
          <div className="flex min-w-0 items-center gap-3">
            {Icono && (
              <span className="grid size-control-sm shrink-0 place-items-center rounded-md bg-primary-soft text-primary-text">
                <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              {titulo && <h2 className="text-body-lg font-semibold">{titulo}</h2>}
              {descripcion && <p className="text-body-sm text-fg-muted">{descripcion}</p>}
            </div>
          </div>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}
