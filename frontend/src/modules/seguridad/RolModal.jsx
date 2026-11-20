import { useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { LIMITES, descripcionONull, validarRol } from './rbac.js';

const ORDEN_CAMPOS = ['nombre', 'descripcion'];
const idCampo = (campo) => `rol-${campo}`;
const describir = (errores, campo) => (errores[campo] ? idError(idCampo(campo)) : undefined);

// Crear (rol = null) o editar un rol. En roles del sistema solo se puede cambiar la descripción:
// renombrarlos rompería referencias como el rol ADMIN.
export default function RolModal({ rol, roles, guardando, onClose, onSubmit }) {
  const { notificar } = useAlert();
  const [formulario, setFormulario] = useState({ nombre: rol?.nombre ?? '', descripcion: rol?.descripcion ?? '' });
  const [errores, setErrores] = useState({});
  const nombreRef = useRef(null);
  const descripcionRef = useRef(null);
  const ultimoEnvio = useRef(null);
  const nombreBloqueado = Boolean(rol?.es_sistema);

  const enfocarPrimero = (mapa) => {
    const campo = ORDEN_CAMPOS.find((nombre) => mapa[nombre]);
    if (campo) document.getElementById(idCampo(campo))?.focus();
  };

  const actualizar = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };

  const enviar = (event) => {
    event.preventDefault();
    const encontrados = validarRol(formulario, { roles, idActual: rol?.id_rol ?? null });
    setErrores(encontrados);
    if (Object.keys(encontrados).length) {
      enfocarPrimero(encontrados);
      notificar.advertencia('Campos requeridos incompletos', {
        mensaje: 'Revisa los campos señalados en el formulario.',
      });
      return;
    }
    ultimoEnvio.current = { nombre: formulario.nombre.trim(), descripcion: descripcionONull(formulario.descripcion) };
    onSubmit(ultimoEnvio.current);
  };

  const claseInvalida = 'aria-invalid:border-danger';

  return (
    <Dialogo tamano="md" labelledBy="rol-modal-titulo" describedBy="rol-modal-descripcion" enfoqueInicial={nombreBloqueado ? descripcionRef : nombreRef} cerrarConFondo={false} onCerrar={onClose}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="rol-modal-titulo" className="text-h3">{rol ? 'Editar rol' : 'Nuevo rol'}</h2>
          <p id="rol-modal-descripcion" className="mt-1 text-body text-fg-muted">
            {rol ? 'Actualiza el nombre y la descripción del rol.' : 'Crea el rol y luego asígnale sus permisos.'}
          </p>
        </div>
        <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>

      <form noValidate onSubmit={enviar}>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor={idCampo('nombre')} className="mb-1.5 block text-label">Nombre del rol</label>
            <input id={idCampo('nombre')} ref={nombreRef} className={`input ${claseInvalida} disabled:cursor-not-allowed disabled:bg-muted`} value={formulario.nombre}
              onChange={(event) => actualizar('nombre', event.target.value)} maxLength={LIMITES.rolNombre.max + 10} autoComplete="off" spellCheck={false}
              disabled={nombreBloqueado} placeholder="Ej. SUPERVISOR_TURNO"
              aria-invalid={errores.nombre ? true : undefined} aria-describedby={describir(errores, 'nombre')} />
            {nombreBloqueado && (
              <p className="mt-1.5 flex items-center gap-1.5 text-body-sm text-fg-muted"><Lock size={13} aria-hidden="true" /> Es un rol del sistema: su nombre no se puede cambiar.</p>
            )}
            <CampoError id={idCampo('nombre')} mensaje={errores.nombre} />
          </div>

          <div>
            <label htmlFor={idCampo('descripcion')} className="mb-1.5 block text-label">Descripción <span className="font-normal text-fg-muted">(opcional)</span></label>
            <textarea id={idCampo('descripcion')} ref={descripcionRef} rows={3} className={`input resize-y ${claseInvalida}`} value={formulario.descripcion}
              onChange={(event) => actualizar('descripcion', event.target.value)} placeholder="¿Qué hace este rol dentro de artesa?"
              aria-invalid={errores.descripcion ? true : undefined} aria-describedby={describir(errores, 'descripcion')} />
            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><CampoError id={idCampo('descripcion')} mensaje={errores.descripcion} /></div>
              <span className={`ml-auto shrink-0 text-body-sm tabular-nums ${formulario.descripcion.length > LIMITES.descripcion ? 'font-semibold text-danger-text' : 'text-fg-muted'}`}>{formulario.descripcion.length}/{LIMITES.descripcion}</span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost min-h-11 sm:min-h-10" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary min-h-11 sm:min-h-10" disabled={guardando}>{guardando ? 'Guardando…' : rol ? 'Guardar cambios' : 'Crear rol'}</button>
        </div>
      </form>
    </Dialogo>
  );
}
