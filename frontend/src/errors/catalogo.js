// Catálogo central de mensajes de error para el usuario.
//
// Cada entrada responde a tres preguntas, en lenguaje claro y sin detalles internos:
//   titulo   → QUÉ pasó (corto)
//   mensaje  → POR QUÉ pasó (la causa, en términos del usuario)
//   accion   → QUÉ hacer ahora (paso concreto)
//
// categoria: 'usuario' = lo puede corregir quien usa la app (datos, permisos, sesión…)
//            'sistema' = falla del sistema/red; se muestra neutro y se ofrece reintentar/soporte
// canal:     dónde se muestra por defecto (ver docs/errores-frontend.md)
//            'campo'  → junto al campo del formulario (+ resumen)
//            'banner' → mensaje en línea dentro de la pantalla/formulario
//            'toast'  → aviso no bloqueante
//            'modal'  → diálogo bloqueante (solo cuando hay que detenerse a leer)

const usuario = (titulo, mensaje, accion, extra = {}) => ({
  categoria: 'usuario', canal: 'toast', reintentable: false, titulo, mensaje, accion, ...extra,
});
const sistema = (titulo, mensaje, accion, extra = {}) => ({
  categoria: 'sistema', canal: 'toast', reintentable: true, titulo, mensaje, accion, ...extra,
});

const SOPORTE = 'Si el problema continúa, contacta a soporte.';

