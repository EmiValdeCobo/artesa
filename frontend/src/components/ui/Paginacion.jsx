import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Select from './Select.jsx';
import { calcularPaginacion, obtenerRangoPaginas } from '../../utils/tabla.js';

export default function Paginacion({
  total = 0,
  pagina = 1,
  porPagina = 10,
  onCambiarPagina,
  onCambiarPorPagina,
  opcionesPorPagina = [10, 25, 50, 100],
  cargando = false,
  className = '',
}) {
  const { totalPaginas, paginaValida, desde, hasta } = calcularPaginacion({
    total,
    pagina,
    porPagina,
  });

  const rangoPaginas = obtenerRangoPaginas(paginaValida, totalPaginas);

  const opcionesSelect = opcionesPorPagina.map((n) => ({
    valor: String(n),
    texto: String(n),
  }));

  const textoResumen = total === 0 ? 'Mostrando 0 de 0' : `Mostrando ${desde}–${hasta} de ${total}`;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-line text-label-sm text-fg ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-fg-muted font-medium select-none">Filas por página:</span>
          <div className="w-20">
            <Select
              id="paginacion-por-pagina"
              aria-label="Filas por página"
              tamano="sm"
              placeholder=""
              opciones={opcionesSelect}
              value={String(porPagina)}
              disabled={cargando}
              onChange={(e, val) => onCambiarPorPagina?.(Number(val ?? e?.target?.value))}
            />
          </div>
        </div>

        <span className="text-fg-muted font-medium tabular-nums" role="status">
          {textoResumen}
        </span>
      </div>

      <nav aria-label="Navegación de páginas" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCambiarPagina?.(1)}
          disabled={paginaValida <= 1 || cargando}
          aria-label="Primera página"
          title="Primera página"
          className="inline-flex size-control-sm items-center justify-center rounded-md border border-line text-fg-muted hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <ChevronsLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onCambiarPagina?.(paginaValida - 1)}
          disabled={paginaValida <= 1 || cargando}
          aria-label="Página anterior"
          title="Página anterior"
          className="inline-flex h-control-sm items-center gap-1 px-2.5 rounded-md border border-line text-fg-muted hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {rangoPaginas.map((p, idx) =>
          p === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="hidden sm:inline-flex items-center justify-center px-1 text-fg-muted select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onCambiarPagina?.(p)}
              disabled={cargando}
              aria-current={p === paginaValida ? 'page' : undefined}
              aria-label={`Página ${p}`}
              className={`hidden sm:inline-flex items-center justify-center min-w-control-sm h-control-sm px-2 rounded-md text-label-sm tabular-nums transition-colors ${
                p === paginaValida
                  ? 'bg-primary-soft text-primary-text font-semibold'
                  : 'text-fg-muted hover:bg-muted hover:text-fg'
              }`.trim()}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onCambiarPagina?.(paginaValida + 1)}
          disabled={paginaValida >= totalPaginas || cargando}
          aria-label="Página siguiente"
          title="Página siguiente"
          className="inline-flex h-control-sm items-center gap-1 px-2.5 rounded-md border border-line text-fg-muted hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onCambiarPagina?.(totalPaginas)}
          disabled={paginaValida >= totalPaginas || cargando}
          aria-label="Última página"
          title="Última página"
          className="inline-flex size-control-sm items-center justify-center rounded-md border border-line text-fg-muted hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <ChevronsRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
