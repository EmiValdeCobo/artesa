const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const serializar = (valor) => JSON.stringify(valor);

function aplanar(valor, prefijo = '') {
  if (!esObjeto(valor)) return new Map([[prefijo || '(valor)', valor]]);
  const filas = new Map();
  for (const [clave, contenido] of Object.entries(valor)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (esObjeto(contenido)) {
      for (const [subruta, dato] of aplanar(contenido, ruta)) filas.set(subruta, dato);
    } else filas.set(ruta, contenido);
  }
  return filas;
}

const mostrar = (valor) => valor === undefined ? '—' : JSON.stringify(valor, null, 2);

export default function JsonDiffViewer({ antes, despues }) {
  const previo = aplanar(antes ?? {});
  const nuevo = aplanar(despues ?? {});
  const claves = [...new Set([...previo.keys(), ...nuevo.keys()])].sort();
  const cambios = claves.map((clave) => {
    const existeAntes = previo.has(clave);
    const existeDespues = nuevo.has(clave);
    const valorAntes = previo.get(clave);
    const valorDespues = nuevo.get(clave);
    if (existeAntes && existeDespues && serializar(valorAntes) === serializar(valorDespues)) return null;
    return { clave, valorAntes, valorDespues, tipo: !existeAntes ? 'añadido' : !existeDespues ? 'eliminado' : 'modificado' };
  }).filter(Boolean);

  if (!cambios.length) return <p className="rounded-lg bg-muted p-4 text-sm text-fg-muted">Este evento no tiene diferencias de datos.</p>;
  return <div className="space-y-2" aria-label="Diferencias entre los datos anteriores y posteriores">
    {cambios.map((cambio) => <article key={cambio.clave} className={`overflow-hidden rounded-lg border ${cambio.tipo === 'añadido' ? 'border-success/30' : cambio.tipo === 'eliminado' ? 'border-danger/30' : 'border-warning/30'}`}>
      <header className={`flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold ${cambio.tipo === 'añadido' ? 'bg-success-soft text-success' : cambio.tipo === 'eliminado' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}><code className="break-all">{cambio.clave}</code><span className="shrink-0 capitalize">{cambio.tipo}</span></header>
      <div className="grid gap-px bg-line sm:grid-cols-2"><div className="min-w-0 bg-surface p-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Antes</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-fg-muted">{mostrar(cambio.valorAntes)}</pre></div><div className="min-w-0 bg-surface p-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Después</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">{mostrar(cambio.valorDespues)}</pre></div></div>
    </article>)}
  </div>;
}
