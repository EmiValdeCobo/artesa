import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Package, Ruler, Pencil, Power, PowerOff, X, Plus, Boxes, Search, Trash2 } from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import Insignia from '../../components/branding/Insignia.jsx';
import { ICONOS } from '../../config/iconos.js';
import CampoError from '../../components/forms/CampoError.jsx';
import { formatoDinero, formatearUnidades, enteroParaInput } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import InsumoDrawer from './InsumoDrawer.jsx';
import DialogoExistenciasInsumo from './DialogoExistenciasInsumo.jsx';
import {
  getInsumos, updateInsumo, deleteInsumo, cambiarEstadoInsumo,
  getUnidades, createUnidad, updateUnidad, deleteUnidad,
} from './inventarioApi.js';

// ─── Constantes ──────────────────────────────────────────────────────────────
const avisoLocal = (mensaje, titulo = 'Revisa la información') => ({
  titulo,
  mensaje,
  accion: '',
  categoria: 'usuario',
});

const PESTANAS_DEF = [
  { clave: 'insumos', texto: 'Insumos', icono: Package },
  { clave: 'unidades', texto: 'Unidades de medida', icono: Ruler },
];

const FILTRO_TIPO_OPTS = [
  { valor: 'TODOS', texto: 'Todos los tipos' },
  { valor: 'INGREDIENTE', texto: 'Ingrediente' },
  { valor: 'EMPAQUE', texto: 'Empaque' },
  { valor: 'REVENTA', texto: 'Reventa' },
];

function TipoBadge({ tipo }) {
  if (tipo === 'REVENTA') return <Insignia variante="aviso">Reventa</Insignia>;
  const label = tipo === 'INGREDIENTE' ? 'Ingrediente' : 'Empaque';
  return <Insignia variante="neutro">{label}</Insignia>;
}

