import { TriangleAlert } from 'lucide-react';
import PaginaSistema from './PaginaSistema.jsx';

// Error inesperado al renderizar. Sin detalle técnico (va a la consola/registro).
export default function ErrorSistema({ titulo = 'Algo falló en esta pantalla', descripcion = 'No pudimos mostrar esta parte de artesa por un problema inesperado.', acciones, children, ...resto }) {
  return (
    <PaginaSistema icono={TriangleAlert} codigo="Error inesperado" titulo={titulo} descripcion={descripcion} acciones={acciones} {...resto}>
      {children}
    </PaginaSistema>
  );
}
