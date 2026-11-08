import { useState } from 'react';
import { Minus, Store, TrendingDown, TrendingUp, UserRoundX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/BannerError.jsx';
import GraficaVentas from './GraficaVentas.jsx';
import { Cargando, Panel, SelectorPeriodo, Vacio } from './Panel.jsx';
import { etiquetaDiaLarga, formatoDinero, formatoEntero, horaDe } from './formato.js';
import { useDashboardData } from './useDashboardData.js';

const PERIODOS = [[7, '7 días'], [14, '14 días'], [30, '30 días']];

function Indicador({ etiqueta, valor, nota }) {
  return (
    <div className="min-w-0 border-l-2 border-fg pl-3">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-fg-muted">{etiqueta}</dt>
      <dd className="mt-0.5 truncate font-display text-2xl font-semibold leading-tight tabular-nums">{valor}</dd>
      {nota && <dd className="mt-0.5 text-xs text-fg-muted">{nota}</dd>}
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

export default function VentasDiariasPanel({ cols }) {
  const { tiene } = useAuth();
  const propias = !tiene('REP_VER_DASHBOARD'); // solo para el rótulo; el alcance real lo decide el servidor
  const [dias, setDias] = useState(14);
  const { datos, error, cargando, recargar } = useDashboardData('/dashboard/ventas-diarias', { dias });
  const titulo = propias ? 'Mis ventas' : 'Ventas diarias';

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={5} alto="h-6" />;
  else if (!datos) cuerpo = <BannerError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') {
    cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Pide a un administrador que te asigne una para ver tus ventas." />;
  } else if (datos.estado === 'sin_datos') {
    cuerpo = <Vacio Icono={UserRoundX} titulo={`Sin ventas en los últimos ${datos.dias} días`} texto={propias ? 'Cuando registres ventas aparecerán aquí.' : 'Cuando haya ventas en tus sucursales aparecerán aquí.'} />;
  } else {
    const r = datos.resumen;
    cuerpo = (
      <>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          <Indicador etiqueta="Hoy" valor={formatoDinero(r.hoy.total)} nota={`${formatoEntero(r.hoy.tickets)} ${r.hoy.tickets === 1 ? 'ticket' : 'tickets'}`} />
          <Indicador etiqueta="Ayer" valor={formatoDinero(r.ayer.total)} />
          <Indicador etiqueta="Últimos 7 días" valor={formatoDinero(r.ultimos7.total)} nota={<Variacion pct={r.variacion7dPct} />} />
          <Indicador etiqueta={`Últimos ${datos.dias} días`} valor={formatoDinero(r.periodo.total)} nota={`${formatoEntero(r.periodo.tickets)} tickets`} />
        </dl>
        <div className="mt-5"><GraficaVentas serie={datos.serie} hoy={r.fecha} /></div>
        <p className="mt-3 text-xs text-fg-muted">
          {propias ? 'Solo ventas registradas por ti. ' : `${datos.sucursales.map((s) => s.nombre).join(', ')}. `}
          Importes con IVA, sin ventas anuladas. Hoy: {etiquetaDiaLarga(r.fecha)}, actualizado a las {horaDe(datos.generadoEn)}.
        </p>
      </>
    );
  }

  return (
    <Panel titulo={titulo} cols={cols} acciones={datos && datos.estado !== 'sin_sucursal' && <SelectorPeriodo etiqueta="Periodo de ventas" valor={dias} opciones={PERIODOS} onCambiar={setDias} />}>
      {datos && error && <BannerError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
