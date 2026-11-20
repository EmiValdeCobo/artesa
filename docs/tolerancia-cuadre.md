# Tolerancia de descuadre al cerrar caja

- Parámetro: `empresa.parametros.clave = 'tolerancia_cuadre'` (USD, valor absoluto). Por defecto `1.00`.
- Se valida en `POST /api/turnos/:id/cierre` ANTES de llamar a `pos.fn_cerrar_turno`, por método (efectivo, tarjeta, digital).
- Si `|contado − esperado| > tolerancia` en algún método: **422** con el detalle (ej. `efectivo (-1.01)`); el turno sigue ABIERTO para recontar.
- Si la diferencia es exactamente igual al límite, cierra. Con `0` se exige cuadre exacto.
- Si el valor del parámetro no es un monto válido: 500 con mensaje claro; no se cierra el turno.
- Cambiar el límite: `UPDATE empresa.parametros SET valor = '2.00' WHERE clave = 'tolerancia_cuadre';` (o por la pantalla de parámetros, permiso `EMP_EDITAR_PARAMETROS`).