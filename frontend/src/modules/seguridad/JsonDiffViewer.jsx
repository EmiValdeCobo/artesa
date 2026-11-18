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

  if (!cambios.length) return <p className="rounded-md bg-muted px-4 py-3 text-body text-fg-muted">Este evento no tiene diferencias de datos.</p>;
  // Diff de texto: por clave, línea quitada (−) en danger-soft y línea añadida (+) en success-soft.
  const Linea = ({ signo, valor, clase }) => (
    <div className={`flex gap-3 px-3 py-0.5 ${clase}`}>
      <span aria-hidden="true" className="w-3 shrink-0 select-none">{signo}</span>
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words">{mostrar(valor)}</pre>
    </div>
  );
  return <div className="overflow-hidden rounded-md border border-line font-mono text-body-sm" aria-label="Diferencias entre los datos anteriores y posteriores">
    {cambios.map((cambio) => <article key={cambio.clave} className="border-b border-line last:border-b-0">
      <header className="flex items-center justify-between gap-3 bg-muted px-3 py-1.5 text-fg"><code className="break-all">{cambio.clave}</code><span className="shrink-0 font-sans text-label-sm capitalize text-fg-muted">{cambio.tipo}</span></header>
      <div aria-hidden="true" className="max-h-48 overflow-auto py-1">
        {cambio.tipo !== 'añadido' && <Linea signo="−" valor={cambio.valorAntes} clase="bg-danger-soft text-danger-text" />}
        {cambio.tipo !== 'eliminado' && <Linea signo="+" valor={cambio.valorDespues} clase="bg-success-soft text-success-text" />}
      </div>
      <p className="sr-only">{cambio.tipo === 'añadido' ? `Añadido: ${mostrar(cambio.valorDespues)}` : cambio.tipo === 'eliminado' ? `Eliminado: ${mostrar(cambio.valorAntes)}` : `Antes: ${mostrar(cambio.valorAntes)}. Después: ${mostrar(cambio.valorDespues)}.`}</p>
    </article>)}
  </div>;
}
