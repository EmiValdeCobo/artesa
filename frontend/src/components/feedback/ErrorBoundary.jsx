import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import ErrorSistema from '../sistema/ErrorSistema.jsx';
import { registrarError } from '../../errors/registro.js';
import { enlaceSoporte } from '../../errors/soporte.js';

// Última red de seguridad: si un componente falla al renderizar, en lugar de una pantalla en blanco
// se muestra una página de error neutra. El detalle técnico (mensaje, stack) solo va a la consola/log.
export default class ErrorBoundary extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error, info) {
    registrarError(error, { origen: 'react', componentes: info?.componentStack });
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    const soporte = enlaceSoporte();
    return (
      <main className="min-h-dvh bg-background px-6 py-10 text-fg sm:px-10">
        <div role="alert">
          <ErrorSistema acciones={<>
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" /> Recargar página</button>
            <a href="/" className="btn-ghost">Ir al inicio</a>
            {soporte && <a href={soporte} className="btn-ghost">Contactar a soporte</a>}
          </>}>
            <p className="text-body text-fg">Recarga la página para intentarlo de nuevo. Si el problema continúa, {soporte ? 'contacta a soporte' : 'avisa a un administrador'}.</p>
          </ErrorSistema>
        </div>
      </main>
    );
  }
}
