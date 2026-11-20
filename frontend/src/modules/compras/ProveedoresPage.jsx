import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Truck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { mascaraEntero, mascaraNit, mascaraNrc, mascaraTelefono, validarMascara } from '../../utils/mascaras.js';
import { actualizarProveedor, crearProveedor, desactivarProveedor, listarProveedores } from './comprasApi.js';

const VACIO = { razonSocial: '', nrc: '', nit: '', contacto: '', telefono: '', diasCredito: '0', tipo: 'COMPRA' };
// COMPRA: insumos para inventario (Nueva factura). SERVICIO: luz, agua, mantenimiento (Gastos operativos).
export const TIPOS_PROVEEDOR = [{ valor: 'COMPRA', texto: 'Compra (insumos)' }, { valor: 'SERVICIO', texto: 'Servicio (gastos)' }];
// Chip sin icono: el tipo es una categoría, no un estado (los badges con icono quedan para estados).
const TipoBadge = ({ tipo }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${tipo === 'SERVICIO' ? 'bg-info-soft text-info-text' : 'bg-muted text-fg-muted'}`}>{tipo === 'SERVICIO' ? 'Servicio' : 'Compra'}</span>;
const texto = (v) => String(v ?? '').toLocaleLowerCase('es');
// Campos del diálogo: [clave, etiqueta, maxLength, máscara, tipo de validarMascara, atributos extra]. Requeridos: razón social, NRC y NIT.
const CAMPOS = [
  ['razonSocial', 'Razón social', 150],
  ['nrc', 'NRC', 8, mascaraNrc, 'nrc', { inputMode: 'numeric', placeholder: '123456-7' }],
  ['nit', 'NIT', 17, mascaraNit, 'nit', { inputMode: 'numeric', placeholder: '0000-000000-000-0' }],
  ['contacto', 'Persona de contacto', 100],
  ['telefono', 'Teléfono', 9, mascaraTelefono, 'telefono', { inputMode: 'tel', placeholder: '2222-3333', autoComplete: 'tel' }],
];
const REQUERIDOS = ['razonSocial', 'nrc', 'nit'];

function ProveedorDialogo({ inicial, guardando, cerrar, guardar }) {
  const { notificar } = useAlert();
  const [form, setForm] = useState(inicial ?? VACIO);
  useEffect(() => setForm(inicial ?? VACIO), [inicial]);
  const [errores, setErrores] = useState({});
  const set = (k, mascara) => (e) => { const valor = mascara ? mascara(e.target.value) : e.target.value; setForm((f) => ({ ...f, [k]: valor })); setErrores((x) => ({ ...x, [k]: '' })); };
  // Valida con los mismos formatos que exige el backend antes de enviar.
  function enviar(e) {
    e.preventDefault();
    const nuevos = {};
    for (const [key, , , , tipo] of CAMPOS) if (tipo) nuevos[key] = validarMascara(tipo, form[key], { requerido: REQUERIDOS.includes(key) });
    nuevos.diasCredito = validarMascara('entero', form.diasCredito, { requerido: true });
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) {
      notificar.advertencia('Formulario incompleto', { mensaje: 'Revisa los campos con error antes de guardar el proveedor.' });
      return;
    }
    guardar(form);
  }
  return <Dialogo onCerrar={cerrar} tamano="md" labelledBy="proveedor-titulo">
    <div className="flex items-start justify-between gap-3 px-6 pt-6"><div><h2 id="proveedor-titulo" className="text-h3">{inicial?.id_proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2><p className="mt-1 text-body text-fg-muted">Los campos con <span className="text-danger-text">*</span> son obligatorios.</p></div><BotonIcono icono={X} etiqueta="Cerrar" titulo="Cerrar" onClick={cerrar} /></div>
    <form onSubmit={enviar}>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        {CAMPOS.map(([key,label,max,mascara,,extra]) => <label key={key} className="flex min-h-[4.25rem] flex-col text-label"><span>{label}{REQUERIDOS.includes(key) && <span className="text-danger-text"> *</span>}</span><input className="input mt-1.5 h-10" type="text" value={form[key]} onChange={set(key, mascara)} maxLength={max} required={REQUERIDOS.includes(key)} aria-invalid={Boolean(errores[key]) || undefined} {...extra} />{errores[key] && <span className="mt-1 text-body-sm font-normal text-danger-text">{errores[key]}</span>}</label>)}
        <label className="flex min-h-[4.25rem] flex-col text-label">Días de crédito<input className="input mt-1.5 h-10" type="text" inputMode="numeric" placeholder="0" maxLength={3} value={form.diasCredito} onChange={set('diasCredito', (v) => mascaraEntero(v, 3))} required aria-invalid={Boolean(errores.diasCredito) || undefined} />{errores.diasCredito && <span className="mt-1 text-body-sm font-normal text-danger-text">{errores.diasCredito}</span>}</label>
        <div className="flex min-h-[4.25rem] flex-col"><Select etiqueta="Tipo de proveedor *" value={form.tipo ?? 'COMPRA'} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} opciones={TIPOS_PROVEEDOR} /><span className="mt-1 text-body-sm text-fg-muted">{(form.tipo ?? 'COMPRA') === 'SERVICIO' ? 'Aparecerá en Gastos operativos.' : 'Aparecerá en Nueva factura de compra.'}</span></div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end"><Button variante="ghost" onClick={cerrar}>Cancelar</Button><Button type="submit" icono={Plus} cargando={guardando}>{inicial?.id_proveedor ? 'Guardar cambios' : 'Crear proveedor'}</Button></div>
    </form>
  </Dialogo>;
}

export default function ProveedoresPage() {
  const { tiene } = useAuth(); const { confirm, notificar, notificarError } = useAlert();
  const [filas, setFilas] = useState([]); const [cargando, setCargando] = useState(true); const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null); const [busqueda, setBusqueda] = useState(''); const [estado, setEstado] = useState('true'); const [modal, setModal] = useState(null); const [tipo, setTipo] = useState('');
  const puedeEditar = tiene('COM_GESTIONAR_PROVEEDORES');
  const cargar = useCallback(async () => { setCargando(true); setError(null); try { setFilas(await listarProveedores(estado)); } catch (e) { setError(e.message); } finally { setCargando(false); } }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);
  const visibles = useMemo(() => filas.filter((x) => (!tipo || x.tipo === tipo) && [x.razon_social,x.nrc,x.nit,x.contacto,x.telefono].some((v) => texto(v).includes(texto(busqueda)))), [filas,busqueda,tipo]);
  async function guardar(form) { setGuardando(true); const id = modal?.id_proveedor; const payload = { ...form, diasCredito: Number(form.diasCredito) }; try { const item = id ? await actualizarProveedor(id,payload) : await crearProveedor(payload); setFilas((actual) => id ? actual.map((x) => x.id_proveedor === id ? item : x) : [...actual,item]); notificar.exito(id ? 'Proveedor actualizado' : 'Proveedor creado'); setModal(null); } catch (e) { notificarError(e); } finally { setGuardando(false); } }
  async function desactivar(fila) { if (!await confirm(`¿Desactivar a ${fila.razon_social}? El proveedor se conserva en el historial.`, { titulo: 'Desactivar proveedor', etiquetaAceptar: 'Desactivar', destructivo: true })) return; try { await desactivarProveedor(fila.id_proveedor); setFilas((xs) => xs.filter((x) => x.id_proveedor !== fila.id_proveedor)); notificar.exito('Proveedor desactivado'); } catch (e) { notificarError(e); } }
  const columnas = [
    {
      clave: 'razon_social',
      titulo: 'Proveedor',
      tipo: 'texto',
      valorOrden: (f) => f.razon_social,
      render: (f) => (
        <div>
          <p className="font-medium">{f.razon_social}</p>
          <p className="text-body-sm text-fg-muted">NRC {f.nrc} · NIT {f.nit}</p>
        </div>
      ),
    },
    {
      clave: 'contacto',
      titulo: 'Contacto',
      tipo: 'texto',
      valorOrden: (f) => f.contacto ?? '',
      render: (f) => (
        <div>
          {f.contacto || '—'}
          <p className="text-body-sm text-fg-muted">{f.telefono || 'Sin teléfono'}</p>
        </div>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      tipo: 'texto',
      valorOrden: (f) => f.tipo,
      render: (f) => <TipoBadge tipo={f.tipo} />,
    },
    {
      clave: 'dias_credito',
      titulo: 'Crédito',
      tipo: 'numero',
      valorOrden: (f) => f.dias_credito,
      render: (f) => `${f.dias_credito} días`,
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      tipo: 'booleano',
      valorOrden: (f) => f.activo,
      render: (f) => (
        <EstadoBadge tipo={f.activo ? 'exito' : 'alerta'}>
          {f.activo ? 'Activo' : 'Inactivo'}
        </EstadoBadge>
      ),
    },
    ...(puedeEditar
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            alinear: 'right',
            ordenable: false,
            render: (f) => (
              <div className="flex justify-end gap-2">
                <BotonIcono
                  icono={ICONOS.editar}
                  etiqueta={`Editar ${f.razon_social}`}
                  titulo="Editar"
                  onClick={() =>
                    setModal({
                      ...f,
                      razonSocial: f.razon_social,
                      diasCredito: String(f.dias_credito),
                    })
                  }
                />
                <BotonIcono
                  icono={ICONOS.desactivar}
                  tono="aviso"
                  etiqueta={`Desactivar ${f.razon_social}`}
                  titulo="Desactivar"
                  onClick={() => desactivar(f)}
                />
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Gestión · Compras"
        titulo="Proveedores"
        descripcion="Administra la información comercial y las condiciones de crédito de tus proveedores."
        acciones={puedeEditar && <Button icono={Plus} onClick={() => { setModal({ ...VACIO }); }}>Nuevo proveedor</Button>}
      />
      {error && <BannerError error={{ titulo: 'No se pudieron cargar los proveedores', mensaje: error, accion: '' }} />}
      <Card sinPadding className="overflow-hidden" icono={Truck} titulo="Directorio de proveedores" descripcion={`${visibles.length} proveedores`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full max-w-xs">
            <label className="sr-only" htmlFor="buscar-proveedor">Buscar proveedor</label>
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input id="buscar-proveedor" className="input pl-9" placeholder="Nombre, NRC o NIT" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="w-full sm:w-40"><Select tamano="sm" aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} opciones={[{ valor: 'true', texto: 'Activos' }, { valor: 'false', texto: 'Inactivos' }]} /></div>
          <div className="w-full sm:w-44"><Select tamano="sm" aria-label="Tipo de proveedor" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Todos los tipos" opciones={TIPOS_PROVEEDOR} /></div>
          {(busqueda || tipo) && <Button variante="ghost" tamano="sm" onClick={() => { setBusqueda(''); setTipo(''); }}>Limpiar filtros</Button>}
        </div>
        <Table cargando={cargando} filas={visibles} idFila="id_proveedor" vacio={<EstadoVacio icono={Truck} titulo="No hay proveedores para este filtro." />} columnas={columnas} idTabla="compras-proveedores" ordenInicial={{ clave: 'razon_social', direccion: 'asc' }} />
      </Card>
      {modal && <ProveedorDialogo inicial={modal.id_proveedor ? modal : null} guardando={guardando} cerrar={() => !guardando && setModal(null)} guardar={guardar} />}
    </div>
  );
}
