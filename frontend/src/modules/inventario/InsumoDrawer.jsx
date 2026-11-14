import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import { Button, Select } from '../../components/ui/index.js';
import CampoError from '../../components/forms/CampoError.jsx';
import { formatoDinero } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import { createInsumo, updateInsumo } from './inventarioApi.js';
const TIPOS_INSUMO = ['INGREDIENTE', 'EMPAQUE', 'REVENTA'];
const VALORES_VACIOS = {};
const avisoLocal = (mensaje, titulo = 'Revisa la información') => ({ titulo, mensaje, accion: '', categoria: 'usuario' });
// ─── DRAWER: Formulario de Insumo ────────────────────────────────────────────
export default function InsumoDrawer({ abierto, insumo, unidades = [], valoresIniciales = VALORES_VACIOS, onCerrar, onGuardado }) {
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
        setForm({ nombre: valoresIniciales.nombre ?? '', tipo_insumo: valoresIniciales.tipo_insumo ?? 'INGREDIENTE', id_unidad_base: String(valoresIniciales.id_unidad_base ?? ''), costo_promedio: valoresIniciales.costo_promedio ? Number(valoresIniciales.costo_promedio).toFixed(2) : '0.00', activo: valoresIniciales.activo ?? true });
      }
    }
  }, [abierto, insumo, esEdicion, valoresIniciales]);

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
        ...(!esEdicion && { costo_promedio: form.costo_promedio ? Number(form.costo_promedio).toFixed(2) : '0.00' }),
      };

      const guardado = esEdicion ? await updateInsumo(insumo.id_insumo, payload) : await createInsumo(payload);

      notificar.exito(esEdicion ? 'Insumo actualizado correctamente.' : 'Insumo creado correctamente.');
      onGuardado(guardado);
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
        className="fixed inset-0 w-screen h-dvh z-[60] bg-[#1C110D]/75 backdrop-blur-[2px] transition-opacity"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel lateral (Drawer) en Alabastro cálido, estructura Flex vertical completa */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar insumo' : 'Nuevo insumo'}
        className="fixed right-0 top-0 bottom-0 h-dvh w-full max-w-md bg-[#FAF8F5] dark:bg-[#2A1A14] shadow-2xl z-[70] flex flex-col border-l border-line"
      >
        {/* Cabecera fija */}
        <div className="px-6 py-4 border-b border-line bg-[#FAF8F5] dark:bg-[#2A1A14] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {esEdicion ? 'Editar insumo' : 'Nuevo insumo'}
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              {esEdicion ? 'Actualiza los datos del insumo y stock mínimo' : 'Registra un ingrediente, empaque o artículo de reventa'}
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
              Nombre <span className="text-danger ml-0.5 font-semibold">*</span>
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
            etiqueta="Tipo"
            requerido
            opciones={opcionesTipo}
            placeholder="Ingrediente, empaque o reventa…"
            value={form.tipo_insumo}
            onChange={(e) => set('tipo_insumo')(e.target.value)}
          />

          <Select
            etiqueta="Unidad"
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
                Costo
              </label>
              <input
                className="input font-mono"
                id="insumo-costo"
                type="number"
                placeholder="0.00"
                value={form.costo_promedio}
                onChange={(e) => set('costo_promedio')(e.target.value)}
                min={0}
                step="0.01"
              />
              <p className="mt-1 text-xs text-fg-muted">Costo por {unidades.find((u) => String(u.id_unidad) === String(form.id_unidad_base))?.codigo ?? 'unidad base'}.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <span title="Promedio del costo de las compras registradas, ponderado por la cantidad comprada.">Costo promedio</span>
              </span>
              <p className="text-sm font-mono font-bold text-fg">
                {insumo.costo_promedio == null ? <span title="Sin permiso para ver costos">—</span> : formatoDinero(insumo.costo_promedio)}
              </p>
              <p className="text-xs text-fg-muted italic">
                El costo se actualiza automáticamente con cada factura de compra.
              </p>
            </div>
          )}

          {esEdicion && <div className="flex items-center gap-3 pt-2">
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
          </div>}
        </form>

        {/* Pie de acciones fijo */}
        <div className="sticky bottom-0 border-t border-line bg-[#FAF8F5] dark:bg-[#2A1A14] px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <Button variante="ghost" onClick={onCerrar} disabled={cargando}>
            Descartar cambios
          </Button>
          <Button
            variante="primary"
            type="submit"
            form="form-insumo"
            cargando={cargando}
            disabled={cargando}
          >
            {esEdicion ? 'Guardar cambios' : 'Guardar insumo'}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}


