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

// Acceso rápido sobrio: chip de icono neutro + título + descripción, un solo tono.
function Acceso({ to, icono: Icono, titulo, descripcion }) {
  return <Link to={to} className="group h-full rounded-lg"><Card className="h-full transition-colors hover:border-primary/40"><div className="flex items-start justify-between gap-3"><span className="grid size-control-md shrink-0 place-items-center rounded-md bg-muted text-fg-muted group-hover:text-primary-text"><Icono size={20} strokeWidth={1.75} aria-hidden="true"/></span><ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-fg-subtle transition-transform group-hover:translate-x-0.5"/></div><h2 className="mt-4 text-body-lg font-semibold">{titulo}</h2><p className="mt-1 text-body-sm text-fg-muted">{descripcion}</p></Card></Link>;
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
  return <div className="space-y-6"><EncabezadoPagina seccion="Gestión · Compras" titulo="Resumen de compras" descripcion="Registra facturas, controla cuentas por pagar y gestiona proveedores." acciones={puedeRegistrar&&<Link to="/compras/registrar"><Button icono={FilePlus2}>Registrar compra</Button></Link>}/>{error&&<BannerError error={{titulo:'No se pudieron consultar los saldos pendientes',mensaje:error,accion:''}}/>}
    {puedeVer&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metrica icono={Clock} cargando={cargando} valor={cargando ? null :pendientes.length} etiqueta="Facturas pendientes"/><Metrica icono={AlertTriangle} tono={!cargando&&vencidas>0?'peligro':'neutro'} cargando={cargando} valor={cargando ? null :vencidas} etiqueta="Facturas vencidas"/><Metrica icono={Wallet} cargando={cargando} valor={cargando ? null :formatoCentavos(saldoCentavos)} etiqueta="Saldo pendiente total"/></div>}
    <nav aria-label="Accesos de compras" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {puedeRegistrar&&<Acceso to="/compras/registrar" icono={FilePlus2} titulo="Nueva factura de compra" descripcion="Registra insumos recibidos y actualiza costo promedio."/>}
      {puedeRegistrar&&<Acceso to="/compras/gastos" icono={ReceiptText} titulo="Gastos operativos" descripcion="Registra servicios y conceptos que no ingresan al inventario."/>}
      {puedeProveedores&&<Acceso to="/compras/proveedores" icono={Truck} titulo="Proveedores" descripcion="Mantén actualizado el directorio y sus condiciones de crédito."/>}
      {puedeVer&&<Acceso to="/compras/cuentas-por-pagar" icono={ClipboardList} titulo="Cuentas por pagar" descripcion={cargando?'Consultando…':`${pendientes.length} facturas pendientes`}/>}
    </nav>
    {puedeVer&&<Card sinPadding className="overflow-hidden" icono={Wallet} titulo="Facturas pendientes" descripcion="Vista resumida de la cola de pago. Los saldos se pueden visualizar en el apartado cuentas por pagar." acciones={<Link to="/compras/cuentas-por-pagar" className="text-body-sm font-medium text-primary-text hover:underline">Ver todas</Link>}><Table cargando={cargando} filas={pendientes.slice(0,6)} idFila="id_compra" vacio="No hay facturas pendientes." columnas={columnas} paginacion={false} ordenInicial={{ clave: 'fecha_vencimiento', direccion: 'asc' }}/></Card>}
  </div>;
}
