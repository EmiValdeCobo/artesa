import { useAuth } from '../../context/AuthContext.jsx';
import AlertasPanel from './paneles/AlertasPanel.jsx';
import TopProductosPanel from './paneles/TopProductosPanel.jsx';
import VentasDiariasPanel from './paneles/VentasDiariasPanel.jsx';
import { fechaNegocio, horaNegocio, saludoPorHora } from '../../utils/formato.js';
import { PERMISOS_ALERTAS, PERMISOS_TOP, PERMISOS_VENTAS } from './lib/permisos.js';
import { useAhora } from '../../hooks/useAhora.js';
import './dashboard.css';

/* Inicio. Rejilla de 12 columnas: cada bloque es un objeto en PANELES con los permisos que lo habilitan.
   Para sumar una gráfica nueva basta otro objeto con su componente; si el usuario no tiene ninguno de sus
   permisos, el bloque ni se pide ni se pinta (y el servidor igual respondería 403). */
const PANELES = [
  { id: 'ventas', permisos: PERMISOS_VENTAS, Componente: VentasDiariasPanel },
  { id: 'top', permisos: PERMISOS_TOP, Componente: TopProductosPanel },
  { id: 'alertas', permisos: PERMISOS_ALERTAS, Componente: AlertasPanel },
];

// Ancho de cada bloque según cuáles tiene el usuario: sin ventas, las notificaciones pasan al lugar principal.
function anchos(ids) {
  const tiene = (id) => ids.includes(id);
  if (tiene('ventas')) return { ventas: tiene('top') ? 8 : 12, top: 4, alertas: 12 };
  return { top: tiene('alertas') ? 4 : 12, alertas: tiene('top') ? 8 : 12 };
}

export default function DashboardPage() {
  const { usuario, tiene } = useAuth();
  const visibles = PANELES.filter((p) => p.permisos.some(tiene));
  const ancho = anchos(visibles.map((p) => p.id));
  const sinVentas = !visibles.some((p) => p.id === 'ventas');
  const sucursales = usuario.sucursales.map((s) => s.nombre).join(', ') || 'Sin sucursal asignada';
  const ahora = useAhora(60000); // el saludo y la fecha cambian solos (mañana → tarde → noche, y de día a medianoche)
  const fecha = fechaNegocio(ahora);

  return (
    <div className="tema-dashboard">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 border-fg pb-5">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-(--serie-1-texto)"><span aria-hidden="true" className="h-0.5 w-6 bg-(--serie-2)" />Inicio</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-[1.1] sm:text-4xl">{saludoPorHora(horaNegocio(ahora))}, {usuario.username}.</h1>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs uppercase tracking-[0.14em] text-fg-muted">Usuario</dt><dd className="mt-0.5 font-semibold">{usuario.username}</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.14em] text-fg-muted">Sucursal</dt><dd className="mt-0.5 font-semibold">{sucursales}</dd></div>
          <div className="hidden sm:block"><dt className="text-xs uppercase tracking-[0.14em] text-fg-muted">Hoy</dt><dd className="mt-0.5 font-semibold">{fecha}</dd></div>
        </dl>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-4" data-zona="graficas">
        {visibles.length
          ? visibles.map(({ id, Componente }, i) => <Componente key={id} orden={i} cols={ancho[id]} titulo={sinVentas ? 'Notificaciones de tu área' : 'Alertas'} />)
          : <div className="col-span-12 flex min-h-56 items-center justify-center border border-dashed border-line px-6 text-center text-sm text-fg-muted">Tu rol no tiene bloques asignados en el inicio. Si los necesitas, pídelos a un administrador.</div>}
      </div>
    </div>
  );
}
