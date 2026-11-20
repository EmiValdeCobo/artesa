import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { BotonIcono, Select } from '../../components/ui/index.js';
import { formatoCentavos } from '../../utils/formato.js';
import { desplazar, errorRango, etiquetaPeriodo, hoyElSalvador, mesActual, mesAnterior, opcionDePeriodo, rangoDePeriodo } from './periodo.js';

const OPCIONES = [
  { valor: 'este', texto: 'Este mes' },
  { valor: 'anterior', texto: 'Mes anterior' },
  { valor: 'mes', texto: 'Mes específico' },
  { valor: 'anio', texto: 'Año completo' },
  { valor: 'rango', texto: 'Rango personalizado' },
  { valor: 'todo', texto: 'Todas las fechas' },
];

// Filtro de período compartido por Cuentas por pagar y Gastos. El padre guarda el período
// y lo traduce con rangoDePeriodo() a desde/hasta para la consulta al backend.
// campoFecha/onCampoFecha son opcionales: solo CxP deja elegir emisión o vencimiento.
export default function FiltroPeriodo({ periodo, onCambiar, campoFecha, onCampoFecha, idBase = 'periodo' }) {
  const hoy = hoyElSalvador();
  const opcion = opcionDePeriodo(periodo, hoy);
  const anioActual = mesActual(hoy).anio;
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i).map((anio) => ({ valor: String(anio), texto: String(anio) }));
  const errorDeRango = periodo.modo === 'rango' ? errorRango(periodo) : '';

  function elegir(valor) {
    if (valor === 'este') onCambiar(mesActual(hoy));
    else if (valor === 'anterior') onCambiar(mesAnterior(hoy));
    else if (valor === 'mes') onCambiar(periodo.modo === 'mes' ? periodo : mesActual(hoy));
    else if (valor === 'anio') onCambiar({ modo: 'anio', anio: periodo.anio ?? anioActual });
    else if (valor === 'rango') {
      const { desde, hasta } = rangoDePeriodo(periodo);
      onCambiar({ modo: 'rango', desde: desde ?? `${anioActual}-01-01`, hasta: hasta ?? hoy });
    } else onCambiar({ modo: 'todo' });
  }

  const navegable = periodo.modo === 'mes' || periodo.modo === 'anio';
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="w-full sm:w-48"><Select tamano="sm" aria-label="Período" value={opcion} onChange={(e) => elegir(e.target.value)} opciones={OPCIONES} /></div>
      {navegable && (
        <div className="flex items-center gap-1" role="group" aria-label="Navegar período">
          <BotonIcono icono={ChevronLeft} etiqueta={periodo.modo === 'mes' ? 'Mes anterior' : 'Año anterior'} titulo="Anterior" onClick={() => onCambiar(desplazar(periodo, -1))} />
          <span className="min-w-[9.5rem] text-center text-body font-medium tabular-nums" aria-live="polite">{etiquetaPeriodo(periodo)}</span>
          <BotonIcono icono={ChevronRight} etiqueta={periodo.modo === 'mes' ? 'Mes siguiente' : 'Año siguiente'} titulo="Siguiente" onClick={() => onCambiar(desplazar(periodo, 1))} />
        </div>
      )}
      {opcion === 'mes' && (
        <input
          type="month"
          className="input h-9 w-full sm:w-44"
          aria-label="Mes"
          value={`${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`}
          onChange={(e) => {
            const [anio, mes] = e.target.value.split('-').map(Number);
            if (anio && mes) onCambiar({ modo: 'mes', anio, mes });
          }}
        />
      )}
      {periodo.modo === 'anio' && (
        <div className="w-full sm:w-32"><Select tamano="sm" aria-label="Año" value={String(periodo.anio)} onChange={(e) => onCambiar({ modo: 'anio', anio: Number(e.target.value) })} opciones={anios} /></div>
      )}
      {periodo.modo === 'rango' && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor={`${idBase}-desde`}>Desde</label>
          <input id={`${idBase}-desde`} type="date" className="input h-9 w-full sm:w-40" value={periodo.desde} max={periodo.hasta || undefined} onChange={(e) => onCambiar({ ...periodo, desde: e.target.value })} aria-invalid={Boolean(errorDeRango) || undefined} aria-describedby={errorDeRango ? `${idBase}-error` : undefined} />
          <span className="text-body-sm text-fg-muted">a</span>
          <label className="sr-only" htmlFor={`${idBase}-hasta`}>Hasta</label>
          <input id={`${idBase}-hasta`} type="date" className="input h-9 w-full sm:w-40" value={periodo.hasta} min={periodo.desde || undefined} onChange={(e) => onCambiar({ ...periodo, hasta: e.target.value })} aria-invalid={Boolean(errorDeRango) || undefined} aria-describedby={errorDeRango ? `${idBase}-error` : undefined} />
          {errorDeRango && <span id={`${idBase}-error`} className="w-full text-body-sm text-danger-text">{errorDeRango}</span>}
        </div>
      )}
      {onCampoFecha && (
        <div className="w-full sm:w-48"><Select tamano="sm" aria-label="Fecha a filtrar" value={campoFecha} onChange={(e) => onCampoFecha(e.target.value)} opciones={[{ valor: 'vencimiento', texto: 'Por vencimiento' }, { valor: 'emision', texto: 'Por emisión' }]} /></div>
      )}
    </div>
  );
}

// Resumen del período filtrado (sumas en centavos BigInt hechas por el padre con totalesPeriodo).
export function ResumenPeriodo({ totales, cantidad, periodo, cargando }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-muted/40 px-5 py-3 text-body sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
      <p className="flex items-center gap-2 text-fg-muted"><CalendarRange size={16} strokeWidth={1.75} aria-hidden="true" />{etiquetaPeriodo(periodo)}{!cargando && ` · ${cantidad} ${cantidad === 1 ? 'factura' : 'facturas'}`}</p>
      <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-6">
        {[['Total', totales.total], ['Abonado', totales.pagado], ['Saldo', totales.saldo]].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="min-w-0">
            <dt className="text-body-sm text-fg-muted">{etiqueta}</dt>
            <dd className={`tabular-nums ${etiqueta === 'Saldo' ? 'font-semibold' : 'font-medium'}`}>{cargando ? '—' : formatoCentavos(valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

