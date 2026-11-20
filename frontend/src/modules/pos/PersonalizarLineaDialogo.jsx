import { useRef, useState } from 'react';
import { Check, MessageSquarePlus, Plus } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { formatoMoneda } from './impuestos.js';

const MAX_NOTA = 200;

// Agrega o quita "Sin <ingrediente>" dentro de la observación, separando con coma.
function alternarSin(nota, ingrediente) {
  const frase = `sin ${ingrediente.toLowerCase()}`;
  const partes = nota.split(',').map((p) => p.trim()).filter(Boolean);
  const existe = partes.some((p) => p.toLowerCase() === frase);
  const nuevas = existe ? partes.filter((p) => p.toLowerCase() !== frase) : [...partes, frase];
  return nuevas.join(', ').slice(0, MAX_NOTA);
}

// Personaliza una línea del carrito: observación libre ("sin mayonesa", "poco hielo"), atajos "Sin X"
// tomados de los ingredientes de la receta y extras permitidos para el producto (se cobran aparte).
// La observación no modifica el inventario; los extras sí descuentan su propia receta.
export default function PersonalizarLineaDialogo({ linea, ingredientes = [], extrasDisponibles = [], onGuardar, onCerrar }) {
  const notaRef = useRef(null);
  const [nota, setNota] = useState(linea.nota ?? '');
  const [extras, setExtras] = useState(() => new Set((linea.extras ?? []).map((e) => e.id_producto)));

  const alternarExtra = (id) => setExtras((actual) => {
    const copia = new Set(actual);
    if (copia.has(id)) copia.delete(id); else copia.add(id);
    return copia;
  });

  const guardar = (e) => {
    e.preventDefault();
    onGuardar({
      nota: nota.trim(),
      extras: extrasDisponibles.filter((x) => extras.has(x.id_producto)).map(({ id_producto, nombre, precio }) => ({ id_producto, nombre, precio })),
    });
  };

  const notaMin = nota.toLowerCase();

  return (
    <Dialogo onCerrar={onCerrar} tamano="md" labelledBy="titulo-personalizar-linea" enfoqueInicial={notaRef}>
      <form onSubmit={guardar}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="titulo-personalizar-linea" className="text-h3 text-fg">Nota y extras</h2>
            <p className="truncate text-body-sm text-fg-muted">{linea.nombre} · {linea.cantidad} {linea.cantidad === 1 ? 'unidad' : 'unidades'}</p>
          </div>
          <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar" onClick={onCerrar} />
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* ── Observación de preparación ── */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-text">
                <MessageSquarePlus size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <label htmlFor="pos-nota-linea" className="text-label text-fg">Observación</label>
            </div>
            <textarea
              id="pos-nota-linea"
              ref={notaRef}
              value={nota}
              maxLength={MAX_NOTA}
              rows={2}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: sin mayonesa, poco hielo, para llevar…"
              aria-describedby="pos-nota-ayuda"
              className="input w-full resize-none"
            />
            <p id="pos-nota-ayuda" className="mt-1 flex justify-between text-label-sm text-fg-muted">
              <span>Aparece en preparación y en el ticket.</span>
              <span className="tabular-nums">{nota.length}/{MAX_NOTA}</span>
            </p>
            {ingredientes.length > 0 && (
              <div className="mt-2.5">
                <p className="mb-1.5 text-label-sm text-fg-muted">Atajos rápidos:</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quitar ingrediente">
                  {ingredientes.map((ing) => {
                    const activo = notaMin.includes(`sin ${ing.toLowerCase()}`);
                    return (
                      <button key={ing} type="button" aria-pressed={activo}
                        onClick={() => setNota((n) => alternarSin(n, ing))}
                        className={`inline-flex h-control-sm items-center rounded-full border px-3 text-label-sm transition-colors ${activo ? 'border-primary/40 bg-primary-soft text-primary-text' : 'border-line text-fg-muted hover:bg-muted hover:text-fg'}`}>
                        Sin {ing.toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── Extras ── */}
          {extrasDisponibles.length > 0 && (
            <fieldset>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-warning-soft text-warning-text">
                  <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <legend className="text-label text-fg">Extras</legend>
              </div>
              <p className="mb-2 text-label-sm text-fg-muted">Se cobran por cada unidad ({linea.cantidad} {linea.cantidad === 1 ? 'ud.' : 'uds.'}).</p>
              <ul className="divide-y divide-line rounded-md border border-line">
                {extrasDisponibles.map((x) => {
                  const marcado = extras.has(x.id_producto);
                  const sinStock = x.stock < linea.cantidad;
                  return (
                    <li key={x.id_producto}>
                      <label className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${sinStock && !marcado ? 'opacity-50' : 'cursor-pointer hover:bg-muted'}`}>
                        <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={marcado}
                          disabled={sinStock && !marcado} onChange={() => alternarExtra(x.id_producto)} />
                        <span className="flex-1 text-body text-fg">{x.nombre.replace(/^Extra:\s*/i, '')}</span>
                        {sinStock && <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-label-sm text-warning-text">Sin stock</span>}
                        <span className="shrink-0 text-body-sm tabular-nums text-fg-muted">+{formatoMoneda(x.precio)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variante="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" icono={Check}>Guardar</Button>
        </div>
      </form>
    </Dialogo>
  );
}
