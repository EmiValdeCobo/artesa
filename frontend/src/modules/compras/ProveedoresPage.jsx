import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import { actualizarProveedor, crearProveedor, desactivarProveedor, listarProveedores } from './comprasApi.js';

const VACIO = { razonSocial: '', nrc: '', nit: '', contacto: '', telefono: '', diasCredito: '0' };
const texto = (v) => String(v ?? '').toLocaleLowerCase('es');

function ProveedorDialogo({ inicial, guardando, error, cerrar, guardar }) {
  const [form, setForm] = useState(inicial ?? VACIO);
  useEffect(() => setForm(inicial ?? VACIO), [inicial]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return <Dialogo onCerrar={cerrar} tamano="md" labelledBy="proveedor-titulo">
    <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary-text">Compras · Proveedores</p><h2 id="proveedor-titulo" className="mt-1 text-xl font-semibold">{inicial?.id_proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2></div><button className="btn-ghost" onClick={cerrar} aria-label="Cerrar">×</button></div>
    {error && <div className="px-5 pt-4 sm:px-6"><BannerError error={{ titulo: 'No se pudo guardar el proveedor', mensaje: error, accion: '' }} /></div>}
    <form onSubmit={(e) => { e.preventDefault(); guardar(form); }} className="space-y-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[['razonSocial','Razón social',150],['nrc','NRC',20],['nit','NIT',20],['contacto','Persona de contacto',100],['telefono','Teléfono',20]].map(([key,label,max]) => <label key={key} className="text-sm font-medium">{label}{['razonSocial','nrc','nit'].includes(key) && <span className="text-danger"> *</span>}<input className="input mt-1.5" value={form[key]} onChange={set(key)} maxLength={max} required={['razonSocial','nrc','nit'].includes(key)} /></label>)}
        <label className="text-sm font-medium">Días de crédito<input className="input mt-1.5" type="number" min="0" step="1" value={form.diasCredito} onChange={set('diasCredito')} required /></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4"><Button variante="ghost" onClick={cerrar}>Cancelar</Button><Button type="submit" icono={Plus} cargando={guardando}>{inicial?.id_proveedor ? 'Guardar cambios' : 'Crear proveedor'}</Button></div>
    </form>
  </Dialogo>;
}

export default function ProveedoresPage() {
  const { tiene } = useAuth(); const { confirm, notificar } = useAlert();
  const [filas, setFilas] = useState([]); const [cargando, setCargando] = useState(true); const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null); const [errorDialogo, setErrorDialogo] = useState(null); const [busqueda, setBusqueda] = useState(''); const [estado, setEstado] = useState('true'); const [modal, setModal] = useState(null);
  const puedeEditar = tiene('COM_GESTIONAR_PROVEEDORES');
  const cargar = useCallback(async () => { setCargando(true); setError(null); try { setFilas(await listarProveedores(estado)); } catch (e) { setError(e.message); } finally { setCargando(false); } }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);
  const visibles = useMemo(() => filas.filter((x) => [x.razon_social,x.nrc,x.nit,x.contacto,x.telefono].some((v) => texto(v).includes(texto(busqueda)))), [filas,busqueda]);
  async function guardar(form) { setGuardando(true); setErrorDialogo(null); const id = modal?.id_proveedor; const payload = { ...form, diasCredito: Number(form.diasCredito) }; try { const item = id ? await actualizarProveedor(id,payload) : await crearProveedor(payload); setFilas((actual) => id ? actual.map((x) => x.id_proveedor === id ? item : x) : [...actual,item]); notificar.exito(id ? 'Proveedor actualizado' : 'Proveedor creado'); setModal(null); } catch (e) { setErrorDialogo(e.message); } finally { setGuardando(false); } }
  async function desactivar(fila) { if (!await confirm(`¿Desactivar a ${fila.razon_social}? El proveedor se conserva en el historial.`, { titulo: 'Desactivar proveedor', etiquetaAceptar: 'Desactivar', destructivo: true })) return; try { await desactivarProveedor(fila.id_proveedor); setFilas((xs) => xs.filter((x) => x.id_proveedor !== fila.id_proveedor)); notificar.exito('Proveedor desactivado'); } catch (e) { setError(e.message); } }
  const columnas = [{ clave:'razon_social',titulo:'Proveedor',render:(f)=><div><p className="font-medium">{f.razon_social}</p><p className="text-xs text-fg-muted">NRC {f.nrc} · NIT {f.nit}</p></div>},{ clave:'contacto',titulo:'Contacto',render:(f)=><div>{f.contacto || '—'}<p className="text-xs text-fg-muted">{f.telefono || 'Sin teléfono'}</p></div>},{ clave:'dias_credito',titulo:'Crédito',render:(f)=>`${f.dias_credito} días`},{ clave:'activo',titulo:'Estado',render:(f)=><EstadoBadge tipo={f.activo?'exito':'alerta'}>{f.activo?'Activo':'Inactivo'}</EstadoBadge>},...(puedeEditar?[{ clave:'acciones',titulo:'Acciones',alinear:'right',render:(f)=><div className="flex justify-end gap-2"><Button variante="ghost" icono={Pencil} aria-label={`Editar ${f.razon_social}`} onClick={()=>setModal({...f,razonSocial:f.razon_social,diasCredito:String(f.dias_credito)})}>Editar</Button><Button variante="danger" onClick={()=>desactivar(f)}>Desactivar</Button></div>}]:[])];
  return <div className="space-y-6"><EncabezadoPagina seccion="Compras · Almacén" titulo="Proveedores" descripcion="Administra la información comercial y las condiciones de crédito de tus proveedores." acciones={puedeEditar&&<Button icono={Plus} onClick={()=>{setErrorDialogo(null);setModal({...VACIO});}}>Nuevo proveedor</Button>} />{error&&<BannerError error={{titulo:'No se pudo cargar o actualizar proveedores',mensaje:error,accion:''}}/>}<Card titulo="Directorio de proveedores" descripcion={`${visibles.length} proveedores`}><div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="sr-only" htmlFor="buscar-proveedor">Buscar proveedor</label><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"/><input id="buscar-proveedor" className="input pl-10" placeholder="Buscar por nombre, NRC o NIT" value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}/></div><Select etiqueta="Estado" value={estado} onChange={(e)=>setEstado(e.target.value)} opciones={[{valor:'true',texto:'Activos'},{valor:'false',texto:'Inactivos'}]}/></div><Table cargando={cargando} filas={visibles} idFila="id_proveedor" vacio="No hay proveedores para este filtro." columnas={columnas}/></Card>{modal&&<ProveedorDialogo inicial={modal.id_proveedor?modal:null} guardando={guardando} error={errorDialogo} cerrar={()=>!guardando&&setModal(null)} guardar={guardar}/>}</div>;
}
