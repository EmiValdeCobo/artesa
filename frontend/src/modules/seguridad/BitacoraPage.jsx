import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { SkeletonTexto } from '../../components/feedback/Skeleton.jsx';
import Insignia from '../../components/branding/Insignia.jsx';
import { ICONOS } from '../../config/iconos.js';
import BitacoraMetricas from './BitacoraMetricas.jsx';
import JsonDiffViewer from './JsonDiffViewer.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import { formatoFechaHora } from '../../utils/formato.js';

const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const diasAntes = (cantidad) => { const d = new Date(); d.setDate(d.getDate()-cantidad); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const NIVEL = { INFO: ['info','Informativo'], WARNING: ['alerta','Advertencia'], ERROR: ['error','Error'], CRITICAL: ['error','Crítico'] };
const ACCION = { CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación', LOGIN: 'Acceso' };

function ErrorEnLinea({ texto, reintentar }) {
  if (!texto) return null;
  return <BannerError error={{ titulo: 'No se pudo cargar la bitácora', mensaje: texto, accion: 'Revisa los filtros e inténtalo de nuevo.', reintentable: true }} onReintentar={reintentar}/>;
}

function DetalleRegistro({ registro, onCerrar }) {
  return <Dialogo onCerrar={onCerrar} tamano="lg" labelledBy="bitacora-detalle-titulo" describedBy="bitacora-detalle-desc">
    <header className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="rotulo">Detalle de auditoría</p><h2 id="bitacora-detalle-titulo" className="mt-1 text-h3">{ACCION[registro.accion] ?? registro.accion} · {registro.modulo}</h2><p id="bitacora-detalle-desc" className="mt-1 text-body text-fg-muted">{formatoFechaHora(registro.creado_en)} · {registro.usuario}</p></div><EstadoBadge tipo={NIVEL[registro.severidad]?.[0] ?? 'info'}>{NIVEL[registro.severidad]?.[1] ?? registro.severidad}</EstadoBadge></div></header>
    <div className="space-y-5 p-5 sm:p-6"><dl className="grid gap-3 rounded-md bg-muted p-4 text-body sm:grid-cols-2"><div><dt className="text-label-sm text-fg-muted">Entidad</dt><dd className="mt-0.5 font-medium">{registro.entidad}</dd></div><div><dt className="text-label-sm text-fg-muted">IP</dt><dd className="mt-0.5 font-mono font-medium">{registro.ip_cliente || 'No registrada'}</dd></div><div className="sm:col-span-2"><dt className="text-label-sm text-fg-muted">Dispositivo / navegador</dt><dd className="mt-0.5 break-words font-medium">{registro.agente_cliente || 'No registrado'}</dd></div></dl><div><h3 className="mb-3 text-label text-fg">Cambios detectados</h3><JsonDiffViewer antes={registro.datos_antes} despues={registro.datos_despues}/></div><details className="rounded-md border border-line"><summary className="cursor-pointer px-4 py-3 text-label">Ver JSON completo</summary><div className="grid gap-px border-t border-line bg-line sm:grid-cols-2"><div className="bg-surface p-3"><p className="mb-2 font-mono text-label-sm text-fg-muted">DATOS_ANTES</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-body-sm">{JSON.stringify(registro.datos_antes, null, 2) ?? '—'}</pre></div><div className="bg-surface p-3"><p className="mb-2 font-mono text-label-sm text-fg-muted">DATOS_DESPUÉS</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-body-sm">{JSON.stringify(registro.datos_despues, null, 2) ?? '—'}</pre></div></div></details></div><div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end"><Button variante="ghost" onClick={onCerrar}>Cerrar</Button></div>
  </Dialogo>;
}

export default function BitacoraPage() {
  const [fechas,setFechas]=useState({startDate:diasAntes(30),endDate:hoyLocal()});
  const [filtros,setFiltros]=useState({search:'',user:'',module:'',action:'',severity:''});
  const [pagina,setPagina]=useState(1);
  const [porPagina,setPorPagina]=useState(25);
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
  const abortListaRef = useRef(null);
  const abortMetricasRef = useRef(null);

  const consultaLista = useCallback(async (signal) => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ...queryBase,
        page: String(pagina),
        limit: String(porPagina),
        ...(filtros.search ? { search: filtros.search } : {}),
        ...(filtros.action ? { action: filtros.action } : {}),
        ...(filtros.severity ? { severity: filtros.severity } : {}),
      });
      const data = await api.get(`/bitacora?${params}`, { signal });
      setRespuesta(data);
    } catch (e) {
      if (signal?.aborted || e?.name === 'AbortError') return;
      setError(e.message);
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, [queryBase, pagina, porPagina, filtros.search, filtros.action, filtros.severity]);

  const consultaMetricas = useCallback(async (signal) => {
    setCargandoMetricas(true);
    setErrorMetricas(null);
    try {
      const rangoDias = (Date.parse(`${fechas.endDate}T00:00:00Z`) - Date.parse(`${fechas.startDate}T00:00:00Z`)) / 86400000;
      const periodo = { ...queryBase, granularity: rangoDias <= 1 ? 'hour' : 'day' };
      setGranularidad(periodo.granularity);
      const data = await api.get(`/bitacora/metricas?${new URLSearchParams(periodo)}`, { signal });
      setMetricas(data);
    } catch (e) {
      if (signal?.aborted || e?.name === 'AbortError') return;
      setErrorMetricas(e.message);
    } finally {
      if (!signal?.aborted) setCargandoMetricas(false);
    }
  }, [fechas.startDate, fechas.endDate, queryBase]);

  useEffect(() => {
    abortListaRef.current?.abort();
    const controller = new AbortController();
    abortListaRef.current = controller;
    const t = setTimeout(() => consultaLista(controller.signal), 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [consultaLista]);

  useEffect(() => {
    abortMetricasRef.current?.abort();
    const controller = new AbortController();
    abortMetricasRef.current = controller;
    const t = setTimeout(() => consultaMetricas(controller.signal), 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [consultaMetricas]);
  const cambiarFiltro=(campo,valor)=>{setFiltros(prev=>({...prev,[campo]:valor}));setPagina(1);};
  const columnas = [
    {
      clave: 'creado_en',
      titulo: 'Fecha y hora',
      tipo: 'fecha',
      valorOrden: (f) => f.creado_en,
      render: (f) => <span className="whitespace-nowrap">{formatoFechaHora(f.creado_en)}</span>,
    },
    {
      clave: 'usuario',
      titulo: 'Usuario',
      tipo: 'texto',
    },
    {
      clave: 'accion',
      titulo: 'Acción',
      tipo: 'texto',
      valorOrden: (f) => ACCION[f.accion] ?? f.accion,
      render: (f) => <span className="font-medium">{ACCION[f.accion] ?? f.accion}</span>,
    },
    {
      clave: 'modulo',
      titulo: 'Módulo',
      tipo: 'texto',
      render: (f) => <Insignia><span className="capitalize">{f.modulo}</span></Insignia>,
    },
    {
      clave: 'cliente',
      titulo: 'IP / Dispositivo',
      tipo: 'texto',
      valorOrden: (f) => f.ip_cliente ?? '',
      render: (f) => (
        <div className="max-w-48">
          <p className="font-mono font-medium">{f.ip_cliente ?? 'No registrada'}</p>
          <p className="truncate text-body-sm text-fg-muted" title={f.agente_cliente}>{f.agente_cliente || 'Dispositivo no registrado'}</p>
        </div>
      ),
    },
    {
      clave: 'severidad',
      titulo: 'Severidad',
      tipo: 'texto',
      valorOrden: (f) => f.severidad,
      render: (f) => <EstadoBadge tipo={NIVEL[f.severidad]?.[0] ?? 'info'}>{NIVEL[f.severidad]?.[1] ?? f.severidad}</EstadoBadge>,
    },
    {
      clave: 'detalle',
      titulo: '',
      ordenable: false,
      render: (f) => <BotonIcono icono={ICONOS.ver} etiqueta={`Ver detalle del registro ${f.id_bitacora}`} titulo="Ver detalle" onClick={() => setSeleccionado(f)} />,
    },
  ];

  return <div className="space-y-6">
    <EncabezadoPagina seccion="Administración · Bitácora" titulo="Bitácora de actividad" descripcion="Rastrea cambios, accesos y patrones operativos. El análisis se calcula en PostgreSQL sobre los filtros elegidos." acciones={<EstadoBadge tipo="exito">Auditoría activa</EstadoBadge>} />
    <Card titulo="Filtros" descripcion="Combina período, operador, módulo, evento y texto libre."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
      <label className="block text-label">Desde<input className="input mt-1.5 h-10 py-0" type="date" value={fechas.startDate} max={fechas.endDate} onChange={e=>{setFechas(f=>({...f,startDate:e.target.value}));setPagina(1);}}/></label>
      <label className="block text-label">Hasta<input className="input mt-1.5 h-10 py-0" type="date" value={fechas.endDate} min={fechas.startDate} max={hoyLocal()} onChange={e=>{setFechas(f=>({...f,endDate:e.target.value}));setPagina(1);}}/></label>
      <label className="block text-label">Operador<input className="input mt-1.5 h-10 py-0" placeholder="Nombre de usuario" value={filtros.user} onChange={e=>cambiarFiltro('user',e.target.value)}/></label>
      <Select etiqueta="Módulo" value={filtros.module} onChange={e=>cambiarFiltro('module',e.target.value)} placeholder="Todos los módulos" opciones={modulos.map(m=>({valor:m,texto:m[0]?.toUpperCase()+m.slice(1)}))}/>
      <Select etiqueta="Acción" value={filtros.action} onChange={e=>cambiarFiltro('action',e.target.value)} placeholder="Todas las acciones" opciones={[{valor:'CREATE',texto:'Creación'},{valor:'UPDATE',texto:'Actualización'},{valor:'DELETE',texto:'Eliminación'},{valor:'LOGIN',texto:'Acceso'}]}/>
      <Select etiqueta="Severidad" value={filtros.severity} onChange={e=>cambiarFiltro('severity',e.target.value)} placeholder="Todas" opciones={[{valor:'',texto:'Todas'},{valor:'INFO',texto:'INFO'},{valor:'WARNING',texto:'WARNING'},{valor:'CRITICAL',texto:'CRITICAL'},{valor:'ERROR',texto:'ERROR'}]}/>
      <label className="block text-label">Buscar en evento<div className="relative mt-1.5"><ICONOS.buscar size={16} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"/><input className="input h-10 py-0 pl-9" placeholder="Entidad, datos, IP…" value={filtros.search} onChange={e=>cambiarFiltro('search',e.target.value)}/></div></label>
    </div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-body-sm tabular-nums text-fg-muted">{respuesta.pagination.total.toLocaleString('es-SV')} eventos encontrados</p><Button variante="ghost" icono={ICONOS.actualizar} onClick={()=>{consultaLista();consultaMetricas();}}>Actualizar datos</Button></div></Card>
    <section aria-label="Indicadores de auditoría">{cargandoMetricas?<Card><SkeletonTexto lineas={4} texto="Calculando analítica de auditoría…"/></Card>:errorMetricas?<ErrorEnLinea texto={errorMetricas} reintentar={consultaMetricas}/>:metricas?<BitacoraMetricas metricas={{...metricas,granularidad}}/>:null}</section>
    <Card titulo="Registro de eventos" descripcion="Ordenado por fecha descendente; selecciona un evento para revisar sus diferencias." sinPadding>
      {error ? (
        <div className="p-5"><ErrorEnLinea texto={error} reintentar={consultaLista} /></div>
      ) : (
        <Table
          columnas={columnas}
          filas={respuesta.data}
          idFila="id_bitacora"
          idTabla="seguridad-bitacora"
          cargando={cargando}
          vacio={<EstadoVacio icono={ICONOS.buscar} titulo="Sin eventos">No hay eventos para los filtros seleccionados.</EstadoVacio>}
          maxAltura="max-h-[38rem]"
          total={respuesta.pagination.total}
          pagina={pagina}
          porPagina={porPagina}
          onCambiarPagina={(nuevaPagina) => setPagina(nuevaPagina)}
          onCambiarPorPagina={(nuevoLimite) => {
            setPorPagina(nuevoLimite);
            setPagina(1);
          }}
          opcionesFilasPorPagina={[10, 25, 50, 100]}
        />
      )}
    </Card>
    {seleccionado&&<DetalleRegistro registro={seleccionado} onCerrar={()=>setSeleccionado(null)}/>}
  </div>;
}
