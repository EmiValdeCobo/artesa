import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import AlertasPanel from './paneles/AlertasPanel.jsx';
import TopProductosPanel from './paneles/TopProductosPanel.jsx';
import VentasDiariasPanel from './paneles/VentasDiariasPanel.jsx';
import { fechaISODelNegocio, fechaNegocio, horaNegocio, saludoPorHora } from '../../utils/formato.js';
import { PERMISOS_ALERTAS, PERMISOS_TOP, PERMISOS_VENTAS } from './lib/permisos.js';
import { useAhora } from '../../hooks/useAhora.js';
import './dashboard.css';
import { CalendarDays } from "lucide-react";
import { ICONOS } from "../../config/iconos.js";
import { Select } from '../../components/ui/index.js';


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
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const visibles = PANELES.filter((p) => p.permisos.some(tiene));
  const ancho = anchos(visibles.map((p) => p.id));
  const sinVentas = !visibles.some((p) => p.id === 'ventas');
  const sucursales = useMemo(() => {
    if (!Array.isArray(usuario?.sucursales) || usuario.sucursales.length === 0) return [];
    return usuario.sucursales
      .map((s, idx) => {
        if (typeof s === 'string') return { id: idx + 1, nombre: s };
        return { id: s.id_sucursal ?? s.id ?? idx + 1, nombre: s.nombre };
      })
      .filter((s) => Boolean(s.nombre));
  }, [usuario?.sucursales]);

  const puedeVerTodas = tiene('DASH_TODAS_SUCURSALES') || sucursales.length > 1;
  const idSucursalFiltro = sucursalSeleccionada ? Number(sucursalSeleccionada) : undefined;

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

        <div className="flex flex-col gap-2 sm:min-w-64 lg:items-end">
          <label
            htmlFor="selector-sucursal-dashboard"
            id="sucursales-label"
            className="text-xs font-medium uppercase tracking-[0.18em] text-fg-muted"
          >
            Sucursal
          </label>
          {sucursales.length > 0 ? (
            <div className="relative w-full max-w-xs">
              <ICONOS.sucursal aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 size-4 text-(--ocre-decorativo)" />
              <Select
                id="selector-sucursal-dashboard"
                aria-label="Seleccionar sucursal"
                className="rounded-xl bg-canvas pl-9 font-semibold"
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                placeholder={puedeVerTodas ? 'Todas las sucursales' : ''}
                opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre }))}
              />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-sm font-semibold text-fg-muted">
              <ICONOS.sucursal aria-hidden="true" className="size-3.5 text-(--ocre-decorativo)" />
              Sin sucursal asignada
            </div>
          )}
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
              sucursal={idSucursalFiltro}
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
