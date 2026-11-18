// Patrón común de las páginas de sistema (404/403/error/en construcción), §7 de DISENO_UI.md:
// alineada a la izquierda dentro del layout (sin hero), icono lucide 24 en bloque neutro,
// código en mono, título display, una frase y como mucho una acción primaria + una ghost.
export default function PaginaSistema({ icono: Icono, codigo, titulo, descripcion, acciones, children, className = '', ...resto }) {
  return (
    <section className={`max-w-xl space-y-4 py-6 ${className}`.trim()} {...resto}>
      {Icono && (
        <span className="grid size-control-lg place-items-center rounded-lg bg-muted text-fg-muted">
          <Icono size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div>
        {codigo && <p className="font-mono text-label-sm text-fg-muted">{codigo}</p>}
        <h1 className="mt-1 font-display text-h1 text-fg">{titulo}</h1>
        {descripcion && <p className="mt-2 text-body text-fg-muted">{descripcion}</p>}
      </div>
      {children}
      {acciones && <div className="flex flex-col gap-2 sm:flex-row">{acciones}</div>}
    </section>
  );
}
