import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, CircleCheck, Store, TriangleAlert } from 'lucide-react';
import AvisoError from '../../../components/feedback/AvisoError.jsx';
import EstadoBadge from '../../../components/feedback/EstadoBadge.jsx';
import { Cargando, Panel, Vacio } from '../components/Panel.jsx';
import Actualizado from '../../../components/display/Actualizado.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';

// Grupos por severidad, de mayor a menor (peligro → aviso → info). Cada grupo lleva su conteo en un EstadoBadge.
const GRUPOS = [
  { clave: 'critica', texto: 'Crítica', titulo: (n) => (n === 1 ? 'crítica' : 'críticas'), badge: 'peligro', marca: 'bg-danger' },
  { clave: 'aviso', texto: 'Aviso', titulo: (n) => (n === 1 ? 'aviso' : 'avisos'), badge: 'aviso', marca: 'bg-warning' },
  { clave: 'info', texto: 'Información', titulo: () => 'informativas', badge: 'info', marca: 'bg-info' },
];
const grupoDe = (a) => (GRUPOS.some((g) => g.clave === a.severidad) ? a.severidad : 'aviso');

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

function FilaAlerta({ a, grupo, navigate }) {
  const ruta = resolverRutaAlerta(a);
  const ir = () => ruta && navigate(ruta);
  return (
    <li
      onClick={ir}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && ruta) {
          e.preventDefault();
          navigate(ruta);
        }
      }}
      role={ruta ? 'button' : undefined}
      tabIndex={ruta ? 0 : undefined}
      aria-label={ruta ? `${grupo.texto}: ${a.titulo}. Ir a ${a.modulo}` : undefined}
      className={`alerta-fila group ${ruta ? 'cursor-pointer hover:bg-muted' : ''}`}
    >
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${grupo.marca}`} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold leading-snug text-fg">
          <span className="sr-only">{grupo.texto}: </span>
          {a.titulo}
        </p>
        <p className="mt-0.5 text-body-sm text-fg-muted">{a.detalle}</p>
        <p className="rotulo mt-1 min-w-0 break-words">{a.modulo} · {a.sucursal}</p>
      </div>
      {ruta && <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
    </li>
  );
}

export default function AlertasPanel({ cols, titulo, orden, sucursal, onResumen }) {
  const navigate = useNavigate();
  const params = useMemo(() => (sucursal ? { sucursal } : {}), [sucursal]);
  const { datos, error, cargando, actualizando, recargar } = useDashboardData('/dashboard/alertas', params, { intervalo: REFRESCO_MS });

  // Indicador "Alertas activas" del encabezado: se deriva de esta misma respuesta (sin otra petición).
  useEffect(() => {
    if (!onResumen) return;
    if (cargando) onResumen({ cargando: true });
    else if (!datos || datos.estado === 'sin_sucursal') onResumen(null);
    else onResumen({ total: datos.totalAlertas ?? datos.alertas.length, critica: datos.resumen?.critica ?? 0, aviso: datos.resumen?.aviso ?? 0 });
  }, [onResumen, cargando, datos]);

  let cuerpo;
  if (cargando) cuerpo = <Cargando lineas={4} texto="Cargando alertas" />;
  else if (!datos) cuerpo = <AvisoError error={error} onReintentar={recargar} />;
  else if (datos.estado === 'sin_sucursal') cuerpo = <Vacio Icono={Store} titulo="Tu usuario no tiene una sucursal asignada" texto="Sin sucursal no hay alertas que calcular. Pide a un administrador que te asigne una." />;
  else {
    const grupos = GRUPOS
      .map((g) => ({ ...g, alertas: datos.alertas.filter((a) => grupoDe(a) === g.clave) }))
      .filter((g) => g.alertas.length > 0);
    cuerpo = (
      <>
        {datos.incompleto && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5 text-body">
            <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-warning-text" />
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
            <p className="sr-only" aria-live="polite">
              {grupos.map((g) => `${g.alertas.length} ${g.titulo(g.alertas.length)}`).join(' · ')}
            </p>
            <div className="grid min-w-0 gap-x-8 gap-y-4 xl:grid-cols-2">
              {grupos.map((g) => (
                <section key={g.clave} aria-label={`${g.texto}: ${g.alertas.length}`} className="min-w-0">
                  <h3 className="mb-1 flex items-center gap-2">
                    <EstadoBadge tipo={g.badge}>{g.alertas.length} {g.titulo(g.alertas.length)}</EstadoBadge>
                  </h3>
                  <ul className="divide-y divide-line">
                    {g.alertas.map((a) => <FilaAlerta key={a.id} a={a} grupo={g} navigate={navigate} />)}
                  </ul>
                </section>
              ))}
            </div>
            {datos.totalAlertas > datos.alertas.length && <p className="mt-3 text-label-sm text-fg-muted">Se muestran las {datos.alertas.length} más importantes de {datos.totalAlertas}.</p>}
          </>
        )}
        <div className="mt-4 border-t border-line pt-3"><Actualizado instante={datos.generadoEn} actualizando={actualizando} onRecargar={recargar} /></div>
      </>
    );
  }

  return (
    <Panel titulo={titulo} icono={Bell} cols={cols} orden={orden}>
      {datos && error && <AvisoError className="mb-4" error={error} onReintentar={recargar} />}
      {cuerpo}
    </Panel>
  );
}
