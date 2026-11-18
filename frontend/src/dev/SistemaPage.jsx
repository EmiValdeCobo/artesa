import { useState } from 'react';
import {
  AlertTriangle, Banknote, Boxes, Coffee, Mail, Moon, Monitor, Package, Plus, Receipt, Search, Sun, Trash2, Pencil, Users,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';
import { useAlert } from '../components/feedback/AlertProvider.jsx';
import { Button, BotonIcono, Card, Select, Table } from '../components/ui/index.js';
import Metrica from '../components/display/Metrica.jsx';
import EncabezadoPagina from '../components/display/EncabezadoPagina.jsx';
import EstadoBadge from '../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../components/feedback/EstadoVacio.jsx';
import BannerError from '../components/feedback/BannerError.jsx';
import AvisoError from '../components/feedback/AvisoError.jsx';
import Skeleton, { SkeletonFilas, SkeletonTexto, PuntosCarga } from '../components/feedback/Skeleton.jsx';
import Insignia from '../components/branding/Insignia.jsx';
import Logo from '../components/branding/Logo.jsx';
import CampoTexto from '../components/forms/CampoTexto.jsx';
import CampoBorde from '../components/forms/CampoBorde.jsx';
import PasswordInput from '../components/forms/PasswordInput.jsx';
import CampoError, { idError } from '../components/forms/CampoError.jsx';
import Pestanas from '../components/navigation/Pestanas.jsx';
import Dialogo from '../components/Dialogo.jsx';
import PaginaNoEncontrada from '../components/sistema/PaginaNoEncontrada.jsx';
import AccesoDenegado from '../components/sistema/AccesoDenegado.jsx';
import ErrorSistema from '../components/sistema/ErrorSistema.jsx';
import EnConstruccion from '../components/sistema/EnConstruccion.jsx';

/* Hoja de estilo viva del sistema de diseño (solo en desarrollo: /_sistema).
   Sirve para revisar tokens y componentes base en claro/oscuro y en móvil antes de tocar módulos.
   No usa la API ni requiere sesión: todos los datos son de muestra. */

const COLORES = [
  ['Página', 'bg-background'], ['Superficie', 'bg-surface'], ['Atenuado', 'bg-muted'], ['Sidebar', 'bg-sidebar'],
  ['Primario', 'bg-primary'], ['Primario suave', 'bg-primary-soft'], ['Acento Ocre', 'bg-secondary'], ['Ocre suave', 'bg-secondary-soft'],
  ['Éxito', 'bg-success'], ['Aviso', 'bg-warning'], ['Peligro', 'bg-danger'], ['Información', 'bg-info'],
  ['Divisor', 'bg-line'], ['Borde de control', 'bg-line-strong'], ['Texto', 'bg-fg'], ['Texto secundario', 'bg-fg-muted'],
];
const SERIES = ['bg-serie-1', 'bg-serie-2', 'bg-serie-3', 'bg-serie-4', 'bg-serie-5', 'bg-chart-neutral', 'bg-chart-focus'];
const CALOR = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];

const TIPOGRAFIA = [
  ['Display 40/48', 'font-display text-display', 'Pan de la casa'],
  ['Display 32/40', 'font-display text-display-sm', 'Pan de la casa'],
  ['H1 28/36', 'font-display text-h1 font-semibold', 'Usuarios y roles'],
  ['H2 22/30', 'text-h2', 'Ventas por hora'],
  ['H3 18/26', 'text-h3', 'Productos más vendidos'],
  ['Cuerpo 16/24', 'text-body-lg', 'Registra la venta y emite el DTE.'],
  ['Cuerpo 14/22', 'text-body', 'Registra la venta y emite el DTE.'],
  ['Cuerpo 13/20', 'text-body-sm', 'Actualizado hace 2 minutos'],
  ['Etiqueta 14/20', 'text-label', 'Nombre de usuario'],
  ['Etiqueta 12/16', 'text-label-sm', 'Filas por página'],
  ['Overline 11/16', 'rotulo', 'Operación · Inicio'],
  ['KPI 30/38', 'kpi text-kpi', '$1,284.50'],
  ['Mono', 'font-mono text-body-sm', 'DTE-01-M001P001-000000000000123'],
];

const FILAS = [
  { id: 1, usuario: 'mlopez', rol: 'Cajero', sucursal: 'Centro', ventas: '1284.50', activo: true },
  { id: 2, usuario: 'jramirez', rol: 'Barista', sucursal: 'Escalón', ventas: '932.10', activo: true },
  { id: 3, usuario: 'admin', rol: 'Administrador', sucursal: 'Todas', ventas: '0.00', activo: true },
  { id: 4, usuario: 'cperez', rol: 'Cocina', sucursal: 'Centro', ventas: '0.00', activo: false },
  { id: 5, usuario: 'amartinez', rol: 'Cajero', sucursal: 'Santa Tecla', ventas: '2045.75', activo: true },
  { id: 6, usuario: 'lhernandez', rol: 'Supervisor', sucursal: 'Escalón', ventas: '310.00', activo: true },
];

