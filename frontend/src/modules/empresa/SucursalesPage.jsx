import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Pencil, Phone, Plus, Power, Search, Store, X } from 'lucide-react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { Button, Card, Select, Table } from '../../components/ui/index.js';

const FORMULARIO_VACIO = {
  codigoEstablecimiento: '',
  nombre: '',
  direccion: '',
  departamento: 'San Salvador',
  telefono: '',
  activa: true,
};

const CAMPOS = [
  { clave: 'codigoEstablecimiento', etiqueta: 'Código de establecimiento', ayuda: 'Cuatro caracteres, por ejemplo M001.', maxLength: 4, requerido: true },
  { clave: 'nombre', etiqueta: 'Nombre de la sucursal', maxLength: 100, requerido: true },
  { clave: 'direccion', etiqueta: 'Dirección', maxLength: 500, requerido: true },
  { clave: 'departamento', etiqueta: 'Departamento', maxLength: 50, requerido: true },
  { clave: 'telefono', etiqueta: 'Teléfono', maxLength: 20, requerido: false },
];

function ordenarSucursales(lista) {
  return [...lista].sort((a, b) => a.id_sucursal - b.id_sucursal);
}

function normalizarTexto(valor) {
  return String(valor ?? '').trim().toLocaleLowerCase('es');
}

function FormularioSucursal({ formulario, setFormulario, guardando, editando, errorGuardado, onCancelar, onGuardar }) {
  return (
    <Dialogo onCerrar={onCancelar} tamano="lg" labelledBy="sucursal-dialogo-titulo" describedBy="sucursal-dialogo-descripcion">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">Empresa · Sucursales</p>
          <h2 id="sucursal-dialogo-titulo" className="mt-1 text-xl font-semibold">
            {editando ? 'Editar sucursal' : 'Registrar sucursal'}
          </h2>
          <p id="sucursal-dialogo-descripcion" className="mt-1 text-sm text-fg-muted">
            Completa los datos del establecimiento. Puedes cambiar su estado en cualquier momento.
          </p>
        </div>
        <button type="button" onClick={onCancelar} className="rounded-md p-2 text-fg-muted hover:bg-muted hover:text-fg" aria-label="Cerrar formulario">
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      {errorGuardado && <div className="px-5 pt-4 sm:px-6"><BannerError error={{ titulo: 'No se pudo guardar la sucursal', mensaje: errorGuardado, accion: '' }} /></div>}

      <form onSubmit={onGuardar} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map((campo) => (
            <label key={campo.clave} className={`block text-sm font-medium ${campo.clave === 'direccion' ? 'sm:col-span-2' : ''}`}>
              {campo.etiqueta}
              <input
                className="input mt-1.5"
                value={formulario[campo.clave]}
                onChange={(evento) => setFormulario((actual) => ({
                  ...actual,
                  [campo.clave]: campo.clave === 'codigoEstablecimiento' ? evento.target.value.toUpperCase() : evento.target.value,
                }))}
                required={campo.requerido}
                maxLength={campo.maxLength}
                pattern={campo.clave === 'codigoEstablecimiento' ? '[A-Z0-9]{4}' : undefined}
                autoComplete={campo.clave === 'telefono' ? 'tel' : campo.clave === 'direccion' ? 'street-address' : 'off'}
                aria-describedby={campo.ayuda ? 'codigo-sucursal-ayuda' : undefined}
              />
              {campo.ayuda && <span id="codigo-sucursal-ayuda" className="mt-1 block text-xs font-normal text-fg-muted">{campo.ayuda}</span>}
            </label>
          ))}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-muted/50 p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={formulario.activa}
            onChange={(evento) => setFormulario((actual) => ({ ...actual, activa: evento.target.checked }))}
          />
          <span>
            <span className="block text-sm font-medium">Sucursal activa</span>
            <span className="mt-0.5 block text-xs text-fg-muted">Las sucursales inactivas se conservan en el historial, pero no se consideran operativas.</span>
          </span>
        </label>

        <div className="flex flex-col-reverse justify-end gap-2 border-t border-line pt-4 sm:flex-row">
          <Button variante="ghost" onClick={onCancelar}>Cancelar</Button>
          <Button type="submit" icono={editando ? Pencil : Plus} cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear sucursal'}
          </Button>
        </div>
      </form>
    </Dialogo>
  );
}

