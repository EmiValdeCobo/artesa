import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Package, Ruler, Pencil, Power, PowerOff, X, Plus } from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import CampoError from '../../components/forms/CampoError.jsx';
import { traducirError } from '../../errors/traducirError.js';
import {
  getInsumos, createInsumo, updateInsumo, deleteInsumo,
  getUnidades, createUnidad, updateUnidad, deleteUnidad,
} from './inventarioApi.js';

// ─── Constantes ──────────────────────────────────────────────────────────────
const TIPOS_INSUMO = ['INGREDIENTE', 'EMPAQUE', 'REVENTA'];

// Mensaje local (validación de formulario o de conexión) con la misma forma que
// espera BannerError, para no mezclar errores de servidor con texto plano.
const avisoLocal = (mensaje, titulo = 'Revisa la información') => ({
  titulo,
  mensaje,
  accion: '',
  categoria: 'usuario',
});

const PESTANAS_DEF = [
  { clave: 'insumos', texto: 'Insumos', icono: Package },
  { clave: 'unidades', texto: 'Unidades de Medida', icono: Ruler },
];

const FILTRO_TIPO_OPTS = [
  { valor: 'TODOS', texto: 'Todos los tipos' },
  { valor: 'INGREDIENTE', texto: 'Ingrediente' },
  { valor: 'EMPAQUE', texto: 'Empaque' },
  { valor: 'REVENTA', texto: 'Reventa' },
];

function TipoBadge({ tipo }) {
  if (tipo === 'REVENTA') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary-soft text-secondary-text">
        Reventa
      </span>
    );
  }
  const label = tipo === 'INGREDIENTE' ? 'Ingrediente' : 'Empaque';
  return <EstadoBadge tipo="info">{label}</EstadoBadge>;
}