const dinero = (v) => `$${Number(v).toLocaleString('es-SV', { minimumFractionDigits: 2 })}`;

function Seccion({ titulo, children }) {
  return (
    <section className="space-y-4">
      <h2 className="rotulo">{titulo}</h2>
      {children}
    </section>
  );
}

export default function SistemaPage() {
  const { tema, elegir } = useTheme();
  const { notificar, confirm } = useAlert();
  const [pestana, setPestana] = useState('resumen');
  const [dialogo, setDialogo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [banner, setBanner] = useState(true);
  const [rol, setRol] = useState('');

  const simularCarga = () => { setCargando(true); setTimeout(() => setCargando(false), 1800); };

  const columnas = [
    { clave: 'usuario', titulo: 'Usuario', render: (f) => <span className="font-medium">{f.usuario}</span> },
    { clave: 'rol', titulo: 'Rol' },
    { clave: 'sucursal', titulo: 'Sucursal', clase: 'hidden md:table-cell' },
    { clave: 'ventas', titulo: 'Ventas del mes', tipo: 'dinero', alinear: 'right', render: (f) => dinero(f.ventas) },
    { clave: 'activo', titulo: 'Estado', tipo: 'booleano', render: (f) => <EstadoBadge tipo={f.activo ? 'exito' : 'inactivo'}>{f.activo ? 'Activo' : 'Inactivo'}</EstadoBadge> },
    { clave: 'acciones', titulo: 'Acciones', alinear: 'right', render: () => (
      <div className="flex justify-end gap-1.5">
        <BotonIcono icono={Pencil} etiqueta="Editar usuario" />
        <BotonIcono icono={Trash2} etiqueta="Eliminar usuario" tono="peligro" />
      </div>
    ) },
  ];

  return (
    <div className="min-h-screen bg-background text-fg">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <EncabezadoPagina
          seccion="Desarrollo · Sistema de diseño"
          titulo="artesa — tokens y componentes"
          descripcion="Hoja viva para revisar la marca en ambos temas. Solo existe en desarrollo."
          acciones={(
            <div role="radiogroup" aria-label="Tema" className="flex rounded-md border border-line bg-surface p-0.5">
              {[['light', Sun, 'Claro'], ['dark', Moon, 'Oscuro'], ['system', Monitor, 'Sistema']].map(([valor, Icono, texto]) => (
                <button key={valor} type="button" role="radio" aria-checked={tema === valor} onClick={() => elegir(valor)}
                  className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-label transition-colors ${tema === valor ? 'bg-primary-soft text-primary-text' : 'text-fg-muted hover:text-fg'}`}>
                  <Icono size={16} strokeWidth={1.75} aria-hidden="true" /> {texto}
                </button>
              ))}
            </div>
          )}
        />

        <Seccion titulo="Logo">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card flex flex-wrap items-end gap-6">
              <Logo variante="completo" alto={40} respeto />
              <Logo variante="isotipo" alto={40} />
              <Logo variante="isotipo" alto={24} />
              <Logo variante="completo" alto={20} />
              <p className="w-full text-body-sm text-fg-muted">Lockup 40 px con área de respeto · símbolo 40 px · corte pequeño 24 px · lockup que no llega a 120 px de ancho → solo símbolo.</p>
            </div>
            <div className="flex flex-wrap items-end gap-6 rounded-lg bg-sidebar p-5">
              <Logo variante="completo" tema="oscuro" alto={40} />
              <Logo variante="isotipo" tema="oscuro" alto={40} />
              <Logo variante="isotipo" tema="mono-claro" alto={24} />
              <p className="w-full text-body-sm text-on-sidebar-muted">Sobre Espresso: variante oscura (Ocre + Alabastro) y una tinta clara.</p>
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Color">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {COLORES.map(([nombre, clase]) => (
              <div key={nombre} className="overflow-hidden rounded-md border border-line bg-surface">
                <div className={`h-12 ${clase}`} />
                <p className="px-2 py-1.5 text-label-sm">{nombre}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2"><span className="text-label-sm text-fg-muted">Series</span>{SERIES.map((c) => <span key={c} className={`size-6 rounded-xs ${c}`} />)}</div>
            <div className="flex items-center gap-1"><span className="mr-1 text-label-sm text-fg-muted">Calor</span>{CALOR.map((c) => <span key={c} className={`size-6 rounded-xs border border-line ${c}`} />)}</div>
          </div>
        </Seccion>

        <Seccion titulo="Tipografía">
          <div className="card divide-y divide-line !py-1">
            {TIPOGRAFIA.map(([nombre, clase, ejemplo]) => (
              <div key={nombre} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-32 shrink-0 text-label-sm text-fg-muted">{nombre}</span>
                <span className={clase}>{ejemplo}</span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Botones">
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button icono={Plus}>Nueva venta</Button>
              <Button variante="secondary">Guardar borrador</Button>
              <Button variante="ghost">Cancelar</Button>
              <Button variante="danger" icono={Trash2}>Anular venta</Button>
              <Button disabled>Deshabilitado</Button>
              <Button cargando={cargando} onClick={simularCarga}>{cargando ? 'Guardando…' : 'Probar carga'}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button tamano="sm">Pequeño 32</Button>
              <Button>Mediano 40</Button>
              <Button tamano="lg" icono={Banknote}>Cobrar $12.75</Button>
              <BotonIcono icono={Pencil} etiqueta="Editar" />
              <BotonIcono icono={AlertTriangle} etiqueta="Revisar" tono="aviso" />
              <BotonIcono icono={Trash2} etiqueta="Eliminar" tono="peligro" />
              <BotonIcono icono={Pencil} etiqueta="Guardando" cargando />
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Formularios">
          <div className="card grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="demo-nombre" className="mb-1.5 block text-label">Nombre del insumo</label>
              <input id="demo-nombre" className="input" placeholder="Ej. Harina de trigo" />
            </div>
            <div>
              <label htmlFor="demo-error" className="mb-1.5 block text-label">Precio</label>
              <input id="demo-error" className="input" defaultValue="-3" aria-invalid="true" aria-describedby={idError('demo-error')} />
              <CampoError id="demo-error" mensaje="El precio debe ser mayor que cero." />
            </div>
            <Select id="demo-rol" etiqueta="Rol" placeholder="Selecciona un rol" value={rol}
              onChange={(e, v) => setRol(v ?? e?.target?.value)}
              opciones={[{ valor: 'cajero', texto: 'Cajero' }, { valor: 'barista', texto: 'Barista' }, { valor: 'admin', texto: 'Administrador' }]} />
            <div>
              <label htmlFor="demo-deshabilitado" className="mb-1.5 block text-label">Código (solo lectura)</label>
              <input id="demo-deshabilitado" className="input font-mono" value="USR-000123" disabled readOnly />
            </div>
            <div>
              <label htmlFor="demo-correo" className="mb-1.5 block text-label">Campo de acceso</label>
              <CampoTexto id="demo-correo" icono={Mail} placeholder="usuario" />
            </div>
            <div>
              <label htmlFor="demo-clave" className="mb-1.5 block text-label">Contraseña</label>
              <PasswordInput id="demo-clave" placeholder="••••••••" />
            </div>
            <CampoBorde id="demo-borde" etiqueta="Usuario" icono={Users} placeholder="Campo con etiqueta en el borde" />
          </div>
        </Seccion>

        <Seccion titulo="Indicadores (Metrica) y tarjetas">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica icono={Receipt} etiqueta="Ventas de hoy" valor="$1,284.50" />
            <Metrica icono={Coffee} etiqueta="Tickets" valor="96" tono="info" />
            <Metrica icono={Boxes} etiqueta="Insumos bajo mínimo" valor="4" tono="aviso" />
            <Metrica icono={AlertTriangle} etiqueta="Facturas vencidas" valor="2" tono="peligro" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card icono={Package} titulo="Productos más vendidos" descripcion="Últimos 7 días"
              acciones={<div className="w-36"><Select id="demo-periodo" aria-label="Periodo" tamano="sm" value="7" onChange={() => {}} opciones={[{ valor: '7', texto: '7 días' }, { valor: '14', texto: '14 días' }, { valor: '30', texto: '30 días' }]} /></div>}
              className="lg:col-span-2">
              <ul className="divide-y divide-line">
                {[['Café americano', 182], ['Pan de yema', 140], ['Quesadilla salvadoreña', 96], ['Cappuccino', 88]].map(([n, u], i) => (
                  <li key={n} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="flex items-center gap-3"><span className="w-5 text-label-sm tabular-nums text-fg-muted">{i + 1}</span>{n}</span>
                    <span className="tabular-nums text-fg-muted">{u} u.</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card titulo="Cargando">
              <SkeletonTexto lineas={4} />
              <div className="mt-4 flex items-center gap-3"><Skeleton className="size-10 rounded-md" /><Skeleton className="h-3.5 flex-1" /></div>
            </Card>
          </div>
        </Seccion>

        <Seccion titulo="Avisos">
          {banner && <BannerError error={{ titulo: 'No se pudieron cargar las existencias', mensaje: 'El servidor tardó demasiado en responder.', accion: 'Revisa tu conexión e inténtalo de nuevo.', reintentable: true, categoria: 'red' }} onReintentar={() => {}} onCerrar={() => setBanner(false)} />}
          <AvisoError error={{ titulo: 'Error del sistema', mensaje: 'No se pudo calcular el cuadre.', accion: '', reintentable: true, categoria: 'sistema' }} onReintentar={() => {}} />
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge tipo="exito">Emitida</EstadoBadge>
            <EstadoBadge tipo="aviso">Pendiente</EstadoBadge>
            <EstadoBadge tipo="error">Anulada</EstadoBadge>
            <EstadoBadge tipo="info">Turno abierto</EstadoBadge>
            <EstadoBadge tipo="inactivo">Inactivo</EstadoBadge>
            <EstadoBadge tipo="cargando">En proceso</EstadoBadge>
            <Insignia>Sistema</Insignia>
            <Insignia variante="primario">Tu rol</Insignia>
            <Insignia variante="exito">12</Insignia>
            <Insignia variante="aviso">Bajo mínimo</Insignia>
            <Insignia variante="peligro">Vencida</Insignia>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variante="ghost" onClick={() => notificar.exito('Venta registrada', { mensaje: 'Ticket 000123 emitido.' })}>Toast éxito</Button>
            <Button variante="ghost" onClick={() => notificar.advertencia('Stock bajo', { mensaje: 'Quedan 2 kg de harina.' })}>Toast aviso</Button>
            <Button variante="ghost" onClick={() => notificar.error('No se pudo guardar', { mensaje: 'Inténtalo de nuevo.' })}>Toast error</Button>
            <Button variante="ghost" onClick={() => confirm('¿Anular la venta 000123? Esta acción no se puede deshacer.', { destructivo: true, titulo: 'Anular venta', etiquetaAceptar: 'Anular' })}>Confirmación</Button>
            <Button variante="ghost" onClick={() => setDialogo(true)}>Diálogo</Button>
          </div>
        </Seccion>

        <Seccion titulo="Pestañas, tabla y estados">
          <div className="card !p-0">
            <Pestanas etiqueta="Secciones de ejemplo" activa={pestana} onCambiar={setPestana} className="px-4"
              pestanas={[{ clave: 'resumen', texto: 'Usuarios', icono: Users, total: FILAS.length }, { clave: 'carga', texto: 'Cargando' }, { clave: 'vacio', texto: 'Vacío' }]} />
            <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
              {pestana === 'resumen' && <Table columnas={columnas} filas={FILAS} idFila="id" idSeleccionado={2} idTabla="demo-sistema" />}
              {pestana === 'carga' && <Table columnas={columnas} filas={[]} cargando />}
              {pestana === 'vacio' && (
                <EstadoVacio icono={Search} titulo="Sin resultados" accion={<Button variante="ghost" onClick={() => setPestana('resumen')}>Limpiar búsqueda</Button>}>
                  No hay usuarios que coincidan con «panadero». Prueba con otro término.
                </EstadoVacio>
              )}
            </div>
          </div>
          <div className="card"><SkeletonFilas filas={3} /></div>
          <p className="flex items-center gap-2 text-body-sm text-fg-muted"><PuntosCarga /> Puntos de carga sueltos</p>
        </Seccion>

        <Seccion titulo="Páginas de sistema">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card"><PaginaNoEncontrada /></div>
            <div className="card"><AccesoDenegado /></div>
            <div className="card"><ErrorSistema acciones={<><Button>Recargar página</Button><Button variante="ghost">Ir al inicio</Button></>} /></div>
            <div className="card"><EnConstruccion /></div>
          </div>
        </Seccion>
      </div>

      {dialogo && (
        <Dialogo onCerrar={() => setDialogo(false)} labelledBy="demo-dialogo-titulo">
          <div className="p-6">
            <h2 id="demo-dialogo-titulo" className="text-h3">Nuevo usuario</h2>
            <p className="mt-1 text-body text-fg-muted">Los diálogos usan radio xl y sombra lg; en móvil son una hoja inferior.</p>
            <label htmlFor="demo-dialogo-usuario" className="mb-1.5 mt-5 block text-label">Usuario</label>
            <input id="demo-dialogo-usuario" className="input" placeholder="Ej. mlopez" />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variante="ghost" onClick={() => setDialogo(false)}>Cancelar</Button>
              <Button onClick={() => setDialogo(false)}>Crear usuario</Button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
