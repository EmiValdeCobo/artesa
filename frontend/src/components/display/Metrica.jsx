import Skeleton from '../feedback/Skeleton.jsx';

// Tarjeta KPI: etiqueta arriba, cifra grande con números tabulares, icono discreto.
// Todas las tarjetas comparten el mismo aspecto neutro (sin "arcoíris"); el `tono` solo
// tiñe el icono cuando comunica un estado (aviso/peligro/exito). primario/info/neutro = neutro.
//   tono: primario · exito · aviso · info · neutro · peligro
//   cargando: muestra un esqueleto del alto de la cifra (en lugar de "…" o "—") y lo anuncia.
const TONOS_ICONO = {
  exito: 'bg-success-soft text-success-text',
  aviso: 'bg-warning-soft text-warning-text',
  peligro: 'bg-danger-soft text-danger-text',
};

export default function Metrica({ icono: Icono, valor, etiqueta, detalle = null, tono = 'neutro', cargando = false }) {
  return (
    <div className="card flex items-start justify-between gap-3 !p-4" aria-busy={cargando || undefined}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-sm text-fg-muted">{etiqueta}</p>
        {cargando ? (
          <div role="status" className="mt-1 flex h-[var(--text-kpi--line-height)] items-center">
            <span className="sr-only">Cargando {etiqueta}…</span>
            <Skeleton className="h-6 w-24" />
          </div>
        ) : (
          <p className="kpi mt-1 text-kpi">{valor}</p>
        )}
        {detalle && !cargando && <p className="mt-1 truncate text-body-sm tabular-nums text-fg-muted">{detalle}</p>}
      </div>
      {Icono && (
        <span className={`grid size-control-md shrink-0 place-items-center rounded-md ${cargando ? 'bg-muted text-fg-muted' : TONOS_ICONO[tono] || 'bg-muted text-fg-muted'}`}>
          <Icono size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