export default function SucursalesPage() {
  const { notificar } = useAlert();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorEstado, setErrorEstado] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todas');
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [editando, setEditando] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();
    async function cargarSucursales() {
      setCargando(true);
      setErrorCarga(null);
      try {
        const datos = await api.get('/empresa/sucursales', { signal: controlador.signal });
        setFilas(ordenarSucursales(datos));
      } catch (error) {
        if (!controlador.signal.aborted) setErrorCarga(error.message);
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }
    cargarSucursales();
    return () => controlador.abort();
  }, []);

  const sucursalesFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda);
    return filas.filter((fila) => {
      const coincideEstado = estadoFiltro === 'todas'
        || (estadoFiltro === 'activas' && fila.activa)
        || (estadoFiltro === 'inactivas' && !fila.activa);
      const coincideTexto = !termino || [
        fila.codigo_establecimiento,
        fila.nombre,
        fila.direccion,
        fila.departamento,
        fila.telefono,
      ].some((valor) => normalizarTexto(valor).includes(termino));
      return coincideEstado && coincideTexto;
    });
  }, [filas, busqueda, estadoFiltro]);

  const activas = filas.filter((fila) => fila.activa).length;
  const inactivas = filas.length - activas;

  function abrirNueva() {
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorGuardado(null);
    setModalAbierto(true);
  }

  function abrirEdicion(fila) {
    setEditando(fila.id_sucursal);
    setFormulario({
      codigoEstablecimiento: fila.codigo_establecimiento,
      nombre: fila.nombre,
      direccion: fila.direccion ?? '',
      departamento: fila.departamento ?? '',
      telefono: fila.telefono ?? '',
      activa: fila.activa,
    });
    setErrorGuardado(null);
    setModalAbierto(true);
  }

  function cerrarFormulario() {
    if (guardando) return;
    setModalAbierto(false);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorGuardado(null);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorGuardado(null);
    const editandoId = editando;
    try {
      const guardada = editandoId
        ? await api.put(`/empresa/sucursales/${editandoId}`, formulario)
        : await api.post('/empresa/sucursales', formulario);
      setFilas((actuales) => ordenarSucursales(
        editandoId
          ? actuales.map((fila) => fila.id_sucursal === editandoId ? { ...fila, ...guardada } : fila)
          : [...actuales, guardada],
      ));
      notificar.exito(editandoId ? 'Sucursal actualizada' : 'Sucursal creada');
      setModalAbierto(false);
      setEditando(null);
      setFormulario(FORMULARIO_VACIO);
    } catch (error) {
      setErrorGuardado(error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(fila) {
    setCambiandoEstado(fila.id_sucursal);
    setErrorEstado(null);
    try {
      const actualizada = await api.patch(`/empresa/sucursales/${fila.id_sucursal}/estado`, { activa: !fila.activa });
      setFilas((actuales) => actuales.map((item) => item.id_sucursal === fila.id_sucursal ? { ...item, ...actualizada } : item));
      notificar.exito(actualizada.activa ? 'Sucursal activada' : 'Sucursal desactivada');
    } catch (error) {
      setErrorEstado(error.message);
    } finally {
      setCambiandoEstado(null);
    }
  }

  const columnas = [
    {
      clave: 'codigo_establecimiento',
      titulo: 'Código',
      render: (fila) => <span className="inline-flex rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold tracking-wide">{fila.codigo_establecimiento}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Establecimiento',
      render: (fila) => (
        <div className="min-w-44">
          <p className="font-semibold text-fg">{fila.nombre}</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-fg-muted">
            <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{fila.direccion || 'Sin dirección registrada'}</span>
          </p>
        </div>
      ),
    },
    { clave: 'departamento', titulo: 'Departamento', render: (fila) => fila.departamento || '—' },
    {
      clave: 'telefono',
      titulo: 'Contacto',
      render: (fila) => <span className="inline-flex items-center gap-1.5 text-fg-muted">{fila.telefono ? <><Phone size={13} aria-hidden="true" />{fila.telefono}</> : '—'}</span>,
    },
    {
      clave: 'activa',
      titulo: 'Estado',
      render: (fila) => <EstadoBadge tipo={fila.activa ? 'exito' : 'alerta'}>{fila.activa ? 'Activa' : 'Inactiva'}</EstadoBadge>,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      render: (fila) => (
        <div className="flex justify-end gap-2">
          <Button variante="ghost" icono={Pencil} className="px-3" onClick={() => abrirEdicion(fila)} aria-label={`Editar ${fila.nombre}`}>Editar</Button>
          <Button
            variante="secondary"
            icono={Power}
            className="px-3"
            disabled={Boolean(cambiandoEstado)}
            cargando={cambiandoEstado === fila.id_sucursal}
            onClick={() => alternarEstado(fila)}
            aria-label={`${fila.activa ? 'Desactivar' : 'Activar'} ${fila.nombre}`}
          >
            {fila.activa ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Empresa"
        titulo="Sucursales"
        descripcion="Organiza los establecimientos, consulta sus datos y controla cuáles están operativos."
        acciones={<Button icono={Plus} onClick={abrirNueva}>Nueva sucursal</Button>}
      />

      {errorCarga && <BannerError error={{ titulo: 'No se pudieron cargar los establecimientos', mensaje: errorCarga, accion: '' }} />}
      {errorEstado && <BannerError error={{ titulo: 'No se pudo cambiar el estado de la sucursal', mensaje: errorEstado, accion: '' }} />}

      <section aria-label="Resumen de sucursales" className="grid gap-3 sm:grid-cols-3">
        <Metrica icono={Store} valor={cargando ? '…' : filas.length} etiqueta="Establecimientos registrados" tono="primario" />
        <Metrica icono={Building2} valor={cargando ? '…' : activas} etiqueta="Sucursales activas" tono="exito" />
        <Metrica icono={Power} valor={cargando ? '…' : inactivas} etiqueta="Sucursales inactivas" tono="neutro" />
      </section>

      <Card titulo="Directorio de sucursales" descripcion="Busca por código, nombre, dirección o departamento; filtra por estado operativo.">
        <div className="mb-4 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-4">
          <label className="relative block w-full min-w-0 flex-1">
            <span className="sr-only">Buscar sucursal</span>
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <input className="input h-10 py-0 pl-10" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar sucursal…" />
          </label>
          <div className="w-full sm:w-56 sm:shrink-0">
            <Select
              etiqueta="Estado"
              className="h-10 py-0"
              value={estadoFiltro}
              onChange={(evento) => setEstadoFiltro(evento.target.value)}
              opciones={[
                { valor: 'todas', texto: 'Todos los estados' },
                { valor: 'activas', texto: 'Solo activas' },
                { valor: 'inactivas', texto: 'Solo inactivas' },
              ]}
            />
          </div>
        </div>
        <div className="mb-3 mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted">
          <span>{sucursalesFiltradas.length} de {filas.length} establecimientos</span>
          {(busqueda || estadoFiltro !== 'todas') && (
            <button type="button" className="font-semibold text-primary-text hover:underline" onClick={() => { setBusqueda(''); setEstadoFiltro('todas'); }}>
              Limpiar filtros
            </button>
          )}
        </div>
        <Table
          cargando={cargando}
          filas={sucursalesFiltradas}
          idFila="id_sucursal"
          vacio={filas.length ? 'No hay sucursales que coincidan con los filtros.' : 'Todavía no hay establecimientos registrados. Crea la primera sucursal para comenzar.'}
          columnas={columnas}
        />
      </Card>

      {modalAbierto && (
        <FormularioSucursal
          formulario={formulario}
          setFormulario={setFormulario}
          guardando={guardando}
          editando={editando}
          errorGuardado={errorGuardado}
          onCancelar={cerrarFormulario}
          onGuardar={guardar}
        />
      )}
    </div>
  );
}
