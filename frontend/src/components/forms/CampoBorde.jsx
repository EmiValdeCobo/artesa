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
        className={`absolute -top-2 left-3 z-10 bg-surface px-1 text-label-sm ${invalid ? "text-danger-text" : "text-fg-muted"}`}
      >
        {etiqueta}
      </label>
      <div
        className={`flex h-control-lg items-center gap-3 rounded-md border bg-surface px-3.5 transition-colors focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${invalid ? "border-danger" : "border-line-strong hover:border-fg-muted"}`}
      >
        {Icono && <Icono size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-fg-subtle" />}
        <input
          ref={ref}
          id={id}
          type={esClave && visible ? 'text' : type}
          aria-invalid={invalid || undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-subtle"
          {...props}
        />
        {esClave && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="grid size-control-sm shrink-0 place-items-center rounded-sm text-fg-muted hover:bg-muted hover:text-fg"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
});

export default CampoBorde;
