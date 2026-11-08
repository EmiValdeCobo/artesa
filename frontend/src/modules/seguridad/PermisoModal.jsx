import { useEffect, useRef, useState } from 'react';
import { Lock, TriangleAlert, X } from 'lucide-react';
import BannerError from '../../components/feedback/BannerError.jsx';
import CampoError, { idError } from '../../components/forms/CampoError.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { LIMITES, descripcionONull, infoModulo, motivoBloqueoPermiso, validarPermiso } from './rbac.js';

const ORDEN_CAMPOS = ['codigo', 'modulo', 'descripcion'];
const idCampo = (campo) => `permiso-${campo}`;
const describir = (errores, campo) => (errores[campo] ? idError(idCampo(campo)) : undefined);

// Crear (permiso = null) o editar un permiso del catálogo.
// `modulos` son los módulos ya existentes (sugerencias); `permisos` sirve para detectar códigos repetidos.
export default function PermisoModal({ permiso, permisos, modulos, guardando, error, onDescartarError, onClose, onSubmit }) {
  const [formulario, setFormulario] = useState({ codigo: permiso?.codigo ?? '', modulo: permiso?.modulo ?? '', descripcion: permiso?.descripcion ?? '' });
  const [errores, setErrores] = useState({});
  const codigoRef = useRef(null);
  const moduloRef = useRef(null);
  const ultimoEnvio = useRef(null);
  const bloqueo = permiso ? motivoBloqueoPermiso(permiso) : null;
  const cambiaCodigo = Boolean(permiso) && formulario.codigo.trim() !== permiso.codigo;

  const enfocarPrimero = (mapa) => {
    const campo = ORDEN_CAMPOS.find((nombre) => mapa[nombre]);
    if (campo) document.getElementById(idCampo(campo))?.focus();
  };

  useEffect(() => {
    if (!error?.campos) return;
    setErrores(error.campos);
    enfocarPrimero(error.campos);
  }, [error]);

  const actualizar = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };

  const enviar = (event) => {
    event.preventDefault();
    const encontrados = validarPermiso(formulario, { permisos, idActual: permiso?.id_permiso ?? null });
    setErrores(encontrados);
    if (Object.keys(encontrados).length) { enfocarPrimero(encontrados); return; }
    // El módulo se guarda en MAYÚSCULAS como los existentes, para que "Caja" y "CAJA" no formen dos grupos.
    ultimoEnvio.current = { codigo: formulario.codigo.trim(), modulo: formulario.modulo.trim().toUpperCase(), descripcion: descripcionONull(formulario.descripcion) };
    onSubmit(ultimoEnvio.current);
  };

  const claseInvalida = 'aria-invalid:border-danger';

  return (
    <Dialogo tamano="md" labelledBy="permiso-modal-titulo" describedBy="permiso-modal-descripcion" enfoqueInicial={bloqueo ? moduloRef : codigoRef} cerrarConFondo={false} onCerrar={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div>
          <h2 id="permiso-modal-titulo" className="text-xl font-bold tracking-tight">{permiso ? 'Editar permiso' : 'Nuevo permiso'}</h2>
          <p id="permiso-modal-descripcion" className="mt-1 text-sm text-fg-muted">El código debe coincidir con el que valida el backend en cada ruta protegida.</p>
        </div>
        <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Cerrar formulario"><X size={18} /></button>
      </div>

      <form noValidate onSubmit={enviar}>
        <div className="space-y-5 p-5 sm:p-6">
          <BannerError error={error} onCerrar={onDescartarError} onReintentar={() => ultimoEnvio.current && onSubmit(ultimoEnvio.current)} />

          <div>
            <label htmlFor={idCampo('codigo')} className="block text-sm font-medium">Código</label>
            <input id={idCampo('codigo')} ref={codigoRef} className={`input mt-1.5 font-mono text-sm uppercase ${claseInvalida} disabled:cursor-not-allowed disabled:bg-muted`} value={formulario.codigo}
              onChange={(event) => actualizar('codigo', event.target.value.toUpperCase().replace(/\s+/g, '_'))} maxLength={LIMITES.permisoCodigo.max + 10}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={Boolean(bloqueo)} placeholder="MODULO_ACCION"
              aria-invalid={errores.codigo ? true : undefined} aria-describedby={describir(errores, 'codigo')} />
            {bloqueo && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-fg-muted"><Lock size={13} aria-hidden="true" className="mt-px shrink-0" /> {bloqueo}</p>}
            {cambiaCodigo && !errores.codigo && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-warning"><TriangleAlert size={13} aria-hidden="true" className="mt-px shrink-0" /> Cambiar el código deja sin efecto las rutas que usan el código anterior.</p>
            )}
            <CampoError id={idCampo('codigo')} mensaje={errores.codigo} />
          </div>

          <div>
            <label htmlFor={idCampo('modulo')} className="block text-sm font-medium">Módulo</label>
            <input id={idCampo('modulo')} ref={moduloRef} list="permiso-modulos" className={`input mt-1.5 ${claseInvalida}`} value={formulario.modulo}
              onChange={(event) => actualizar('modulo', event.target.value)} maxLength={LIMITES.modulo.max + 10} autoComplete="off" placeholder="Elige uno existente o escribe uno nuevo"
              aria-invalid={errores.modulo ? true : undefined} aria-describedby={describir(errores, 'modulo')} />
            <datalist id="permiso-modulos">{modulos.map((modulo) => <option key={modulo} value={modulo}>{infoModulo(modulo).etiqueta}</option>)}</datalist>
            <CampoError id={idCampo('modulo')} mensaje={errores.modulo} />
          </div>

          <div>
            <label htmlFor={idCampo('descripcion')} className="block text-sm font-medium">Descripción <span className="font-normal text-fg-muted">(opcional)</span></label>
            <textarea id={idCampo('descripcion')} rows={3} className={`input mt-1.5 resize-y ${claseInvalida}`} value={formulario.descripcion}
              onChange={(event) => actualizar('descripcion', event.target.value)} placeholder="¿Qué permite hacer?"
              aria-invalid={errores.descripcion ? true : undefined} aria-describedby={describir(errores, 'descripcion')} />
            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><CampoError id={idCampo('descripcion')} mensaje={errores.descripcion} /></div>
              <span className={`ml-auto shrink-0 text-xs ${formulario.descripcion.length > LIMITES.descripcion ? 'font-semibold text-danger' : 'text-fg-muted'}`}>{formulario.descripcion.length}/{LIMITES.descripcion}</span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2.5 border-t border-line bg-surface p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" className="btn-ghost min-h-11 sm:min-h-10" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary min-h-11 sm:min-h-10" disabled={guardando}>{guardando ? 'Guardando…' : permiso ? 'Guardar cambios' : 'Crear permiso'}</button>
        </div>
      </form>
    </Dialogo>
  );
}
