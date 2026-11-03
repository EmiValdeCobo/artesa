// Guía de uso de lucide-react (borrar cuando el equipo la domine).
// Reglas: importar SOLO los iconos usados, size 16–20, aria-hidden si hay texto, aria-label si es solo-icono.
import { Plus, Pencil, Trash2, Search, Save, Printer, Ban } from 'lucide-react';
import EstadoBadge from './EstadoBadge.jsx';

export default function EjemplosIconos() {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Acciones</h2>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary"><Plus size={16} /> Nuevo producto</button>
        <button className="btn-secondary"><Save size={16} /> Guardar</button>
        <button className="btn-ghost"><Pencil size={16} /> Editar</button>
        <button className="btn-ghost"><Printer size={16} /> Imprimir</button>
        <button className="btn-danger"><Ban size={16} /> Anular venta</button>
        <button className="btn-ghost" aria-label="Eliminar"><Trash2 size={16} /></button>
      </div>
      <h2 className="font-semibold">Estados</h2>
      <div className="flex flex-wrap gap-2">
        <EstadoBadge tipo="exito">Emitida</EstadoBadge>
        <EstadoBadge tipo="alerta">Stock bajo</EstadoBadge>
        <EstadoBadge tipo="error">Anulada</EstadoBadge>
        <EstadoBadge tipo="info">Turno abierto</EstadoBadge>
        <EstadoBadge tipo="cargando">Procesando</EstadoBadge>
      </div>
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
        <input className="input pl-9" placeholder="Buscar insumo…" />
      </div>
    </div>
  );
}
