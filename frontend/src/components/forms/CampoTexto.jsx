import { forwardRef, isValidElement } from 'react';

// Campo de texto con icono opcional a la izquierda (el icono se tiñe de acento al enfocar).
const CampoTexto = forwardRef(function CampoTexto({ icono: Icono, id, invalid = false, className = '', ...resto }, ref) {
  const tieneIcono = Boolean(Icono);

  return (
    <div className="group relative">
      {tieneIcono && (
        isValidElement(Icono) ? (
          Icono
        ) : (
          <Icono
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted transition-colors group-focus-within:text-primary-text"
          />
        )
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        {...resto}
        className={`input input-auth ${tieneIcono ? 'pl-11' : ''} ${className}`}
      />
    </div>
  );
});

CampoTexto.displayName = 'CampoTexto';

export default CampoTexto;
