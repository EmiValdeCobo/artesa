import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';
import { api } from '../../api/client.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { aplicarMascara, mostrarTelefono, propsMascara, validarMascara } from '../../utils/mascaras.js';
import AperturaSucursalDialogo from './AperturaSucursalDialogo.jsx';

const FORMULARIO_VACIO = {
  codigoEstablecimiento: '',
  nombre: '',
  direccion: '',
  departamento: 'San Salvador',
  telefono: '',
  activa: true,
};

const CAMPOS = [
  { clave: 'codigoEstablecimiento', etiqueta: 'Código de establecimiento', ayuda: 'Cuatro letras o números, por ejemplo M001.', mascara: 'codigo', requerido: true },
  { clave: 'nombre', etiqueta: 'Nombre de la sucursal', maxLength: 100, requerido: true },
  { clave: 'direccion', etiqueta: 'Dirección', maxLength: 500, requerido: true },
  { clave: 'departamento', etiqueta: 'Departamento', maxLength: 50, requerido: true },
  { clave: 'telefono', etiqueta: 'Teléfono', ayuda: 'Ocho dígitos, se guarda como 2222-3333.', mascara: 'telefono', requerido: false },
];
const idCampo = (clave) => `sucursal-${clave}`;

// Mismas reglas que empresa.schemas.js, mostradas junto al campo antes de llamar a la API.
function validarSucursal(formulario) {
  const errores = {};
  CAMPOS.forEach((campo) => {
    const valor = String(formulario[campo.clave] ?? '').trim();
    const mensaje = campo.mascara
      ? validarMascara(campo.mascara, valor, { requerido: campo.requerido })
      : campo.requerido && !valor ? 'Este campo es obligatorio.' : '';
    if (mensaje) errores[campo.clave] = mensaje;
  });
  if (!errores.nombre && formulario.nombre.trim().length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  if (!errores.direccion && formulario.direccion.trim().length < 3) errores.direccion = 'La dirección debe tener al menos 3 caracteres.';
  return errores;
}

function ordenarSucursales(lista) {
  return [...lista].sort((a, b) => a.id_sucursal - b.id_sucursal);
}

function normalizarTexto(valor) {
  return String(valor ?? '').trim().toLocaleLowerCase('es');
}

function FormularioSucursal({ formulario, setFormulario, errores, setErrores, guardando, editando, onCancelar, onGuardar }) {
  return (
    <Dialogo onCerrar={onCancelar} tamano="lg" labelledBy="sucursal-dialogo-titulo" describedBy="sucursal-dialogo-descripcion">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">Administración · Sucursales</p>
          <h2 id="sucursal-dialogo-titulo" className="mt-1 text-xl font-semibold">
            {editando ? 'Editar sucursal' : 'Registrar sucursal'}
          </h2>
          <p id="sucursal-dialogo-descripcion" className="mt-1 text-sm text-fg-muted">
            Completa los datos del establecimiento. Puedes cambiar su estado en cualquier momento.
          </p>
        </div>
        <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar formulario" onClick={onCancelar} />
      </div>

      <form noValidate onSubmit={onGuardar} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map((campo) => {
            const id = idCampo(campo.clave);
            const ayudaId = `${id}-ayuda`;
            return (
              <div key={campo.clave} className={campo.clave === 'direccion' ? 'sm:col-span-2' : ''}>
                <label htmlFor={id} className="block text-sm font-medium">
                  {campo.etiqueta}{campo.requerido && <span className="ml-0.5 font-semibold text-danger">*</span>}
                </label>
                <input
                  id={id}
                  className="input mt-1.5 aria-invalid:border-danger"
                  {...(campo.mascara ? propsMascara(campo.mascara) : { maxLength: campo.maxLength, autoComplete: campo.clave === 'direccion' ? 'street-address' : 'off' })}
                  value={formulario[campo.clave]}
                  onChange={(evento) => {
                    const valor = campo.mascara ? aplicarMascara(campo.mascara, evento.target.value) : evento.target.value;
                    setFormulario((actual) => ({ ...actual, [campo.clave]: valor }));
                    setErrores(({ [campo.clave]: _quitado, ...resto }) => resto);
                  }}
                  aria-required={campo.requerido || undefined}
                  aria-invalid={errores[campo.clave] ? true : undefined}
                  aria-describedby={[campo.ayuda && ayudaId, errores[campo.clave] && idError(id)].filter(Boolean).join(' ') || undefined}
                />
                {campo.ayuda && !errores[campo.clave] && <span id={ayudaId} className="mt-1 block text-xs text-fg-muted">{campo.ayuda}</span>}
                <CampoError id={id} mensaje={errores[campo.clave]} />
              </div>
            );
          })}
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
          <Button type="submit" icono={editando ? ICONOS.guardar : ICONOS.crear} cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear sucursal'}
          </Button>
        </div>
      </form>
    </Dialogo>
  );
}

