import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Tooltip de acciones: portal para escapar de overflow y soporte mouse/teclado.
export default function AccionConTooltip({ texto, children, retraso = 300 }) {
  const id = useId();
  const boton = useRef(null);
  const temporizador = useRef(null);
  const [visible, setVisible] = useState(false);
  const [posicion, setPosicion] = useState({ x: 0, y: 0, debajo: false });

  const mostrar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      const rect = boton.current?.getBoundingClientRect();
      if (!rect) return;
      const debajo = rect.top < 48;
      const centroSeguro = Math.max(152, Math.min(rect.left + rect.width / 2, window.innerWidth - 152));
      setPosicion({ x: centroSeguro, y: debajo ? rect.bottom + 8 : rect.top, debajo });
      setVisible(true);
    }, retraso);
  };
  const ocultar = () => {
    clearTimeout(temporizador.current);
    setVisible(false);
  };

  useEffect(() => {
    const cerrar = () => setVisible(false);
    window.addEventListener('resize', cerrar);
    window.addEventListener('scroll', cerrar, true);
    return () => {
      clearTimeout(temporizador.current);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('scroll', cerrar, true);
    };
  }, []);

  const accion = cloneElement(children, {
    ref: boton,
    title: undefined,
    'aria-describedby': visible ? id : undefined,
    onMouseEnter: mostrar,
    onMouseLeave: ocultar,
    onFocus: mostrar,
    onBlur: ocultar,
    onKeyDown: (evento) => {
      children.props.onKeyDown?.(evento);
      if (evento.key === 'Escape') ocultar();
    },
  });

  return <>
    {accion}
    {visible && createPortal(
      <span id={id} role="tooltip" className="accion-tooltip" style={{ left: posicion.x, top: posicion.y, transform: posicion.debajo ? 'translate(-50%, .5rem)' : undefined }}>
        {texto}
      </span>,
      document.body,
    )}
  </>;
}
