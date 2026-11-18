import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleDashed, Monitor } from 'lucide-react';
import { api } from '../../api/client.js';
import Dialogo from '../../components/Dialogo.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { BotonIcono, Button, Table } from '../../components/ui/index.js';
import { SkeletonTexto } from '../../components/feedback/Skeleton.jsx';
import { ICONOS } from '../../config/iconos.js';
import { traducirError } from '../../errors/traducirError.js';
import { enteroParaInput, formatearUnidades } from '../../utils/formato.js';
import { aplicarMascara, propsMascara } from '../../utils/mascaras.js';

// Valores iniciales del formulario: el mínimo vigente o, si la sucursal es nueva, el sugerido
// (mayor mínimo de las demás sucursales activas); la carga inicial cubre lo que falta para ese mínimo.
function armarFilas(insumos) {
  return Object.fromEntries(insumos.map((i) => {
    const minimo = Number(enteroParaInput(i.stock_minimo)) > 0 ? enteroParaInput(i.stock_minimo) : enteroParaInput(i.stock_minimo_sugerido);
    const faltante = Math.max(Number(minimo || 0) - Number(enteroParaInput(i.stock_actual) || 0), 0);
    return [i.id_insumo, { stockMinimo: minimo === '0' ? '' : minimo, cantidadInicial: faltante ? String(faltante) : '' }];
  }));
}

