import { Bell, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import Metrica from '../../../components/display/Metrica.jsx';
import Skeleton from '../../../components/feedback/Skeleton.jsx';
import { formatoCentavos, formatoEntero } from '../../../utils/formato.js';

// Ticket promedio en centavos con BigInt (redondeo a la unidad más cercana): nunca float con dinero.
function promedioCentavos(totalCentavos, tickets) {
  const t = BigInt(tickets);
  if (t === 0n) return null;
  return (BigInt(totalCentavos) * 2n + t) / (2n * t);
}

function MetricaCargando() {
  return (
    <div className="card !p-4" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
    </div>
  );
}

/* Fila de indicadores del inicio. Solo usa lo que los bloques visibles YA cargaron (ventas y alertas):
   si el usuario no ve un bloque, tampoco ve sus indicadores. No hace peticiones propias. */
export default function FilaIndicadores({ ventas, alertas, conVentas, conAlertas }) {
  const tarjetas = [];
  if (conVentas) {
    if (ventas?.cargando) tarjetas.push({ id: 'v1', cargando: true }, { id: 'v2', cargando: true }, { id: 'v3', cargando: true });
    else if (ventas) {
      const promedio = promedioCentavos(ventas.total, ventas.tickets);
      tarjetas.push(
        { id: 'ventas', icono: Wallet, etiqueta: ventas.propias ? 'Mis ventas de hoy' : 'Ventas de hoy', valor: formatoCentavos(ventas.total) },
        { id: 'tickets', icono: Receipt, etiqueta: 'Tickets de hoy', valor: formatoEntero(ventas.tickets) },
        { id: 'promedio', icono: ShoppingBag, etiqueta: 'Ticket promedio', valor: promedio === null ? '—' : formatoCentavos(promedio) },
      );
    }
  }
  if (conAlertas) {
    if (alertas?.cargando) tarjetas.push({ id: 'a1', cargando: true });
    else if (alertas) {
      const tono = alertas.critica > 0 ? 'peligro' : alertas.aviso > 0 ? 'aviso' : 'neutro';
      tarjetas.push({ id: 'alertas', icono: Bell, etiqueta: 'Alertas activas', valor: formatoEntero(alertas.total), tono });
    }
  }
  if (!tarjetas.length) return null;

  return (
    <section aria-label="Indicadores de hoy" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tarjetas.map(({ id, cargando, ...t }) => (cargando ? <MetricaCargando key={id} /> : <Metrica key={id} {...t} />))}
    </section>
  );
}
