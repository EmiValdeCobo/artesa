import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';

export default function KardexPage(){const {usuario}=useAuth();const sucursales=usuario?.sucursales??[];const [sucursal,setSucursal]=useState('');const [insumo,setInsumo]=useState('');const [insumos,setInsumos]=useState([]);const [filas,setFilas]=useState([]);const [cargando,setCargando]=useState(false);const [error,setError]=useState(null);
 useEffect(()=>{if(sucursales.length&&!sucursal)setSucursal(String(sucursales[0].id_sucursal));},[sucursales,sucursal]);
 useEffect(()=>{api.get('/inventario/insumos').then(setInsumos).catch(e=>setError(e.message));},[]);
 async function cargar(){if(!sucursal)return;setCargando(true);setError(null);try{const q=new URLSearchParams({idSucursal:sucursal});if(insumo)q.set('idInsumo',insumo);setFilas(await api.get(`/inventario/movimientos?${q}`));}catch(e){setError(e.message);}finally{setCargando(false);}}
 useEffect(()=>{cargar();},[sucursal,insumo]);
 return <div className="space-y-6"><EncabezadoPagina seccion="Inventario" titulo="Kárdex" descripcion="Auditoría cronológica de entradas, salidas y ajustes de existencias." />{error&&<BannerError error={{titulo:'No se pudieron cargar los movimientos',mensaje:error,accion:''}}/>}<Card titulo="Filtrar movimientos"><div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><Select etiqueta="Sucursal" value={sucursal} onChange={e=>setSucursal(e.target.value)} opciones={sucursales.map(s=>({valor:String(s.id_sucursal),texto:s.nombre}))} placeholder="Selecciona sucursal"/><Select etiqueta="Insumo" value={insumo} onChange={e=>setInsumo(e.target.value)} opciones={insumos.map(i=>({valor:String(i.id_insumo),texto:i.nombre}))} placeholder="Todos los insumos"/><Button onClick={cargar} cargando={cargando}>Actualizar</Button></div></Card><Card titulo="Movimientos registrados" descripcion={`${filas.length} movimientos encontrados`}><Table cargando={cargando} filas={filas} idFila="id_movimiento" vacio="No hay movimientos para estos filtros." columnas={[{clave:'creado_en',titulo:'Fecha'},{clave:'sucursal',titulo:'Sucursal'},{clave:'insumo',titulo:'Insumo'},{clave:'tipo',titulo:'Movimiento'},{clave:'cantidad',titulo:'Cantidad'},{clave:'stock_resultante',titulo:'Saldo'},{clave:'motivo',titulo:'Motivo'},{clave:'usuario',titulo:'Usuario'}]}/></Card></div>;
}
