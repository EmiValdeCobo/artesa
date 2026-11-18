// Encabezado estándar de las pantallas: sección (overline) → título (Fraunces) → descripción,
// con un espacio opcional a la derecha para acciones (botón principal, estado, selector).
//
// El rótulo usa `text-primary-text` (no `text-primary`): cumple AA en claro (5,7:1) y oscuro (7,6:1).
// Convención del rótulo `seccion`: "Grupo · Módulo", tomados tal cual de config/menu.js
// Ej.: "Operación · Compras", "Gestión · RR. HH.", "Administración · Usuarios y roles".
//   <EncabezadoPagina seccion="Operación · Inventario" titulo="Kárdex" descripcion="Auditoría de movimientos."
//     acciones={<Button>Nuevo</Button>} />
export default function EncabezadoPagina({ seccion, titulo, descripcion, acciones = null, className = '' }) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        {seccion && <p className="rotulo !text-primary-text">{seccion}</p>}
        <h1 className="mt-1 font-display text-h1 font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-body text-fg-muted">{descripcion}</p>}
      </div>
      {acciones}
    </header>
  );
}
