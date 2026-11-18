import { Lock } from 'lucide-react';
import PaginaSistema from './PaginaSistema.jsx';

// 403: la cuenta no tiene el permiso que exige la pantalla.
export default function AccesoDenegado({ acciones }) {
  return (
    <PaginaSistema icono={Lock} codigo="Error 403" titulo="Acceso no autorizado"
      descripcion="Esta pantalla no está disponible para tu cuenta. Si la necesitas, pídela a un administrador."
      acciones={acciones ?? <a href="/" className="btn-ghost">Ir al inicio</a>} />
  );
}