export default function SucursalesPage() {
  const { confirm, notificar, notificarError } = useAlert();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todas');
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [apertura, setApertura] = useState(null);
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
    setErrores({});
    setModalAbierto(true);
  }

  function abrirEdicion(fila) {
    setEditando(fila.id_sucursal);
    setFormulario({
      codigoEstablecimiento: fila.codigo_establecimiento,
      nombre: fila.nombre,
      direccion: fila.direccion ?? '',
      departamento: fila.departamento ?? '',
      telefono: mostrarTelefono(fila.telefono),
      activa: fila.activa,
    });
    setErrores({});
    setModalAbierto(true);
  }

  function cerrarFormulario() {
    if (guardando) return;
    setModalAbierto(false);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
  }

  async function guardar(evento) {
    evento.preventDefault();
    const encontrados = validarSucursal(formulario);
    setErrores(encontrados);
    const primero = CAMPOS.find((campo) => encontrados[campo.clave]);
    if (primero) {
      document.getElementById(idCampo(primero.clave))?.focus();
      notificar.advertencia('Campos requeridos incompletos', {
        mensaje: 'Revisa los campos señalados en el formulario.',
      });
      return;
    }
    setGuardando(true);
    const editandoId = editando;
    const datos = { ...formulario, telefono: formulario.telefono || null };
    try {
      const guardada = editandoId
        ? await api.put(`/empresa/sucursales/${editandoId}`, datos)
        : await api.post('/empresa/sucursales', datos);
      setFilas((actuales) => ordenarSucursales(
        editandoId
          ? actuales.map((fila) => fila.id_sucursal === editandoId ? { ...fila, ...guardada } : fila)
          : [...actuales, guardada],
      ));
      notificar.exito(editandoId ? 'Sucursal actualizada' : 'Sucursal creada');
      setModalAbierto(false);
      setEditando(null);
      setFormulario(FORMULARIO_VACIO);
      // Una sucursal nueva pasa directo al flujo de apertura (personal, caja y stock mínimo para operar).
      if (!editandoId) setApertura(guardada);
    } catch (error) {
      notificarError(error, { reintentar: () => guardar(evento) });
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(fila) {
    if (fila.activa) {
      const confirmado = await confirm(
        `¿Desactivar la sucursal "${fila.nombre}"? No se considerará operativa pero se conservará en el historial.`,
        { destructivo: true, titulo: 'Desactivar sucursal', etiquetaAceptar: 'Desactivar' },
      );
      if (!confirmado) return;
    } else {
      const confirmado = await confirm(
        `¿Reactivar la sucursal "${fila.nombre}"? Volverá a estar operativa en el sistema.`,
        { tipo: 'pregunta', titulo: 'Activar sucursal', etiquetaAceptar: 'Activar' },
      );
      if (!confirmado) return;
    }
    setCambiandoEstado(fila.id_sucursal);
    try {
      const actualizada = await api.patch(`/empresa/sucursales/${fila.id_sucursal}/estado`, { activa: !fila.activa });
      setFilas((actuales) => actuales.map((item) => item.id_sucursal === fila.id_sucursal ? { ...item, ...actualizada } : item));
      notificar.exito(actualizada.activa ? 'Sucursal activada' : 'Sucursal desactivada');
    } catch (error) {
      notificarError(error, { reintentar: () => alternarEstado(fila) });
    } finally {
      setCambiandoEstado(null);
    }
  }

  const columnas = [
    {
      clave: 'codigo_establecimiento',
      titulo: 'Código',
      tipo: 'texto',
      render: (fila) => <span className="inline-flex rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold tracking-wide">{fila.codigo_establecimiento}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Establecimiento',
      tipo: 'texto',
      valorOrden: (fila) => fila.nombre,
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
    {
      clave: 'departamento',
      titulo: 'Departamento',
      tipo: 'texto',
      valorOrden: (fila) => fila.departamento || '',
      render: (fila) => fila.departamento || '—',
    },
    {
      clave: 'telefono',
      titulo: 'Contacto',
      tipo: 'texto',
      valorOrden: (fila) => fila.telefono || '',
      render: (fila) => <span className="inline-flex items-center gap-1.5 text-fg-muted">{fila.telefono ? <><Phone size={13} aria-hidden="true" />{mostrarTelefono(fila.telefono)}</> : '—'}</span>,
    },
    {
      clave: 'activa',
      titulo: 'Estado',
      tipo: 'booleano',
      valorOrden: (fila) => Boolean(fila.activa),
      render: (fila) => <EstadoBadge tipo={fila.activa ? 'exito' : 'alerta'}>{fila.activa ? 'Activa' : 'Inactiva'}</EstadoBadge>,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (fila) => (
        <div className="flex justify-end gap-2">
          <BotonIcono icono={ICONOS.apertura} etiqueta={`Apertura y stock mínimo de ${fila.nombre}`} titulo="Apertura y stock mínimo" onClick={() => setApertura(fila)} />
          <BotonIcono icono={ICONOS.editar} etiqueta={`Editar ${fila.nombre}`} titulo="Editar" onClick={() => abrirEdicion(fila)} />
          <BotonIcono
            icono={fila.activa ? ICONOS.desactivar : ICONOS.activar}
            tono={fila.activa ? 'aviso' : 'exito'}
            etiqueta={`${fila.activa ? 'Desactivar' : 'Activar'} ${fila.nombre}`}
            titulo={fila.activa ? 'Desactivar' : 'Activar'}
            disabled={Boolean(cambiandoEstado)}
            cargando={cambiandoEstado === fila.id_sucursal}
            onClick={() => alternarEstado(fila)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Administración · Sucursales"
        titulo="Sucursales"
        descripcion="Organiza los establecimientos, consulta sus datos y controla cuáles están operativos."
        acciones={<Button icono={ICONOS.crear} onClick={abrirNueva}>Nueva sucursal</Button>}
      />

      {errorCarga && <BannerError error={{ titulo: 'No se pudieron cargar los establecimientos', mensaje: errorCarga, accion: '' }} />}

      <section aria-label="Resumen de sucursales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icono={ICONOS.sucursal} valor={cargando ? '…' : filas.length} etiqueta="Establecimientos registrados" tono="primario" />
        <Metrica icono={Building2} valor={cargando ? '…' : activas} etiqueta="Sucursales activas" tono="exito" />
        <Metrica icono={ICONOS.desactivar} valor={cargando ? '…' : inactivas} etiqueta="Sucursales inactivas" tono="neutro" />
      </section>

      <Card titulo="Directorio de sucursales" descripcion="Busca por código, nombre, dirección o departamento; filtra por estado operativo.">
        <div className="mb-4 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-4">
          <label className="relative block w-full min-w-0 flex-1">
            <span className="sr-only">Buscar sucursal</span>
            <ICONOS.buscar size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
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
          idTabla="empresa-sucursales"
          ordenInicial={{ clave: 'codigo_establecimiento', direccion: 'asc' }}
          vacio={filas.length ? 'No hay sucursales que coincidan con los filtros.' : 'Todavía no hay establecimientos registrados. Crea la primera sucursal para comenzar.'}
          columnas={columnas}
        />
      </Card>

      {modalAbierto && (
        <FormularioSucursal
          formulario={formulario}
          setFormulario={setFormulario}
          errores={errores}
          setErrores={setErrores}
          guardando={guardando}
          editando={editando}
          onCancelar={cerrarFormulario}
          onGuardar={guardar}
        />
      )}

      {apertura && <AperturaSucursalDialogo sucursal={apertura} onCerrar={() => setApertura(null)} />}
    </div>
  );
}
