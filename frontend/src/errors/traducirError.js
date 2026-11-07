import { ENTRADAS, PATRONES, POR_STATUS, traducirMensajeCampo } from './catalogo.js';
import { registrarError } from './registro.js';
import { ErrorApi } from './ErrorApi.js';

// Traduce CUALQUIER error (ErrorApi, Error, string, undefined…) a un `ErrorUsuario`:
//
//   { id, clave, categoria, canal, titulo, mensaje, accion, mensajeCompleto,
//     reintentable, status, campos }
//
// Los componentes SOLO consumen este objeto; nunca el formato crudo del backend.
// Es una función pura salvo por el registro en consola de errores inesperados.

const ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const RUTA_LOGIN = /\/auth\/(cliente\/)?login$/;

const sinConexion = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function resolver(error) {
  if (error.codigo && ENTRADAS[error.codigo]) return { id: error.codigo };
  if (error.tipoFallo === 'timeout') return { id: ESCRITURA.has(error.metodo) ? 'TIMEOUT_ESCRITURA' : 'TIMEOUT' };
  if (error.tipoFallo === 'red') return { id: sinConexion() ? 'SIN_INTERNET' : 'RED' };
  // En el login un 401 significa credenciales incorrectas, no sesión vencida.
  if (error.status === 401 && RUTA_LOGIN.test(error.endpoint || '')) return { id: 'CREDENCIALES' };

  const texto = error.mensajeServidor || '';
  for (const patron of PATRONES) {
    const m = texto.match(patron.regex);
    if (m) return { id: patron.id, m, plantilla: patron.plantilla };
  }
  if (error.detalles?.length) return { id: 'VALIDACION' };
  return { id: POR_STATUS(error.status) };
}

function camposDe(id, entrada, error) {
  const campos = {};
  if (entrada.campo) campos[entrada.campo] = entrada.mensajeCampo || entrada.accion;
  if (id === 'VALIDACION' && Array.isArray(error.detalles)) {
    for (const { campo = '', mensaje } of error.detalles) {
      const nombre = String(campo).split('.')[0] || '_';
      if (!campos[nombre]) campos[nombre] = traducirMensajeCampo(nombre, mensaje);
    }
  }
  return campos;
}

export function traducirError(error) {
  if (error?.esErrorUsuario) return error;   // ya es un ErrorUsuario (idempotente)
  if (error?.usuario) return error.usuario;  // ErrorApi ya traducido por client.js

  const esApi = error?.name === 'ErrorApi';
  if (!esApi) registrarError(error instanceof Error ? error : new Error(String(error)), { origen: 'no-api' });

  const { id, m, plantilla } = esApi ? resolver(error) : { id: 'DESCONOCIDO' };
  const base = ENTRADAS[id];
  const dinamico = (plantilla || base.plantilla)?.(m) || {};
  const { plantilla: _omitida, ...entrada } = { ...base, ...dinamico };

  const campos = esApi ? camposDe(id, entrada, error) : {};
  const nCampos = Object.keys(campos).length;
  // Validación: si el backend no dijo qué campos, el mensaje es general y va como banner.
  const canal = id === 'VALIDACION' && !nCampos ? 'banner' : entrada.canal;

  return {
    esErrorUsuario: true,
    id,
    clave: id,                      // sirve para no duplicar avisos idénticos
    ...entrada,
    canal,
    status: esApi ? error.status : 0,
    campos,
    mensajeCompleto: `${entrada.mensaje} ${entrada.accion}`.trim(),
  };
}

// Atajo para los lugares que solo necesitan un texto (por ejemplo `setError`).
export const mensajeDeError = (error) => traducirError(error).mensajeCompleto;

// Atajo: ¿el error es del tipo que se corrige con datos (no del sistema)?
export const esErrorDeUsuario = (error) => traducirError(error).categoria === 'usuario';

// Construye un ErrorUsuario a partir de una clave del catálogo (por ejemplo, 'SESION_EXPIRADA').
export const errorUsuarioDeId = (id) => traducirError(new ErrorApi({ codigo: id }));
