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

// NRC salvadoreño (proveedores): 6 dígitos + dígito verificador, 123456-7 (8 caracteres con guion).
export const mascaraNrc = (valor) => {
  const d = soloDigitos(valor).slice(0, 7);
  return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
};

// Referencia de pago (autorización de tarjeta, transferencia o Chivo): solo dígitos, máximo 12.
export const mascaraReferenciaPago = (valor) => soloDigitos(valor).slice(0, 12);

// Comprobante de pago no en efectivo: se guarda en pos.pagos.referencia y el formato depende del método.
// Debe coincidir con REFERENCIA_POR_METODO de backend/src/modules/pos/ventas/ventas.schemas.js.
export const REFERENCIAS_PAGO = {
  TARJETA: {
    etiqueta: 'N.º de autorización del voucher',
    placeholder: '123456',
    inputMode: 'numeric',
    maxLength: 12,
    patron: /^\d{6,12}$/,
    mensaje: 'La autorización de tarjeta debe tener de 6 a 12 dígitos.',
    aplicar: (v) => soloDigitos(v).slice(0, 12),
  },
  TRANSFERENCIA: {
    etiqueta: 'N.º de referencia de la transferencia',
    placeholder: 'TRX20261119001',
    inputMode: 'text',
    maxLength: 30,
    patron: /^[A-Z0-9-]{6,30}$/,
    mensaje: 'La referencia bancaria debe tener de 6 a 30 letras o números.',
    aplicar: (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30),
  },
  BITCOIN_CHIVO: {
    etiqueta: 'ID de transacción (Chivo Wallet / hash Lightning)',
    placeholder: 'a1b2c3d4…',
    inputMode: 'text',
    maxLength: 100,
    patron: /^[A-Za-z0-9]{8,100}$/,
    mensaje: 'El ID de transacción Bitcoin/Chivo debe tener de 8 a 100 letras o números.',
    aplicar: (v) => String(v ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 100),
  },
};

// '' si la referencia es válida para el método; mensaje en español si falta o no cumple el formato.
export function validarReferenciaPago(metodo, valor) {
  const cfg = REFERENCIAS_PAGO[metodo];
  if (!cfg) return '';
  const v = String(valor ?? '').trim();
  if (!v) return `Falta el comprobante: ${cfg.etiqueta.toLowerCase()}.`;
  return cfg.patron.test(v) ? '' : cfg.mensaje;
}

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
  nrc: /^\d{6}-\d$/,
  referenciaPago: /^\d{1,12}$/,
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
    nrc: 'El NRC debe tener 7 dígitos con formato 123456-7.',
    referenciaPago: 'La referencia debe tener solo números (máximo 12).',
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
  nrc: { aplicar: mascaraNrc, inputMode: 'numeric', placeholder: '123456-7', maxLength: 8 },
  referenciaPago: { aplicar: mascaraReferenciaPago, inputMode: 'numeric', placeholder: 'N.º de autorización', maxLength: 12, autoComplete: 'off' },
  entero: { aplicar: (v) => mascaraEntero(v), inputMode: 'numeric', placeholder: '0' },
  monto: { aplicar: (v) => mascaraDecimal(v, 2), inputMode: 'decimal', placeholder: '0.00' },
};
export const aplicarMascara = (tipo, valor) => (CONFIG[tipo]?.aplicar ?? String)(valor ?? '');
export function propsMascara(tipo) {
  const { aplicar: _aplicar, ...atributos } = CONFIG[tipo] ?? {};
  return { type: 'text', ...atributos };
}

// ── Dinero ──────────────────────────────────────────────────────────────────
// Convierte un monto ya enmascarado ("12.5") a centavos BigInt (1250n) para comparar sin float.
export const montoACentavos = (valor) => {
  const v = mascaraDecimal(valor, 2);
  if (!v) return 0n;
  const [ent = '0', dec = ''] = v.split('.');
  return BigInt(ent || '0') * 100n + BigInt(dec.padEnd(2, '0'));
};

// Máscara de moneda: solo dígitos y un punto, máximo 2 decimales, sin signo negativo.
// Si el resultado supera `maximo` (string "10000.00"), devuelve null para que el campo conserve el valor previo.
export const mascaraMoneda = (valor, maximo = null) => {
  const v = mascaraDecimal(valor, 2, 8);
  if (maximo && v && montoACentavos(v) > montoACentavos(maximo)) return null;
  return v;
};
