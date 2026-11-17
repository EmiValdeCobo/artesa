import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ClipboardList, Clock, FilePlus2, ReceiptText, Truck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import { formatoCentavos } from '../../utils/formato.js';
import { Button, Card, Table } from '../../components/ui/index.js';
import { listarCuentasPorPagar } from './comprasApi.js';

// Convierte un string NUMERIC ("12.50") a centavos BigInt, sin pasar por float.
function aCentavos(valor) {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(valor ?? '0').trim());
  if (!partes) return 0n;
  const centavos = BigInt(partes[2]) * 100n + BigInt((partes[3] ?? '').padEnd(2, '0').slice(0, 2));
  return partes[1] ? -centavos : centavos;
}

export default function ComprasPage(){
  const {tiene}=useAuth(); const [pendientes,setPendientes]=useState([]); const [cargando,setCargando]=useState(true); const [error,setError]=useState(null);
  useEffect(()=>{let vivo=true;listarCuentasPorPagar().then(x=>{if(vivo)setPendientes(x);}).catch(e=>{if(vivo)setError(e.message);}).finally(()=>{if(vivo)setCargando(false);});return()=>{vivo=false;};},[]);
  const puedeRegistrar=tiene('COM_REGISTRAR_COMPRA'); const puedeVer=tiene('COM_VER_CXP'); const puedeProveedores=tiene('COM_GESTIONAR_PROVEEDORES');
  // Resumen de la cola de pago (solo la primera página que devuelve el backend: 50 por defecto).
  const vencidas=pendientes.filter(f=>Number(f.dias_vencida)>0).length;
  const saldoCentavos=pendientes.reduce((suma,f)=>suma+aCentavos(f.saldo),0n);
  const columnas = [
    { clave: 'fecha_vencimiento', titulo: 'Vencimiento', tipo: 'fecha', valorOrden: (f) => f.fecha_vencimiento },
    { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', valorOrden: (f) => f.proveedor },
    { clave: 'num_factura', titulo: 'N.º factura', tipo: 'texto', valorOrden: (f) => f.num_factura },
    { clave: 'saldo', titulo: 'Saldo', tipo: 'dinero', alinear: 'right', valorOrden: (f) => f.saldo, render: (f) => `$${f.saldo}` },
    {
      clave: 'estado_pago',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (f) => (Number(f.dias_vencida) > 0 ? `Vencida ${f.dias_vencida}` : 'Pendiente'),
      render: (f) => (Number(f.dias_vencida) > 0 ? <EstadoBadge tipo="error">Vencida · {f.dias_vencida} d</EstadoBadge> : <EstadoBadge tipo="alerta">Pendiente</EstadoBadge>),
    },
  ];
  return <div className="space-y-6"><EncabezadoPagina seccion="Operación · Compras" titulo="Compras" descripcion="Registra facturas, controla cuentas por pagar y gestiona proveedores." acciones={puedeRegistrar&&<Link to="/compras/registrar"><Button icono={FilePlus2}>Registrar compra</Button></Link>}/>{error&&<BannerError error={{titulo:'No se pudieron consultar los saldos pendientes',mensaje:error,accion:''}}/>}
    {puedeVer&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metrica icono={Clock} tono="aviso" valor={cargando?'—':pendientes.length} etiqueta="Facturas pendientes"/><Metrica icono={AlertTriangle} tono={cargando?'neutro':vencidas>0?'peligro':'exito'} valor={cargando?'—':vencidas} etiqueta="Facturas vencidas"/><Metrica icono={Wallet} tono="primario" valor={cargando?'—':formatoCentavos(saldoCentavos)} etiqueta="Saldo pendiente total"/></div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{puedeRegistrar&&<Link to="/compras/registrar" className="group h-full"><Card className="h-full transition hover:border-primary/40"><div className="flex items-start justify-between"><div className="rounded-xl bg-primary-soft p-3 text-primary-text"><FilePlus2 size={22}/></div><ArrowRight size={18} className="text-fg-muted transition group-hover:translate-x-1"/></div><h2 className="mt-4 font-semibold">Factura de compra</h2><p className="mt-1 text-sm text-fg-muted">Registra insumos recibidos y actualiza costo promedio.</p></Card></Link>}{puedeRegistrar&&<Link to="/compras/gastos" className="group h-full"><Card className="h-full transition hover:border-primary/40"><div className="flex items-start justify-between"><div className="rounded-xl bg-secondary-soft p-3 text-secondary-text"><ReceiptText size={22}/></div><ArrowRight size={18} className="text-fg-muted transition group-hover:translate-x-1"/></div><h2 className="mt-4 font-semibold">Gastos operativos</h2><p className="mt-1 text-sm text-fg-muted">Registra servicios y conceptos que no ingresan al inventario.</p></Card></Link>}{puedeProveedores&&<Link to="/compras/proveedores" className="group h-full"><Card className="h-full transition hover:border-primary/40"><div className="flex items-start justify-between"><div className="rounded-xl bg-muted p-3 text-fg"><Truck size={22}/></div><ArrowRight size={18} className="text-fg-muted transition group-hover:translate-x-1"/></div><h2 className="mt-4 font-semibold">Proveedores</h2><p className="mt-1 text-sm text-fg-muted">Mantén actualizado el directorio y sus condiciones de crédito.</p></Card></Link>}{puedeVer&&<Link to="/compras/cuentas-por-pagar" className="group h-full"><Card className="h-full transition hover:border-primary/40"><div className="flex items-start justify-between"><div className="rounded-xl bg-warning-soft p-3 text-warning"><ClipboardList size={22}/></div><ArrowRight size={18} className="text-fg-muted transition group-hover:translate-x-1"/></div><h2 className="mt-4 font-semibold">Cuentas por pagar</h2><p className="mt-1 text-sm text-fg-muted">{cargando?'Consultando…':`${pendientes.length} facturas pendientes`}</p></Card></Link>}</div>
    {puedeVer&&<Card titulo="Facturas pendientes" descripcion="Vista resumida de la cola de pago. Los saldos se consultan directamente del backend." acciones={<Link to="/compras/cuentas-por-pagar" className="text-sm font-medium text-primary-text hover:underline">Ver todas</Link>}><Table cargando={cargando} filas={pendientes.slice(0,6)} idFila="id_compra" vacio="No hay facturas pendientes." columnas={columnas} paginacion={false} ordenInicial={{ clave: 'fecha_vencimiento', direccion: 'asc' }}/></Card>}
  </div>;
}
