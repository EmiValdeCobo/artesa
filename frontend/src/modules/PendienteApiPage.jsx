import EnConstruccion from '../components/sistema/EnConstruccion.jsx';

// Pantalla "en construcción": informa qué endpoints faltan sin mostrar datos de ejemplo ni llamar rutas inexistentes.
export default function PendienteApiPage({ titulo, descripcion, endpoints }) {
  return (
    <EnConstruccion codigo="Pendiente de API" titulo={titulo}
      descripcion={descripcion ?? 'El backend todavía no expone los endpoints necesarios para esta información.'}>
      <div className="rounded-md border border-line bg-surface px-4 py-3">
        <p className="text-label text-fg">Endpoints que faltan</p>
        <p className="mt-1 text-body-sm text-fg-muted">La pantalla no muestra datos de ejemplo ni realiza llamadas a rutas no existentes.</p>
        <ul className="mt-2 space-y-1">{endpoints.map((x) => <li key={x}><code className="font-mono text-body-sm text-fg">{x}</code></li>)}</ul>
      </div>
    </EnConstruccion>
  );
}
