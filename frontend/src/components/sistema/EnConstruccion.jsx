import { Hammer } from 'lucide-react';
import PaginaSistema from './PaginaSistema.jsx';

// Pantalla cuya API aún no existe. `children` admite el detalle (p. ej. endpoints faltantes).
export default function EnConstruccion({ titulo = 'Pantalla en construcción', descripcion, codigo = 'En construcción', acciones, children }) {
  return (
    <PaginaSistema icono={Hammer} codigo={codigo} titulo={titulo}
      descripcion={descripcion ?? 'Esta sección todavía no está disponible. Estará lista cuando el backend exponga sus datos.'}
      acciones={acciones}>
      {children}
    </PaginaSistema>
  );
}
