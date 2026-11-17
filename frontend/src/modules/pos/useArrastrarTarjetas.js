// frontend/src/modules/pos/useArrastrarTarjetas.js
// Hook de React para arrastre y soltado (DnD) basado en Pointer Events nativos.
// Funciona con mouse, lápiz y pantallas táctiles (tablets/monitores de cocina).

import { useState, useRef, useCallback, useEffect } from 'react';
import { esMovimientoValido } from './preparacionDnd.js';

/**
 * @param {object} params
 * @param {(orden: object, destino: string) => void} params.onSoltarValido
 * @param {(orden: object, destino: string | null) => void} params.onSoltarInvalido
 * @param {Set<number>} params.enProgreso Set de IDs con operación en curso
 */
export function useArrastrarTarjetas({ onSoltarValido, onSoltarInvalido, enProgreso }) {
  const [arrastre, setArrastre] = useState({
    activo: false,
    orden: null,
    posicion: { x: 0, y: 0 },
    dimensiones: { ancho: 0, alto: 0 },
    columnaSobre: null,
    esValido: false,
    regresandoId: null,
  });

  const estadoRef = useRef(arrastre);
  estadoRef.current = arrastre;

  const dragInfoRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    iniciado: false,
    orden: null,
  });

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('select-none');
    };
  }, []);

  /**
   * Determina la zona de soltado válida en las coordenadas (clientX, clientY).
   */
  const detectarZonaDrop = useCallback((clientX, clientY, ordenActual) => {
    if (!ordenActual) return { columna: null, esValido: false };

    // Buscar elementos con data-zona-drop en el punto del cursor
    const elementosBajoPuntero = document.elementsFromPoint(clientX, clientY);
    let zonaEncontrada = null;

    for (const el of elementosBajoPuntero) {
      const dropAttr = el.getAttribute('data-zona-drop');
      if (dropAttr) {
        zonaEncontrada = dropAttr;
        break;
      }
    }

    if (!zonaEncontrada) {
      return { columna: null, esValido: false };
    }

    const valido = esMovimientoValido(ordenActual.estado, zonaEncontrada);
    return { columna: zonaEncontrada, esValido: valido };
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const info = dragInfoRef.current;
      if (info.pointerId === null || e.pointerId !== info.pointerId) return;

      const deltaX = Math.abs(e.clientX - info.startX);
      const deltaY = Math.abs(e.clientY - info.startY);

      // Umbral mínimo de 5px para distinguir un click accidental de un arrastre intencionado
      if (!info.iniciado && deltaX < 5 && deltaY < 5) {
        return;
      }

      if (!info.iniciado) {
        info.iniciado = true;
        document.body.classList.add('select-none');
      }

      const { columna, esValido } = detectarZonaDrop(e.clientX, e.clientY, info.orden);

      // Actualizar cursor del body
      if (columna) {
        document.body.style.cursor = esValido ? 'grabbing' : 'not-allowed';
      } else {
        document.body.style.cursor = 'grabbing';
      }

      setArrastre({
        activo: true,
        orden: info.orden,
        posicion: {
          x: e.clientX - info.offsetX,
          y: e.clientY - info.offsetY,
        },
        dimensiones: {
          ancho: info.ancho,
          alto: info.alto,
        },
        columnaSobre: columna,
        esValido,
        regresandoId: null,
      });
    },
    [detectarZonaDrop],
  );

  const finalizarArrastre = useCallback(
    (e) => {
      const info = dragInfoRef.current;
      if (info.pointerId === null || e.pointerId !== info.pointerId) return;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finalizarArrastre);
      window.removeEventListener('pointercancel', finalizarArrastre);

      document.body.style.cursor = '';
      document.body.classList.remove('select-none');

      const fueArrastre = info.iniciado;
      const orden = info.orden;
      const { columna, esValido } = detectarZonaDrop(e.clientX, e.clientY, orden);

      info.pointerId = null;
      info.iniciado = false;
      info.orden = null;

      if (fueArrastre && orden) {
        if (columna && esValido) {
          setArrastre({
            activo: false,
            orden: null,
            posicion: { x: 0, y: 0 },
            dimensiones: { ancho: 0, alto: 0 },
            columnaSobre: null,
            esValido: false,
            regresandoId: null,
          });
          onSoltarValido(orden, columna);
        } else {
          // Movimiento inválido o soltado fuera de columna
          setArrastre({
            activo: false,
            orden: null,
            posicion: { x: 0, y: 0 },
            dimensiones: { ancho: 0, alto: 0 },
            columnaSobre: null,
            esValido: false,
            regresandoId: orden.id_orden,
          });
          onSoltarInvalido(orden, columna);

          // Limpiar animación de regreso
          setTimeout(() => {
            setArrastre((prev) => (prev.regresandoId === orden.id_orden ? { ...prev, regresandoId: null } : prev));
          }, 350);
        }
      } else {
        setArrastre({
          activo: false,
          orden: null,
          posicion: { x: 0, y: 0 },
          dimensiones: { ancho: 0, alto: 0 },
          columnaSobre: null,
          esValido: false,
          regresandoId: null,
        });
      }
    },
    [detectarZonaDrop, onPointerMove, onSoltarInvalido, onSoltarValido],
  );

  /**
   * Inicia la captura del puntero al presionar sobre la tarjeta.
   */
  const iniciarArrastre = useCallback(
    (e, orden) => {
      // Solo botón primario (izquierdo o toque simple)
      if (e.button !== 0) return;

      // No arrastrar si la orden está en sincronización/progreso
      if (enProgreso.has(orden.id_orden)) return;

      // No iniciar arrastre si se hizo clic en un botón o control interactivo
      if (e.target.closest('button, a, input, select, textarea')) return;

      // En móviles (< 768px), deshabilitar arrastre para evitar conflicto con scroll vertical
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;

      const tarjetaElemento = e.currentTarget;
      const rect = tarjetaElemento.getBoundingClientRect();

      dragInfoRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        ancho: rect.width,
        alto: rect.height,
        iniciado: false,
        orden,
      };

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', finalizarArrastre);
      window.addEventListener('pointercancel', finalizarArrastre);
    },
    [enProgreso, finalizarArrastre, onPointerMove],
  );

  return {
    arrastre,
    iniciarArrastre,
  };
}
