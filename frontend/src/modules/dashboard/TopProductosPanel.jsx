import { useState } from 'react';
import { Coffee, Store } from 'lucide-react';
import BannerError from '../../components/feedback/BannerError.jsx';
import { Cargando, Panel, SelectorPeriodo, Vacio } from './Panel.jsx';
import { formatoDinero, formatoEntero } from './formato.js';
import { useDashboardData } from './useDashboardData.js';

const PERIODOS = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];

export default function TopProductosPanel({ cols }) {
  const [dias, setDias] = useState(7);
  const { datos, error, cargando, recargar } = useDashboardData('/dashboard/top-productos', { dias, limite: 5 });

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={5} alto="h-8" />;
  else if (!datos) cuerpo = <BannerError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Sin sucursal asignada" texto="Pide a un administrador que te asigne una." />;
  else if (datos.estado === 'sin_datos') cuerpo = <Vacio Icono={Coffee} titulo={dias === 1 ? 'Aún no hay ventas hoy' : `Sin ventas en los últimos ${dias} días`} texto="El ranking aparecerá cuando se registren ventas." />;
  else {
    const maximo = datos.productos[0].unidades;
    cuerpo = (
      <ol className="space-y-3">
        {datos.productos.map((p) => (
          <li key={p.id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-x-2">
            <span className="font-display text-lg font-semibold tabular-nums text-primary-text">{p.posicion}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.nombre}</p>
              <div className="mt-1 h-1.5 bg-muted" aria-hidden="true"><div className="h-full bg-primary" style={{ width: `${(p.unidades / maximo) * 100}%` }} /></div>
            </div>
            <div className="text-right text-sm tabular-nums">
              <p className="font-semibold">{formatoEntero(p.unidades)} <span className="text-xs font-normal text-fg-muted">uds.</span></p>
              <p className="text-xs text-fg-muted">{datos.incluyeImportes ? formatoDinero(p.ingreso) : `${p.participacionPct} %`}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <Panel titulo="Productos más vendidos" cols={cols} acciones={datos && datos.estado !== 'sin_sucursal' && <SelectorPeriodo etiqueta="Periodo del ranking" valor={dias} opciones={PERIODOS} onCambiar={setDias} />}>
      {datos && error && <BannerError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
      {datos?.estado === 'ok' && (
        <p className="mt-4 text-xs text-fg-muted">
          Por unidades vendidas. {datos.incluyeImportes ? 'Importe bruto con IVA, antes de descuentos.' : 'Debajo de cada cifra, su parte del total de unidades.'}
        </p>
      )}
    </Panel>
  );
}
