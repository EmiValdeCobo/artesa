import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleAlert, CircleCheck, Store, TriangleAlert } from 'lucide-react';
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

function resolverRutaAlerta(a) {
  const mod = String(a.modulo || '').toUpperCase();
  const tipo = String(a.tipo || '').toUpperCase();

  if (mod.includes('INVENTARIO') || tipo.includes('STOCK')) {
    return '/inventario';
  }
  if (mod.includes('COMPRA') || tipo.includes('CXP')) {
    return '/compras/cuentas-por-pagar';
  }
  if (mod.includes('CAJA') || tipo.includes('CUADRE') || tipo.includes('TURNO')) {
    return '/caja';
  }
  if (mod.includes('PREPARAC') || mod.includes('VENTA') || tipo.includes('PREPARACION') || tipo.includes('ANULAC') || tipo.includes('CAIDA_VENTAS')) {
    return '/pos';
  }
  if (mod.includes('RR') || tipo.includes('PLANILLA')) {
    return '/rrhh';
  }
  return null;
}

export default function AlertasPanel({ cols, titulo, orden, sucursal }) {
  const navigate = useNavigate();
  const params = useMemo(() => (sucursal ? { sucursal } : {}), [sucursal]);
  const { datos, error, cargando, actualizando, recargar } = useDashboardData('/dashboard/alertas', params, { intervalo: REFRESCO_MS });

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={4} alto="h-12" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Sin sucursal no hay alertas que calcular. Pide a un administrador que te asigne una." />;
  else {
    cuerpo = (
      <>
        {datos.incompleto && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm">
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
            <ul className="grid min-w-0 gap-x-6 xl:grid-cols-2">
              {datos.alertas.map((a) => {
                const { Icono, texto, clase } = SEVERIDAD[a.severidad] || SEVERIDAD.aviso;
                const ruta = resolverRutaAlerta(a);
                return (
                  <li
                    key={a.id}
                    onClick={() => ruta && navigate(ruta)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && ruta) {
                        e.preventDefault();
                        navigate(ruta);
                      }
                    }}
                    role={ruta ? 'button' : undefined}
                    tabIndex={ruta ? 0 : undefined}
                    aria-label={ruta ? `${texto}: ${a.titulo}. Ir a ${a.modulo}` : undefined}
                    className={`group mb-2 flex items-start gap-3 rounded-xl border-l-4 py-3 pl-3 pr-3 transition-all ${
                      clase.split(' ')[0]
                    } ${clase.split(' ')[2]} ${
                      ruta ? 'cursor-pointer hover:bg-surface/90 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : ''
                    }`}
                  >
                    <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${clase.split(' ')[1]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold leading-snug text-fg sm:text-sm">
                        <span className="sr-only">{texto}: </span>
                        {a.titulo}
                      </p>
                      <p className="mt-0.5 text-sm text-fg-muted">{a.detalle}</p>
                      <p className="mt-1.5 min-w-0 break-words text-xs font-medium uppercase tracking-[0.1em] text-fg-muted">
                        {a.modulo} · {a.sucursal}
                      </p>
                    </div>
                    {ruta && (
                      <ChevronRight
                        size={16}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-fg-muted opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    )}
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
    <Panel titulo={titulo} cols={cols} orden={orden} acento={3}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
