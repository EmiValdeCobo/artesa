import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import { Button, Card, Table } from '../../components/ui/index.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';

const vacio = { codigoEstablecimiento: '', nombre: '', direccion: '', departamento: 'San Salvador', telefono: '', activa: true };
export default function SucursalesPage() {
  const { notificar } = useAlert();
  const [filas,setFilas]=useState([]); const [cargando,setCargando]=useState(true); const [error,setError]=useState(null); const [form,setForm]=useState(vacio); const [editando,setEditando]=useState(null); const [guardando,setGuardando]=useState(false);
  async function cargar(){ setCargando(true); setError(null); try { setFilas(await api.get('/empresa/sucursales')); } catch(e){setError(e.message);} finally{setCargando(false);} }
  useEffect(()=>{cargar();},[]);
  function editar(f){setEditando(f.id_sucursal);setForm({codigoEstablecimiento:f.codigo_establecimiento,nombre:f.nombre,direccion:f.direccion??'',departamento:f.departamento??'',telefono:f.telefono??'',activa:f.activa});}
  async function guardar(e){e.preventDefault();setGuardando(true);try{if(editando) await api.put(`/empresa/sucursales/${editando}`,form); else await api.post('/empresa/sucursales',form);notificar.exito('Sucursal guardada');setForm(vacio);setEditando(null);await cargar();}catch(err){setError(err.message);}finally{setGuardando(false);}}
  async function alternar(f){try{await api.patch(`/empresa/sucursales/${f.id_sucursal}/estado`,{activa:!f.activa});await cargar();}catch(e){setError(e.message);}}
  return <div className="space-y-6"><EncabezadoPagina seccion="Empresa" titulo="Sucursales" descripcion="Administra establecimientos y sus datos de contacto." />{error&&<BannerError error={{titulo:'No se pudo guardar o cargar la sucursal',mensaje:error,accion:''}}/>}<Card titulo={editando?'Editar sucursal':'Nueva sucursal'} descripcion="El código de establecimiento usa cuatro caracteres, como M001."><form onSubmit={guardar} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[['codigoEstablecimiento','Código de establecimiento'],['nombre','Nombre'],['direccion','Dirección'],['departamento','Departamento'],['telefono','Teléfono']].map(([k,l])=><label key={k} className="text-sm font-medium">{l}<input className="input mt-1" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required={k!=='telefono'} maxLength={k==='codigoEstablecimiento'?4:undefined}/></label>)}<label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.activa} onChange={e=>setForm({...form,activa:e.target.checked})}/> Activa</label><div className="flex gap-2"><Button type="submit" icono={Plus} cargando={guardando}>{editando?'Guardar cambios':'Crear sucursal'}</Button>{editando&&<Button variante="secondary" onClick={()=>{setEditando(null);setForm(vacio);}}>Cancelar</Button>}</div></form></Card><Card titulo="Establecimientos registrados" descripcion={`${filas.length} sucursales`}><Table cargando={cargando} filas={filas} idFila="id_sucursal" vacio="No hay sucursales registradas." columnas={[{clave:'codigo_establecimiento',titulo:'Código'},{clave:'nombre',titulo:'Sucursal'},{clave:'departamento',titulo:'Departamento'},{clave:'telefono',titulo:'Teléfono'},{clave:'activa',titulo:'Estado',render:f=><EstadoBadge tipo={f.activa?'exito':'alerta'}>{f.activa?'Activa':'Inactiva'}</EstadoBadge>},{clave:'acciones',titulo:'Acciones',render:f=><div className="flex gap-2"><Button variante="ghost" onClick={()=>editar(f)}>Editar</Button><Button variante="secondary" onClick={()=>alternar(f)}>{f.activa?'Desactivar':'Activar'}</Button></div>}]} /></Card></div>;
}
