import { useAuth } from '../context/AuthContext.jsx';

/* Inicio. Rejilla de 12 columnas pensada para crecer: cada gráfica futura es un objeto
   en PANELES con su título, su componente y cuántas columnas ocupa (de 3 a 12).
   Ejemplo:  { id: 'ventas-hora', titulo: 'Ventas por hora', cols: 8, Componente: VentasPorHora }
   Mientras la lista esté vacía, la rejilla muestra un hueco señalizado. */
const PANELES = [];

const COLUMNAS = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 6: 'lg:col-span-6', 8: 'lg:col-span-8', 12: 'lg:col-span-12' };

function Panel({ titulo, cols = 6, children }) {
  return (
    <section className={`col-span-12 border border-line bg-surface ${COLUMNAS[cols] ?? COLUMNAS[6]}`}>
      <h2 className="border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">{titulo}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const sucursales = usuario.sucursales.map((s) => s.nombre).join(', ') || 'Sin sucursal asignada';
  const fecha = new Date().toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-2 border-fg pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-text">Inicio</p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight">Hola, {usuario.username}.</h1>
        </div>
        <dl className="flex gap-8 text-sm">
          <div><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Usuario</dt><dd className="mt-0.5 font-medium">{usuario.username}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Sucursal</dt><dd className="mt-0.5 font-medium">{sucursales}</dd></div>
          <div className="hidden sm:block"><dt className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Hoy</dt><dd className="mt-0.5 font-medium first-letter:uppercase">{fecha}</dd></div>
        </dl>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-4" data-zona="graficas">
        {PANELES.length
          ? PANELES.map(({ id, titulo, cols, Componente }) => <Panel key={id} titulo={titulo} cols={cols}><Componente /></Panel>)
          : <div className="col-span-12 flex min-h-56 items-center justify-center border border-dashed border-line px-6 text-center text-sm text-fg-muted">Espacio reservado para las gráficas del negocio.</div>}
      </div>
    </div>
  );
}
