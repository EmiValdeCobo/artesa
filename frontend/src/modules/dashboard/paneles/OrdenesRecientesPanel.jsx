import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Coffee, ReceiptText, Store } from 'lucide-react';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import EstadoBadge from '../../../components/feedback/EstadoBadge.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Cargando, Panel, Vacio } from '../components/Panel.jsx';
import { formatoDinero, formatoEntero } from '../../../utils/formato.js';
import { useDashboardData } from '../hooks/useDashboardData.js';

const METODOS = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', BITCOIN_CHIVO: 'Bitcoin', TRANSFERENCIA: 'Transferencia', MIXTO: 'Mixto' };
const CANALES = { MOSTRADOR: 'Mostrador', PARA_LLEVAR: 'Para llevar', DELIVERY: 'Delivery' };
const ESTADOS = { EMITIDA: ['exito', 'Completada'], ANULADA: ['error', 'Anulada'] };

// "2026-11-19 14:05" (ya en hora del negocio) → "14:05" si es hoy, "19 nov · 14:05" si no.
function cuando(fechaLocal, hoyISO) {
  const [dia, hora] = fechaLocal.split(' ');
  if (dia === hoyISO) return hora;
  const [a, m, d] = dia.split('-').map(Number);
  return `${new Date(a, m - 1, d).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' }).replace('.', '')} · ${hora}`;
}

const quien = (o) => o.cliente || CANALES[o.canal] || 'Consumidor final';

// Últimas ventas del alcance. Tabla compacta desde sm; tarjetas apiladas en móvil.
// Cada fila abre el detalle en el historial (mismo modal, sin duplicarlo) si el rol puede verlo.
export default function OrdenesRecientesPanel({ cols, orden, sucursal, hoyISO }) {
  const { tiene } = useAuth();
  const navigate = useNavigate();
  const puedeHistorial = tiene('POS_COBRAR');
  const params = useMemo(() => ({ limite: 8, ...(sucursal ? { sucursal } : {}) }), [sucursal]);
  const { datos, error, cargando, recargar } = useDashboardData('/dashboard/ordenes-recientes', params, { intervalo: 60000 });

  const abrir = (o) => puedeHistorial && navigate(`/pos/ventas?venta=${encodeURIComponent(o.id)}`);
  const alTeclear = (e, o) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(o); } };
  const filaProps = (o) => (puedeHistorial ? {
    role: 'link', tabIndex: 0, onClick: () => abrir(o), onKeyDown: (e) => alTeclear(e, o),
    'aria-label': `Ver detalle de ${o.comprobante}, ${formatoDinero(o.total)}`,
    className: 'cursor-pointer transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
  } : {});

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={6} texto="Cargando órdenes recientes" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Sin sucursal asignada" texto="Pide a un administrador que te asigne una." />;
  else if (datos.estado === 'sin_datos') cuerpo = <Vacio Icono={Coffee} titulo="Aún no hay ventas" texto="Las órdenes aparecerán aquí en cuanto se cobre la primera." />;
  else {
    const varias = datos.sucursales.length > 1;
    const badge = (o) => { const [tipo, texto] = ESTADOS[o.estado] ?? ['info', o.estado]; return <EstadoBadge tipo={tipo}>{texto}</EstadoBadge>; };
    cuerpo = (
      <>
        {/* Móvil: tarjetas */}
        <ul className="divide-y divide-line sm:hidden">
          {datos.ordenes.map((o) => (
            <li key={o.id} {...filaProps(o)} className={`-mx-2 rounded-md px-2 py-3 ${filaProps(o).className ?? ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num truncate text-body font-semibold">{o.comprobante}</p>
                  <p className="truncate text-label-sm text-fg-muted">
                    {cuando(o.fechaLocal, hoyISO)} · {quien(o)}{varias ? ` · ${o.sucursal}` : ''}
                  </p>
                </div>
                <p className={`num whitespace-nowrap text-body font-semibold ${o.estado === 'ANULADA' ? 'text-fg-muted line-through' : ''}`}>{formatoDinero(o.total)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-label-sm text-fg-muted">
                <span>{formatoEntero(o.items)} ítems · {METODOS[o.metodoPago] ?? '—'}</span>
                {badge(o)}
              </div>
            </li>
          ))}
        </ul>
        {/* sm+: tabla compacta */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-body">
            <caption className="sr-only">Últimas {datos.ordenes.length} ventas</caption>
            <thead>
              <tr className="border-b border-line text-left text-label-sm text-fg-muted">
                <th scope="col" className="py-2 pr-3 font-medium">N° de orden</th>
                <th scope="col" className="py-2 pr-3 font-medium">Hora</th>
                <th scope="col" className="py-2 pr-3 font-medium">Cliente</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Ítems</th>
                <th scope="col" className="py-2 pr-3 font-medium">Pago</th>
                <th scope="col" className="py-2 pr-3 font-medium">Estado</th>
                <th scope="col" className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {datos.ordenes.map((o) => (
                <tr key={o.id} {...filaProps(o)}>
                  <td className="num whitespace-nowrap py-2.5 pr-3 font-medium">{o.comprobante}</td>
                  <td className="num whitespace-nowrap py-2.5 pr-3 text-fg-muted">
                    <time dateTime={o.fecha}>{cuando(o.fechaLocal, hoyISO)}</time>
                  </td>
                  <td className="max-w-48 py-2.5 pr-3">
                    <p className="truncate" title={quien(o)}>{quien(o)}</p>
                    {varias && <p className="truncate text-label-sm text-fg-muted">{o.sucursal}</p>}
                  </td>
                  <td className="num py-2.5 pr-3 text-right">{formatoEntero(o.items)}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-fg-muted">{METODOS[o.metodoPago] ?? '—'}</td>
                  <td className="py-2.5 pr-3">{badge(o)}</td>
                  <td className={`num whitespace-nowrap py-2.5 text-right font-semibold ${o.estado === 'ANULADA' ? 'text-fg-muted line-through' : ''}`}>{formatoDinero(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const verTodas = puedeHistorial && datos?.estado === 'ok' && (
    <Link to="/pos/ventas" className="inline-flex items-center gap-1 rounded-md text-label font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
      Ver todas <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );

  return (
    <Panel titulo="Órdenes recientes" icono={ReceiptText} cols={cols} orden={orden} acciones={verTodas}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
      {datos?.estado === 'ok' && datos.modo === 'propio' && <p className="mt-3 border-t border-line pt-3 text-label-sm text-fg-muted">Solo se muestran las ventas que cobraste tú.</p>}
    </Panel>
  );
}
