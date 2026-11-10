import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import BitacoraMetricas from './BitacoraMetricas.jsx';
import JsonDiffViewer from './JsonDiffViewer.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';

const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const diasAntes = (cantidad) => { const d = new Date(); d.setDate(d.getDate()-cantidad); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const NIVEL = { INFO: ['info','Informativo'], WARNING: ['alerta','Advertencia'], ERROR: ['error','Error'], CRITICAL: ['error','Crítico'] };
const ACCION = { CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación', LOGIN: 'Acceso' };
const fechaLegible = (fecha) => new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/El_Salvador' }).format(new Date(fecha));

function ErrorEnLinea({ texto, reintentar }) {
  if (!texto) return null;
  return <BannerError error={{ titulo: 'No se pudo cargar la bitácora', mensaje: texto, accion: 'Revisa los filtros e inténtalo de nuevo.', reintentable: true }} onReintentar={reintentar}/>;
}

function DetalleRegistro({ registro, onCerrar }) {
  return <Dialogo onCerrar={onCerrar} tamano="lg" labelledBy="bitacora-detalle-titulo" describedBy="bitacora-detalle-desc">
    <header className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Detalle de auditoría</p><h2 id="bitacora-detalle-titulo" className="mt-1 text-lg font-semibold">{ACCION[registro.accion] ?? registro.accion} · {registro.modulo}</h2><p id="bitacora-detalle-desc" className="mt-1 text-sm text-fg-muted">{fechaLegible(registro.creado_en)} · {registro.usuario}</p></div><EstadoBadge tipo={NIVEL[registro.severidad]?.[0] ?? 'info'}>{NIVEL[registro.severidad]?.[1] ?? registro.severidad}</EstadoBadge></div></header>
    <div className="space-y-5 p-5 sm:p-6"><dl className="grid gap-3 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-fg-muted">Entidad</dt><dd className="mt-0.5 font-medium">{registro.entidad}</dd></div><div><dt className="text-xs text-fg-muted">IP</dt><dd className="mt-0.5 font-medium">{registro.ip_cliente || 'No registrada'}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-fg-muted">Dispositivo / navegador</dt><dd className="mt-0.5 break-words font-medium">{registro.agente_cliente || 'No registrado'}</dd></div></dl><div><h3 className="mb-3 font-semibold">Cambios detectados</h3><JsonDiffViewer antes={registro.datos_antes} despues={registro.datos_despues}/></div><details className="rounded-lg border border-line"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver JSON completo</summary><div className="grid gap-px border-t border-line bg-line sm:grid-cols-2"><div className="bg-surface p-3"><p className="mb-2 text-xs font-semibold text-fg-muted">DATOS_ANTES</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(registro.datos_antes, null, 2) ?? '—'}</pre></div><div className="bg-surface p-3"><p className="mb-2 text-xs font-semibold text-fg-muted">DATOS_DESPUÉS</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(registro.datos_despues, null, 2) ?? '—'}</pre></div></div></details><div className="flex justify-end"><Button variante="secondary" onClick={onCerrar}>Cerrar</Button></div></div>
  </Dialogo>;
}

export default function BitacoraPage() {
  const [fechas,setFechas]=useState({startDate:diasAntes(30),endDate:hoyLocal()});
  const [filtros,setFiltros]=useState({search:'',user:'',module:'',action:''});
  const [pagina,setPagina]=useState(1);
  const [respuesta,setRespuesta]=useState({data:[],pagination:{page:1,limit:25,total:0,totalPages:0}});
  const [metricas,setMetricas]=useState(null);
  const [cargando,setCargando]=useState(true);
  const [cargandoMetricas,setCargandoMetricas]=useState(true);
  const [error,setError]=useState(null);
  const [errorMetricas,setErrorMetricas]=useState(null);
  const [seleccionado,setSeleccionado]=useState(null);
  const [granularidad,setGranularidad]=useState('day');

  const queryBase = useMemo(() => ({...fechas,...(filtros.module?{module:filtros.module}:{}),...(filtros.user?{user:filtros.user}:{})}),[fechas,filtros.module,filtros.user]);
  const modulos = useMemo(()=>metricas?.modulos??[],[metricas]);
  const consultaLista = async () => {
    setCargando(true);setError(null);
    try { const params=new URLSearchParams({...queryBase,page:String(pagina),limit:'25',...(filtros.search?{search:filtros.search}:{}),...(filtros.action?{action:filtros.action}:{})});setRespuesta(await api.get(`/bitacora?${params}`)); }
    catch(e){setError(e.message);}
    finally{setCargando(false);}
  };
  const consultaMetricas = async () => {
    setCargandoMetricas(true);setErrorMetricas(null);
    try { const rangoDias=(Date.parse(`${fechas.endDate}T00:00:00Z`)-Date.parse(`${fechas.startDate}T00:00:00Z`))/86400000;const periodo={...queryBase,granularity:rangoDias<=1?'hour':'day'};setGranularidad(periodo.granularity);setMetricas(await api.get(`/bitacora/metricas?${new URLSearchParams(periodo)}`)); }
    catch(e){setErrorMetricas(e.message);}
    finally{setCargandoMetricas(false);}
  };

  useEffect(()=>{const t=setTimeout(consultaLista,250);return()=>clearTimeout(t);},[queryBase,pagina,filtros.search,filtros.action]);
  useEffect(()=>{consultaMetricas();},[queryBase]);
  const cambiarFiltro=(campo,valor)=>{setFiltros(prev=>({...prev,[campo]:valor}));setPagina(1);};
  const primeraFila=(pagina-1)*respuesta.pagination.limit+1;
  const finFila=Math.min(pagina*respuesta.pagination.limit,respuesta.pagination.total);
  const columnas=[
    {clave:'creado_en',titulo:'Fecha y hora',render:f=><span className="whitespace-nowrap">{fechaLegible(f.creado_en)}</span>},
    {clave:'usuario',titulo:'Usuario'},
    {clave:'accion',titulo:'Acción',render:f=><span className="font-medium">{ACCION[f.accion]??f.accion}</span>},
    {clave:'modulo',titulo:'Módulo',render:f=><span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{f.modulo}</span>},
    {clave:'cliente',titulo:'IP / Dispositivo',render:f=><div className="max-w-[190px]"><p className="font-medium">{f.ip_cliente??'No registrada'}</p><p className="truncate text-xs text-fg-muted" title={f.agente_cliente}>{f.agente_cliente||'Dispositivo no registrado'}</p></div>},
    {clave:'severidad',titulo:'Severidad',render:f=><EstadoBadge tipo={NIVEL[f.severidad]?.[0]??'info'}>{NIVEL[f.severidad]?.[1]??f.severidad}</EstadoBadge>},
    {clave:'detalle',titulo:'',render:f=><Button variante="ghost" icono={Eye} aria-label={`Ver detalle del registro ${f.id_bitacora}`} onClick={()=>setSeleccionado(f)}>Detalle</Button>},
  ];

  return <div className="space-y-6 pb-8">
    <EncabezadoPagina seccion="Seguridad · Auditoría" titulo="Bitácora de actividad" descripcion="Rastrea cambios, accesos y patrones operativos. El análisis se calcula en PostgreSQL sobre los filtros elegidos." acciones={<div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg-muted"><span className="h-2 w-2 rounded-full bg-success"/> Auditoría activa</div>} />
    <Card titulo="Filtros" descripcion="Combina período, operador, módulo, evento y texto libre."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <label className="text-xs font-medium text-fg-muted">Desde<input className="input mt-1 text-fg" type="date" value={fechas.startDate} max={fechas.endDate} onChange={e=>{setFechas(f=>({...f,startDate:e.target.value}));setPagina(1);}}/></label>
      <label className="text-xs font-medium text-fg-muted">Hasta<input className="input mt-1 text-fg" type="date" value={fechas.endDate} min={fechas.startDate} max={hoyLocal()} onChange={e=>{setFechas(f=>({...f,endDate:e.target.value}));setPagina(1);}}/></label>
      <label className="text-xs font-medium text-fg-muted">Operador<input className="input mt-1 text-fg" placeholder="Nombre de usuario" value={filtros.user} onChange={e=>cambiarFiltro('user',e.target.value)}/></label>
      <Select etiqueta="Módulo" value={filtros.module} onChange={e=>cambiarFiltro('module',e.target.value)} placeholder="Todos los módulos" opciones={modulos.map(m=>({valor:m,texto:m[0]?.toUpperCase()+m.slice(1)}))}/>
      <Select etiqueta="Acción" value={filtros.action} onChange={e=>cambiarFiltro('action',e.target.value)} placeholder="Todas las acciones" opciones={[{valor:'CREATE',texto:'Creación'},{valor:'UPDATE',texto:'Actualización'},{valor:'DELETE',texto:'Eliminación'},{valor:'LOGIN',texto:'Acceso'}]}/>
      <label className="text-xs font-medium text-fg-muted">Buscar en evento<div className="relative mt-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"/><input className="input pl-9 text-fg" placeholder="Entidad, datos, IP…" value={filtros.search} onChange={e=>cambiarFiltro('search',e.target.value)}/></div></label>
    </div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-fg-muted">{respuesta.pagination.total.toLocaleString('es-SV')} eventos encontrados</p><Button variante="ghost" icono={RefreshCw} onClick={()=>{consultaLista();consultaMetricas();}}>Actualizar datos</Button></div></Card>
    <section aria-label="Indicadores de auditoría">{cargandoMetricas?<Card><Spinner texto="Calculando analítica de auditoría…"/></Card>:errorMetricas?<ErrorEnLinea texto={errorMetricas} reintentar={consultaMetricas}/>:metricas?<BitacoraMetricas metricas={{...metricas,granularidad}}/>:null}</section>
    <Card titulo="Registro de eventos" descripcion="Ordenado por fecha descendente; selecciona un evento para revisar sus diferencias." sinPadding>
      {error?<div className="p-5"><ErrorEnLinea texto={error} reintentar={consultaLista}/></div>:<Table columnas={columnas} filas={respuesta.data} idFila="id_bitacora" cargando={cargando} vacio="No hay eventos para los filtros seleccionados." maxAltura="max-h-[620px]"/>}
      {!cargando&&!error&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4"><p className="text-xs text-fg-muted">{respuesta.pagination.total?`Mostrando ${primeraFila}–${finFila} de ${respuesta.pagination.total.toLocaleString('es-SV')}`:'Sin resultados'}</p><nav aria-label="Paginación de bitácora" className="flex items-center gap-2"><Button variante="secondary" icono={ChevronLeft} aria-label="Página anterior" disabled={pagina<=1} onClick={()=>setPagina(p=>p-1)}/><span className="min-w-24 text-center text-xs text-fg-muted">Página {pagina} de {Math.max(1,respuesta.pagination.totalPages)}</span><Button variante="secondary" icono={ChevronRight} aria-label="Página siguiente" disabled={pagina>=respuesta.pagination.totalPages} onClick={()=>setPagina(p=>p+1)}/></nav></footer>}
    </Card>
    {seleccionado&&<DetalleRegistro registro={seleccionado} onCerrar={()=>setSeleccionado(null)}/>}
  </div>;
}