// ─── DRAWER: Formulario de Insumo ────────────────────────────────────────────
function DrawerInsumo({ abierto, insumo, unidades, onCerrar, onGuardado }) {
  const { notificar } = useAlert();
  const esEdicion = Boolean(insumo?.id_insumo);

  const [form, setForm] = useState({
    nombre: '',
    tipo_insumo: 'INGREDIENTE',
    id_unidad_base: '',
    costo_promedio: '',
    activo: true,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      if (esEdicion) {
        setForm({
          nombre: insumo.nombre ?? '',
          tipo_insumo: insumo.tipo_insumo ?? 'INGREDIENTE',
          id_unidad_base: String(insumo.id_unidad_base ?? ''),
          costo_promedio: insumo.costo_promedio ?? '',
          activo: insumo.activo ?? true,
        });
      } else {
        setForm({
          nombre: '',
          tipo_insumo: 'INGREDIENTE',
          id_unidad_base: '',
          costo_promedio: '0.0000',
          activo: true,
        });
      }
    }
  }, [abierto, insumo, esEdicion]);

  const set = (campo) => (val) => setForm((f) => ({ ...f, [campo]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) return setError(avisoLocal('El nombre es obligatorio.'));
    if (!form.tipo_insumo) return setError(avisoLocal('Selecciona un tipo de insumo.'));
    if (!form.id_unidad_base) return setError(avisoLocal('Selecciona una unidad de medida base.'));

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo_insumo: form.tipo_insumo,
        id_unidad_base: Number(form.id_unidad_base),
        activo: form.activo,
        ...(!esEdicion && { costo_promedio: form.costo_promedio || '0.0000' }),
      };

      if (esEdicion) {
        await updateInsumo(insumo.id_insumo, payload);
      } else {
        await createInsumo(payload);
      }

      notificar.exito(esEdicion ? 'Insumo actualizado correctamente.' : 'Insumo creado correctamente.');
      onGuardado();
    } catch (err) {
      const traducido = traducirError(err);
      if (traducido.id === 'DUPLICADO') traducido.campos = { nombre: traducido.mensaje };
      setError(traducido);
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

  const opcionesUnidades = unidades.filter((u) => u.activo !== false || String(u.id_unidad) === String(insumo?.id_unidad_base)).map((u) => ({
    valor: String(u.id_unidad),
    texto: `${u.codigo} — ${u.nombre}`,
  }));

  const opcionesTipo = TIPOS_INSUMO.map((t) => ({
    valor: t,
    texto: t.charAt(0) + t.slice(1).toLowerCase(),
  }));

  return createPortal(
    <>
      {/* Backdrop con cobertura 100% de pantalla (w-screen, h-dvh) y blur oscuro profundo */}
      <div
        className="fixed inset-0 w-screen h-dvh z-40 bg-[#1C110D]/75 backdrop-blur-[2px] transition-opacity"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel lateral (Drawer) en Alabastro cálido, estructura Flex vertical completa */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
        className="fixed right-0 top-0 bottom-0 h-dvh w-full max-w-md bg-[#FAF8F5] dark:bg-[#2A1A14] shadow-2xl z-50 flex flex-col border-l border-line"
      >
        {/* Cabecera fija */}
        <div className="px-6 py-4 border-b border-line bg-[#FAF8F5] dark:bg-[#2A1A14] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              {esEdicion ? 'Actualiza los datos del insumo y stock mínimo' : 'Registra un nuevo ingrediente o material de empaque'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-espresso-100 dark:hover:bg-espresso-800 transition-colors"
            aria-label="Cerrar formulario"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo con scroll interno */}
        <form id="form-insumo" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scroll-fino px-6 py-5 space-y-4">
          {error && <BannerError error={error} onCerrar={() => setError(null)} />}

          <div>
            <label htmlFor="insumo-nombre" className="mb-1 block text-sm font-medium text-fg">
              Nombre del Insumo <span className="text-danger ml-0.5 font-semibold">*</span>
            </label>
            <input
              className="input"
              id="insumo-nombre"
              placeholder="Ej. Café molido espresso"
              value={form.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              maxLength={100}
              required
            />
            <CampoError id="insumo-nombre" mensaje={error?.campos?.nombre} />
          </div>

          <Select
            etiqueta="Tipo de insumo"
            requerido
            opciones={opcionesTipo}
            placeholder="Selecciona un tipo…"
            value={form.tipo_insumo}
            onChange={(e) => set('tipo_insumo')(e.target.value)}
          />

          <Select
            etiqueta="Unidad de medida base"
            requerido
            opciones={opcionesUnidades}
            placeholder="Selecciona una unidad…"
            value={form.id_unidad_base}
            onChange={(e) => set('id_unidad_base')(e.target.value)}
            buscable
          />

          {!esEdicion ? (
            <div>
              <label htmlFor="insumo-costo" className="mb-1 block text-sm font-medium text-fg">
                Costo inicial / referencia
              </label>
              <input
                className="input"
                id="insumo-costo"
                type="number"
                placeholder="0.0000"
                value={form.costo_promedio}
                onChange={(e) => set('costo_promedio')(e.target.value)}
                min={0}
                step="0.0001"
              />
              <p className="mt-1 text-xs text-fg-muted">Costo por {unidades.find((u) => String(u.id_unidad) === String(form.id_unidad_base))?.codigo ?? 'unidad base'}.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Costo promedio ponderado actual
              </span>
              <p className="text-sm font-mono font-bold text-fg">
                {insumo.costo_promedio == null ? <span title="Sin permiso para ver costos">—</span> : `$ ${insumo.costo_promedio}`}
              </p>
              <p className="text-xs text-fg-muted italic">
                El costo se actualiza automáticamente con cada factura de compra.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <input
              id="insumo-activo"
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set('activo')(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-primary"
            />
            <label htmlFor="insumo-activo" className="text-sm text-fg select-none">
              Insumo habilitado para operaciones
            </label>
          </div>
        </form>

        {/* Pie de acciones fijo */}
        <div className="sticky bottom-0 border-t border-line bg-[#FAF8F5] dark:bg-[#2A1A14] px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <Button variante="ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variante="primary"
            type="submit"
            form="form-insumo"
            cargando={cargando}
            disabled={cargando}
          >
            {esEdicion ? 'Guardar cambios' : 'Crear insumo'}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── MODAL: Formulario de Unidad de Medida ───────────────────────────────────
function ModalUnidad({ abierto, unidad, onCerrar, onGuardado }) {
  const { notificar } = useAlert();
  const esEdicion = Boolean(unidad?.id_unidad);

  const [form, setForm] = useState({ codigo: '', nombre: '', factor_conversion: '1.0000', activo: true });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setForm(
        esEdicion
          ? {
              codigo: unidad.codigo ?? '',
              nombre: unidad.nombre ?? '',
              factor_conversion: unidad.factor_conversion ?? '1.0000',
              activo: unidad.activo !== false,
            }
          : { codigo: '', nombre: '', factor_conversion: '1.0000', activo: true },
      );
    }
  }, [abierto, unidad, esEdicion]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.codigo.trim()) return setError(avisoLocal('El código / abreviatura es obligatorio.'));
    if (!form.nombre.trim()) return setError(avisoLocal('El nombre es obligatorio.'));

    setCargando(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        factor_conversion: form.factor_conversion?.trim() || '1.0000',
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
      const traducido = traducirError(err);
      if (traducido.id === 'DUPLICADO') traducido.campos = { nombre: traducido.mensaje };
      setError(traducido);
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
    <div className="fixed inset-0 w-screen h-dvh z-50 flex items-center justify-center bg-[#1C110D]/75 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar Unidad' : 'Nueva Unidad'}
        className="bg-[#FAF8F5] dark:bg-[#2A1A14] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-line"
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">
            {esEdicion ? 'Editar Unidad' : 'Nueva Unidad de Medida'}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-espresso-100 dark:hover:bg-espresso-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form id="form-unidad" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <BannerError error={error} onCerrar={() => setError(null)} />}

          <div>
            <label htmlFor="unidad-codigo" className="mb-1 block text-sm font-medium text-fg">
              Abreviatura / Símbolo <span className="text-danger ml-0.5 font-semibold">*</span>
            </label>
            <input
              className="input"
              id="unidad-codigo"
              placeholder="Ej. kg, ml, g, oz, unidad"
              value={form.codigo}
              onChange={set('codigo')}
              maxLength={10}
              required
            />
            <CampoError id="unidad-codigo" mensaje={error?.campos?.codigo} />
          </div>
          {esEdicion && <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />Activa</label>}

          <div>
            <label htmlFor="unidad-nombre" className="mb-1 block text-sm font-medium text-fg">
              Nombre de la Unidad <span className="text-danger ml-0.5 font-semibold">*</span>
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
            <CampoError id="unidad-nombre" mensaje={error?.campos?.nombre} />
          </div>

          <div>
            <label htmlFor="unidad-factor" className="mb-1 block text-sm font-medium text-fg">
              Factor de conversión
            </label>
            <input
              className="input"
              id="unidad-factor"
              type="number"
              placeholder="1.0000"
              value={form.factor_conversion}
              onChange={set('factor_conversion')}
              min={0.0001}
              step="0.0001"
            />
            <p className="mt-1 text-xs text-fg-muted">
              Equivalencia respecto a la unidad base (ej: 1000 para kg si la base es gramo).
            </p>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-line bg-[#FAF8F5] dark:bg-[#2A1A14] flex gap-3 justify-end">
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
function PestanaInsumos({ unidades }) {
  const { tiene } = useAuth();
  const { confirm, notificar } = useAlert();
  const puedeGestionar = tiene('INV_GESTIONAR_INSUMOS');

  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [insumoActual, setInsumoActual] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getInsumos();
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      setInsumos(lista);
      setErrorBanner(null);
    } catch (err) {
      setInsumos([]);
      setErrorBanner(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const insumosFiltrados = useMemo(() => {
    return insumos.filter((ins) => {
      const termino = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !termino ||
        ins.nombre?.toLowerCase().includes(termino);

      const coincideTipo = filtroTipo === 'TODOS' || ins.tipo_insumo === filtroTipo;

      return coincideBusqueda && coincideTipo && (mostrarInactivos || ins.activo !== false);
    });
  }, [insumos, busqueda, filtroTipo, mostrarInactivos]);

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

  const handleDesactivar = async (ins) => {
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

    try {
      await deleteInsumo(ins.id_insumo);
      notificar.exito('Insumo desactivado correctamente.');
      await cargar();
    } catch (err) {
      setErrorBanner(traducirError(err));
    }
  };

  const handleReactivar = async (ins) => {
    try { await updateInsumo(ins.id_insumo, { nombre: ins.nombre, tipo_insumo: ins.tipo_insumo, id_unidad_base: ins.id_unidad_base, activo: true }); notificar.exito('Insumo reactivado.'); await cargar(); }
    catch (err) { setErrorBanner(traducirError(err)); }
  };

  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Nombre',
      render: (fila) => <div><span className="font-medium text-fg">{fila.nombre}</span><div className="mt-0.5"><TipoBadge tipo={fila.tipo_insumo} /></div></div>,
    },
    {
      clave: 'codigo_unidad',
      titulo: 'Unidad base',
      render: (fila) => (
        <span className="text-sm font-medium text-fg-muted">
          {fila.codigo_unidad ?? fila.unidad?.codigo ?? '—'}
        </span>
      ),
    },
    {
      clave: 'costo_promedio',
      titulo: 'Costo prom.',
      alinear: 'right',
      render: (fila) => (
        <span className="text-sm font-mono font-medium text-fg">
          {fila.costo_promedio == null ? <span title="Sin permiso para ver costos">—</span> : `$ ${fila.costo_promedio}`}
        </span>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (fila) => (
        <EstadoBadge tipo={fila.activo ? 'exito' : 'error'}>
          {fila.activo ? 'Activo' : 'Inactivo'}
        </EstadoBadge>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            clave: '_acciones',
            titulo: '',
            alinear: 'right',
            render: (fila) => (
              <div className="flex items-center gap-1 justify-end">
                <button
                  type="button"
                  className="btn-ghost !p-1.5 min-h-8"
                  title="Editar insumo"
                  onClick={() => abrirEditar(fila)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="btn-ghost !p-1.5 min-h-8 text-danger"
                  title={fila.activo === false ? 'Reactivar insumo' : 'Desactivar insumo'}
                  onClick={() => fila.activo === false ? handleReactivar(fila) : handleDesactivar(fila)}
                >
                  {fila.activo === false ? <Power size={15} /> : <PowerOff size={15} />}
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        seccion="Inventario"
        titulo="Catálogo de Insumos"
        descripcion="Gestión de materias primas, empaques y artículos de reventa"
        acciones={
          puedeGestionar && (
            <Button variante="primary" icono={Plus} onClick={abrirCrear}>
              Nuevo Insumo
            </Button>
          )
        }
      />

      <p className="text-sm text-fg-muted">El stock y las alertas por sucursal se consultan en Inventario › {tiene('INV_VER_STOCK') ? <a className="font-medium text-primary-text underline" href="/inventario/existencias">Existencias</a> : 'Existencias'}.</p>

      {errorBanner && (
        <BannerError
          error={errorBanner}
          onReintentar={cargar}
          onCerrar={() => setErrorBanner(null)}
        />
      )}

      {/* Controles y barra superior */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input flex-1"
          aria-label="Buscar insumo por nombre"
        />
        <div className="sm:w-48">
          <Select
            opciones={FILTRO_TIPO_OPTS}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-fg-muted"><input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />Mostrar inactivos</label>
      </div>

      {/* Tabla de Insumos */}
      <Card sinPadding>
        <Table
          columnas={columnas}
          filas={insumosFiltrados}
          idFila="id_insumo"
          cargando={cargando}
          vacio={<EstadoVacio icono={Package} titulo="Sin insumos registrados">No hay insumos para los criterios seleccionados.</EstadoVacio>}
        />
      </Card>

      <DrawerInsumo
        abierto={drawerAbierto}
        insumo={insumoActual}
        unidades={unidades}
        onCerrar={cerrarDrawer}
        onGuardado={() => {
          cerrarDrawer();
          cargar();
        }}
      />
    </div>
  );
}

// ─── PESTAÑA 2: Unidades de Medida ───────────────────────────────────────────
function PestanaUnidades() {
  const { tiene } = useAuth();
  const { confirm, notificar } = useAlert();
  const puedeGestionar = tiene('INV_GESTIONAR_INSUMOS');

  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);
  const [unidadActual, setUnidadActual] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getUnidades();
      setUnidades(Array.isArray(data) ? data : (data?.data ?? []));
      setErrorBanner(null);
    } catch (err) {
      setUnidades([]);
      setErrorBanner(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
      cargar();
    } catch (err) {
      setErrorBanner(traducirError(err));
    }
  };
  const reactivar = async (u) => { try { await updateUnidad(u.id_unidad, { activo: true }); notificar.exito('Unidad de medida reactivada.'); await cargar(); } catch (err) { setErrorBanner(traducirError(err)); } };
  const unidadesVisibles = unidades.filter((u) => mostrarInactivas || u.activo !== false);

  const columnas = [
    {
      clave: 'codigo',
      titulo: 'Abreviatura / Símbolo',
      render: (fila) => <span className="font-mono font-bold text-fg">{fila.codigo}</span>,
    },
    { clave: 'nombre', titulo: 'Nombre de la Unidad' },
    {
      clave: 'factor_conversion',
      titulo: 'Factor de conversión',
      alinear: 'right',
      render: (fila) => (
        <span className="font-mono text-sm text-fg-muted">
          {fila.factor_conversion ?? '1.0000'}
        </span>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
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
            alinear: 'right',
            render: (fila) => (
              <div className="flex items-center gap-1 justify-end">
                <button
                  type="button"
                  className="btn-ghost !p-1.5 min-h-8"
                  title="Editar unidad"
                  onClick={() => abrirEditar(fila)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="btn-ghost !p-1.5 min-h-8 text-danger"
                  title={fila.activo === false ? 'Reactivar unidad' : 'Desactivar unidad'}
                  onClick={() => fila.activo === false ? reactivar(fila) : handleDesactivar(fila)}
                >
                  {fila.activo === false ? <Power size={15} /> : <PowerOff size={15} />}
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Unidades de Medida Operativas</h2>
          <p className="text-sm text-fg-muted">
            Unidades de cafetería y panadería con factor de conversión para costeo y recetas
          </p>
        </div>
        {puedeGestionar && (
          <Button variante="primary" icono={Plus} onClick={abrirCrear}>
            Nueva Unidad
          </Button>
        )}
      </div>

      {errorBanner && (
        <BannerError
          error={errorBanner}
          onReintentar={cargar}
          onCerrar={() => setErrorBanner(null)}
        />
      )}

      <label className="inline-flex items-center gap-2 text-sm text-fg-muted"><input type="checkbox" checked={mostrarInactivas} onChange={(e) => setMostrarInactivas(e.target.checked)} />Mostrar inactivas</label>

      <Card sinPadding>
        <Table
          columnas={columnas}
          filas={unidadesVisibles}
          idFila="id_unidad"
          cargando={cargando}
          vacio={<EstadoVacio icono={Ruler} titulo="Sin unidades registradas">No hay unidades de medida disponibles.</EstadoVacio>}
        />
      </Card>

      <ModalUnidad
        abierto={modalAbierto}
        unidad={unidadActual}
        onCerrar={cerrarModal}
        onGuardado={() => {
          cerrarModal();
          cargar();
        }}
      />
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function CatalogoInsumosPage() {
  const [pestanaActiva, setPestanaActiva] = useState('insumos');

  const [unidades, setUnidades] = useState([]);
  const [errorUnidades, setErrorUnidades] = useState(null);
  const cargarUnidades = useCallback(async () => {
    try {
      const data = await getUnidades();
      setUnidades(Array.isArray(data) ? data : (data?.data ?? []));
      setErrorUnidades(null);
    } catch (err) {
      setUnidades([]);
      setErrorUnidades(traducirError(err));
    }
  }, []);
  useEffect(() => {
    cargarUnidades();
  }, [cargarUnidades]);

  return (
    <div className="space-y-6">
      <Pestanas
        pestanas={PESTANAS_DEF}
        activa={pestanaActiva}
        onCambiar={setPestanaActiva}
        etiqueta="Secciones de catálogo"
      />

      {pestanaActiva === 'unidades' && errorUnidades && <BannerError error={errorUnidades} onReintentar={cargarUnidades} onCerrar={() => setErrorUnidades(null)} />}

      {pestanaActiva === 'insumos' && <PestanaInsumos unidades={unidades} />}
      {pestanaActiva === 'unidades' && <PestanaUnidades />}
    </div>
  );
}
