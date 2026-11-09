import Spinner from './Spinner.jsx';

/* columnas: [{ clave, titulo, render?: (fila) => nodo, alinear?: 'right' }]
   filas: arreglo de objetos. idFila: nombre del campo único (ej. 'id_usuario'). */
export default function Table({ columnas, filas, idFila = 'id', cargando = false, vacio = 'No hay registros.' }) {
  if (cargando) return <Spinner />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-fg-muted">
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className={`px-5 py-3 font-semibold ${c.alinear === 'right' ? 'text-right' : ''}`}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {filas.map((fila) => (
            <tr key={fila[idFila]} className="hover:bg-muted/60">
              {columnas.map((c) => (
                <td key={c.clave} className={`px-5 py-4 ${c.alinear === 'right' ? 'text-right' : ''}`}>
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