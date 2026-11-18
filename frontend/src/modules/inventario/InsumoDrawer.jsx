import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { BotonIcono, Button, Select } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import CampoError from '../../components/forms/CampoError.jsx';
import { formatoDinero } from '../../utils/formato.js';
import { aplicarMascara, completarDecimales, propsMascara } from '../../utils/mascaras.js';
import { createInsumo, updateInsumo } from './inventarioApi.js';
const TIPOS_INSUMO = ['INGREDIENTE', 'EMPAQUE', 'REVENTA'];
const VALORES_VACIOS = {};
// ─── DRAWER: Formulario de Insumo ────────────────────────────────────────────
export default function InsumoDrawer({ abierto, insumo, unidades = [], valoresIniciales = VALORES_VACIOS, onCerrar, onGuardado }) {
  const { notificar, notificarError } = useAlert();
  const esEdicion = Boolean(insumo?.id_insumo);

  const [form, setForm] = useState({
    nombre: '',
    tipo_insumo: 'INGREDIENTE',
    id_unidad_base: '',
    costo_promedio: '',
    activo: true,
  });
  const [cargando, setCargando] = useState(false);
  const [errorNombre, setErrorNombre] = useState(null);

  useEffect(() => {
    if (abierto) {
      setErrorNombre(null);
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

  const set = (campo) => (val) => {
    if (campo === 'nombre') setErrorNombre(null);
    setForm((f) => ({ ...f, [campo]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorNombre(null);

    if (!form.nombre.trim()) {
      setErrorNombre('El nombre del insumo es obligatorio.');
      notificar.advertencia('Nombre requerido', { mensaje: 'El nombre del insumo es obligatorio.' });
      return;
    }
    if (!form.tipo_insumo) {
      notificar.advertencia('Tipo requerido', { mensaje: 'Selecciona un tipo de insumo.' });
      return;
    }
    if (!form.id_unidad_base) {
      notificar.advertencia('Unidad requerida', { mensaje: 'Selecciona una unidad de medida base.' });
      return;
    }

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo_insumo: form.tipo_insumo,
        id_unidad_base: Number(form.id_unidad_base),
        activo: form.activo,
        ...(!esEdicion && { costo_promedio: completarDecimales(form.costo_promedio) || '0.00' }),
      };

      const guardado = esEdicion ? await updateInsumo(insumo.id_insumo, payload) : await createInsumo(payload);

      notificar.exito(esEdicion ? 'Insumo actualizado correctamente.' : 'Insumo creado correctamente.');
      onGuardado(guardado);
    } catch (err) {
      const traducido = notificarError(err);
      if (traducido?.id === 'DUPLICADO') {
        setErrorNombre(traducido.mensaje);
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
      {/* Fondo atenuado a pantalla completa (token de overlay, sin blur) */}
      <div
        className="anim-scrim fixed inset-0 w-screen h-dvh z-[60] bg-overlay"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel lateral (Drawer) en Alabastro cálido, estructura Flex vertical completa */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar insumo' : 'Nuevo insumo'}
        className="fixed right-0 top-0 bottom-0 h-dvh w-full max-w-md bg-surface shadow-lg z-[70] flex flex-col border-l border-line"
      >
        {/* Cabecera fija */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface px-6 pb-4 pt-6">
          <div>
            <h2 className="text-h3 text-fg">
              {esEdicion ? 'Editar insumo' : 'Nuevo insumo'}
            </h2>
            <p className="mt-1 text-body text-fg-muted">
              {esEdicion ? 'Actualiza los datos del insumo y stock mínimo' : 'Registra un ingrediente, empaque o artículo de reventa'}
            </p>
          </div>
          <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar formulario" onClick={onCerrar} />
        </div>

        {/* Cuerpo con scroll interno */}
        <form id="form-insumo" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scroll-fino px-6 py-5 space-y-4">
          <div>
            <label htmlFor="insumo-nombre" className="mb-1.5 block text-label text-fg">
              Nombre <span className="text-danger-text">*</span>
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
            <CampoError id="insumo-nombre" mensaje={errorNombre} />
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
              <label htmlFor="insumo-costo" className="mb-1.5 block text-label text-fg">
                Costo
              </label>
              <input
                className="input text-right tabular-nums"
                id="insumo-costo"
                {...propsMascara('monto')}
                value={form.costo_promedio}
                onChange={(e) => set('costo_promedio')(aplicarMascara('monto', e.target.value))}
                onBlur={() => form.costo_promedio && set('costo_promedio')(completarDecimales(form.costo_promedio))}
              />
              <p className="mt-1 text-body-sm text-fg-muted">Costo por {unidades.find((u) => String(u.id_unidad) === String(form.id_unidad_base))?.codigo ?? 'unidad base'}.</p>
            </div>
          ) : (
            <div className="space-y-1 rounded-md bg-muted p-4">
              <span className="rotulo">
                <span title="Promedio del costo de las compras registradas, ponderado por la cantidad comprada.">Costo promedio</span>
              </span>
              <p className="text-h3 tabular-nums text-fg">
                {insumo.costo_promedio == null ? <span title="Sin permiso para ver costos">—</span> : formatoDinero(insumo.costo_promedio)}
              </p>
              <p className="text-body-sm text-fg-muted">
                El costo se actualiza automáticamente con cada factura de compra.
              </p>
            </div>
          )}

          {esEdicion && <div className="flex items-center gap-3 border-t border-line pt-4">
            <input
              id="insumo-activo"
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set('activo')(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-primary"
            />
            <label htmlFor="insumo-activo" className="select-none text-body text-fg">
              Insumo habilitado para operaciones
            </label>
          </div>}
        </form>

        {/* Pie de acciones fijo */}
        <div className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end">
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


