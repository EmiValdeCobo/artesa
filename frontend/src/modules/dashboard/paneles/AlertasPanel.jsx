import { CircleAlert, CircleCheck, Store, TriangleAlert } from 'lucide-react';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import { Cargando, Panel, Vacio } from '../components/Panel.jsx';
import Actualizado from '../../../components/display/Actualizado.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';

const SEVERIDAD = {
  critica: { Icono: CircleAlert, texto: 'Crítica', clase: 'border-danger text-danger bg-danger-soft/70' },
  aviso: { Icono: TriangleAlert, texto: 'Aviso', clase: 'border-warning text-warning bg-warning-soft/80' },
};

const unir = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0] ?? '');
const REFRESCO_MS = 2 * 60 * 1000;

export default function AlertasPanel({ cols, titulo, orden }) {
  const { datos, error, cargando, actualizando, recargar } = useDashboardData('/dashboard/alertas', {}, { intervalo: REFRESCO_MS });

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={4} alto="h-12" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Sin sucursal no hay alertas que calcular. Pide a un administrador que te asigne una." />;
  else {
    cuerpo = (
      <>
        {datos.incompleto && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm">
            <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
            <p className="min-w-0 flex-1">
              No se pudieron calcular las alertas de {unir(datos.fallos.map((f) => f.modulo))}. Lo demás está al día.{' '}
              <button type="button" onClick={recargar} className="font-semibold text-primary-text underline underline-offset-2">Reintentar</button>
            </p>
          </div>
        )}
        {datos.alertas.length === 0 ? (
          <Vacio Icono={CircleCheck} titulo={datos.incompleto ? 'Sin alertas en lo que se pudo revisar' : 'Sin pendientes por ahora'} texto={`Nada urgente en ${unir(datos.categorias)}.`} />
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
                  <li key={a.id} className={`mb-2 flex gap-3 rounded-r-md border-l-4 py-3 pl-3 pr-3 ${clase.split(' ')[0]} ${clase.split(' ')[2]}`}>
                    <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${clase.split(' ')[1]}`} />
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug text-fg sm:text-sm"><span className="sr-only">{texto}: </span>{a.titulo}</p>
                      <p className="mt-0.5 text-sm text-fg-muted">{a.detalle}</p>
                      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.1em] text-fg-muted">{a.modulo} · {a.sucursal}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {datos.totalAlertas > datos.alertas.length && <p className="mt-3 text-xs text-fg-muted">Se muestran las {datos.alertas.length} más importantes de {datos.totalAlertas}.</p>}
          </>
        )}
        <div className="mt-4 border-t border-line pt-3"><Actualizado instante={datos.generadoEn} actualizando={actualizando} onRecargar={recargar} /></div>
      </>
    );
  }

  return (
    <Panel titulo={titulo} cols={cols} orden={orden} acento={5}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