export const ENTRADAS = {
  // ── Sesión y permisos ────────────────────────────────────────────────────────
  CREDENCIALES: usuario('No pudimos iniciar sesión', 'El usuario o la contraseña no coinciden.', 'Revísalos e inténtalo de nuevo.', { canal: 'banner' }),
  SESION_EXPIRADA: usuario('Tu sesión terminó', 'Por seguridad, tu sesión ya no está activa.', 'Inicia sesión de nuevo para continuar.'),
  PORTAL_INCORRECTO: usuario('Portal equivocado', 'Esta sesión pertenece a otro portal de artesa.', 'Cierra sesión e ingresa desde el portal que te corresponde.'),
  SIN_PERMISO: usuario('No tienes permiso', 'Tu rol no incluye esta acción.', 'Si la necesitas, pídele acceso a un administrador.'),
  AUTOPROTECCION: usuario('Acción no permitida', 'No puedes realizar esta acción sobre tu propia cuenta mientras la estás usando.', 'Pídele a otro administrador que la haga.'),
  DEMASIADAS_SOLICITUDES: usuario('Demasiados intentos', 'Se hicieron muchas solicitudes seguidas y el acceso se bloqueó un momento.', 'Espera unos minutos antes de volver a intentarlo.', { canal: 'banner' }),

  // ── Usuarios y roles ────────────────────────────────────────────────────────
  USERNAME_DUPLICADO: usuario('Nombre de usuario en uso', 'Ese nombre de usuario ya está registrado.', 'Elige otro nombre de usuario.', { canal: 'campo', campo: 'username', mensajeCampo: 'Ese nombre de usuario ya está en uso. Elige otro.' }),
  ROL_NO_DISPONIBLE: usuario('Rol no disponible', 'El rol elegido ya no existe o fue desactivado.', 'Actualiza la lista y selecciona otro rol.', { canal: 'campo', campo: 'idRol', mensajeCampo: 'Este rol ya no está disponible. Selecciona otro.' }),
  SUCURSAL_NO_DISPONIBLE: usuario('Sucursal no disponible', 'Una de las sucursales elegidas ya no existe o está inactiva.', 'Actualiza la lista y vuelve a seleccionar las sucursales.', { canal: 'campo', campo: 'sucursales', mensajeCampo: 'Alguna sucursal ya no está disponible. Revisa la selección.' }),
  USUARIO_NO_ENCONTRADO: usuario('Usuario no disponible', 'Este usuario ya no existe o su estado cambió mientras trabajabas.', 'Actualiza la lista para ver los datos más recientes.'),

  // ── Caja ────────────────────────────────────────────────────────────────────
  CAJA_OCUPADA: usuario('Caja en uso', 'Esta caja ya tiene un turno abierto.', 'Elige otra caja o pide que cierren el turno actual.'),
  TURNO_PROPIO_ABIERTO: usuario('Ya tienes un turno abierto', 'Solo puedes tener un turno abierto a la vez.', 'Ciérralo antes de abrir uno nuevo.'),
  SIN_TURNO: usuario('Sin turno abierto', 'Necesitas un turno abierto para hacer esta acción.', 'Abre un turno de caja e inténtalo de nuevo.'),
  CAJA_NO_EXISTE: usuario('Caja no encontrada', 'La caja seleccionada ya no existe.', 'Actualiza la pantalla y elige otra caja.'),
  SUCURSAL_INACTIVA: usuario('Sucursal inactiva', 'La sucursal de esta caja está desactivada.', 'Elige una caja de otra sucursal o consulta con un administrador.'),
  SUCURSAL_NO_ASIGNADA: usuario('Sucursal no asignada', 'Tu usuario no tiene asignada la sucursal de esta caja.', 'Pídele a un administrador que te la asigne o elige otra caja.'),
  TURNO_NO_EXISTE: usuario('Turno no encontrado', 'El turno ya no existe o no está disponible.', 'Actualiza la pantalla e inténtalo de nuevo.'),
  SOLO_CAJERO: usuario('Acción reservada al cajero', 'Solo el cajero que abrió el turno puede registrar movimientos.', 'Pídele a esa persona que lo registre.'),
  TURNO_CERRADO: usuario('El turno está cerrado', 'Ya no se pueden registrar cambios en un turno cerrado.', 'Abre un turno nuevo si necesitas continuar.'),
  TURNO_CERRADO_NOTA_CREDITO: usuario('El turno ya cerró', 'Una venta de un turno cerrado no se puede anular directamente.', 'Emite una nota de crédito.'),
  MOVIMIENTOS_SIN_PERMISO: usuario('Sin acceso a este turno', 'Solo puedes ver los movimientos de tus propios turnos.', 'Pide acceso a un administrador si necesitas consultarlo.'),
  EFECTIVO_INSUFICIENTE: usuario('Efectivo insuficiente', 'La caja no tiene efectivo suficiente para este egreso.', 'Registra un monto menor o un ingreso previo.', {
    plantilla: (m) => ({ mensaje: `La caja no tiene efectivo suficiente para este egreso (disponible: $${m[1]}).` }),
  }),

  // ── Ventas, inventario y planilla ───────────────────────────────────────────
  STOCK_INSUFICIENTE: usuario('Existencias insuficientes', 'No hay suficiente inventario para completar la operación.', 'Reduce la cantidad o registra una compra.', {
    plantilla: (m) => ({ mensaje: `Solo hay ${m[2]} de "${m[1]}" disponible y se necesitan ${m[3]}.` }),
  }),
  PRODUCTO_NO_EXISTE: usuario('Producto no disponible', 'Uno de los productos ya no existe o está inactivo.', 'Quítalo de la orden y vuelve a intentarlo.'),
  PRODUCTO_SIN_RECETA: usuario('Producto sin receta', 'Un producto elaborado no tiene receta configurada.', 'Pide a un administrador que le agregue la receta.', {
    plantilla: (m) => ({ mensaje: `"${m[1]}" es un producto elaborado y no tiene receta configurada.` }),
  }),
  CCF_SIN_DATOS: usuario('Faltan datos del cliente', 'Un comprobante de crédito fiscal requiere un cliente con NRC y giro económico.', 'Selecciona o completa un cliente con esos datos.'),
  VENTA_VACIA: usuario('La venta está vacía', 'No se puede registrar una venta sin productos.', 'Agrega al menos un producto.'),
  DESCUENTO_EXCESIVO: usuario('Descuento demasiado alto', 'El descuento no puede ser mayor que el total de la venta.', 'Reduce el descuento.'),
  PAGOS_NO_CUADRAN: usuario('Los pagos no cuadran', 'La suma de los pagos no coincide con el total a cobrar.', 'Ajusta los montos hasta que coincidan.', {
    plantilla: (m) => ({ mensaje: `Los pagos (${m[1]}) no coinciden con el total a cobrar (${m[2]}).` }),
  }),
  VENTA_NO_EXISTE: usuario('Venta no encontrada', 'La venta ya no existe o no está disponible.', 'Actualiza la pantalla e inténtalo de nuevo.'),
  VENTA_ANULADA: usuario('Venta ya anulada', 'Esta venta ya fue anulada antes.', 'Actualiza la pantalla para ver su estado actual.'),
  MOTIVO_REQUERIDO: usuario('Falta el motivo', 'Para anular una venta debes explicar el motivo.', 'Escribe el motivo de la anulación.', { canal: 'campo', campo: 'motivo', mensajeCampo: 'Escribe el motivo de la anulación.' }),
  PAGO_EXCEDE_SALDO: usuario('El pago es mayor al saldo', 'El monto ingresado supera lo que falta por pagar.', 'Ingresa un monto igual o menor al saldo.'),
  PLANILLA_NO_EXISTE: usuario('Planilla no encontrada', 'La planilla ya no existe o no está disponible.', 'Actualiza la pantalla e inténtalo de nuevo.'),
  PLANILLA_PROCESADA: usuario('Planilla ya procesada', 'Una planilla procesada no se puede recalcular.', 'Consulta la planilla existente o genera una nueva.'),

  // ── Datos y conflictos genéricos ────────────────────────────────────────────
  VALIDACION: usuario('Revisa los datos', 'Algunos datos ingresados no son válidos.', 'Corrige lo marcado e inténtalo de nuevo.', { canal: 'campo' }),
  DUPLICADO: usuario('Registro duplicado', 'Ya existe un registro con esos datos.', 'Verifica que el valor no esté repetido e inténtalo de nuevo.'),
  EN_USO: usuario('No se pudo completar', 'El registro está relacionado con otros datos o hace referencia a algo que ya no existe.', 'Actualiza la pantalla y revisa los datos relacionados.'),
  CONFLICTO: usuario('No se pudo completar', 'La información cambió mientras trabajabas o esta acción ya no es posible.', 'Actualiza la pantalla e inténtalo de nuevo.'),
  NO_ENCONTRADO: usuario('No encontrado', 'Lo que buscas ya no existe o fue movido.', 'Actualiza la pantalla o vuelve al inicio.'),
  DEMASIADO_GRANDE: usuario('Datos demasiado grandes', 'La información enviada supera el tamaño permitido.', 'Reduce el contenido e inténtalo de nuevo.'),

  // ── Fallas del sistema (mensaje neutro) ─────────────────────────────────────
  RED: sistema('Sin conexión con el servidor', 'No pudimos comunicarnos con el servidor.', 'Revisa tu conexión a internet e inténtalo de nuevo.'),
  SIN_INTERNET: sistema('Sin conexión a internet', 'Tu dispositivo parece estar sin conexión.', 'Reconéctate e inténtalo de nuevo.'),
  TIMEOUT: sistema('La respuesta tardó demasiado', 'El servidor tardó más de lo normal en responder.', 'Inténtalo de nuevo. Si sigue pasando, revisa tu conexión.'),
  // En escrituras no sabemos si el cambio se aplicó: se detiene al usuario (modal) y NO se invita a reintentar a ciegas.
  TIMEOUT_ESCRITURA: sistema('No pudimos confirmar el resultado', 'La solicitud tardó demasiado y no sabemos si el cambio se guardó.', 'Revisa la lista antes de repetir la acción para evitar duplicados.', { canal: 'modal', reintentable: false }),
  SERVICIO_NO_DISPONIBLE: sistema('Servicio no disponible', 'El sistema no está respondiendo en este momento.', `Espera un momento e inténtalo de nuevo. ${SOPORTE}`),
  INTERNO: sistema('Algo falló de nuestro lado', 'Ocurrió un problema en el sistema y no pudimos completar la acción.', `Inténtalo de nuevo en unos minutos. ${SOPORTE}`),
  FUNCION_NO_DISPONIBLE: sistema('Función no disponible', 'Esta función no está disponible en este momento.', `Recarga la página. ${SOPORTE}`, { reintentable: false }),
  DESCONOCIDO: sistema('Algo no salió como esperábamos', 'Ocurrió un problema inesperado.', 'Inténtalo de nuevo. Si continúa, recarga la página o contacta a soporte.'),
};

