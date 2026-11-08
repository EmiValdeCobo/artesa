import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
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
      <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-fg">
        <div role="alert" className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center shadow-lg sm:p-9">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger"><TriangleAlert size={28} aria-hidden="true" /></span>
          <h1 className="mt-5 text-xl font-bold tracking-tight">Algo falló en esta pantalla</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">No pudimos mostrar esta parte de artesa por un problema inesperado.</p>
          <p className="mt-3 text-sm leading-relaxed">Recarga la página para intentarlo de nuevo. Si el problema continúa, {soporte ? 'contacta a soporte' : 'avisa a un administrador'}.</p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary min-h-11" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden="true" /> Recargar página</button>
            <a href="/" className="btn-ghost min-h-11">Ir al inicio</a>
            {soporte && <a href={soporte} className="btn-ghost min-h-11">Contactar a soporte</a>}
          </div>
        </div>
      </main>
    );
  }
}
