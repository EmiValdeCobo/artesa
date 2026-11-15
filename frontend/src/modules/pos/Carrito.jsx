import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ReceiptText, UserCheck, Building2, Search, X, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { calcularTotales, formatoMoneda, IVA } from './impuestos.js';
import { listarClientes } from './posApi.js';

// El crédito fiscal requiere POS_EMITIR_CCF (permiso distinto de POS_COBRAR).
const TIPOS_DOC = [
  { valor: 'FACTURA', texto: 'Consumidor final' },
  { valor: 'CCF', texto: 'Crédito fiscal (CCF)', permiso: 'POS_EMITIR_CCF' },
];

export default function Carrito({
  items,
  tipoDocumento,
  onTipoDocumento,
  clienteSeleccionado = null,
  onSeleccionarCliente,
  dispatch,
  onCobrar,
}) {
  const { tiene } = useAuth();
  const puedeVerClientes = tiene('POS_GESTIONAR_CLIENTES') || tiene('POS_COBRAR');
  const tipos = TIPOS_DOC.filter((t) => !t.permiso || tiene(t.permiso));
  const { subtotal, iva, total } = calcularTotales(items);
  const unidades = items.reduce((n, i) => n + i.cantidad, 0);

  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [terminoCliente, setTerminoCliente] = useState('');
  const [resultadosCliente, setResultadosCliente] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  const esCCF = tipoDocumento === 'CCF';
  const clienteValidoParaCCF = Boolean(
    clienteSeleccionado?.nrc && clienteSeleccionado?.giro_economico,
  );
  const bloqueoPorCCF = esCCF && !clienteValidoParaCCF;

  useEffect(() => {
    if (!buscandoCliente || !puedeVerClientes) return undefined;
    const timer = setTimeout(async () => {
      setCargandoClientes(true);
      try {
        const lista = await listarClientes({
          q: terminoCliente.trim(),
          soloCcf: esCCF,
        });
        setResultadosCliente(Array.isArray(lista) ? lista.slice(0, 6) : []);
      } catch {
        setResultadosCliente([]);
      } finally {
        setCargandoClientes(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [buscandoCliente, terminoCliente, esCCF, puedeVerClientes]);

  const elegirCliente = (c) => {
    if (onSeleccionarCliente) onSeleccionarCliente(c);
    setBuscandoCliente(false);
    setTerminoCliente('');
  };

  return (
    <aside id="pedido-actual" className="card flex h-full scroll-mt-20 flex-col !p-0" aria-label="Pedido actual">
      <header className="border-b border-line p-4">
        <h2 className="font-semibold">Pedido actual</h2>
        <p className="text-xs text-fg-muted">{unidades} {unidades === 1 ? 'producto' : 'productos'}</p>
        {tipos.length < 2 ? <p className="mt-3 text-xs text-fg-muted">Documento: {tipos[0].texto}</p> : (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de documento">
            {tipos.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={tipoDocumento === t.valor} onClick={() => onTipoDocumento(t.valor)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${tipoDocumento === t.valor ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
                {t.texto}
              </button>
            ))}
          </div>
        )}

        {/* Afiliación de cliente (Opcional para FCF / Cliente Premium, Obligatorio con NRC para CCF) */}
        <div className="mt-3 rounded-lg border border-line bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-fg">
              {esCCF ? 'Contribuyente CCF *' : 'Cliente afiliado (opcional)'}
            </span>
            {clienteSeleccionado ? (
              <button
                type="button"
                onClick={() => onSeleccionarCliente && onSeleccionarCliente(null)}
                className="inline-flex items-center gap-1 text-[11px] text-danger hover:underline"
              >
                <X size={12} /> Quitar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setBuscandoCliente((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-text hover:underline"
              >
                <Search size={12} /> {buscandoCliente ? 'Cerrar' : 'Afiliar cliente'}
              </button>
            )}
          </div>

          {clienteSeleccionado ? (
            <div className="mt-1.5 flex items-start justify-between gap-2 rounded-md bg-surface p-2 border border-line">
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg flex items-center gap-1">
                  {clienteSeleccionado.nrc ? <Building2 size={13} className="text-primary-text shrink-0" /> : <Sparkles size={13} className="text-primary-text shrink-0" />}
                  {clienteSeleccionado.nombre_razon_social}
                </p>
                <p className="text-[11px] text-fg-muted">
                  {clienteSeleccionado.nrc
                    ? `NRC: ${clienteSeleccionado.nrc} · ${clienteSeleccionado.giro_economico}`
                    : clienteSeleccionado.num_documento
                      ? `${clienteSeleccionado.tipo_documento}: ${clienteSeleccionado.num_documento} · Cliente afiliado`
                      : 'Cliente frecuente / afiliado'}
                </p>
                {esCCF && !clienteValidoParaCCF && (
                  <p className="mt-1 text-[11px] font-medium text-danger">
                    Este cliente no posee NRC ni giro económico para emitir CCF.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBuscandoCliente(true)}
                className="text-[11px] font-medium text-primary-text hover:underline shrink-0"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">
              {esCCF
                ? 'Selecciona un cliente con NRC y giro registrado.'
                : 'Sin afiliar: se emitirá como Consumidor Final.'}
            </p>
          )}

          {buscandoCliente && (
            <div className="mt-2 space-y-1.5 border-t border-line pt-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  type="text"
                  value={terminoCliente}
                  onChange={(e) => setTerminoCliente(e.target.value)}
                  placeholder={esCCF ? 'Buscar por nombre, NIT o NRC...' : 'Buscar cliente por nombre, DUI o NIT...'}
                  className="input w-full !py-1.5 pl-7 pr-2 text-xs"
                />
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-line rounded-md border border-line bg-surface">
                {cargandoClientes ? (
                  <p className="p-2 text-center text-[11px] text-fg-muted">Buscando clientes...</p>
                ) : resultadosCliente.length === 0 ? (
                  <p className="p-2 text-center text-[11px] text-fg-muted">
                    No se encontraron clientes registrados.
                  </p>
                ) : (
                  resultadosCliente.map((c) => (
                    <button
                      key={c.id_cliente}
                      type="button"
                      onClick={() => elegirCliente(c)}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{c.nombre_razon_social}</p>
                        <p className="truncate text-[10px] text-fg-muted">
                          {c.nrc ? `NRC: ${c.nrc}` : c.num_documento ? `${c.tipo_documento}: ${c.num_documento}` : 'Cliente afiliado'}
                        </p>
                      </div>
                      <UserCheck size={13} className="shrink-0 text-primary-text" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-fg-muted">
            <ReceiptText size={26} aria-hidden="true" />
            <p>Toca un producto del catálogo para empezar el pedido.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id_producto} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{i.nombre}</p>
                  <p className="text-xs text-fg-muted">{formatoMoneda(i.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="btn-ghost h-9 w-9 !p-0" aria-label={`Quitar una unidad de ${i.nombre}`}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad - 1 })}><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{i.cantidad}</span>
                  <button type="button" className="btn-ghost h-9 w-9 !p-0" aria-label={`Agregar una unidad de ${i.nombre}`} disabled={i.cantidad >= i.stock}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad + 1 })}><Plus size={14} /></button>
                </div>
                <p className="w-16 text-right text-sm font-semibold">{formatoMoneda(i.precio * i.cantidad)}</p>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar ${i.nombre}`}
                  onClick={() => dispatch({ tipo: 'quitar', id: i.id_producto })}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-line p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd>{formatoMoneda(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">IVA ({IVA * 100}%)</dt><dd>{formatoMoneda(iva)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatoMoneda(total)}</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <Button variante="ghost" disabled={!items.length} onClick={() => dispatch({ tipo: 'vaciar' })}>Vaciar</Button>
          <Button disabled={!items.length || bloqueoPorCCF} onClick={onCobrar}>Cobrar {formatoMoneda(total)}</Button>
        </div>
      </footer>
    </aside>
  );
}