import { CircleAlert } from 'lucide-react';

// Mensaje de error junto a un campo. Se enlaza con el input mediante aria-describedby
// (usa `idError(id)` en el input) para que el lector de pantalla lo lea al enfocarlo.
//
//   <input id="usuario-username" aria-invalid={!!errores.username} aria-describedby={errores.username ? idError('usuario-username') : undefined} />
//   <CampoError id="usuario-username" mensaje={errores.username} />
export const idError = (id) => `${id}-error`;

export default function CampoError({ id, mensaje }) {
  if (!mensaje) return null;
  return (
    <p id={idError(id)} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-snug text-danger">
      <CircleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
      <span>{mensaje}</span>
    </p>
  );
}
