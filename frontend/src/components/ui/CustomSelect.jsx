import { useState, useEffect, useRef, useId, useMemo, forwardRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export const CustomSelect = forwardRef(function CustomSelect(
  {
    etiqueta,
    opciones = [],
    value,
    onChange,
    placeholder = 'Seleccionar…',
    error,
    ayuda,
    requerido = false,
    disabled = false,
    buscable,
    className = '',
    id,
    name,
    tamano = 'md',
    'aria-label': ariaLabel,
    ...resto
  },
  ref
) {
  const autoId = useId();
  const idCampo = id || autoId;
  const listboxId = `${idCampo}-listbox`;
  const contenedorRef = useRef(null);
  const searchInputRef = useRef(null);

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abrirHaciaArriba, setAbrirHaciaArriba] = useState(false);
  const [indiceEnfocado, setIndiceEnfocado] = useState(-1);

  // Normalizar opciones
  const listaOpciones = useMemo(() => {
    const normalizadas = opciones.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { valor: String(opt), texto: String(opt) };
      }
      const valor = opt.valor !== undefined ? opt.valor : (opt.value !== undefined ? opt.value : '');
      const texto = opt.texto !== undefined ? opt.texto : (opt.label !== undefined ? opt.label : String(valor));
      return {
        ...opt,
        valor: String(valor),
        texto: String(texto),
        deshabilitado: Boolean(opt.deshabilitado || opt.disabled),
      };
    });

    // Si hay placeholder y ninguna opción tiene valor vacío, agregarla al inicio
    if (placeholder && !normalizadas.some((o) => o.valor === '')) {
      return [{ valor: '', texto: placeholder, esPlaceholder: true }, ...normalizadas];
    }
    return normalizadas;
  }, [opciones, placeholder]);

  // Encontrar opción seleccionada actual
  const opcionSeleccionada = useMemo(() => {
    if (value === undefined || value === null) return null;
    return listaOpciones.find((o) => String(o.valor) === String(value)) || null;
  }, [listaOpciones, value]);

  // Determinar si activar búsqueda (explícito o si hay más de 7 opciones)
  const esBuscable = buscable !== undefined ? buscable : listaOpciones.length > 7;

  // Filtrar opciones por búsqueda
  const opcionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return listaOpciones;
    const termino = busqueda.toLowerCase().trim();
    return listaOpciones.filter(
      (o) => o.texto.toLowerCase().includes(termino) || (o.codigo && String(o.codigo).toLowerCase().includes(termino))
    );
  }, [listaOpciones, busqueda]);

  // Detectar posición para abrir hacia arriba si no hay espacio abajo
  const calcularPosicion = () => {
    if (!contenedorRef.current) return;
    const rect = contenedorRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    if (espacioAbajo < 260 && espacioArriba > espacioAbajo) {
      setAbrirHaciaArriba(true);
    } else {
      setAbrirHaciaArriba(false);
    }
  };

  const abrirDropdown = () => {
    if (disabled) return;
    calcularPosicion();
    setAbierto(true);
    setIndiceEnfocado(-1);
  };

  const cerrarDropdown = () => {
    setAbierto(false);
    setBusqueda('');
    setIndiceEnfocado(-1);
  };

  const toggleDropdown = () => {
    if (abierto) {
      cerrarDropdown();
    } else {
      abrirDropdown();
    }
  };

  // Clic fuera del componente
  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        cerrarDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('touchstart', handleClickFuera);
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('touchstart', handleClickFuera);
    };
  }, [abierto]);

  // Tecla Escape
  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarDropdown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto]);

  // Auto-foco en el input de búsqueda al abrir
  useEffect(() => {
    if (abierto && esBuscable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [abierto, esBuscable]);

  const seleccionarOpcion = (opcion) => {
    if (opcion.deshabilitado) return;
    if (onChange) {
      const eventoSintetico = {
        target: { value: opcion.valor, name: name || idCampo },
        currentTarget: { value: opcion.valor, name: name || idCampo },
        value: opcion.valor,
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(eventoSintetico, opcion.valor);
    }
    cerrarDropdown();
  };

  // Manejo de teclado en el trigger
  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirDropdown();
    }
  };

  // Manejo de teclado dentro de la lista
  const handleListKeyDown = (e) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceEnfocado((prev) => (prev < opcionesFiltradas.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceEnfocado((prev) => (prev > 0 ? prev - 1 : opcionesFiltradas.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceEnfocado >= 0 && indiceEnfocado < opcionesFiltradas.length) {
        seleccionarOpcion(opcionesFiltradas[indiceEnfocado]);
      }
    } else if (e.key === 'Tab') {
      cerrarDropdown();
    }
  };

  // Alturas por tamaño
  const alturaClase = tamano === 'sm' ? 'h-9 text-xs' : tamano === 'lg' ? 'h-11 text-base' : 'h-10 text-sm';

  const textoDisplay = opcionSeleccionada
    ? opcionSeleccionada.texto
    : placeholder;

  const esValorVacio = !opcionSeleccionada || opcionSeleccionada.valor === '';

  return (
    <div className="w-full relative" ref={contenedorRef}>
      {etiqueta && (
        <label
          htmlFor={idCampo}
          className="mb-1.5 block text-sm font-medium text-fg select-none"
        >
          {etiqueta}
          {requerido && <span className="text-danger ml-0.5 font-semibold">*</span>}
        </label>
      )}

      {/* Botón Disparador (Trigger) */}
      <button
        ref={ref}
        id={idCampo}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listboxId}
        aria-label={ariaLabel || etiqueta || placeholder}
        aria-invalid={Boolean(error) || undefined}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full ${alturaClase} rounded-lg border bg-surface px-3.5 pr-10 text-left font-medium shadow-sm transition-all flex items-center justify-between appearance-none select-none relative ${
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
            : abierto
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-line hover:border-espresso-400 dark:hover:border-espresso-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-muted/30' : 'cursor-pointer'} ${className}`}
        {...resto}
      >
        <span
          className={`truncate block ${
            esValorVacio ? 'text-fg-muted/70 font-normal' : 'text-fg font-medium'
          }`}
        >
          {textoDisplay}
        </span>

        {/* Chevron personalizado posicionado exactamente a la derecha con rotación */}
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted flex items-center">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${
              abierto ? 'rotate-180 text-primary' : ''
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Menú Flotante (Popover Dropdown) */}
      {abierto && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className={`absolute left-0 right-0 z-[60] rounded-xl border border-line bg-surface shadow-xl p-1.5 transition-all ${
            abrirHaciaArriba ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {/* Input de Búsqueda Integrada */}
          {esBuscable && (
            <div className="relative p-1 mb-1 border-b border-line/60">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setIndiceEnfocado(0);
                }}
                onKeyDown={handleListKeyDown}
                placeholder="Buscar opción…"
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-line bg-muted/40 text-fg placeholder:text-fg-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-muted hover:text-fg rounded"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Lista de Opciones con Scroll Estilizado */}
          <div className="max-h-60 overflow-y-auto scroll-fino space-y-0.5 py-0.5">
            {opcionesFiltradas.length === 0 ? (
              <div className="py-4 text-center text-xs text-fg-muted">
                No se encontraron opciones
              </div>
            ) : (
              opcionesFiltradas.map((opcion, idx) => {
                const esSeleccionada = String(opcion.valor) === String(value);
                const esEnfocada = idx === indiceEnfocado;

                return (
                  <div
                    key={`${opcion.valor}-${idx}`}
                    role="option"
                    aria-selected={esSeleccionada}
                    onClick={() => seleccionarOpcion(opcion)}
                    onMouseEnter={() => setIndiceEnfocado(idx)}
                    className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors select-none ${
                      opcion.deshabilitado
                        ? 'opacity-40 cursor-not-allowed pointer-events-none'
                        : esSeleccionada
                        ? 'bg-primary-soft text-primary-text font-semibold'
                        : esEnfocada
                        ? 'bg-espresso-100/70 dark:bg-espresso-800/70 text-fg'
                        : 'text-fg hover:bg-espresso-100/50 dark:hover:bg-espresso-800/50'
                    }`}
                  >
                    <span className="truncate block pr-2">
                      {opcion.texto}
                    </span>

                    {esSeleccionada && (
                      <Check
                        size={16}
                        className="text-primary shrink-0 ml-2"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mensajes de Error y Ayuda */}
      {error && (
        <p className="mt-1 text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
      {ayuda && !error && (
        <p className="mt-1 text-xs text-fg-muted">{ayuda}</p>
      )}
    </div>
  );
});

export default CustomSelect;
