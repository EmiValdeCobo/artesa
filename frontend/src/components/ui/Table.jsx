import Spinner from './Spinner.jsx';

/* columnas: [{ clave, titulo, encabezado?: nodo (sustituye al título en <th>), render?: (fila) => nodo,
   alinear?: 'right', clase?: string (clases extra en th/td, p. ej. 'hidden md:table-cell') }]
   filas: arreglo de objetos. idFila: nombre del campo único (ej. 'id_usuario'). */
export default function Table({
  columnas,
  filas,
  idFila = 'id',
  cargando = false,
  vacio = 'No hay registros.',
  maxAltura = 'max-h-[560px]',
  scrollVertical = true,
  horizontal = true,
  minAncho = 'min-w-[600px]',
  className = '',
}) {
  if (cargando) return <Spinner />;
  return (
    // horizontal=false deja la tabla al scroll de la página: el encabezado sticky se pega al viewport.
    // Combinar con `clase: 'hidden md:table-cell'` en columnas secundarias para anchos pequeños.
    <div className={`${horizontal ? 'overflow-x-auto' : 'overflow-visible'} ${scrollVertical ? `overflow-y-auto scroll-fino ${maxAltura}` : 'overflow-y-visible'} ${className}`.trim()}>
      <table className={`w-full ${minAncho} text-left text-sm`}>
        <thead className="sticky top-0 z-10 border-b border-line bg-muted text-xs uppercase tracking-wide text-fg-muted shadow-xs">
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" data-col={c.clave} title={c.descripcion} className={`bg-muted px-5 py-3 font-semibold ${c.alinear === 'right' ? 'text-right' : ''} ${c.clase ?? ''}`.trim()}>{c.encabezado ?? c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {filas.map((fila) => (
            <tr key={fila[idFila]} className={`hover:bg-muted/60 ${fila.activo === false ? 'opacity-60' : ''}`}>
              {columnas.map((c) => (
                <td key={c.clave} data-col={c.clave} data-label={c.titulo} className={`px-5 py-4 ${c.alinear === 'right' ? 'text-right tabular-nums' : ''} ${c.clase ?? ''}`.trim()}>
                  {c.render ? c.render(fila) : fila[c.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!filas.length && <p className="p-8 text-center text-sm text-fg-muted">{vacio}</p>}
    </div>
  );
}
