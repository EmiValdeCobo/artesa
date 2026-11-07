import { ErrorApi } from '../errors/ErrorApi.js';
import { traducirError } from '../errors/traducirError.js';
import { registrarError } from '../errors/registro.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TIMEOUT_MS = 20000;

// Evento global que avisa que la sesión venció a mitad de uso (lo escuchan AuthContext y las notificaciones).
export const EVENTO_SESION_EXPIRADA = 'artesa:sesion-expirada';
// En estas rutas un 401 es esperado (credenciales, arranque sin sesión, cierre de sesión): no es "sesión vencida".
const RUTAS_401_ESPERADO = /\/auth\/(cliente\/)?(login|me|logout)$/;

// Convierte el fallo en un ErrorApi: su `message` ya es el texto para el usuario, y el detalle
// técnico (estado, endpoint, texto crudo del servidor) va al registro, nunca a la pantalla.
function construirError(datos) {
  const error = new ErrorApi(datos);
  error.usuario = traducirError(error);
  error.message = error.usuario.mensajeCompleto;

  const esperado = error.status === 401 && RUTAS_401_ESPERADO.test(error.endpoint);
  if (!esperado) registrarError(error);
  if (error.usuario.id === 'SESION_EXPIRADA' && !esperado && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
  }
  return error;
}

async function request(endpoint, options = {}) {
  const { timeout = TIMEOUT_MS, signal: senalExterna, ...resto } = options;
  const metodo = (resto.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...resto.headers,
  };

  // Tiempo máximo de espera, combinado con una posible cancelación pedida por quien llama.
  const controlador = new AbortController();
  let vencido = false;
  const temporizador = setTimeout(() => { vencido = true; controlador.abort(); }, timeout);
  const cancelar = () => controlador.abort();
  senalExterna?.addEventListener('abort', cancelar, { once: true });

  let response;
  let data = null;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...resto,
      headers,
      credentials: 'include',
      signal: controlador.signal,
    });
    data = await response.json().catch(() => null);
  } catch (causa) {
    if (senalExterna?.aborted) throw causa; // cancelación voluntaria: no es un error que mostrar
    throw construirError({ endpoint, metodo, tipoFallo: vencido ? 'timeout' : 'red', causa });
  } finally {
    clearTimeout(temporizador);
    senalExterna?.removeEventListener('abort', cancelar);
  }
  if (vencido) throw construirError({ endpoint, metodo, tipoFallo: 'timeout' });

  if (!response.ok) {
    // Texto crudo del backend: solo sirve para traducir y para el registro. No se muestra.
    const mensajeServidor = (typeof data?.error === 'string' ? data.error : data?.error?.message)
      || data?.message || '';
    throw construirError({
      endpoint,
      metodo,
      status: response.status,
      mensajeServidor,
      codigo: typeof data?.codigo === 'string' ? data.codigo : null,
      detalles: Array.isArray(data?.detalles) ? data.detalles : [],
    });
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
