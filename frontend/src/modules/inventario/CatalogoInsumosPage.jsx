import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Ruler, Pencil, Trash2, X, Plus } from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import CampoTexto from '../../components/forms/CampoTexto.jsx';
import { traducirError } from '../../errors/traducirError.js';
import {
  getInsumos, createInsumo, updateInsumo, deleteInsumo,
  getUnidades, createUnidad, updateUnidad, deleteUnidad,
} from './inventarioApi.js';
import { MOCK_INSUMOS, MOCK_UNIDADES } from './mockData.js';

// ─── Constantes ──────────────────────────────────────────────────────────────
const TIPOS_INSUMO = ['INGREDIENTE', 'EMPAQUE', 'REVENTA'];

const PESTANAS_DEF = [
  { clave: 'insumos', texto: 'Insumos', icono: Package },
  { clave: 'unidades', texto: 'Unidades de Medida', icono: Ruler },
];

const FILTRO_STOCK_OPTS = [
  { valor: 'TODOS', texto: 'Todos los estados' },
  { valor: 'NORMAL', texto: 'Normal' },
  { valor: 'BAJO_MINIMO', texto: 'Bajo Mínimo' },
  { valor: 'AGOTADO', texto: 'Agotado' },
];

const FILTRO_TIPO_OPTS = [
  { valor: 'TODOS', texto: 'Todos los tipos' },
  { valor: 'INGREDIENTE', texto: 'Ingrediente' },
  { valor: 'EMPAQUE', texto: 'Empaque' },
  { valor: 'REVENTA', texto: 'Reventa' },
];

// ─── Helpers: Semáforo y Tipo ────────────────────────────────────────────────
function calcularEstadoStock(insumo) {
  const stockActual = Number(insumo.stock_actual ?? 0);
  const stockMinimo = Number(insumo.stock_minimo ?? 0);
  if (stockMinimo > 0 && stockActual <= 0) return 'AGOTADO';
  if (stockMinimo > 0 && stockActual <= stockMinimo) return 'BAJO_MINIMO';
  return 'NORMAL';
}

