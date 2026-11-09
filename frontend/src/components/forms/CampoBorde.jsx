import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* Campo con la etiqueta montada sobre el borde (estilo "fieldset").
   Solo lo usa el login administrativo. Con type="password" añade el botón mostrar/ocultar. */
const CampoBorde = forwardRef(function CampoBorde(
  { id, etiqueta, icono: Icono, type = 'text', invalid = false, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const esClave = type === 'password';
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={`absolute -top-2.5 left-3.5 z-10 bg-surface px-1.5 text-[11px] font-bold tracking-wide ${invalid ? 'text-danger' : 'text-primary-text'}`}
      >
        {etiqueta}
      </label>
      <div
        className={`flex h-14 items-center gap-3 rounded-lg border-[1.5px] bg-surface px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-ring ${invalid ? 'border-danger' : 'border-primary'}`}
      >
        {Icono && <Icono size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-fg" />}
        <input
          ref={ref}
          id={id}
          type={esClave && visible ? 'text' : type}
          aria-invalid={invalid || undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted/60"
          {...props}
        />
        {esClave && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
});

export default CampoBorde;
