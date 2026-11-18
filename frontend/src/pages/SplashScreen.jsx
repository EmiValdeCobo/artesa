import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/branding/Logo.jsx';

// Pantalla de bienvenida (splash) de artesa para visitantes sin sesión.
// Logo centrado sobre un fondo cálido Espresso; sin spinners ni barras de progreso.
// Tras 1.8 s se desvanece (opacidad 0.3 s) y redirige a /admin/login; no permanece montada.
const ESPERA_MS = 1800;
const FUNDIDO_MS = 300;
const FONDO = 'radial-gradient(circle at 50% 40%, #44211a 0%, #1f120e 100%)';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);
  const refFundido = useRef(null);

  useEffect(() => {
    const refEspera = setTimeout(() => {
      setSaliendo(true);
      refFundido.current = setTimeout(() => navigate('/admin/login', { replace: true }), FUNDIDO_MS);
    }, ESPERA_MS);
    return () => { clearTimeout(refEspera); clearTimeout(refFundido.current); };
  }, [navigate]);

  return (
    <div
      role="status"
      aria-label="Iniciando artesa"
      style={{ background: FONDO, transitionDuration: `${FUNDIDO_MS}ms` }}
      className={`fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center transition-opacity ease-out ${saliendo ? 'opacity-0' : 'opacity-100'}`}
    >
      <Logo variante="completo" tema="oscuro" alto={64} alt="artesa · ERP & POS" />
      <p className="mt-6 text-label-sm uppercase tracking-widest text-espresso-200">
        Sistema de gestión artesanal
      </p>
    </div>
  );
}