function SemaforoBadge({ insumo }) {
  const estado = calcularEstadoStock(insumo);
  if (estado === 'AGOTADO') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-danger-soft text-danger">
        Agotado
      </span>
    );
  }
  if (estado === 'BAJO_MINIMO') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary-soft text-secondary-text">
        Bajo Mínimo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-soft text-success">
      Normal
    </span>
  );
}

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
    codigo_sku: '',
    tipo_insumo: 'INGREDIENTE',
    id_unidad_base: '',
    stock_minimo: '',
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
          codigo_sku: insumo.codigo_sku ?? insumo.sku ?? '',
          tipo_insumo: insumo.tipo_insumo ?? 'INGREDIENTE',
          id_unidad_base: String(insumo.id_unidad_base ?? ''),
          stock_minimo: insumo.stock_minimo != null ? String(insumo.stock_minimo) : '',
          costo_promedio: insumo.costo_promedio ?? '',
          activo: insumo.activo ?? true,
        });
      } else {
        setForm({
          nombre: '',
          codigo_sku: '',
          tipo_insumo: 'INGREDIENTE',
          id_unidad_base: '',
          stock_minimo: '0.0000',
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

    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.tipo_insumo) return setError('Selecciona un tipo de insumo.');
    if (!form.id_unidad_base) return setError('Selecciona una unidad de medida base.');

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        codigo_sku: form.codigo_sku?.trim() || null,
        tipo_insumo: form.tipo_insumo,
        id_unidad_base: Number(form.id_unidad_base),
        stock_minimo: form.stock_minimo ? String(form.stock_minimo).trim() : '0.0000',
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
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  const opcionesUnidades = unidades.map((u) => ({
    valor: String(u.id_unidad),
    texto: `${u.codigo} — ${u.nombre}`,
  }));

  const opcionesTipo = TIPOS_INSUMO.map((t) => ({
    valor: t,
    texto: t.charAt(0) + t.slice(1).toLowerCase(),
  }));

  return (
    <>
      <div
        className="fixed inset-0 bg-espresso-900/60 z-40 transition-opacity"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col"
      >
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">
            {esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ghost !p-1.5 min-h-8"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form id="form-insumo" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scroll-fino px-5 py-4 space-y-4">
          {error && <BannerError error={error} onCerrar={() => setError(null)} />}

          <div>
            <label htmlFor="insumo-sku" className="mb-1 block text-sm font-medium text-fg">
              Código / SKU
            </label>
            <CampoTexto
              id="insumo-sku"
              placeholder="Ej. INS-001 o código de barras"
              value={form.codigo_sku}
              onChange={(e) => set('codigo_sku')(e.target.value)}
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="insumo-nombre" className="mb-1 block text-sm font-medium text-fg">
              Nombre del Insumo <span className="text-danger">*</span>
            </label>
            <CampoTexto
              id="insumo-nombre"
              placeholder="Ej. Café molido espresso"
              value={form.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              maxLength={150}
              required
            />
          </div>

          <Select
            etiqueta="Tipo de insumo"
            opciones={opcionesTipo}
            placeholder="Selecciona un tipo…"
            value={form.tipo_insumo}
            onChange={(e) => set('tipo_insumo')(e.target.value)}
          />

          <Select
            etiqueta="Unidad de medida base"
            opciones={opcionesUnidades}
            placeholder="Selecciona una unidad…"
            value={form.id_unidad_base}
            onChange={(e) => set('id_unidad_base')(e.target.value)}
          />

          <div>
            <label htmlFor="insumo-stock-minimo" className="mb-1 block text-sm font-medium text-fg">
              Stock mínimo preventivo
            </label>
            <CampoTexto
              id="insumo-stock-minimo"
              type="number"
              placeholder="Ej. 1000.0000"
              value={form.stock_minimo}
              onChange={(e) => set('stock_minimo')(e.target.value)}
              min={0}
              step="0.0001"
            />
            <p className="mt-1 text-xs text-fg-muted">
              Nivel que activa la alerta preventiva (semáforo en Ocre).
            </p>
          </div>

          {!esEdicion ? (
            <div>
              <label htmlFor="insumo-costo" className="mb-1 block text-sm font-medium text-fg">
                Costo inicial / referencia
              </label>
              <CampoTexto
                id="insumo-costo"
                type="number"
                placeholder="0.0000"
                value={form.costo_promedio}
                onChange={(e) => set('costo_promedio')(e.target.value)}
                min={0}
                step="0.0001"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-muted/40 p-3 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Costo promedio ponderado actual
              </span>
              <p className="text-sm font-mono font-bold text-fg">
                $ {insumo.costo_promedio ?? '0.0000'}
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

        <div className="px-5 py-4 border-t border-line flex gap-3 justify-end">
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
    </>
  );
}

// ─── MODAL: Formulario de Unidad de Medida ───────────────────────────────────
function ModalUnidad({ abierto, unidad, onCerrar, onGuardado }) {
  const { notificar } = useAlert();
  const esEdicion = Boolean(unidad?.id_unidad);

  const [form, setForm] = useState({ codigo: '', nombre: '', factor_conversion: '1.0000' });
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
            }
          : { codigo: '', nombre: '', factor_conversion: '1.0000' },
      );
    }
  }, [abierto, unidad, esEdicion]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.codigo.trim()) return setError('El código / abreviatura es obligatorio.');
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');

    setCargando(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        factor_conversion: form.factor_conversion?.trim() || '1.0000',
      };
      if (esEdicion) {
        await updateUnidad(unidad.id_unidad, payload);
      } else {
        await createUnidad(payload);
      }
      notificar.exito(esEdicion ? 'Unidad actualizada correctamente.' : 'Unidad creada correctamente.');
      onGuardado();
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-900/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar Unidad' : 'Nueva Unidad'}
        className="bg-surface rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">
            {esEdicion ? 'Editar Unidad' : 'Nueva Unidad de Medida'}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ghost !p-1.5 min-h-8"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form id="form-unidad" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <BannerError error={error} onCerrar={() => setError(null)} />}

          <div>
            <label htmlFor="unidad-codigo" className="mb-1 block text-sm font-medium text-fg">
              Abreviatura / Símbolo <span className="text-danger">*</span>
            </label>
            <CampoTexto
              id="unidad-codigo"
              placeholder="Ej. kg, ml, g, oz, unidad"
              value={form.codigo}
              onChange={set('codigo')}
              maxLength={10}
              required
            />
          </div>

          <div>
            <label htmlFor="unidad-nombre" className="mb-1 block text-sm font-medium text-fg">
              Nombre de la Unidad <span className="text-danger">*</span>
            </label>
            <CampoTexto
              id="unidad-nombre"
              placeholder="Ej. Kilogramo, Mililitro"
              value={form.nombre}
              onChange={set('nombre')}
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor="unidad-factor" className="mb-1 block text-sm font-medium text-fg">
              Factor de conversión
            </label>
            <CampoTexto
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

        <div className="px-5 py-4 border-t border-line flex gap-3 justify-end">
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
    </div>
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
  const [esMock, setEsMock] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState('TODOS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [insumoActual, setInsumoActual] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setEsMock(false);
    try {
      const data = await getInsumos();
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      setInsumos(lista);
      setErrorBanner(null);
    } catch {
      const mapa = Object.fromEntries(
        MOCK_UNIDADES.map((u) => [u.id_unidad, u.codigo]),
      );
      const enriquecidos = MOCK_INSUMOS.map((i) => ({
        ...i,
        codigo_unidad: i.codigo_unidad ?? mapa[i.id_unidad_base] ?? '—',
      }));
      setInsumos(enriquecidos);
      setEsMock(true);
      setErrorBanner('No se pudo conectar con el servidor. Mostrando datos de demostración.');
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
        ins.nombre?.toLowerCase().includes(termino) ||
        ins.codigo_sku?.toLowerCase().includes(termino) ||
        ins.sku?.toLowerCase().includes(termino);

      const coincideTipo = filtroTipo === 'TODOS' || ins.tipo_insumo === filtroTipo;

      const estadoStock = calcularEstadoStock(ins);
      const coincideStock = filtroStock === 'TODOS' || estadoStock === filtroStock;

      return coincideBusqueda && coincideTipo && coincideStock;
    });
  }, [insumos, busqueda, filtroTipo, filtroStock]);

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

  const handleEliminar = async (ins) => {
    const confirmado = await confirm({
      titulo: 'Eliminar insumo',
      mensaje: `¿Deseas dar de baja el insumo "${ins.nombre}"? Si está en uso en recetas o compras, no podrá eliminarse.`,
      destructivo: true,
      etiquetaCancelar: 'Cancelar',
      etiquetaAceptar: 'Eliminar insumo',
    });
    if (!confirmado) return;

    try {
      await deleteInsumo(ins.id_insumo);
      notificar.exito('Insumo eliminado correctamente.');
      setInsumos((prev) => prev.filter((i) => i.id_insumo !== ins.id_insumo));
    } catch (err) {
      const status = err?.status;
      if (status === 409) {
        setErrorBanner('No se puede eliminar: el insumo está vinculado en recetas, compras o movimientos.');
      } else {
        setErrorBanner(traducirError(err));
      }
    }
  };

  const columnas = [
    {
      clave: 'codigo_sku',
      titulo: 'Código/SKU',
      render: (fila) => (
        <span className="font-mono text-xs font-semibold text-fg-muted">
          {fila.codigo_sku || fila.sku || `INS-${String(fila.id_insumo).padStart(3, '0')}`}
        </span>
      ),
    },
    {
      clave: 'nombre',
      titulo: 'Nombre del insumo',
      render: (fila) => (
        <div>
          <span className="font-medium text-fg">{fila.nombre}</span>
          <div className="mt-0.5">
            <TipoBadge tipo={fila.tipo_insumo} />
          </div>
        </div>
      ),
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
          $ {fila.costo_promedio ?? '0.0000'}
        </span>
      ),
    },
    {
      clave: 'stock_minimo',
      titulo: 'Stock mín.',
      alinear: 'right',
      render: (fila) =>
        fila.stock_minimo != null ? (
          <span className="text-sm font-mono text-fg-muted">{fila.stock_minimo}</span>
        ) : (
          <span className="text-xs text-fg-muted">—</span>
        ),
    },
    {
      clave: 'semaforo',
      titulo: 'Semáforo',
      render: (fila) => <SemaforoBadge insumo={fila} />,
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
                  title="Eliminar insumo"
                  onClick={() => handleEliminar(fila)}
                >
                  <Trash2 size={15} />
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
        descripcion="Gestión de materias primas, empaques y artículos de reventa con control de stock y costeo"
        acciones={
          puedeGestionar && (
            <Button variante="primary" icono={Plus} onClick={abrirCrear}>
              Nuevo Insumo
            </Button>
          )
        }
      />

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
          placeholder="Buscar por nombre o código/SKU…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input flex-1"
          aria-label="Buscar insumo por nombre o código"
        />
        <div className="sm:w-48">
          <Select
            opciones={FILTRO_STOCK_OPTS}
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <Select
            opciones={FILTRO_TIPO_OPTS}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Insumos */}
      <Card sinPadding>
        <Table
          columnas={columnas}
          filas={insumosFiltrados}
          idFila="id_insumo"
          cargando={cargando}
          vacio="Sin insumos registrados para los criterios seleccionados."
        />
      </Card>

      {esMock && (
        <p className="text-xs text-fg-muted text-center">
          Mostrando datos de demostración. Conecta con la base de datos para sincronizar en tiempo real.
        </p>
      )}

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
  const [unidadActual, setUnidadActual] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getUnidades();
      setUnidades(Array.isArray(data) ? data : (data?.data ?? []));
      setErrorBanner(null);
    } catch {
      setUnidades(MOCK_UNIDADES);
      setErrorBanner('No se pudo conectar con el servidor. Mostrando unidades de demostración.');
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
    const confirmado = await confirm({
      titulo: 'Desactivar unidad de medida',
      mensaje: `¿Desactivar la unidad "${u.nombre}" (${u.codigo})? Los insumos existentes la mantendrán, pero no se sugerirá para nuevos registros.`,
      destructivo: true,
      etiquetaCancelar: 'Cancelar',
      etiquetaAceptar: 'Desactivar',
    });
    if (!confirmado) return;

    try {
      await updateUnidad(u.id_unidad, { activo: false });
      notificar.exito('Unidad de medida desactivada.');
      cargar();
    } catch (err) {
      setErrorBanner(traducirError(err));
    }
  };

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
                  title="Desactivar unidad"
                  onClick={() => handleDesactivar(fila)}
                >
                  <Trash2 size={15} />
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

      <Card sinPadding>
        <Table
          columnas={columnas}
          filas={unidades}
          idFila="id_unidad"
          cargando={cargando}
          vacio="Sin unidades de medida registradas."
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
  useEffect(() => {
    getUnidades()
      .then((data) => setUnidades(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setUnidades(MOCK_UNIDADES));
  }, []);

  return (
    <div className="space-y-6">
      <Pestanas
        pestanas={PESTANAS_DEF}
        activa={pestanaActiva}
        onCambiar={setPestanaActiva}
        etiqueta="Secciones de catálogo"
      />

      {pestanaActiva === 'insumos' && <PestanaInsumos unidades={unidades} />}
      {pestanaActiva === 'unidades' && <PestanaUnidades />}
    </div>
  );
}
