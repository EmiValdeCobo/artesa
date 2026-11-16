import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import CampoError from '../../components/forms/CampoError.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
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
  const [filas, setFilas] = useState([]);
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.get('/empresa/parametros');
      setFilas(data.map((x) => ({ ...x, tipo: tipoDe(x.valor) })));
      setValores(Object.fromEntries(data.map((x) => [x.clave, x.valor])));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(fila) {
    const mensaje = validar(fila.tipo, valores[fila.clave]);
    setErrores((actual) => ({ ...actual, [fila.clave]: mensaje }));
    if (mensaje) return;
    setGuardando(fila.clave);
    try {
      const data = await api.put('/empresa/parametros', { clave: fila.clave, valor: String(valores[fila.clave]).trim() });
      setFilas((p) => p.map((x) => (x.clave === fila.clave ? { ...data, tipo: x.tipo } : x)));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando('');
    }
  }

  const columnas = [
    { clave: 'clave', titulo: 'Parámetro', render: (f) => <div className="min-w-48"><p className="font-medium">{f.clave}</p><p className="text-xs text-fg-muted">{f.descripcion}</p></div> },
    {
      clave: 'valor',
      titulo: 'Valor',
      render: (f) => (
        <div className="w-full max-w-xs">
          {f.tipo === 'booleano' ? (
            <Select aria-label={`Valor de ${f.clave}`} placeholder="" value={String(valores[f.clave]).toLowerCase()} onChange={(e) => setValores({ ...valores, [f.clave]: e.target.value })}
              opciones={[{ valor: 'true', texto: 'Sí (activado)' }, { valor: 'false', texto: 'No (desactivado)' }]} />
          ) : (
            <input id={`parametro-${f.clave}`} aria-label={`Valor de ${f.clave}`} className="input aria-invalid:border-danger" type="text"
              inputMode={f.tipo === 'texto' ? 'text' : f.tipo === 'entero' ? 'numeric' : 'decimal'} maxLength={100}
              value={valores[f.clave] ?? ''} aria-invalid={errores[f.clave] ? true : undefined}
              onChange={(e) => { setValores({ ...valores, [f.clave]: MASCARAS[f.tipo](e.target.value) }); setErrores(({ [f.clave]: _q, ...resto }) => resto); }} />
          )}
          {errores[f.clave] ? <CampoError id={`parametro-${f.clave}`} mensaje={errores[f.clave]} /> : AYUDA[f.tipo] && <p className="mt-1 text-xs text-fg-muted">{AYUDA[f.tipo]}</p>}
        </div>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      render: (f) => (
        <Button icono={ICONOS.guardar} cargando={guardando === f.clave} disabled={guardando !== '' || valores[f.clave] === f.valor} onClick={() => guardar(f)} aria-label={`Guardar ${f.clave}`}>Guardar</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Empresa" titulo="Parámetros" descripcion="Configuración fiscal y operativa definida por el sistema." />
      {error && <BannerError error={{ titulo: 'No se pudo guardar o cargar el parámetro', mensaje: error, accion: '' }} />}
      <Card titulo="Parámetros del negocio" descripcion="Los valores se guardan en la configuración central del negocio.">
        <Table cargando={cargando} filas={filas} idFila="clave" columnas={columnas} maxAltura="" vacio="No hay parámetros configurados." />
      </Card>
    </div>
  );
}
