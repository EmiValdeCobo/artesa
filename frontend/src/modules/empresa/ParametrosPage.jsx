import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import CampoError from '../../components/forms/CampoError.jsx';
import { SlidersHorizontal } from 'lucide-react';
import { Button, Card, Select } from '../../components/ui/index.js';
import { SkeletonFilas } from '../../components/feedback/Skeleton.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { ICONOS } from '../../config/iconos.js';
import { mascaraDecimal, mascaraEntero } from '../../utils/mascaras.js';

// El tipo se deduce del valor vigente: booleano → combobox Sí/No; entero o decimal → máscara numérica.
// Así cada parámetro conserva su formato (p. ej. tasa_iva = "0.13") sin cambiar el contrato de la API.
const tipoDe = (valor) => (/^(true|false)$/i.test(valor) ? 'booleano' : /^\d+$/.test(valor) ? 'entero' : /^\d+\.\d+$/.test(valor) ? 'decimal' : 'texto');
const MASCARAS = { entero: (v) => mascaraEntero(v), decimal: (v) => mascaraDecimal(v, 4), texto: (v) => v };
const AYUDA = { entero: 'Número entero.', decimal: 'Número con hasta 4 decimales; las tasas se escriben en fracción (0.13 = 13%).' };
const validar = (tipo, valor) => {
  const v = String(valor ?? '').trim();
  if (!v) return 'Escribe un valor.';
  if (tipo === 'decimal' && !/^\d+(\.\d{1,4})?$/.test(v)) return 'Usa un número con hasta 4 decimales.';
  if (tipo === 'entero' && !/^\d+$/.test(v)) return 'Usa un número entero.';
  return '';
};

export default function ParametrosPage() {
  const { notificar, notificarError } = useAlert();
  const [filas, setFilas] = useState([]);
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.get('/empresa/parametros');
      setFilas(data.map((x) => ({ ...x, tipo: tipoDe(x.valor) })));
      setValores(Object.fromEntries(data.map((x) => [x.clave, x.valor])));
      setErrorCarga(null);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(fila) {
    const mensaje = validar(fila.tipo, valores[fila.clave]);
    setErrores((actual) => ({ ...actual, [fila.clave]: mensaje }));
    if (mensaje) {
      notificar.advertencia('Valor inválido', {
        mensaje,
        accion: 'Corrige el valor ingresado antes de guardar.',
      });
      return;
    }
    setGuardando(fila.clave);
    try {
      const data = await api.put('/empresa/parametros', { clave: fila.clave, valor: String(valores[fila.clave]).trim() });
      setFilas((p) => p.map((x) => (x.clave === fila.clave ? { ...data, tipo: x.tipo } : x)));
      notificar.exito('Parámetro guardado', { mensaje: `Se actualizó el valor de «${fila.clave}».` });
    } catch (e) {
      notificarError(e, { reintentar: () => guardar(fila) });
    } finally {
      setGuardando('');
    }
  }

  // Control de cada parámetro (combobox Sí/No o input con máscara según el tipo deducido).
  const control = (f) => (
    <div className="w-full">
      {f.tipo === 'booleano' ? (
        <Select aria-label={`Valor de ${f.clave}`} placeholder="" value={String(valores[f.clave]).toLowerCase()} onChange={(e) => setValores({ ...valores, [f.clave]: e.target.value })}
          opciones={[{ valor: 'true', texto: 'Sí (activado)' }, { valor: 'false', texto: 'No (desactivado)' }]} />
      ) : (
        <input id={`parametro-${f.clave}`} aria-label={`Valor de ${f.clave}`} className={`input aria-invalid:border-danger ${f.tipo === 'texto' ? '' : 'text-right tabular-nums'}`} type="text"
          inputMode={f.tipo === 'texto' ? 'text' : f.tipo === 'entero' ? 'numeric' : 'decimal'} maxLength={100}
          value={valores[f.clave] ?? ''} aria-invalid={errores[f.clave] ? true : undefined}
          onChange={(e) => { setValores({ ...valores, [f.clave]: MASCARAS[f.tipo](e.target.value) }); setErrores(({ [f.clave]: _q, ...resto }) => resto); }} />
      )}
      {errores[f.clave] ? <CampoError id={`parametro-${f.clave}`} mensaje={errores[f.clave]} /> : AYUDA[f.tipo] && <p className="mt-1 text-body-sm text-fg-muted">{AYUDA[f.tipo]}</p>}
    </div>
  );
  const ordenadas = [...filas].sort((x, y) => x.clave.localeCompare(y.clave));

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Administración · Parámetros" titulo="Parámetros" descripcion="Configuración fiscal y operativa definida por el sistema." />
      {errorCarga && <BannerError error={{ titulo: 'No se pudieron cargar los parámetros', mensaje: errorCarga, accion: 'Reintenta la operación.' }} onReintentar={cargar} />}
      <Card sinPadding className="overflow-hidden" icono={SlidersHorizontal} titulo="Parámetros del negocio" descripcion="Los valores se guardan en la configuración central del negocio.">
        {cargando ? (
          <div className="px-5 py-4"><SkeletonFilas filas={4} /></div>
        ) : ordenadas.length === 0 ? (
          <p className="px-5 py-8 text-body text-fg-muted">No hay parámetros configurados.</p>
        ) : (
          <dl className="divide-y divide-line">
            {ordenadas.map((f) => (
              <div key={f.clave} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_auto] md:items-start">
                <dt className="min-w-0">
                  <p className="font-mono text-body-sm font-medium text-fg">{f.clave}</p>
                  {f.descripcion && <p className="mt-0.5 text-body-sm text-fg-muted">{f.descripcion}</p>}
                </dt>
                <dd>{control(f)}</dd>
                <dd className="md:justify-self-end">
                  <Button variante="secondary" icono={ICONOS.guardar} cargando={guardando === f.clave} disabled={guardando !== '' || valores[f.clave] === f.valor} onClick={() => guardar(f)} aria-label={`Guardar ${f.clave}`}>Guardar</Button>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