// Textos que hoy devuelve el backend → entrada del catálogo. El orden importa (de más a menos específico).
// Es la ÚNICA tabla que depende del texto crudo del servidor: cuando el backend envíe `codigo`,
// basta con que ese código coincida con una clave de ENTRADAS y esta tabla deja de usarse.
export const PATRONES = [
  // Sesión
  { regex: /^(Usuario|Cliente) no encontrado o inactivo$/i, id: 'SESION_EXPIRADA' },
  { regex: /^(Sesión inactiva|Token requerido|Token inválido o expirado)$/i, id: 'SESION_EXPIRADA' },
  { regex: /^Sesión no válida para este portal$/i, id: 'PORTAL_INCORRECTO' },
  { regex: /^Usuario o contraseña incorrectos$/i, id: 'CREDENCIALES' },
  { regex: /^No tienes permiso para esta acción$/i, id: 'SIN_PERMISO' },
  { regex: /^Demasiados intentos/i, id: 'DEMASIADAS_SOLICITUDES' },
  // Usuarios
  { regex: /^No puedes (desactivar|eliminar) tu propio usuario$/i, id: 'AUTOPROTECCION', plantilla: (m) => ({ mensaje: `No puedes ${m[1].toLowerCase()} tu propia cuenta mientras la estás usando.` }) },
  { regex: /^El nombre de usuario ya existe$/i, id: 'USERNAME_DUPLICADO' },
  { regex: /^El rol seleccionado no existe o está inactivo$/i, id: 'ROL_NO_DISPONIBLE' },
  { regex: /^El rol o una sucursal no existe o está inactiva$/i, id: 'ROL_NO_DISPONIBLE' },
  { regex: /^Una o más sucursales no existen o están inactivas$/i, id: 'SUCURSAL_NO_DISPONIBLE' },
  { regex: /^Usuario no encontrado( o ya está (in)?activo)?$/i, id: 'USUARIO_NO_ENCONTRADO' },
  // Caja
  { regex: /^La caja ya tiene un turno abierto$/i, id: 'CAJA_OCUPADA' },
  { regex: /^Ya tienes un turno abierto/i, id: 'TURNO_PROPIO_ABIERTO' },
  { regex: /^No tienes un turno abierto$/i, id: 'SIN_TURNO' },
  { regex: /^La caja no existe$/i, id: 'CAJA_NO_EXISTE' },
  { regex: /^La sucursal de la caja está inactiva$/i, id: 'SUCURSAL_INACTIVA' },
  { regex: /^No tienes asignada la sucursal/i, id: 'SUCURSAL_NO_ASIGNADA' },
  { regex: /^Solo el cajero del turno/i, id: 'SOLO_CAJERO' },
  { regex: /^No tienes permiso para ver los movimientos/i, id: 'MOVIMIENTOS_SIN_PERMISO' },
  { regex: /^Efectivo insuficiente en caja \(disponible: \$?([\d.,]+)\)$/i, id: 'EFECTIVO_INSUFICIENTE' },
  { regex: /^El turno ya cerró: emita una nota de crédito$/i, id: 'TURNO_CERRADO_NOTA_CREDITO' },
  { regex: /^El turno (no existe o )?(está|ya está) cerrado$/i, id: 'TURNO_CERRADO' },
  { regex: /^(El )?turno no existe$/i, id: 'TURNO_NO_EXISTE' },
  // Ventas, inventario, planilla (mensajes de las funciones SQL)
  { regex: /^Stock insuficiente de "(.+)" \(disponible: ([^,]+), requerido: ([^)]+)\)$/i, id: 'STOCK_INSUFICIENTE' },
  { regex: /^Producto \S+ no existe$/i, id: 'PRODUCTO_NO_EXISTE' },
  { regex: /^Hay productos inexistentes/i, id: 'PRODUCTO_NO_EXISTE' },
  { regex: /^El producto "(.+)" es elaborado pero no tiene receta$/i, id: 'PRODUCTO_SIN_RECETA' },
  { regex: /^Un CCF requiere cliente/i, id: 'CCF_SIN_DATOS' },
  { regex: /^La venta no tiene productos$/i, id: 'VENTA_VACIA' },
  { regex: /^El descuento no puede superar el total$/i, id: 'DESCUENTO_EXCESIVO' },
  { regex: /^Los pagos \((.+)\) no cuadran con el total \((.+)\)$/i, id: 'PAGOS_NO_CUADRAN' },
  { regex: /^Venta no existe$/i, id: 'VENTA_NO_EXISTE' },
  { regex: /^La venta ya está anulada$/i, id: 'VENTA_ANULADA' },
  { regex: /^Debe indicar el motivo de anulación$/i, id: 'MOTIVO_REQUERIDO' },
  { regex: /^El pago excede el saldo/i, id: 'PAGO_EXCEDE_SALDO' },
  { regex: /^Planilla no existe$/i, id: 'PLANILLA_NO_EXISTE' },
  { regex: /^La planilla ya fue procesada/i, id: 'PLANILLA_PROCESADA' },
  // Errores genéricos del manejador del backend
  { regex: /valor duplicado/i, id: 'DUPLICADO' },
  { regex: /^Referencia inválida o registro en uso$/i, id: 'EN_USO' },
  { regex: /^Ruta no encontrada/i, id: 'FUNCION_NO_DISPONIBLE' }, // incluye método y URL internos: jamás se muestra
];

