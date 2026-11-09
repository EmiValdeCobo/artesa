import { forwardRef, useId } from 'react';

// opciones: [{ valor, texto }]
const Select = forwardRef(function Select({ etiqueta, opciones = [], placeholder, error, className = '', id, ...resto }, ref) {
  const auto = useId();
  const idCampo = id || auto;
  return (
    <div>
      {etiqueta && <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium">{etiqueta}</label>}
      <select ref={ref} id={idCampo} aria-invalid={!!error || undefined} className={`input ${className}`} {...resto}>
        {placeholder && <option value="">{placeholder}</option>}
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
});

export default Select;