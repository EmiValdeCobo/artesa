import { Compass } from 'lucide-react';
import PaginaSistema from './PaginaSistema.jsx';

// 404: la ruta no existe. Usa enlaces <a> para funcionar también fuera del Router.
export default function PaginaNoEncontrada({ inicio = '/', acciones }) {
  return (
    <PaginaSistema icono={Compass} codigo="Error 404" titulo="No encontramos esta página"
      descripcion="La dirección no existe o fue movida. Revisa el enlace o vuelve al inicio."
      acciones={acciones ?? <a href={inicio} className="btn-primary">Ir al inicio</a>} />
  );
}
