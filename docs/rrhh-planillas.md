# Planillas mensuales y boletas

El módulo liquida una planilla mensual por sucursal y período. Se crea con `AAAA-MM`; PostgreSQL calcula inicio/fin del mes y un índice único impide una segunda planilla para esa sucursal y mes. La función `rrhh.fn_calcular_planilla(id)` realiza las operaciones monetarias en `NUMERIC` y guarda cada monto en centavos. El servicio coordina validación, transacción y estados; los PDF se generan en una capa separada con un escritor PDF pequeño basado en Helvetica, sin motor de plantillas ni dependencias nativas.

## Flujo

1. Crear una planilla; opcionalmente adjuntar bonificaciones y otros descuentos por empleado activo de la sucursal.
2. Calcular una vez que el mes esté listo. El resultado queda consultable y recalculable antes de procesarlo.
3. Procesar la planilla calculada. Una planilla procesada queda cerrada y no se recalcula.
4. Descargar el resumen PDF o la boleta individual en PDF.

Las operaciones de crear, calcular y procesar usan transacción, bloquean el encabezado para serializar concurrencia, y dejan `app.user_id` disponible para auditoría. Se rechazan referencias inválidas, sucursales inactivas, mes mal formado, duplicidad de período, planilla vacía y transiciones de estado inválidas.

## API

Todas las rutas usan cookie JWT y usuario administrador. `RRHH_CALCULAR_PLANILLA` permite crear/calcular/procesar; `RRHH_VER_PLANILLA` permite consultar y descargar. Errores siguen `{ "error": "mensaje" }`; conflicto/estado inválido usa 409, entrada inválida 400 y ausencia 404.

| Método y ruta | Contrato |
|---|---|
| `POST /api/rrhh/planillas` | `{idSucursal,periodo:"2026-11",ajustes?:[{idEmpleado,bonificaciones?,otrosDescuentos?,detalle?:string[]}]}` → `201 {idPlanilla}` |
| `POST /api/rrhh/planillas/:id/calculo` | Invoca `rrhh.fn_calcular_planilla`; retorna `{idPlanilla,empleados,estado:"CALCULADA"}` |
| `POST /api/rrhh/planillas/:id/procesamiento` | Cierra la nómina calculada; retorna `{idPlanilla,estado:"PROCESADA"}` |
| `GET /api/rrhh/planillas?idSucursal=&desde=AAAA-MM&hasta=AAAA-MM` | Lista encabezados, conteo, bruto y neto total |
| `GET /api/rrhh/planillas/:id` | `{planilla,empleados:[...]}` con desglose y montos string |
| `GET /api/rrhh/planillas/:id/pdf` | `application/pdf`, resumen tabular de la planilla procesada |
| `GET /api/rrhh/planillas/:id/empleados/:idEmpleado/boleta.pdf` | `application/pdf`, boleta individual procesada |

## Parámetros legales y límites

`rrhh.parametros_legales` conserva versiones por fecha efectiva y la planilla guarda la versión utilizada. `rrhh.tramos_renta` contiene tramos con vigencia. Para renta mensual desde 2025-05-01 se cargó el Decreto Ejecutivo 10, emitido el 30-04-2025, efectivo desde mayo: base exenta hasta $550; tramos II $550.01–$895.24 (10%, exceso $550 y cuota $17.67), III $895.25–$2,038.10 (20%, exceso $895.24 y cuota $60), IV desde $2,038.11 (30%, exceso $2,038.10 y cuota $288.57). [Decreto 10, Ministerio de Hacienda](https://transparencia.mh.gob.sv/downloads/pdf/700-DGII-DC-2025-01.pdf) y [aviso de vigencia](https://www.mh.gob.sv/wp-content/uploads/2025/05/Modificacion-a-las-tablas-de-retenci%C3%B3n-del-Impuesto-Sobre-la-Renta-Decreto-Ejecutivo-NO.10.pdf).

La misma tabla define remuneración gravada neta de cotizaciones sociales. El artículo 1(e) ordena considerar una deducción adicional de $1,600 en tramo II para personas con ingreso anual hasta $9,100, y los artículos 1(f) y 1(g) exigen recálculos de junio/diciembre y tratamiento especial de remuneraciones extraordinarias. La función actual aplica la tabla mensual regular, pero no modela ingresos de otros patronos, deducción personal de $1,600 ni recálculo semestral/anual; por ello requiere validación del contador antes de uso para liquidación fiscal real, pese a que sus porcentajes/tramos base están vigentes. No se deben presentar estas boletas como constancias fiscales definitivas.

AFP laboral 7.25% y patronal 8.75% desde la versión 2025-05-01, según art. 16 de la [Ley Integral del Sistema de Pensiones, SSF](https://ssf.gob.sv/wp-content/uploads/2023/02/Ley-Integral-del-Sistema-de-Pensiones.pdf). ISSS laboral 3% y patronal 7.5% en esa misma versión, según [ISSS](https://www.isss.gob.sv/servicios/actualizacion-de-datos-patronales/); el tope de $1,000 se conserva de la configuración inicial del proyecto y debe comprobarse con el régimen y actividad de cada patrono. INSAFORP 1% patronal solo se computa con 10 o más empleados activos en toda la empresa; confirmar obligación y tasa con asesoría laboral. Las fuentes y valores son datos versionados, no constantes JavaScript. Para incorporar cambios, cerrar la vigencia anterior el día previo y agregar una fila nueva con fecha, porcentajes/topes y la referencia normativa; agregar los tramos con igual fecha efectiva. No sobrescriba versiones usadas por planillas procesadas.

La tabla del decreto describe remuneraciones pagaderas mensualmente, quincenalmente y semanalmente; este producto opera solo mensual. Los campos `detalle` guardan etiquetas descriptivas de ajustes; los valores contables se envían como importes agregados. La generación PDF no sustituye la validación visual/fiscal ni un formato oficial exigido por el patrono.
