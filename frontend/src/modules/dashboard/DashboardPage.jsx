import { useAuth } from '../../context/AuthContext.jsx';
import AlertasPanel from './paneles/AlertasPanel.jsx';
import TopProductosPanel from './paneles/TopProductosPanel.jsx';
import VentasDiariasPanel from './paneles/VentasDiariasPanel.jsx';
import { fechaISODelNegocio, fechaNegocio, horaNegocio, saludoPorHora } from '../../utils/formato.js';
import { PERMISOS_ALERTAS, PERMISOS_TOP, PERMISOS_VENTAS } from './lib/permisos.js';
import { useAhora } from '../../hooks/useAhora.js';
import './dashboard.css';
import { CalendarDays, MapPin } from "lucide-react";


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
  const sucursales = Array.isArray(usuario?.sucursales) && usuario.sucursales.length > 0
    ? usuario.sucursales.map((s) => (typeof s === 'string' ? s : s?.nombre)).filter(Boolean)
    : ['Sin sucursal asignada'];
  const ahora = useAhora(60000); // el saludo y la fecha cambian solos (mañana → tarde → noche, y de día a medianoche)
  const fecha = fechaNegocio(ahora);
  const fechaISO = fechaISODelNegocio(ahora);

  return (
    <div className="tema-dashboard">
      <header className="flex flex-col gap-5 rounded-2xl border border-line bg-surface px-6 py-5 shadow-sm lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--serie-1-texto)">
            <span aria-hidden="true" className="h-1 w-6 rounded-full bg-(--ocre-decorativo)" />
            Inicio
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-[1.1] text-balance sm:text-4xl">
            {saludoPorHora(horaNegocio(ahora))}, {usuario?.username ?? 'Usuario'}.
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <time dateTime={fechaISO}>{fecha}</time>
          </p>
        </div>

        <div className="lg:max-w-md lg:text-right">
          <p id="sucursales-label" className="text-xs font-medium uppercase tracking-[0.18em] text-fg-muted">
            Sucursal
          </p>
          <ul aria-labelledby="sucursales-label" className="mt-2 flex flex-wrap gap-2 lg:justify-end">
            {sucursales.map((s) => (
              <li
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-sm font-semibold"
              >
                <MapPin aria-hidden="true" className="size-3.5 text-(--ocre-decorativo)" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </header>
      <div className="mt-6 grid grid-cols-12 gap-4" data-zona="graficas">
        {visibles.length ? (
          visibles.map(({ id, Componente }, i) => (
            <Componente
              key={id}
              orden={i}
              cols={ancho[id]}
              titulo={sinVentas ? 'Notificaciones de tu área' : 'Alertas'}
            />
          ))
        ) : (
          <div className="col-span-12 flex min-h-56 items-center justify-center border border-dashed border-line px-6 text-center text-sm text-fg-muted">
            Tu rol no tiene bloques asignados en el inicio. Si los necesitas, pídelos a un administrador.
          </div>
        )}
      </div>
    </div>
  );
}
