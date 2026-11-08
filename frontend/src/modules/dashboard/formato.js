// Formato solo para MOSTRAR. Los importes llegan como string NUMERIC y el servidor ya los sumó:
// aquí nunca se suman ni se comparan importes.
const moneda = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const moneda0 = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const entero = new Intl.NumberFormat('es-SV');

export const formatoDinero = (valor) => moneda.format(valor ?? 0);
export const formatoDineroCorto = (valor) => moneda0.format(valor ?? 0);
export const formatoEntero = (valor) => entero.format(valor ?? 0);

// 'YYYY-MM-DD' → Date local sin desfase de zona horaria.
export const fechaLocal = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
export const etiquetaDia = (iso) => fechaLocal(iso).toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric' }).replace('.', '');
export const etiquetaDiaLarga = (iso) => fechaLocal(iso).toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });
export const horaDe = (isoInstante) => new Date(isoInstante).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
