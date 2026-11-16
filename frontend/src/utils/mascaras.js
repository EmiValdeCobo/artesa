// Máscaras de entrada: transforman lo que se escribe al formato definido y validan el resultado.
// Trabajan con strings (los importes NUMERIC nunca pasan por float) y son idempotentes:
// aplicar la máscara a un valor ya formateado devuelve el mismo valor, así que sirven para
// escribir, para cargar datos existentes en un formulario y para mostrarlos.

const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

// Teléfono salvadoreño de 8 dígitos: 2222-3333.
export const mascaraTelefono = (valor) => {
  const d = soloDigitos(valor).slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
};
// Para mostrar datos ya guardados: aplica la máscara solo si son 8 dígitos; si no, se respeta el valor histórico.
export const mostrarTelefono = (valor) => (soloDigitos(valor).length === 8 ? mascaraTelefono(valor) : String(valor ?? ''));

// DUI salvadoreño de 9 dígitos: 00000000-0.
export const mascaraDui = (valor) => {
  const d = soloDigitos(valor).slice(0, 9);
  return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
};

// NIT salvadoreño de 14 dígitos: 0000-000000-000-0.
export const mascaraNit = (valor) => {
  const d = soloDigitos(valor).slice(0, 14);
  if (d.length <= 4) return d;
  if (d.length <= 10) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length <= 13) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13)}`;
};

// Código alfanumérico en mayúsculas y largo fijo (código de establecimiento DTE: M001).
export const mascaraCodigo = (valor, largo = 4) => String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, largo);

// Código de barras / identificador: letras, números y guion, sin espacios.
export const mascaraIdentificador = (valor, largo = 50) => String(valor ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, largo);

// Entero no negativo (cantidades físicas, factores, días).
export const mascaraEntero = (valor, largo = 10) => soloDigitos(valor).replace(/^0+(?=\d)/, '').slice(0, largo);

// Monto o decimal: dígitos con un solo punto y hasta `decimales` cifras ("12.5" → "12.5"; "1,25" → "1.25").
export const mascaraDecimal = (valor, decimales = 2, enteros = 10) => {
  const limpio = String(valor ?? '').replace(',', '.').replace(/[^\d.]/g, '');
  const [ent = '', ...resto] = limpio.split('.');
  const parteEntera = ent.replace(/^0+(?=\d)/, '').slice(0, enteros);
  if (!resto.length || decimales === 0) return parteEntera;
  return `${parteEntera || '0'}.${resto.join('').slice(0, decimales)}`;
};

// Completa un monto a sus decimales fijos para guardar/mostrar ("12.5" → "12.50"); sin float.
export const completarDecimales = (valor, decimales = 2) => {
  const v = mascaraDecimal(valor, decimales);
  if (!v) return '';
  const [ent, dec = ''] = v.split('.');
  return decimales ? `${ent || '0'}.${dec.padEnd(decimales, '0')}` : ent;
};

export const PATRONES = {
  telefono: /^\d{4}-\d{4}$/,
  codigo: /^[A-Z0-9]{4}$/,
  dui: /^\d{8}-\d$/,
  nit: /^\d{4}-\d{6}-\d{3}-\d$/,
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  entero: /^\d+$/,
  monto: /^\d+(\.\d{1,2})?$/,
  fecha: /^\d{4}-\d{2}-\d{2}$/,
};

// Devuelve un mensaje en español si el valor no cumple la máscara; '' si es válido o está vacío (no requerido).
export function validarMascara(tipo, valor, { requerido = false } = {}) {
  const v = String(valor ?? '').trim();
  if (!v) return requerido ? 'Este campo es obligatorio.' : '';
  const mensajes = {
    telefono: 'El teléfono debe tener 8 dígitos con formato 2222-3333.',
    codigo: 'El código debe tener 4 letras o números, por ejemplo M001.',
    dui: 'El DUI debe tener 9 dígitos con formato 00000000-0.',
    nit: 'El NIT debe tener 14 dígitos con formato 0000-000000-000-0.',
    correo: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    entero: 'Escribe un número entero sin decimales.',
    monto: 'Escribe un monto con hasta 2 decimales, por ejemplo 2.50.',
    fecha: 'Escribe una fecha válida (AAAA-MM-DD).',
  };
  return PATRONES[tipo]?.test(v) ? '' : mensajes[tipo] ?? 'Formato no válido.';
}

// Máscara + atributos de teclado para un tipo de campo: <input {...propsMascara('telefono')} />.
const CONFIG = {
  telefono: { aplicar: mascaraTelefono, inputMode: 'tel', placeholder: '2222-3333', maxLength: 9, autoComplete: 'tel' },
  codigo: { aplicar: (v) => mascaraCodigo(v), inputMode: 'text', placeholder: 'M001', maxLength: 4, autoCapitalize: 'characters' },
  identificador: { aplicar: (v) => mascaraIdentificador(v), inputMode: 'text', autoCapitalize: 'characters', spellCheck: false },
  dui: { aplicar: mascaraDui, inputMode: 'numeric', placeholder: '00000000-0', maxLength: 10 },
  nit: { aplicar: mascaraNit, inputMode: 'numeric', placeholder: '0000-000000-000-0', maxLength: 17 },
  entero: { aplicar: (v) => mascaraEntero(v), inputMode: 'numeric', placeholder: '0' },
  monto: { aplicar: (v) => mascaraDecimal(v, 2), inputMode: 'decimal', placeholder: '0.00' },
};
export const aplicarMascara = (tipo, valor) => (CONFIG[tipo]?.aplicar ?? String)(valor ?? '');
export function propsMascara(tipo) {
  const { aplicar: _aplicar, ...atributos } = CONFIG[tipo] ?? {};
  return { type: 'text', ...atributos };
}
