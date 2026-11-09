import { useAuth } from '../../context/AuthContext.jsx';
import AlertasPanel from './paneles/AlertasPanel.jsx';
import TopProductosPanel from './paneles/TopProductosPanel.jsx';
import VentasDiariasPanel from './paneles/VentasDiariasPanel.jsx';
import { fechaNegocio, horaNegocio, saludoPorHora } from '../../utils/formato.js';
import { PERMISOS_ALERTAS, PERMISOS_TOP, PERMISOS_VENTAS } from './lib/permisos.js';
import { useAhora } from '../../hooks/useAhora.js';

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
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-2 border-fg pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-text">Inicio</p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight">{saludoPorHora(horaNegocio(ahora))}, {usuario.username}.</h1>
        </div>
        <dl className="flex gap-8 text-sm">
          <div><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Usuario</dt><dd className="mt-0.5 font-medium">{usuario.username}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Sucursal</dt><dd className="mt-0.5 font-medium">{sucursales}</dd></div>
          <div className="hidden sm:block"><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Hoy</dt><dd className="mt-0.5 font-medium">{fecha}</dd></div>
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
