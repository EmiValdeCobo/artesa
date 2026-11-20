// Esqueletos de carga: muestran la forma de lo que viene en lugar de un spinner.
// El brillo se apaga con prefers-reduced-motion (ver .skeleton en index.css).
//
//   <Skeleton className="h-4 w-32" />                 bloque suelto
//   <SkeletonTexto lineas={3} />                      párrafo
//   <SkeletonFilas filas={5} columnas={4} />          tabla
export default function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`.trim()} />;
}

const ANCHOS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4'];

export function SkeletonTexto({ lineas = 3, texto = 'Cargando…', className = '' }) {
  return (
    <div role="status" className={`space-y-2.5 ${className}`.trim()}>
      <span className="sr-only">{texto}</span>
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lineas - 1 ? 'w-1/2' : ANCHOS[i % ANCHOS.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonFilas({ filas = 5, columnas = 4, texto = 'Cargando registros…', className = '' }) {
  return (
    <div role="status" className={`divide-y divide-line ${className}`.trim()}>
      <span className="sr-only">{texto}</span>
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="flex items-center gap-6 px-4 py-3.5">
          {Array.from({ length: columnas }, (_, c) => (
            <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-1/4' : 'flex-1'} ${c === columnas - 1 ? 'max-w-20' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Tres puntos que laten: carga dentro de botones o acciones breves (hereda el color del texto).
export function PuntosCarga({ className = '' }) {
  return (
    <span aria-hidden="true" className={`puntos-carga ${className}`.trim()}>
      <span /><span /><span />
    </span>
  );
}
