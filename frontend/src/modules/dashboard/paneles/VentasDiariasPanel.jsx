import { useState } from 'react';
import { Minus, Store, TrendingDown, TrendingUp, UserRoundX } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import GraficaVentas, { LeyendaVentas } from '../components/GraficaVentas.jsx';
import { Cargando, Panel, SelectorPeriodo, Vacio } from '../components/Panel.jsx';
import Actualizado from '../../../components/display/Actualizado.jsx';
import { formatoDinero, formatoEntero } from '../../../utils/formato.js';
import { useDashboardData } from '../hooks/useDashboardData.js';

const PERIODOS = [[7, '7 días'], [14, '14 días'], [30, '30 días']];

// Jerarquía: "Hoy" es el dato principal (más grande y con regla de acento); el resto da contexto.
function Indicador({ etiqueta, valor, nota, principal = false }) {
  return (
    <div className={`min-w-0 border-l-2 pl-4 ${principal ? 'col-span-2 border-primary lg:col-span-1' : 'border-line'}`}>
      <dt className="text-xs text-fg-muted">{etiqueta}</dt>
      <dd className={`mt-1 font-display font-semibold leading-none tabular-nums ${principal ? 'text-4xl' : 'text-2xl'}`}>{valor}</dd>
      {nota && <dd className="mt-2 text-xs text-fg-muted">{nota}</dd>}
    </div>
  );
}

function Variacion({ pct }) {
  if (pct == null) return <span>Sin semana previa para comparar</span>;
  const n = Number(pct);
  const Icono = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
  const color = n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-fg-muted';
  return <span className={`inline-flex items-center gap-1 font-medium ${color}`}><Icono size={13} aria-hidden="true" />{n > 0 ? '+' : ''}{pct} % vs. 7 días previos</span>;
}

export default function VentasDiariasPanel({ cols, orden }) {
  const { tiene } = useAuth();
  const propias = !tiene('REP_VER_DASHBOARD'); // solo para el rótulo; el alcance real lo decide el servidor
  const [dias, setDias] = useState(14);
  const { datos, error, cargando, actualizando, recargar } = useDashboardData('/dashboard/ventas-diarias', { dias }, { intervalo: 60000 });
  const titulo = propias ? 'Mis ventas' : 'Ventas diarias';

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={5} alto="h-6" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') {
    cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Pide a un administrador que te asigne una para ver tus ventas." />;
  } else if (datos.estado === 'sin_datos') {
    cuerpo = <Vacio Icono={UserRoundX} titulo={`Sin ventas en los últimos ${datos.dias} días`} texto={propias ? 'Cuando registres ventas aparecerán aquí.' : 'Cuando haya ventas en tus sucursales aparecerán aquí.'} />;
  } else {
    const r = datos.resumen;
    const filaHoy = datos.serie.find((f) => f.fecha === r.fecha);
    cuerpo = (
      <>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <Indicador principal etiqueta="Hoy" valor={formatoDinero(r.hoy.total)} nota={`${formatoEntero(r.hoy.tickets)} ${r.hoy.tickets === 1 ? 'ticket' : 'tickets'} hasta ahora`} />
          <Indicador etiqueta="Ayer" valor={formatoDinero(r.ayer.total)} />
          <Indicador etiqueta="Últimos 7 días" valor={formatoDinero(r.ultimos7.total)} nota={<Variacion pct={r.variacion7dPct} />} />
          <Indicador etiqueta="Ticket promedio hoy" valor={filaHoy?.tickets ? formatoDinero(filaHoy.ticketPromedio) : '—'} nota={filaHoy?.tickets ? 'por venta' : 'aún sin ventas'} />
        </dl>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className="text-sm font-semibold">Ventas por día</h3>
            <p className="mt-0.5 text-xs text-fg-muted">
              Últimos {datos.dias} días: <span className="font-medium tabular-nums text-fg">{formatoDinero(r.periodo.total)}</span> en {formatoEntero(r.periodo.tickets)} tickets
            </p>
          </div>
          <LeyendaVentas />
        </div>
        <div className="mt-4"><GraficaVentas serie={datos.serie} hoy={r.fecha} /></div>

        <p className="mt-5 flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line pt-3 text-xs text-fg-muted">
          <span>{propias ? 'Solo ventas registradas por ti' : datos.sucursales.map((s) => s.nombre).join(', ')}. Importes con IVA, sin ventas anuladas.</span>
          <Actualizado instante={datos.generadoEn} actualizando={actualizando} onRecargar={recargar} />
        </p>
      </>
    );
  }

  return (
    <Panel titulo={titulo} cols={cols} orden={orden} acciones={datos && datos.estado !== 'sin_sucursal' && <SelectorPeriodo etiqueta="Periodo de ventas" valor={dias} opciones={PERIODOS} onCambiar={setDias} />}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