// Si el backend no dio un texto reconocido, se decide por el código HTTP.
export const POR_STATUS = (status) => {
  if (status === 400 || status === 422) return 'VALIDACION';
  if (status === 401) return 'SESION_EXPIRADA';
  if (status === 403) return 'SIN_PERMISO';
  if (status === 404) return 'NO_ENCONTRADO';
  if (status === 409) return 'CONFLICTO';
  if (status === 413) return 'DEMASIADO_GRANDE';
  if (status === 429) return 'DEMASIADAS_SOLICITUDES';
  if (status === 502 || status === 503 || status === 504) return 'SERVICIO_NO_DISPONIBLE';
  if (status >= 500) return 'INTERNO';
  return 'DESCONOCIDO';
};

// ── Errores por campo (validación Zod del backend) ───────────────────────────
export const ETIQUETAS_CAMPO = {
  username: 'El nombre de usuario',
  password: 'La contraseña',
  idRol: 'El rol',
  sucursales: 'Las sucursales',
  idCaja: 'La caja',
  montoApertura: 'El monto de apertura',
  monto: 'El monto',
  concepto: 'El concepto',
  tipo: 'El tipo',
  motivo: 'El motivo',
};

// Los mensajes por defecto de Zod vienen en inglés ("Too small: expected string to have >=3 characters").
// Los que el backend escribió en español se conservan; los de Zod se traducen aquí.
const ES_ZOD_POR_DEFECTO = /^(too (small|big)|invalid|expected|required|unrecognized|input|string|number|array)\b/i;

export function traducirMensajeCampo(campo, mensaje = '') {
  const etiqueta = ETIQUETAS_CAMPO[campo] || 'Este campo';
  const texto = String(mensaje).trim();
  if (texto && !ES_ZOD_POR_DEFECTO.test(texto)) return /[.!?]$/.test(texto) ? texto : `${texto}.`;

  let m;
  if ((m = texto.match(/too small: expected string to have >=?\s*(\d+)/i))) return `${etiqueta} debe tener al menos ${m[1]} caracteres.`;
  if ((m = texto.match(/too big: expected string to have <=?\s*(\d+)/i))) return `${etiqueta} debe tener como máximo ${m[1]} caracteres.`;
  if ((m = texto.match(/too small: expected array to have >=?\s*(\d+)/i))) return `Selecciona al menos ${m[1]} opción${m[1] === '1' ? '' : 'es'}.`;
  if (/too small: expected number/i.test(texto)) return `${etiqueta} no es válido. Selecciona o ingresa un valor mayor que cero.`;
  if (/received (undefined|null)|^required/i.test(texto)) return `${etiqueta} es obligatorio.`;
  return `${etiqueta} no tiene un formato válido. Revísalo e inténtalo de nuevo.`;
}
