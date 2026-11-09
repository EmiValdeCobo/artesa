import { CircleAlert, CircleCheck, Store, TriangleAlert } from 'lucide-react';
import BannerError from '../../components/feedback/BannerError.jsx';
import { Cargando, Panel, Vacio } from './Panel.jsx';
import { horaDe } from './formato.js';
import { useDashboardData } from './useDashboardData.js';

const SEVERIDAD = {
  critica: { Icono: CircleAlert, texto: 'Crítica', clase: 'border-danger text-danger' },
  aviso: { Icono: TriangleAlert, texto: 'Aviso', clase: 'border-warning text-warning' },
};

const unir = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0] ?? '');
const REFRESCO_MS = 2 * 60 * 1000;

export default function AlertasPanel({ cols, titulo }) {
  const { datos, error, cargando, recargar } = useDashboardData('/dashboard/alertas', {}, { intervalo: REFRESCO_MS });

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={4} alto="h-12" />;
  else if (!datos) cuerpo = <BannerError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Sin sucursal no hay alertas que calcular. Pide a un administrador que te asigne una." />;
  else {
    cuerpo = (
      <>
        {datos.incompleto && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm">
            <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
            <p className="min-w-0 flex-1">
              No se pudieron calcular las alertas de {unir(datos.fallos.map((f) => f.modulo))}. Lo demás está al día.{' '}
              <button type="button" onClick={recargar} className="font-medium underline underline-offset-2">Reintentar</button>
            </p>
          </div>
        )}
        {datos.alertas.length === 0 ? (
          <Vacio Icono={CircleCheck} titulo={datos.incompleto ? 'Sin alertas en lo que se pudo revisar' : 'Todo en orden'} texto={`Revisamos ${unir(datos.categorias)} a las ${horaDe(datos.generadoEn)}. No hay nada que atender.`} />
        ) : (
          <>
            <p className="mb-3 text-sm text-fg-muted" aria-live="polite">
              {datos.resumen.critica > 0 && <><strong className="font-semibold text-danger">{datos.resumen.critica} {datos.resumen.critica === 1 ? 'crítica' : 'críticas'}</strong>{datos.resumen.aviso > 0 ? ' · ' : ''}</>}
              {datos.resumen.aviso > 0 && <strong className="font-semibold text-warning">{datos.resumen.aviso} {datos.resumen.aviso === 1 ? 'aviso' : 'avisos'}</strong>}
            </p>
            <ul className="grid gap-x-6 lg:grid-cols-2">
              {datos.alertas.map((a) => {
                const { Icono, texto, clase } = SEVERIDAD[a.severidad];
                return (
                  <li key={a.id} className={`flex gap-3 border-l-2 py-2.5 pl-3 ${clase.split(' ')[0]} border-b border-b-line last:border-b-0`}>
                    <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${clase.split(' ')[1]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug"><span className="sr-only">{texto}: </span>{a.titulo}</p>
                      <p className="mt-0.5 text-sm text-fg-muted">{a.detalle}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-fg-muted">{a.modulo} · {a.sucursal}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {datos.totalAlertas > datos.alertas.length && <p className="mt-3 text-xs text-fg-muted">Se muestran las {datos.alertas.length} más importantes de {datos.totalAlertas}.</p>}
            <p className="mt-3 text-xs text-fg-muted">Revisado a las {horaDe(datos.generadoEn)}. Se actualiza solo cada 2 minutos.</p>
          </>
        )}
      </>
    );
  }

  return (
    <Panel titulo={titulo} cols={cols}>
      {datos && error && <BannerError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
