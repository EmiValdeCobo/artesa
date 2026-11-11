const COLORES = { INFO: 'bg-info', WARNING: 'bg-warning', ERROR: 'bg-danger', CRITICAL: 'bg-primary' };
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function GraficaTendencia({ datos }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  const puntos = datos.map((d, i) => `${datos.length < 2 ? 50 : 8 + (i * 84) / (datos.length - 1)},${92 - (d.total / max) * 78}`).join(' ');
  if (!datos.length) return <p className="py-8 text-center text-sm text-fg-muted">Sin actividad para este período.</p>;
  return <div className="overflow-x-auto"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 min-w-[420px] w-full" role="img" aria-label="Tendencia del volumen de eventos">
    {[14, 34, 54, 74, 94].map((y) => <line key={y} x1="5" x2="98" y1={y} y2={y} stroke="currentColor" className="text-line" strokeWidth=".35"/>)}
    <polyline points={puntos} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
    {datos.map((d, i) => { const [x, y] = puntos.split(' ')[i].split(','); return <circle key={d.periodo} cx={x} cy={y} r="1.6" className="fill-primary"><title>{`${new Date(d.periodo).toLocaleString('es-SV', {timeZone:'America/El_Salvador'})}: ${d.total} eventos`}</title></circle>; })}
  </svg><div className="mt-2 flex justify-between text-[10px] text-fg-muted"><span>{new Date(datos[0].periodo).toLocaleDateString('es-SV',{timeZone:'America/El_Salvador'})}</span><span>{new Date(datos.at(-1).periodo).toLocaleDateString('es-SV',{timeZone:'America/El_Salvador'})}</span></div></div>;
}

function ModulosSeveridad({ datos }) {
  const modulos = [...new Set(datos.map((x) => x.modulo))];
  if (!modulos.length) return <p className="py-8 text-center text-sm text-fg-muted">Sin actividad para este período.</p>;
  const total = Math.max(1, ...modulos.map((modulo) => datos.filter((x) => x.modulo === modulo).reduce((suma, x) => suma + x.total, 0)));
  return <div className="space-y-4">{modulos.map((modulo) => { const filas = datos.filter((x) => x.modulo === modulo); const subtotal = filas.reduce((suma, x) => suma + x.total, 0); return <div key={modulo}><div className="mb-1 flex justify-between text-xs"><span className="font-medium capitalize">{modulo}</span><span className="text-fg-muted">{subtotal}</span></div><div className="flex h-3 overflow-hidden rounded-full bg-muted" title={`${modulo}: ${subtotal} eventos`} style={{ width: `${Math.max(5, subtotal / total * 100)}%` }}>{['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((nivel) => { const cantidad = filas.find((x) => x.severidad === nivel)?.total ?? 0; return cantidad ? <span key={nivel} className={`${COLORES[nivel]} h-full`} style={{ width: `${cantidad / subtotal * 100}%` }} title={`${nivel}: ${cantidad}`}/> : null; })}</div></div>; })}<div className="flex flex-wrap gap-3 pt-2">{Object.entries(COLORES).map(([nivel, color])=><span className="flex items-center gap-1.5 text-[11px] text-fg-muted" key={nivel}><i className={`h-2.5 w-2.5 rounded-sm ${color}`}/>{nivel}</span>)}</div></div>;
}

function TopUsuarios({ datos }) {
  if (!datos.length) return <p className="py-8 text-center text-sm text-fg-muted">Sin modificaciones o accesos fuera de horario.</p>;
  const max = Math.max(1, ...datos.map((d) => d.total));
  return <div className="space-y-3">{datos.map((d) => <div key={d.usuario} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-xs"><span className="truncate" title={d.usuario}>{d.usuario}</span><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${d.total / max * 100}%` }}/></div><span className="text-right font-semibold">{d.total}</span><span className="col-start-2 -mt-1 text-[10px] text-fg-muted">{d.cambios_sensibles} cambios · {d.accesos_fuera_horario} accesos 22:00–05:59</span></div>)}</div>;
}

function Heatmap({ datos }) {
  const celdas = new Map(datos.map((d) => [`${d.dia_semana}-${d.hora}`, d.total]));
  const max = Math.max(1, ...datos.map((d) => d.total));
  return <div className="overflow-x-auto"><div className="min-w-[520px]"><div className="grid grid-cols-[2.4rem_repeat(24,minmax(0,1fr))] gap-1">{['', ...Array.from({length:24},(_,h)=>h)].map((x)=><span className="text-center text-[9px] text-fg-muted" key={`h${x}`}>{x === '' ? '' : x % 3 === 0 ? String(x).padStart(2,'0') : ''}</span>)}{DIAS.map((dia,dow)=><div className="contents" key={dia}><span className="self-center text-xs text-fg-muted">{dia}</span>{Array.from({length:24},(_,hora)=>{const total=celdas.get(`${dow}-${hora}`)??0;return <span key={`${dow}-${hora}`} className="aspect-square min-h-3 rounded-[2px] bg-primary" style={{opacity:total?0.12+0.88*total/max:0.04}} title={`${dia} ${String(hora).padStart(2,'0')}:00 · ${total} eventos`}/>})}</div>)}</div><div className="mt-2 text-right text-[10px] text-fg-muted">Menos actividad <span className="mx-1 inline-block h-2.5 w-16 rounded-sm bg-gradient-to-r from-primary/10 to-primary"/> Más actividad</div></div></div>;
}

export default function BitacoraMetricas({ metricas }) {
  return <section aria-label="Analítica de auditoría" className="grid gap-5 xl:grid-cols-2">
    <article className="card min-w-0"><h2 className="font-semibold">Tendencia de actividad</h2><p className="mb-3 mt-1 text-xs text-fg-muted">Volumen de eventos {metricas.granularidad === 'hour' ? 'por hora' : 'por día'}.</p><GraficaTendencia datos={metricas.tendencia}/></article>
    <article className="card min-w-0"><h2 className="font-semibold">Severidad por módulo</h2><p className="mb-4 mt-1 text-xs text-fg-muted">Distribución de eventos en cada módulo.</p><ModulosSeveridad datos={metricas.severidadModulo}/></article>
    <article className="card min-w-0"><h2 className="font-semibold">Acciones sensibles por usuario</h2><p className="mb-4 mt-1 text-xs text-fg-muted">Modificaciones, eliminaciones y accesos fuera de 22:00 a 05:59.</p><TopUsuarios datos={metricas.usuarios}/></article>
    <article className="card min-w-0"><h2 className="font-semibold">Actividad por día y hora</h2><p className="mb-4 mt-1 text-xs text-fg-muted">Concentración de eventos durante la semana.</p><Heatmap datos={metricas.heatmap}/></article>
  </section>;
}