function Requisito({ cumplido, titulo, children }) {
  const Icono = cumplido ? CircleCheck : CircleDashed;
  return (
    <li className={`flex items-start gap-3 rounded-lg border p-3.5 ${cumplido ? 'border-success/30 bg-success-soft/40' : 'border-warning/30 bg-warning-soft/40'}`}>
      <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${cumplido ? 'text-success' : 'text-warning'}`} />
      <div className="min-w-0 text-body">
        <p className="font-semibold">{titulo}</p>
        <div className="mt-0.5 text-body-sm text-fg-muted">{children}</div>
      </div>
    </li>
  );
}

export default function AperturaSucursalDialogo({ sucursal, onCerrar }) {
  const { notificar, notificarError } = useAlert();
  const [estado, setEstado] = useState(null);
  const [filas, setFilas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const datos = await api.get(`/empresa/sucursales/${sucursal.id_sucursal}/apertura`);
      setEstado(datos);
      setFilas(armarFilas(datos.insumos));
    } catch (err) {
      setErrorCarga(traducirError(err));
    } finally {
      setCargando(false);
    }
  }, [sucursal.id_sucursal]);

  useEffect(() => { cargar(); }, [cargar]);

  const actualizar = (idInsumo, campo, valor) => {
    setFilas((actuales) => ({ ...actuales, [idInsumo]: { ...actuales[idInsumo], [campo]: aplicarMascara('entero', valor) } }));
    setConfirmado(false);
  };

  // Vista previa por fila (cantidades físicas enteras): el veredicto definitivo lo devuelve el backend.
  const previa = useMemo(() => Object.fromEntries((estado?.insumos ?? []).map((i) => {
    const f = filas[i.id_insumo] ?? {};
    const minimo = Number(f.stockMinimo || 0);
    const resultante = Number(enteroParaInput(i.stock_actual) || 0) + Number(f.cantidadInicial || 0);
    return [i.id_insumo, { minimo, resultante, cubierto: minimo > 0 && resultante >= minimo }];
  })), [estado, filas]);

  const sinMinimo = (estado?.insumos ?? []).filter((i) => !previa[i.id_insumo]?.minimo).length;
  const cubiertosPrevia = Object.values(previa).filter((p) => p.cubierto).length;
  const total = estado?.insumos.length ?? 0;

  async function confirmar(evento) {
    evento.preventDefault();
    if (sinMinimo > 0) {
      notificar.advertencia('Stock mínimo incompleto', {
        mensaje: `Debes definir el stock mínimo para los ${sinMinimo} insumo(s) pendientes.`,
      });
      return;
    }
    if (!confirmado) {
      notificar.advertencia('Confirmación requerida', {
        mensaje: 'Debes marcar la casilla de confirmación para continuar.',
      });
      return;
    }
    setGuardando(true);
    try {
      const items = estado.insumos.map((i) => ({
        idInsumo: i.id_insumo,
        stockMinimo: filas[i.id_insumo].stockMinimo,
        cantidadInicial: filas[i.id_insumo].cantidadInicial || '0',
      }));
      const datos = await api.post(`/empresa/sucursales/${sucursal.id_sucursal}/apertura`, { items });
      setEstado(datos);
      setFilas(armarFilas(datos.insumos));
      setConfirmado(false);
      if (datos.lista) notificar.exito(`${sucursal.nombre} está lista para operar`);
      else notificar.advertencia('Stock registrado', { mensaje: 'La sucursal aún no cumple todos los requisitos para operar.' });
    } catch (err) {
      notificarError(err, { reintentar: () => confirmar(evento) });
    } finally {
      setGuardando(false);
    }
  }

  const admins = estado?.usuarios.filter((u) => u.rol === 'ADMIN') ?? [];

  const columnasInsumos = [
    {
      clave: 'insumo',
      titulo: 'Insumo',
      tipo: 'texto',
      valorOrden: (i) => i.insumo,
      render: (i) => (
        <div>
          <p className="font-medium">{i.insumo}</p>
          <p className="text-body-sm text-fg-muted">{i.tipo_insumo.toLowerCase()} · {i.unidad}{Number(i.stock_minimo_sugerido) > 0 && ` · sugerido ${formatearUnidades(i.stock_minimo_sugerido)}`}</p>
        </div>
      ),
    },
    {
      clave: 'stock_actual',
      titulo: 'Stock actual',
      tipo: 'numero',
      alinear: 'right',
      valorOrden: (i) => Number(enteroParaInput(i.stock_actual) || 0),
      render: (i) => <span className="tabular-nums">{formatearUnidades(i.stock_actual)}</span>,
    },
    {
      clave: 'stockMinimo',
      titulo: 'Mínimo para operar',
      ordenable: false,
      render: (i) => {
        const f = filas[i.id_insumo] ?? {};
        return (
          <input
            {...propsMascara('entero')}
            className="input h-9 w-28 aria-invalid:border-danger"
            value={f.stockMinimo ?? ''}
            onChange={(e) => actualizar(i.id_insumo, 'stockMinimo', e.target.value)}
            aria-label={`Stock mínimo de ${i.insumo} en ${i.unidad}`}
            aria-invalid={!f.stockMinimo || undefined}
          />
        );
      },
    },
    {
      clave: 'cantidadInicial',
      titulo: 'Carga inicial',
      ordenable: false,
      render: (i) => {
        const f = filas[i.id_insumo] ?? {};
        return (
          <input
            {...propsMascara('entero')}
            className="input h-9 w-28"
            value={f.cantidadInicial ?? ''}
            onChange={(e) => actualizar(i.id_insumo, 'cantidadInicial', e.target.value)}
            aria-label={`Carga inicial de ${i.insumo} en ${i.unidad}`}
          />
        );
      },
    },
    {
      clave: 'resultado',
      titulo: 'Resultado',
      tipo: 'texto',
      valorOrden: (i) => (previa[i.id_insumo]?.cubierto ? 'Cubierto' : 'Falta stock'),
      render: (i) => {
        const p = previa[i.id_insumo] ?? {};
        return (
          <EstadoBadge tipo={p.cubierto ? 'exito' : 'alerta'}>
            {p.cubierto ? `Cubierto (${formatearUnidades(p.resultante)})` : 'Falta stock'}
          </EstadoBadge>
        );
      },
    },
  ];

  return (
    <Dialogo onCerrar={() => !guardando && onCerrar()} tamano="xl" cerrarConFondo={false} labelledBy="apertura-titulo" describedBy="apertura-descripcion">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="apertura-titulo" className="text-h3">{sucursal.nombre} <span className="font-mono text-body text-fg-muted">{sucursal.codigo_establecimiento}</span></h2>
          <p id="apertura-descripcion" className="mt-1 text-body text-fg-muted">
            Revisa el personal, la caja y el stock mínimo que necesita para operar. Confirma antes de habilitarla en el POS.
          </p>
        </div>
        <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar apertura" onClick={onCerrar} disabled={guardando} />
      </div>

      <div className="space-y-4 px-6 py-5">
        <BannerError error={errorCarga} onReintentar={cargar} />

        {cargando ? <SkeletonTexto lineas={4} texto="Cargando requisitos de apertura…" /> : estado && (
          <>
            {estado.lista
              ? <EstadoBadge tipo="exito">Lista para operar</EstadoBadge>
              : <EstadoBadge tipo="alerta">Pendiente de requisitos</EstadoBadge>}

            <ul className="grid gap-3 sm:grid-cols-3" aria-label="Requisitos de apertura">
              <Requisito cumplido={estado.usuarios.length > 0} titulo={`Personal asignado (${estado.usuarios.length})`}>
                {admins.length ? `Administración global: ${admins.map((u) => u.username).join(', ')}` : 'Sin administrador asignado'}
                {estado.usuarios.length > admins.length && <span className="block">+ {estado.usuarios.length - admins.length} usuario(s) de la sucursal</span>}
              </Requisito>
              <Requisito cumplido={estado.cajas.length > 0} titulo={`Caja POS (${estado.cajas.length})`}>
                {estado.cajas.length
                  ? estado.cajas.map((c) => <span key={c.id_caja} className="flex items-center gap-1"><Monitor size={12} aria-hidden="true" />{c.nombre_identificador} · {c.codigo_punto_venta}</span>)
                  : 'Sin caja configurada'}
              </Requisito>
              <Requisito cumplido={total > 0 && estado.insumos.every((i) => i.cubierto)} titulo={`Stock mínimo (${estado.insumos.filter((i) => i.cubierto).length}/${total})`}>
                {total ? 'Insumos cubiertos según lo registrado en la sucursal.' : 'El catálogo activo no tiene recetas ni productos de reventa.'}
              </Requisito>
            </ul>

            {!estado.sucursal.activa && <p className="text-body text-warning-text">La sucursal está inactiva: actívala para que pueda operar.</p>}

            {total === 0 ? (
              <EstadoVacio icono={ICONOS.insumo} titulo="No hay insumos requeridos">
                Registra productos con receta o de reventa en el Catálogo para calcular el stock mínimo.
              </EstadoVacio>
            ) : (
              <form noValidate onSubmit={confirmar} className="space-y-4">
                <Table
                  filas={estado.insumos}
                  idFila="id_insumo"
                  columnas={columnasInsumos}
                  paginacion={false}
                  maxAltura="max-h-[45dvh]"
                  minAncho="min-w-[640px]"
                  vacio={<EstadoVacio icono={ICONOS.insumo} titulo="No hay insumos requeridos." />}
                />

                <p className="text-body-sm text-fg-muted" aria-live="polite">
                  Vista previa: {cubiertosPrevia} de {total} insumos cubiertos.{sinMinimo > 0 && ` Define el mínimo de ${sinMinimo} insumo(s) (entero mayor a cero).`} La carga se registra como movimiento «Inventario inicial» en el Kárdex.
                </p>

                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-muted p-3.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={confirmado} disabled={sinMinimo > 0} onChange={(e) => setConfirmado(e.target.checked)} />
                  <span>
                    <span className="block text-label">Confirmo que la sucursal cuenta con el stock mínimo requerido para operar</span>
                    <span className="mt-0.5 block text-body-sm text-fg-muted">Se guardarán los umbrales de alerta y la carga inicial indicada.</span>
                  </span>
                </label>

                <div className="-mx-6 -mb-5 flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
                  <Button variante="ghost" onClick={onCerrar} disabled={guardando}>{estado.lista ? 'Cerrar' : 'Completar después'}</Button>
                  <Button type="submit" icono={ICONOS.apertura} cargando={guardando} disabled={!confirmado || sinMinimo > 0}>Confirmar y cargar stock</Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Dialogo>
  );
}
