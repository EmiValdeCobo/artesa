import { forwardRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, TriangleAlert } from 'lucide-react';

// Campo de contraseña: candado a la izquierda, "ojito" para mostrar/ocultar a la derecha
// y aviso discreto cuando Bloq Mayús está activo.
// Uso: <PasswordInput id="password" value={password} onChange={...} invalid={false} />
const PasswordInput = forwardRef(function PasswordInput({ id, invalid = false, className = '', ...resto }, ref) {
    const [visible, setVisible] = useState(false);
    const [mayus, setMayus] = useState(false);
    const detectar = (e) => setMayus(Boolean(e.getModifierState?.('CapsLock')));

    return (
        <div>
            <div className="group relative">
                <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted transition-colors group-focus-within:text-primary-text" />
                <input
                    ref={ref}
                    id={id}
                    type={visible ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={mayus ? `${id}-mayus` : undefined}
                    {...resto}
                    onKeyDown={detectar}
                    onKeyUp={detectar}
                    onBlur={() => setMayus(false)}
                    // pl-11 deja sitio al candado; pr-12 al ojito. Se ocultan los iconos nativos de Edge para no duplicarlo.
                    className={`input input-auth pl-11 pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${className}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={visible}
                    title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
            </div>
            {mayus && (
                <p id={`${id}-mayus`} role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                    <TriangleAlert size={13} aria-hidden="true" /> Bloq Mayús está activado
                </p>
            )}
        </div>
    );
});

export default PasswordInput;