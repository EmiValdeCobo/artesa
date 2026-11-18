import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { SkeletonFilas } from '../feedback/Skeleton.jsx';
import Paginacion from './Paginacion.jsx';
import {
  ordenarFilas,
  calcularPaginacion,
  mismosIds,
} from '../../utils/tabla.js';

/* columnas: [{ clave, titulo, encabezado?: nodo (sustituye al título en <th>), render?: (fila) => nodo,
   alinear?: 'right', clase?: string (clases extra en th/td, p. ej. 'hidden md:table-cell'),
   ordenable?: boolean (por defecto true, excepto 'acciones'), tipo?: 'texto'|'numero'|'dinero'|'fecha'|'booleano',
   valorOrden?: (fila) => any, descripcion?: string }]
   filas: arreglo de objetos. idFila: nombre del campo único (ej. 'id_usuario').
   idSeleccionado: id de la fila resaltada (opcional). apilarEnMovil: bajo 768 px cada fila se muestra
   como tarjeta, con el título de la columna a la izquierda de cada dato (por defecto true). */
export default function Table({
  columnas,
  filas = [],
  idFila = 'id',
  cargando = false,
  vacio = 'No hay registros.',
  maxAltura = 'max-h-[560px]',
  scrollVertical = true,
  horizontal = true,
  minAncho = 'min-w-[600px]',
  className = '',
  idSeleccionado = null,
  apilarEnMovil = true,
  pie = null, // fila de totales opcional: { [clave]: nodo } (p. ej. { nombre: 'Total', neto: '$1,200.00' })
  // Nuevas props de paginación y orden
  paginacion = true,
  filasPorPaginaInicial = 10,
  opcionesFilasPorPagina = [10, 25, 50, 100],
  ordenInicial = null,
  onOrdenar = null,
  idTabla = null,
  // Props de modo servidor opcional
  total,
  pagina,
  porPagina,
  onCambiarPagina,
  onCambiarPorPagina,
}) {
  const esModoServidor = total !== undefined;

  const [orden, setOrden] = useState(() => ({
    clave: ordenInicial?.clave ?? null,
    direccion: ordenInicial?.direccion ?? 'asc',
  }));

  const [tamanoPaginaLocal, setTamanoPaginaLocal] = useState(() => {
    if (idTabla) {
      try {
        const guardado = Number(localStorage.getItem(`artesa_tabla_tamano_${idTabla}`));
        if (guardado && opcionesFilasPorPagina.includes(guardado)) {
          return guardado;
        }
      } catch {
        // Ignorar fallos de acceso a localStorage
      }
    }
    return filasPorPaginaInicial;
  });

  const [paginaLocal, setPaginaLocal] = useState(1);
  const [mensajeAria, setMensajeAria] = useState('');

  // Rastrear si el conjunto de IDs cambió para reiniciar a la página 1 en modo cliente
  const filasPreviasRef = useRef(filas);
  useEffect(() => {
    if (!esModoServidor) {
      if (!mismosIds(filasPreviasRef.current, filas, idFila)) {
        setPaginaLocal(1);
      }
    }
    filasPreviasRef.current = filas;
  }, [filas, idFila, esModoServidor]);

  const filasValidas = Array.isArray(filas) ? filas : [];

  const filasOrdenadas = useMemo(() => {
    if (esModoServidor || !orden.clave) return filasValidas;
    const colActiva = columnas.find((c) => c.clave === orden.clave);
    return ordenarFilas(
      filasValidas,
      orden.clave,
      orden.direccion,
      colActiva?.tipo ?? 'texto',
      colActiva?.valorOrden,
    );
  }, [columnas, esModoServidor, filasValidas, orden.clave, orden.direccion]);

  if (cargando) return <SkeletonFilas columnas={Math.min(Math.max(columnas.length, 2), 5)} />;

  const manejarOrdenar = (col) => {
    let nuevaDireccion = 'asc';
    if (orden.clave === col.clave) {
      nuevaDireccion = orden.direccion === 'asc' ? 'desc' : 'asc';
    }
    const nuevoOrden = { clave: col.clave, direccion: nuevaDireccion };
    setOrden(nuevoOrden);
    if (!esModoServidor) {
      setPaginaLocal(1);
    }
    onOrdenar?.(nuevoOrden);

    const nombreCol = typeof col.titulo === 'string' ? col.titulo : col.clave;
    const dirTexto = nuevaDireccion === 'asc' ? 'ascendente' : 'descendente';
    setMensajeAria(`Ordenado por ${nombreCol}, ${dirTexto}.`);
  };

  // Cálculos de paginación
  const totalRegistros = esModoServidor ? (Number(total) || 0) : filasOrdenadas.length;
  const tamanoEfectivo = esModoServidor ? (Number(porPagina) || filasPorPaginaInicial) : tamanoPaginaLocal;
  const paginaSolicitada = esModoServidor ? (Number(pagina) || 1) : paginaLocal;

  const infoPag = calcularPaginacion({
    total: totalRegistros,
    pagina: paginaSolicitada,
    porPagina: tamanoEfectivo,
  });

  const filasMostradas = !paginacion
    ? filasOrdenadas
    : esModoServidor
      ? filasValidas
      : filasOrdenadas.slice(infoPag.offset, infoPag.offset + infoPag.porPagina);

  const manejarCambioPagina = (nuevaPag) => {
    if (!esModoServidor) {
      setPaginaLocal(nuevaPag);
    }
    onCambiarPagina?.(nuevaPag);
    setMensajeAria(`Página ${nuevaPag} de ${infoPag.totalPaginas}.`);
  };

  const manejarCambioPorPagina = (nuevoTamano) => {
    if (!esModoServidor) {
      setTamanoPaginaLocal(nuevoTamano);
      setPaginaLocal(1);
    }
    if (idTabla) {
      try {
        localStorage.setItem(`artesa_tabla_tamano_${idTabla}`, String(nuevoTamano));
      } catch {
        // Ignorar fallos de localStorage
      }
    }
    onCambiarPorPagina?.(nuevoTamano);
    setMensajeAria(`Mostrando ${nuevoTamano} filas por página.`);
  };

  // Cuando paginacion es true, se evita el scroll vertical interno para que thead sticky
  // funcione con el viewport y no genere dobles barras de desplazamiento.
  const claseScrollY = paginacion
    ? 'overflow-y-visible'
    : (scrollVertical ? `overflow-y-auto scroll-fino ${maxAltura}` : 'overflow-y-visible');

  return (
    <div className={`w-full ${apilarEnMovil ? 'tabla-apilable' : ''}`.trim()}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {mensajeAria}
      </div>

      <div className={`${horizontal ? 'overflow-x-auto' : 'overflow-visible'} ${claseScrollY} ${className}`.trim()}>
        <table className={`w-full ${minAncho} text-left text-body`}>
          <thead className="sticky top-0 z-10 border-b border-line bg-surface text-label-sm text-fg-muted">
            <tr>
              {columnas.map((c) => {
                const esOrdenable = c.ordenable !== false && c.clave !== 'acciones';
                const estaActiva = esOrdenable && orden.clave === c.clave;
                const direccionActual = estaActiva ? orden.direccion : null;
                const ariaSort = !esOrdenable
                  ? undefined
                  : estaActiva
                    ? (direccionActual === 'asc' ? 'ascending' : 'descending')
                    : 'none';

                return (
                  <th
                    key={c.clave}
                    scope="col"
                    data-col={c.clave}
                    title={c.descripcion}
                    aria-sort={ariaSort}
                    className={`bg-surface px-4 py-2.5 font-semibold ${c.alinear === 'right' ? 'text-right' : ''} ${c.clase ?? ''}`.trim()}
                  >
                    {esOrdenable ? (
                      <button
                        type="button"
                        onClick={() => manejarOrdenar(c)}
                        className={`group -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-xs px-1 font-semibold select-none transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${estaActiva ? 'text-fg' : 'text-fg-muted'} ${
                          c.alinear === 'right' ? 'justify-end w-full' : ''
                        }`.trim()}
                      >
                        <span>{c.encabezado ?? c.titulo}</span>
                        {estaActiva ? (
                          direccionActual === 'asc' ? (
                            <ArrowUp size={14} strokeWidth={2} className="shrink-0 text-primary-text" aria-hidden="true" />
                          ) : (
                            <ArrowDown size={14} strokeWidth={2} className="shrink-0 text-primary-text" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} strokeWidth={1.75} className="shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      c.encabezado ?? c.titulo
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filasMostradas.map((fila) => (
              <tr
                key={fila[idFila]}
                aria-selected={idSeleccionado != null ? fila[idFila] === idSeleccionado : undefined}
                className={`transition-colors hover:bg-muted/60 aria-selected:bg-primary-soft ${fila.activo === false ? 'text-fg-muted' : ''}`}
              >
                {columnas.map((c) => (
                  <td
                    key={c.clave}
                    data-col={c.clave}
                    data-label={typeof c.titulo === 'string' ? c.titulo : undefined}
                    className={`px-4 py-3 ${c.alinear === 'right' ? 'text-right tabular-nums' : ''} ${c.clase ?? ''}`.trim()}
                  >
                    {c.render ? c.render(fila) : fila[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {pie && filasMostradas.length > 0 && (
            <tfoot className="border-t-2 border-line-strong font-semibold tabular-nums">
              <tr>
                {columnas.map((c) => (
                  <td key={c.clave} data-col={c.clave} data-label={typeof c.titulo === 'string' && pie[c.clave] != null ? c.titulo : undefined}
                    className={`px-4 py-3 ${c.alinear === 'right' ? 'text-right' : ''} ${c.clase ?? ''}`.trim()}>
                    {pie[c.clave] ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {!filasMostradas.length && (typeof vacio === 'string'
          ? <p className="px-4 py-10 text-center text-body text-fg-muted">{vacio}</p>
          : vacio)}
      </div>

      {paginacion && totalRegistros > 0 && (
        <Paginacion
          total={totalRegistros}
          pagina={infoPag.paginaValida}
          porPagina={tamanoEfectivo}
          onCambiarPagina={manejarCambioPagina}
          onCambiarPorPagina={manejarCambioPorPagina}
          opcionesPorPagina={opcionesFilasPorPagina}
          cargando={cargando}
        />
      )}
    </div>
  );
}
