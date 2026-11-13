// Mensaje centrado para listas vacías o sin resultados: qué pasa + qué hacer.
//   <EstadoVacio icono={Search} titulo="Sin resultados">Prueba con otro término.</EstadoVacio>
export default function EstadoVacio({ icono: Icono, titulo, tono = 'text-fg-muted', className = '', children }) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {Icono && <Icono size={28} className={tono} aria-hidden="true" />}
      <h3 className="mt-3 font-semibold">{titulo}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-fg-muted">{children}</p>}
    </div>
  );
}
