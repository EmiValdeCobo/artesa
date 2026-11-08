// Tarjeta compacta con una cifra y su etiqueta (resúmenes al inicio de una pantalla).
//   tono: primario · exito · aviso · info · neutro
const TONOS = {
  primario: 'bg-primary-soft text-primary-text',
  exito: 'bg-success-soft text-success',
  aviso: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  neutro: 'bg-muted text-fg-muted',
};

export default function Metrica({ icono: Icono, valor, etiqueta, tono = 'primario' }) {
  return (
    <div className="card flex items-center gap-3 !p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONOS[tono] || TONOS.primario}`}><Icono size={19} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none">{valor}</p>
        <p className="mt-1 truncate text-xs text-fg-muted">{etiqueta}</p>
      </div>
    </div>
  );
}
