// Encabezado estándar de las pantallas de administración: sección (rótulo) → título → descripción,
// con un espacio opcional a la derecha para acciones (botón principal, estado, selector).
// Es el mismo patrón que ya usaban Kárdex, Reportes, Empresa y Bitácora, ahora en un solo lugar.
//
// El rótulo usa `text-primary-text` (no `text-primary`): el token está pensado para texto pequeño y
// cumple AA en claro (5,7:1) y oscuro (7,6:1); `text-primary` queda en 4,3:1 / 3,9:1.
//
//   <EncabezadoPagina seccion="Inventario" titulo="Kárdex" descripcion="Auditoría de movimientos."
//     acciones={<Button>Nuevo</Button>} />
export default function EncabezadoPagina({ seccion, titulo, descripcion, acciones = null, className = '' }) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        {seccion && <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">{seccion}</p>}
        <h1 className="mt-1 text-2xl font-semibold">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{descripcion}</p>}
      </div>
      {acciones}
    </header>
  );
}
