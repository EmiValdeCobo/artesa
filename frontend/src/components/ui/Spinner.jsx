import { SkeletonTexto } from '../feedback/Skeleton.jsx';

// Estado de carga genérico (se conserva el nombre por compatibilidad). Ya no gira:
// muestra un esqueleto de texto y anuncia `texto` a lectores de pantalla.
export default function Spinner({ texto = 'Cargando…', className = '' }) {
  return (
    <div className={`w-full p-6 ${className}`.trim()}>
      <SkeletonTexto lineas={3} texto={texto} className="max-w-md" />
    </div>
  );
}
