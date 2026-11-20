import { forwardRef } from 'react';
import { completarDecimales, mascaraMoneda } from '../../utils/mascaras.js';

// Campo de dinero común (USD): bloquea letras, signos y más de 2 decimales al escribir y al pegar,
// no permite superar `maximo` y completa a 2 decimales al perder el foco ("5" → "5.00").
// El valor viaja como string (NUMERIC en PostgreSQL): nunca se convierte a float.
//
//   <InputMoneda id="fondo" valor={monto} onValor={setMonto} maximo="10000.00" />
const InputMoneda = forwardRef(function InputMoneda(
  { valor, onValor, maximo = null, vacioEsCero = false, className = '', onBlur, ...resto },
  ref,
) {
  const cambiar = (e) => {
    const limpio = mascaraMoneda(e.target.value, maximo);
    if (limpio !== null) onValor(limpio); // sobre el máximo: se ignora la tecla o el pegado
  };

  const salir = (e) => {
    const completo = completarDecimales(valor);
    onValor(completo || (vacioEsCero ? '0.00' : ''));
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0.00"
      maxLength={11}
      {...resto}
      value={valor}
      onChange={cambiar}
      onBlur={salir}
      className={`input text-right tabular-nums ${className}`}
    />
  );
});

export default InputMoneda;
