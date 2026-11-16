import { useState, useEffect, useLayoutEffect, useRef, useId, useMemo, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

const ALTO_MENU = 280; // alto máximo aproximado del menú (búsqueda + lista) para decidir si abre hacia arriba

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
    vacio = 'No hay opciones disponibles',
    'aria-label': ariaLabel,
    ...resto
  },
  ref
) {
  const autoId = useId();
  const idCampo = id || autoId;
  const listboxId = `${idCampo}-listbox`;
  const idOpcion = (idx) => `${idCampo}-opcion-${idx}`;
  const contenedorRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listaRef = useRef(null);
  const searchInputRef = useRef(null);

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [posicion, setPosicion] = useState(null);
  const [indiceEnfocado, setIndiceEnfocado] = useState(-1);

  const asignarRef = (nodo) => {
    triggerRef.current = nodo;
    if (typeof ref === 'function') ref(nodo);
    else if (ref) ref.current = nodo;
  };

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
        valor: String(valor ?? ''),
        texto: String(texto),
        deshabilitado: Boolean(opt.deshabilitado || opt.disabled),
      };
    });

    // Con placeholder y opciones reales, se ofrece una opción vacía al inicio para poder limpiar el filtro/valor.
    if (placeholder && normalizadas.length && !normalizadas.some((o) => o.valor === '')) {
      return [{ valor: '', texto: placeholder, esPlaceholder: true }, ...normalizadas];
    }
    return normalizadas;
  }, [opciones, placeholder]);

  const valorActual = value === undefined || value === null ? '' : String(value);
  const opcionSeleccionada = useMemo(() => listaOpciones.find((o) => o.valor === valorActual) || null, [listaOpciones, valorActual]);

  // Determinar si activar búsqueda (explícito o si hay más de 7 opciones)
  const esBuscable = buscable !== undefined ? buscable : listaOpciones.length > 7;

  const opcionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return listaOpciones;
    const termino = busqueda.toLowerCase().trim();
    return listaOpciones.filter(
      (o) => !o.esPlaceholder && (o.texto.toLowerCase().includes(termino) || (o.codigo && String(o.codigo).toLowerCase().includes(termino)))
    );
  }, [listaOpciones, busqueda]);

  // El menú se pinta en un portal con posición fija: así no lo recortan tablas, tarjetas ni diálogos con overflow.
  const calcularPosicion = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const haciaArriba = espacioAbajo < ALTO_MENU && rect.top > espacioAbajo;
    setPosicion({
      left: rect.left,
      width: rect.width,
      ...(haciaArriba ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }, []);

  const cerrarDropdown = useCallback((devolverFoco = false) => {
    setAbierto(false);
    setBusqueda('');
    setIndiceEnfocado(-1);
    if (devolverFoco) triggerRef.current?.focus();
  }, []);

  const abrirDropdown = () => {
    if (disabled) return;
    calcularPosicion();
    setAbierto(true);
    const seleccion = listaOpciones.findIndex((o) => o.valor === valorActual);
    setIndiceEnfocado(seleccion >= 0 ? seleccion : listaOpciones.findIndex((o) => !o.deshabilitado));
  };

  const toggleDropdown = () => (abierto ? cerrarDropdown() : abrirDropdown());

  // Clic fuera (del botón y del menú en el portal)
  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e) => {
      if (contenedorRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      cerrarDropdown();
    };
    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('touchstart', handleClickFuera);
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('touchstart', handleClickFuera);
    };
  }, [abierto, cerrarDropdown]);

  // Reposicionar al desplazar o redimensionar (incluye el scroll interno de diálogos y tablas)
  useEffect(() => {
    if (!abierto) return;
    const alMover = (e) => { if (!menuRef.current?.contains(e.target)) calcularPosicion(); };
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', calcularPosicion);
    return () => {
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', calcularPosicion);
    };
  }, [abierto, calcularPosicion]);

  // Auto-foco en el input de búsqueda al abrir
  useEffect(() => {
    if (abierto && esBuscable) searchInputRef.current?.focus();
  }, [abierto, esBuscable]);

  // Mantener visible la opción activa al navegar con el teclado
  useLayoutEffect(() => {
    if (!abierto || indiceEnfocado < 0) return;
    listaRef.current?.querySelector(`#${CSS.escape(idOpcion(indiceEnfocado))}`)?.scrollIntoView({ block: 'nearest' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, indiceEnfocado]);

  const seleccionarOpcion = (opcion) => {
    if (!opcion || opcion.deshabilitado) return;
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
    cerrarDropdown(true);
  };

  const mover = (paso) => {
    const total = opcionesFiltradas.length;
    if (!total) return;
    setIndiceEnfocado((prev) => {
      let siguiente = prev;
      for (let i = 0; i < total; i += 1) {
        siguiente = (siguiente + paso + total) % total;
        if (!opcionesFiltradas[siguiente].deshabilitado) return siguiente;
      }
      return prev;
    });
  };

  // Un solo manejador de teclado para el botón, la búsqueda y la lista.
  // Escape se detiene aquí para no cerrar también el diálogo que contiene al combobox.
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrirDropdown();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cerrarDropdown(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      mover(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      mover(-1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setIndiceEnfocado(e.key === 'Home' ? 0 : opcionesFiltradas.length - 1);
    } else if (e.key === 'Enter' || (e.key === ' ' && e.target === triggerRef.current)) {
      e.preventDefault();
      seleccionarOpcion(opcionesFiltradas[indiceEnfocado]);
    } else if (e.key === 'Tab') {
      if (e.target !== triggerRef.current) { e.preventDefault(); cerrarDropdown(true); } else cerrarDropdown();
    }
  };

  // Alturas por tamaño
  const alturaClase = tamano === 'sm' ? 'h-9 text-xs' : tamano === 'lg' ? 'h-11 text-base' : 'h-10 text-sm';
  const esValorVacio = !opcionSeleccionada || opcionSeleccionada.valor === '';
  const textoDisplay = esValorVacio ? (placeholder || 'Seleccionar…') : opcionSeleccionada.texto;
  const sinOpciones = !listaOpciones.some((o) => !o.esPlaceholder);

  const menu = abierto && posicion && createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: posicion.left, width: posicion.width, top: posicion.top, bottom: posicion.bottom }}
      className="z-[70] min-w-40 rounded-xl border border-line bg-surface p-1.5 shadow-xl"
      onKeyDown={handleKeyDown}
    >
      {esBuscable && (
        <div className="relative mb-1 border-b border-line/60 p-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            role="searchbox"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setIndiceEnfocado(0);
            }}
            aria-controls={listboxId}
            aria-activedescendant={indiceEnfocado >= 0 ? idOpcion(indiceEnfocado) : undefined}
            aria-label={`Buscar en ${ariaLabel || etiqueta || 'opciones'}`}
            placeholder="Buscar opción…"
            className="h-8 w-full rounded-lg border border-line bg-muted/40 pl-8 pr-7 text-xs text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => { setBusqueda(''); searchInputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-muted hover:text-fg"
              aria-label="Limpiar búsqueda"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div ref={listaRef} id={listboxId} role="listbox" aria-label={ariaLabel || etiqueta || placeholder} className="scroll-fino max-h-60 space-y-0.5 overflow-y-auto py-0.5">
        {opcionesFiltradas.length === 0 ? (
          <div role="presentation" className="py-4 text-center text-xs text-fg-muted">
            {busqueda.trim() ? 'No se encontraron opciones' : vacio}
          </div>
        ) : (
          opcionesFiltradas.map((opcion, idx) => {
            const esSeleccionada = opcion.valor === valorActual;
            const esEnfocada = idx === indiceEnfocado;
            return (
              <div
                key={`${opcion.valor}-${idx}`}
                id={idOpcion(idx)}
                role="option"
                aria-selected={esSeleccionada}
                aria-disabled={opcion.deshabilitado || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionarOpcion(opcion)}
                onMouseEnter={() => setIndiceEnfocado(idx)}
                className={`flex cursor-pointer select-none items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  opcion.deshabilitado
                    ? 'pointer-events-none cursor-not-allowed opacity-40'
                    : esSeleccionada
                    ? 'bg-primary-soft font-semibold text-primary-text'
                    : esEnfocada
                    ? 'bg-espresso-100/70 text-fg dark:bg-espresso-800/70'
                    : 'text-fg hover:bg-espresso-100/50 dark:hover:bg-espresso-800/50'
                } ${opcion.esPlaceholder && !esSeleccionada ? 'text-fg-muted' : ''} ${esEnfocada && esSeleccionada ? 'ring-1 ring-primary/40' : ''}`}
              >
                <span className="block truncate pr-2">{opcion.texto}</span>
                {esSeleccionada && <Check size={16} className="ml-2 shrink-0 text-primary" aria-hidden="true" />}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );

  return (
    <div className="relative w-full" ref={contenedorRef}>
      {etiqueta && (
        <label htmlFor={idCampo} className="mb-1.5 block select-none text-sm font-medium text-fg">
          {etiqueta}
          {requerido && <span className="ml-0.5 font-semibold text-danger">*</span>}
        </label>
      )}

      {/* Botón disparador (trigger) */}
      <button
        ref={asignarRef}
        id={idCampo}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? listboxId : undefined}
        aria-activedescendant={abierto && !esBuscable && indiceEnfocado >= 0 ? idOpcion(indiceEnfocado) : undefined}
        aria-label={ariaLabel || undefined}
        aria-required={requerido || undefined}
        aria-invalid={Boolean(error) || undefined}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`relative flex w-full ${alturaClase} select-none appearance-none items-center justify-between rounded-md border bg-surface px-3 pr-10 text-left font-medium transition-colors ${
          error
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
            : abierto
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-line hover:border-espresso-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:hover:border-espresso-600'
        } ${disabled ? 'cursor-not-allowed bg-muted/30 opacity-60' : 'cursor-pointer'} ${className}`}
        {...resto}
      >
        <span className={`block min-w-0 truncate ${esValorVacio ? 'font-normal text-fg-muted' : 'font-medium text-fg'}`}>
          {sinOpciones && esValorVacio ? vacio : textoDisplay}
        </span>
        <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-fg-muted">
          <ChevronDown size={18} className={`transition-transform duration-200 ${abierto ? 'rotate-180 text-primary' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {/* Campo oculto para formularios nativos (FormData / name) */}
      {name && <input type="hidden" name={name} value={valorActual} />}

      {menu}

      {error && (
        <p className="mt-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      {ayuda && !error && <p className="mt-1 text-xs text-fg-muted">{ayuda}</p>}
    </div>
  );
});

export default CustomSelect;
