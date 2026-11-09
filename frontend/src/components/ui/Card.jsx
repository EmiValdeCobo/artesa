export default function Card({ titulo, descripcion, acciones, sinPadding = false, className = '', children }) {
  return (
    <section className={`card ${sinPadding ? '!p-0' : ''} ${className}`}>
      {(titulo || acciones) && (
        <header className={`flex flex-wrap items-start justify-between gap-3 ${sinPadding ? 'border-b border-line p-5' : 'mb-4'}`}>
          <div>
            {titulo && <h2 className="font-semibold">{titulo}</h2>}
            {descripcion && <p className="mt-1 text-xs text-fg-muted">{descripcion}</p>}
          </div>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}