// ─── MODAL: Formulario de Unidad de Medida ───────────────────────────────────
function ModalUnidad({ abierto, unidad, onCerrar, onGuardado }) {
  const { notificar, notificarError } = useAlert();
  const esEdicion = Boolean(unidad?.id_unidad);

  const [form, setForm] = useState({ codigo: '', nombre: '', factor_conversion: '1', activo: true });
  const [cargando, setCargando] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});

  useEffect(() => {
    if (abierto) {
      setErroresCampos({});
      setForm(
        esEdicion
          ? {
              codigo: unidad.codigo ?? '',
              nombre: unidad.nombre ?? '',
              factor_conversion: enteroParaInput(unidad.factor_conversion) || '1',
              activo: unidad.activo !== false,
            }
          : { codigo: '', nombre: '', factor_conversion: '1', activo: true },
      );
    }
  }, [abierto, unidad, esEdicion]);

  const set = (campo) => (e) => {
    setErroresCampos((prev) => ({ ...prev, [campo]: null }));
    setForm((f) => ({ ...f, [campo]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroresCampos({});
    if (!form.codigo.trim()) {
      setErroresCampos((prev) => ({ ...prev, codigo: 'El código / abreviatura es obligatorio.' }));
      notificar.advertencia('Código requerido', { mensaje: 'El código / abreviatura es obligatorio.' });
      return;
    }
    if (!form.nombre.trim()) {
      setErroresCampos((prev) => ({ ...prev, nombre: 'El nombre es obligatorio.' }));
      notificar.advertencia('Nombre requerido', { mensaje: 'El nombre es obligatorio.' });
      return;
    }

    setCargando(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        factor_conversion: enteroParaInput(form.factor_conversion) || '1',
        activo: form.activo,
      };
      if (esEdicion) {
        await updateUnidad(unidad.id_unidad, payload);
      } else {
        await createUnidad(payload);
      }
      notificar.exito(esEdicion ? 'Unidad actualizada correctamente.' : 'Unidad creada correctamente.');
      onGuardado();
    } catch (err) {
      const traducido = notificarError(err);
      if (traducido?.id === 'DUPLICADO') {
        setErroresCampos({ nombre: traducido.mensaje });
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div className="anim-scrim fixed inset-0 w-screen h-dvh z-50 flex items-end justify-center bg-overlay sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar unidad' : 'Nueva unidad'}
        className="flex w-full flex-col overflow-hidden rounded-t-xl border border-line bg-surface shadow-lg sm:max-w-md sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 className="text-h3 text-fg">
            {esEdicion ? 'Editar unidad' : 'Nueva unidad de medida'}
          </h2>
          <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar" onClick={onCerrar} />
        </div>

        <form id="form-unidad" onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="unidad-codigo" className="mb-1.5 block text-label text-fg">
              Abreviatura / Símbolo <span className="text-danger-text">*</span>
            </label>
            <input
              className="input"
              id="unidad-codigo"
              placeholder="Ej. KG, ML, G, OZ, UNIDAD"
              value={form.codigo}
              onChange={set('codigo')}
              maxLength={10}
              required
            />
            <CampoError id="unidad-codigo" mensaje={erroresCampos.codigo} />
          </div>
          {esEdicion && <label className="inline-flex items-center gap-2 text-body"><input type="checkbox" className="h-4 w-4 accent-primary" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />Activa</label>}

          <div>
            <label htmlFor="unidad-nombre" className="mb-1.5 block text-label text-fg">
              Nombre de la unidad <span className="text-danger-text">*</span>
            </label>
            <input
              className="input"
              id="unidad-nombre"
              placeholder="Ej. Kilogramo, Mililitro"
              value={form.nombre}
              onChange={set('nombre')}
              maxLength={50}
              required
            />
            <CampoError id="unidad-nombre" mensaje={erroresCampos.nombre} />
          </div>

          <div>
            <label htmlFor="unidad-factor" className="mb-1.5 block text-label text-fg">
              Factor de conversión
            </label>
            <input
              className="input text-right tabular-nums"
              id="unidad-factor"
              inputMode="numeric"
              placeholder="1"
              value={form.factor_conversion}
              onChange={(e) => setForm((f) => ({ ...f, factor_conversion: mascaraEntero(e.target.value) }))}
              min="1"
              step="1"
            />
            <p className="mt-1 text-body-sm text-fg-muted">
              Equivalencia respecto a la unidad base (ej: 1000 para kg si la base es gramo).
            </p>
          </div>
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end">
          <Button variante="ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variante="primary"
            type="submit"
            form="form-unidad"
            cargando={cargando}
            disabled={cargando}
          >
            {esEdicion ? 'Guardar cambios' : 'Crear unidad'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── PESTAÑA 1: Insumos ───────────────────────────────────────────────────────
function PestanaInsumos({ unidades, onTotal, onCargandoTotal, onErrorTotal }) {
  const { tiene, usuario } = useAuth();
  const { confirm, notificar, notificarError } = useAlert();
  const puedeGestionar = tiene('INV_GESTIONAR_INSUMOS');

  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [insumoActual, setInsumoActual] = useState(null);
  const [insumoExistencias, setInsumoExistencias] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    onCargandoTotal?.();
    try {
      const data = await getInsumos();
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      setInsumos(lista);
      setErrorBanner(null);
    } catch (err) {
      setInsumos([]);
      setErrorBanner(traducirError(err));
      onErrorTotal?.();
    } finally {
      setCargando(false);
    }
  }, [onCargandoTotal, onErrorTotal]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!cargando && !errorBanner) onTotal?.(insumos.length);
  }, [cargando, errorBanner, insumos.length, onTotal]);

  const insumosFiltrados = useMemo(() => {
    return insumos.filter((ins) => {
      const termino = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !termino ||
        ins.nombre?.toLowerCase().includes(termino);

      const coincideTipo = filtroTipo === 'TODOS' || ins.tipo_insumo === filtroTipo;

      const coincideEstado =
        filtroEstado === 'TODOS'
          ? true
          : filtroEstado === 'ACTIVOS'
            ? ins.activo !== false
            : ins.activo === false;

      return coincideBusqueda && coincideTipo && coincideEstado;
    });
  }, [insumos, busqueda, filtroTipo, filtroEstado]);

  const abrirCrear = () => {
    setInsumoActual(null);
    setDrawerAbierto(true);
  };
  const abrirEditar = (ins) => {
    setInsumoActual(ins);
    setDrawerAbierto(true);
  };
  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setInsumoActual(null);
  };

  const handleToggleEstado = async (ins) => {
    const nuevoEstado = ins.activo === false;
    if (!nuevoEstado) {
      const confirmado = await confirm(
        `¿Desactivar "${ins.nombre}"? No aparecerá en nuevos selectores ni se podrá usar en recetas. Si un producto activo lo usa, el sistema impedirá la acción y te mostrará cuáles.`,
        {
          titulo: 'Desactivar insumo',
          destructivo: true,
          etiquetaCancelar: 'Cancelar',
          etiquetaAceptar: 'Desactivar insumo',
        },
      );
      if (!confirmado) return;
    }

    try {
      const res = await cambiarEstadoInsumo(ins.id_insumo, nuevoEstado);
      const actualizado = res?.data ?? res ?? { ...ins, activo: nuevoEstado };
      setInsumos((prev) =>
        prev.map((item) =>
          item.id_insumo === ins.id_insumo ? { ...item, ...actualizado, activo: nuevoEstado } : item,
        ),
      );
      notificar.exito(nuevoEstado ? 'Insumo habilitado correctamente.' : 'Insumo desactivado correctamente.');
    } catch (err) {
      notificarError(err);
    }
  };

  // Mantener handleDesactivar y handleReactivar para compatibilidad y tests existentes
  const handleDesactivar = (ins) => handleToggleEstado(ins);
  const handleReactivar = (ins) => handleToggleEstado(ins);

  const handleEliminarInsumo = async (ins) => {
    const confirmado = await confirm(
      `¿Eliminar definitivamente el insumo "${ins.nombre}"? El registro desaparecerá por completo de todos los catálogos y listados del sistema.`,
      {
        titulo: 'Eliminar insumo',
        destructivo: true,
        etiquetaCancelar: 'Cancelar',
        etiquetaAceptar: 'Eliminar insumo',
      },
    );
    if (!confirmado) return;

    try {
      await deleteInsumo(ins.id_insumo);
      setInsumos((prev) => prev.filter((item) => item.id_insumo !== ins.id_insumo));
      notificar.exito('Insumo eliminado del catálogo.');
    } catch (err) {
      notificarError(err);
    }
  };

  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Nombre',
      tipo: 'texto',
      valorOrden: (fila) => fila.nombre,
      render: (fila) => <div><span className="font-medium text-fg">{fila.nombre}</span><div className="mt-0.5"><TipoBadge tipo={fila.tipo_insumo} /></div></div>,
    },
    {
      clave: 'codigo_unidad',
      titulo: 'Unidad base',
      tipo: 'texto',
      valorOrden: (fila) => fila.codigo_unidad ?? fila.unidad?.codigo ?? '',
      render: (fila) => (
        <span className="font-mono text-body-sm text-fg-muted">
          {fila.codigo_unidad ?? fila.unidad?.codigo ?? '—'}
        </span>
      ),
    },
    {
      clave: 'costo_promedio',
      titulo: 'Costo prom.',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (fila) => fila.costo_promedio,
      render: (fila) => (
        <span className="whitespace-nowrap tabular-nums text-fg">
          {fila.costo_promedio == null ? <span title="Sin permiso para ver costos">—</span> : formatoDinero(fila.costo_promedio)}
        </span>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      tipo: 'booleano',
      valorOrden: (fila) => fila.activo !== false,
      render: (fila) => (
        <EstadoBadge tipo={fila.activo !== false ? 'exito' : 'error'}>
          {fila.activo !== false ? 'Activo' : 'Inactivo'}
        </EstadoBadge>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            clave: '_acciones',
            titulo: '',
            ordenable: false,
            alinear: 'right',
            render: (fila) => (
              <div className="flex items-center gap-1 justify-end">
                {tiene('INV_GESTIONAR_INSUMOS') && <BotonIcono icono={Boxes} etiqueta={`Ver existencias de ${fila.nombre}`} titulo="Existencias" onClick={() => setInsumoExistencias(fila)} />}
                <BotonIcono icono={ICONOS.editar} etiqueta={`Editar insumo ${fila.nombre}`} titulo="Editar insumo" onClick={() => abrirEditar(fila)} />
                <BotonIcono
                  icono={fila.activo === false ? ICONOS.activar : ICONOS.desactivar}
                  tono={fila.activo === false ? 'exito' : 'aviso'}
                  etiqueta={`${fila.activo === false ? 'Reactivar' : 'Desactivar'} insumo ${fila.nombre}`}
                  titulo={fila.activo === false ? 'Reactivar insumo' : 'Desactivar insumo'}
                  onClick={() => handleToggleEstado(fila)}
                />
                <BotonIcono icono={ICONOS.eliminar} tono="peligro" etiqueta={`Eliminar insumo ${fila.nombre}`} titulo="Eliminar insumo" onClick={() => handleEliminarInsumo(fila)} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-fg-muted">El stock y las alertas por sucursal se consultan en Inventario › {tiene('INV_VER_STOCK') ? <Link className="font-medium text-primary-text underline" to="/inventario">Existencias</Link> : 'Existencias'}.</p>

      {errorBanner && (
        <BannerError
          error={errorBanner}
          onReintentar={cargar}
          onCerrar={() => setErrorBanner(null)}
        />
      )}

      {/* Tabla de Insumos con barra de herramientas */}
      <Card sinPadding icono={Package} titulo="Insumos registrados" descripcion={<span className="tabular-nums" aria-live="polite">{cargando ? 'Cargando insumos…' : errorBanner ? 'No disponible' : `${insumosFiltrados.length} encontrados`}</span>}
        acciones={puedeGestionar ? <Button variante="primary" icono={Plus} onClick={abrirCrear}>Nuevo insumo</Button> : null}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full max-w-xs">
            <label htmlFor="buscar-insumo" className="sr-only">Buscar insumo</label>
            <ICONOS.buscar size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input id="buscar-insumo" type="search" placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input pl-9" aria-label="Buscar insumo por nombre" />
          </div>
          <div className="w-full sm:w-44">
            <Select
              opciones={FILTRO_TIPO_OPTS}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            />
          </div>
          <div className="inline-flex rounded-md border border-line bg-muted p-0.5 text-label-sm" role="group" aria-label="Filtro por estado">
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'TODOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => setFiltroEstado('TODOS')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'ACTIVOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => setFiltroEstado('ACTIVOS')}
            >
              Activos
            </button>
            <button
              type="button"
              className={`h-7 rounded-sm px-3 transition-colors ${filtroEstado === 'INACTIVOS' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => setFiltroEstado('INACTIVOS')}
              title="Mostrar inactivos"
            >
              Inactivos
            </button>
          </div>
          {(busqueda || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS') && (
            <Button variante="ghost" tamano="sm" className="ml-auto" onClick={() => { setBusqueda(''); setFiltroTipo('TODOS'); setFiltroEstado('TODOS'); }}>Limpiar filtros</Button>
          )}
        </div>
        <Table
          columnas={columnas}
          filas={insumosFiltrados}
          idFila="id_insumo"
          idTabla="catalogo-insumos"
          cargando={cargando}
          vacio={errorBanner ? null : <EstadoVacio icono={Package} titulo={insumos.length === 0 ? 'Aún no hay insumos' : 'Sin resultados'} accion={insumos.length === 0 && tiene('INV_GESTIONAR_INSUMOS') ? <Button onClick={abrirCrear}>Crear primer insumo</Button> : null}>{insumos.length === 0 ? 'Registra el primer insumo para abastecer el catálogo.' : 'No hay insumos para los criterios seleccionados.'}</EstadoVacio>}
        />
      </Card>

      <InsumoDrawer
        abierto={drawerAbierto}
        insumo={insumoActual}
        unidades={unidades}
        onCerrar={cerrarDrawer}
        onGuardado={() => {
          cerrarDrawer();
          cargar();
        }}
      />
      {insumoExistencias && <DialogoExistenciasInsumo insumo={insumoExistencias} sucursales={usuario?.sucursales ?? []} onCerrar={() => setInsumoExistencias(null)} />}
    </div>
  );
}

// ─── PESTAÑA 2: Unidades de Medida ───────────────────────────────────────────
function PestanaUnidades({ unidades, cargando, errorBanner, recargar, limpiarError }) {
  const { tiene } = useAuth();
  const { confirm, notificar, notificarError } = useAlert();
  const puedeGestionar = tiene('INV_GESTIONAR_INSUMOS');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);
  const [unidadActual, setUnidadActual] = useState(null);

  const abrirCrear = () => {
    setUnidadActual(null);
    setModalAbierto(true);
  };
  const abrirEditar = (u) => {
    setUnidadActual(u);
    setModalAbierto(true);
  };
  const cerrarModal = () => {
    setModalAbierto(false);
    setUnidadActual(null);
  };

  const handleDesactivar = async (u) => {
    const confirmado = await confirm(
      `¿Desactivar la unidad "${u.nombre}" (${u.codigo})? No aparecerá al crear o editar insumos. Los insumos activos que la usan impedirán la acción.`,
      {
        titulo: 'Desactivar unidad de medida',
        destructivo: true,
        etiquetaCancelar: 'Cancelar',
        etiquetaAceptar: 'Desactivar',
      },
    );
    if (!confirmado) return;

    try {
      await updateUnidad(u.id_unidad, { activo: false });
      notificar.exito('Unidad de medida desactivada.');
      await recargar();
    } catch (err) {
      notificarError(err);
    }
  };
  const reactivar = async (u) => { try { await updateUnidad(u.id_unidad, { activo: true }); notificar.exito('Unidad de medida reactivada.'); await recargar(); } catch (err) { notificarError(err); } };
  const unidadesVisibles = unidades.filter((u) => mostrarInactivas || u.activo !== false);

  const columnas = [
    {
      clave: 'codigo',
      titulo: 'Abreviatura / Símbolo',
      tipo: 'texto',
      valorOrden: (fila) => fila.codigo,
      render: (fila) => <span className="font-mono font-medium text-fg">{fila.codigo}</span>,
    },
    { clave: 'nombre', titulo: 'Nombre de la unidad', tipo: 'texto', valorOrden: (fila) => fila.nombre },
    {
      clave: 'factor_conversion',
      titulo: 'Factor de conversión',
      tipo: 'numero',
      alinear: 'right',
      valorOrden: (fila) => fila.factor_conversion ?? 1,
      render: (fila) => (
        <span className="tabular-nums text-fg-muted">
          {formatearUnidades(fila.factor_conversion ?? 1)}
        </span>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      tipo: 'booleano',
      valorOrden: (fila) => fila.activo !== false,
      render: (fila) => (
        <EstadoBadge tipo={fila.activo !== false ? 'exito' : 'error'}>
          {fila.activo !== false ? 'Activa' : 'Inactiva'}
        </EstadoBadge>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            clave: '_acciones',
            titulo: '',
            ordenable: false,
            alinear: 'right',
            render: (fila) => (
              <div className="flex items-center gap-1 justify-end">
                <BotonIcono icono={ICONOS.editar} etiqueta={`Editar unidad ${fila.nombre}`} titulo="Editar unidad" onClick={() => abrirEditar(fila)} />
                <BotonIcono
                  icono={fila.activo === false ? ICONOS.activar : ICONOS.desactivar}
                  tono={fila.activo === false ? 'exito' : 'aviso'}
                  etiqueta={`${fila.activo === false ? 'Reactivar' : 'Desactivar'} unidad ${fila.nombre}`}
                  titulo={fila.activo === false ? 'Reactivar unidad' : 'Desactivar unidad'}
                  onClick={() => fila.activo === false ? reactivar(fila) : handleDesactivar(fila)}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">

      {errorBanner && (
        <BannerError
          error={errorBanner}
          onReintentar={recargar}
          onCerrar={limpiarError}
        />
      )}

      <Card sinPadding icono={Ruler} titulo="Unidades de medida" descripcion="Unidades para costeo y recetas"
        acciones={puedeGestionar ? (
          <Button variante="primary" icono={Plus} onClick={abrirCrear}>
            Nueva unidad
          </Button>
        ) : null}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <label className="inline-flex min-h-10 items-center gap-2 text-body text-fg-muted"><input type="checkbox" className="h-4 w-4 accent-primary" checked={mostrarInactivas} onChange={(e) => setMostrarInactivas(e.target.checked)} />Mostrar inactivas</label>
        </div>
        <Table
          columnas={columnas}
          filas={unidadesVisibles}
          idFila="id_unidad"
          idTabla="catalogo-unidades"
          cargando={cargando}
          vacio={errorBanner ? null : <EstadoVacio icono={Ruler} titulo="Sin unidades registradas">No hay unidades de medida disponibles.</EstadoVacio>}
        />
      </Card>

      <ModalUnidad
        abierto={modalAbierto}
        unidad={unidadActual}
        onCerrar={cerrarModal}
        onGuardado={() => {
          cerrarModal();
          recargar();
        }}
      />
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function CatalogoInsumosPage() {
  const [pestanaActiva, setPestanaActiva] = useState('insumos');
  const [totales, setTotales] = useState({ insumos: null, unidades: null });

  const [unidades, setUnidades] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);
  const [errorUnidades, setErrorUnidades] = useState(null);
  const cargarUnidades = useCallback(async () => {
    setCargandoUnidades(true);
    setErrorUnidades(null);
    setTotales((actual) => ({ ...actual, unidades: null }));
    try {
      const data = await getUnidades();
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      setUnidades(lista);
      setTotales((actual) => ({ ...actual, unidades: lista.filter((unidad) => unidad.activo !== false).length }));
      setErrorUnidades(null);
    } catch (err) {
      setUnidades([]);
      setErrorUnidades(traducirError(err));
      setTotales((actual) => ({ ...actual, unidades: undefined }));
    } finally {
      setCargandoUnidades(false);
    }
  }, []);
  useEffect(() => {
    cargarUnidades();
  }, [cargarUnidades]);

  const handleTotalInsumos = useCallback((total) => {
    setTotales((actual) => (actual.insumos === total ? actual : { ...actual, insumos: total }));
  }, []);

  const marcarInsumosCargando = useCallback(() => setTotales((actual) => ({ ...actual, insumos: null })), []);
  const marcarErrorInsumos = useCallback(() => setTotales((actual) => ({ ...actual, insumos: undefined })), []);

  return (
    <div className="space-y-6">
      <EncabezadoPagina seccion="Operación · Catálogo" titulo="Insumos y unidades" descripcion="Gestiona materias primas, empaques, artículos de reventa y unidades de medida." />
      <Pestanas
        pestanas={PESTANAS_DEF.map((pestana) => ({ ...pestana, total: totales[pestana.clave] }))}
        activa={pestanaActiva}
        onCambiar={setPestanaActiva}
        etiqueta="Secciones de catálogo"
        className="flex-wrap"
      />

      {pestanaActiva === 'insumos' && (
        <section id="panel-insumos" role="tabpanel" aria-labelledby="tab-insumos">
          <PestanaInsumos unidades={unidades} onTotal={handleTotalInsumos} onCargandoTotal={marcarInsumosCargando} onErrorTotal={marcarErrorInsumos} />
        </section>
      )}
      {pestanaActiva === 'unidades' && (
        <section id="panel-unidades" role="tabpanel" aria-labelledby="tab-unidades">
          <PestanaUnidades unidades={unidades} cargando={cargandoUnidades} errorBanner={errorUnidades} recargar={cargarUnidades} limpiarError={() => setErrorUnidades(null)} />
        </section>
      )}
    </div>
  );
}

