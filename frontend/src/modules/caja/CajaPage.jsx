import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Receipt,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  X,
  Clock,
  Store,
  History,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import Pestanas from '../../components/navigation/Pestanas.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { formatoDinero, horaDe, etiquetaDiaLarga, haceCuanto } from '../../utils/formato.js';
import { cajaApi } from '../../api/caja.api.js';

const PATRON_MONTO = /^\d{1,8}(\.\d{1,2})?$/;

const avisoLocal = (mensaje, titulo = 'Revisa la información') => ({
  titulo,
  mensaje,
  accion: '',
  categoria: 'usuario',
});

export default function CajaPage() {
  const { usuario, tiene } = useAuth();
  const { notificar, confirm } = useAlert();

  // Permisos específicos de caja
  const puedeAbrir = tiene('CAJA_ABRIR_TURNO');
  const puedeMover = tiene('CAJA_MOVIMIENTOS');
  const puedeCerrar = tiene('CAJA_CERRAR_TURNO');
  const puedeVerCuadres = tiene('CAJA_VER_CUADRES');

  // Estados generales de la pantalla
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [turno, setTurno] = useState(null);

  // Pestañas
  const [pestanaActiva, setPestanaActiva] = useState('movimientos');

  // Movimientos del turno
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  // Apertura de turno
  const [mostrarApertura, setMostrarApertura] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [formApertura, setFormApertura] = useState({ idCaja: '', montoApertura: '0.00' });
  const [guardandoApertura, setGuardandoApertura] = useState(false);
  const [errorApertura, setErrorApertura] = useState(null);

  // Registro de movimiento
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [formMovimiento, setFormMovimiento] = useState({ tipo: 'EGRESO', concepto: '', monto: '' });
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [errorMovimiento, setErrorMovimiento] = useState(null);

  // Cierre de turno y arqueo
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [formCierre, setFormCierre] = useState({ efectivo: '0.00', tarjeta: '0.00', digital: '0.00' });
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);

  // Diálogo de cuadre (tras cierre o para ver auditoría)
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  const [cuadreDetalle, setCuadreDetalle] = useState(null);

  // Historial de cuadres (para usuarios con CAJA_VER_CUADRES)
  const [cuadres, setCuadres] = useState([]);
  const [cargandoCuadres, setCargandoCuadres] = useState(false);
  const [filtroEstadoCuadre, setFiltroEstadoCuadre] = useState('');
  const [filtroDesdeCuadre, setFiltroDesdeCuadre] = useState('');
  const [filtroHastaCuadre, setFiltroHastaCuadre] = useState('');

  // ─── Carga de datos ──────────────────────────────────────────────────────────
  const cargarMovimientos = useCallback(async (idTurno) => {
    setCargandoMovimientos(true);
    try {
      const lista = await cajaApi.listarMovimientos(idTurno);
      setMovimientos(lista || []);
    } catch (err) {
      console.error('Error al cargar movimientos de caja:', err);
    } finally {
      setCargandoMovimientos(false);
    }
  }, []);

  const cargarTurno = useCallback(async (silencioso = false) => {
    if (silencioso) {
      setActualizando(true);
    } else {
      setCargando(true);
    }
    setErrorCarga(null);

    try {
      const turnoActivo = await cajaApi.obtenerTurnoActual();
      setTurno(turnoActivo);
      if (turnoActivo?.id_turno) {
        await cargarMovimientos(turnoActivo.id_turno);
      }
    } catch (err) {
      // 404 es el estado normal cuando el usuario no tiene turno abierto
      if (err.status === 404 || /no tienes un turno abierto/i.test(err.message || '')) {
        setTurno(null);
        setMovimientos([]);
      } else {
        setErrorCarga({
          titulo: 'No se pudo cargar la información de caja',
          mensaje: err.message || 'Error de conexión con el servidor.',
          accion: 'Revisa tu conexión e intenta nuevamente.',
          reintentable: true,
        });
      }
    } finally {
      if (silencioso) {
        setActualizando(false);
      } else {
        setCargando(false);
      }
    }
  }, [cargarMovimientos]);

  const cargarCuadresHistorial = useCallback(async () => {
    if (!puedeVerCuadres) return;
    setCargandoCuadres(true);
    try {
      const filtros = {};
      if (filtroEstadoCuadre) filtros.estado = filtroEstadoCuadre;
      if (filtroDesdeCuadre) filtros.desde = filtroDesdeCuadre;
      if (filtroHastaCuadre) filtros.hasta = filtroHastaCuadre;
      const resultado = await cajaApi.listarCuadres(filtros);
      setCuadres(resultado || []);
    } catch (err) {
      console.error('Error al cargar historial de cuadres:', err);
    } finally {
      setCargandoCuadres(false);
    }
  }, [puedeVerCuadres, filtroEstadoCuadre, filtroDesdeCuadre, filtroHastaCuadre]);

  useEffect(() => {
    cargarTurno();
  }, [cargarTurno]);

  useEffect(() => {
    if (pestanaActiva === 'cuadres' || (!turno && puedeVerCuadres)) {
      cargarCuadresHistorial();
    }
  }, [pestanaActiva, turno, puedeVerCuadres, cargarCuadresHistorial]);

  // ─── Apertura de turno ───────────────────────────────────────────────────────
  const abrirModalApertura = async () => {
    setErrorApertura(null);
    setFormApertura({ idCaja: '', montoApertura: '0.00' });
    setMostrarApertura(true);
    setCargandoCajas(true);

    try {
      const listaCajas = await cajaApi.listarCajas();
      setCajas(listaCajas || []);
      const disponible = listaCajas.find((c) => !c.ocupada);
      if (disponible) {
        setFormApertura((prev) => ({ ...prev, idCaja: String(disponible.id_caja) }));
      }
    } catch (err) {
      setErrorApertura(err.message || 'Error al obtener la lista de cajas.');
    } finally {
      setCargandoCajas(false);
    }
  };

  const handleAbrirTurno = async (e) => {
    e.preventDefault();
    setErrorApertura(null);

    const idCajaNum = Number(formApertura.idCaja);
    if (!idCajaNum || idCajaNum <= 0) {
      setErrorApertura('Debes seleccionar una caja válida.');
      return;
    }

    const montoLimpio = formApertura.montoApertura.trim();
    if (!PATRON_MONTO.test(montoLimpio)) {
      setErrorApertura('El monto de apertura debe ser un número positivo con hasta 2 decimales (ej: 50.00).');
      return;
    }

    setGuardandoApertura(true);
    try {
      const nuevoTurno = await cajaApi.abrirTurno({
        idCaja: idCajaNum,
        montoApertura: montoLimpio,
      });
      notificar.exito('Turno de caja abierto correctamente');
      setMostrarApertura(false);
      setTurno(nuevoTurno);
      if (nuevoTurno?.id_turno) {
        cargarMovimientos(nuevoTurno.id_turno);
      }
    } catch (err) {
      setErrorApertura(err.message || 'No se pudo abrir el turno.');
    } finally {
      setGuardandoApertura(false);
    }
  };

  // ─── Registro de movimiento ──────────────────────────────────────────────────
  const abrirModalMovimiento = () => {
    setErrorMovimiento(null);
    setFormMovimiento({ tipo: 'EGRESO', concepto: '', monto: '' });
    setMostrarMovimiento(true);
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();
    setErrorMovimiento(null);

    if (!turno?.id_turno) return;

    const conceptoLimpio = formMovimiento.concepto.trim();
    if (conceptoLimpio.length < 3) {
      setErrorMovimiento('El concepto debe tener al menos 3 caracteres descriptivos.');
      return;
    }

    const montoLimpio = formMovimiento.monto.trim();
    if (!PATRON_MONTO.test(montoLimpio) || Number(montoLimpio) <= 0) {
      setErrorMovimiento('El monto debe ser un número mayor a cero con hasta 2 decimales.');
      return;
    }

    setGuardandoMovimiento(true);
    try {
      await cajaApi.registrarMovimiento(turno.id_turno, {
        tipo: formMovimiento.tipo,
        concepto: conceptoLimpio,
        monto: montoLimpio,
      });
      notificar.exito(`Movimiento de ${formMovimiento.tipo.toLowerCase()} registrado correctamente`);
      setMostrarMovimiento(false);
      await cargarTurno(true);
    } catch (err) {
      setErrorMovimiento(err.message || 'No se pudo registrar el movimiento.');
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  // ─── Cierre de turno y arqueo ───────────────────────────────────────────────
  const abrirModalCierre = () => {
    setErrorCierre(null);
    // Pre-llenamos con 0.00
    setFormCierre({ efectivo: '0.00', tarjeta: '0.00', digital: '0.00' });
    setMostrarCierre(true);
  };

  const handleCerrarTurno = async (e) => {
    e.preventDefault();
    setErrorCierre(null);

    if (!turno?.id_turno) return;

    const efectivoLimpio = formCierre.efectivo.trim();
    const tarjetaLimpia = formCierre.tarjeta.trim();
    const digitalLimpio = formCierre.digital.trim();

    if (!PATRON_MONTO.test(efectivoLimpio)) {
      setErrorCierre('El conteo de efectivo debe ser un monto válido (ej: 0.00).');
      return;
    }
    if (!PATRON_MONTO.test(tarjetaLimpia)) {
      setErrorCierre('El conteo de vouchers de tarjeta debe ser un monto válido (ej: 0.00).');
      return;
    }
    if (!PATRON_MONTO.test(digitalLimpio)) {
      setErrorCierre('El conteo de pagos digitales debe ser un monto válido (ej: 0.00).');
      return;
    }

    const seguro = await confirm(
      '¿Confirmas el cierre del turno? Una vez cerrado no se podrán registrar más ventas ni movimientos en esta caja.',
      {
        titulo: 'Confirmar cierre de turno',
        destructivo: true,
        etiquetaAceptar: 'Sí, cerrar turno',
        etiquetaCancelar: 'Revisar montos',
      },
    );

    if (!seguro) return;

    setGuardandoCierre(true);
    try {
      const resultadoCuadre = await cajaApi.cerrarTurno(turno.id_turno, {
        efectivo: efectivoLimpio,
        tarjeta: tarjetaLimpia,
        digital: digitalLimpio,
      });

      notificar.exito('Turno cerrado y cuadre calculado exitosamente');
      setMostrarCierre(false);
      setCuadreDetalle(resultadoCuadre);
      setMostrarCuadre(true);
      setTurno(null);
      setMovimientos([]);
      if (puedeVerCuadres) {
        cargarCuadresHistorial();
      }
    } catch (err) {
      setErrorCierre(err.message || 'No se pudo cerrar el turno.');
    } finally {
      setGuardandoCierre(false);
    }
  };

  const verDetalleCuadre = async (idTurno) => {
    try {
      const cuadre = await cajaApi.obtenerCuadre(idTurno);
      setCuadreDetalle(cuadre);
      setMostrarCuadre(true);
    } catch (err) {
      notificar.error(err.message || 'No se pudo cargar el detalle del cuadre.');
    }
  };

  // ─── Pestañas y columnas ─────────────────────────────────────────────────────
  const pestanasVisibles = useMemo(() => {
    const lista = [];
    if (turno) {
      lista.push({ clave: 'movimientos', texto: 'Movimientos de caja', icono: Wallet, total: movimientos.length });
      lista.push({ clave: 'ventas', texto: 'Medios de pago y ventas', icono: Receipt });
    }
    if (puedeVerCuadres) {
      lista.push({ clave: 'cuadres', texto: 'Historial de cuadres', icono: History, total: cuadres.length });
    }
    return lista;
  }, [turno, movimientos.length, puedeVerCuadres, cuadres.length]);

  const columnasMovimientos = useMemo(() => [
    {
      clave: 'creado_en',
      titulo: 'Hora',
      render: (m) => (
        <div>
          <p className="font-medium text-fg">{horaDe(m.creado_en)}</p>
          <p className="text-xs text-fg-muted">{haceCuanto(m.creado_en, Date.now())}</p>
        </div>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (m) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            m.tipo === 'INGRESO'
              ? 'bg-success-soft text-success'
              : 'bg-warning-soft text-warning'
          }`}
        >
          {m.tipo === 'INGRESO' ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
          {m.tipo}
        </span>
      ),
    },
    {
      clave: 'concepto',
      titulo: 'Concepto / Motivo',
      render: (m) => <span className="text-sm font-medium text-fg">{m.concepto}</span>,
    },
    {
      clave: 'monto',
      titulo: 'Monto',
      alinear: 'right',
      render: (m) => (
        <span className={`font-semibold ${m.tipo === 'INGRESO' ? 'text-success' : 'text-danger'}`}>
          {m.tipo === 'INGRESO' ? '+' : '-'}{formatoDinero(m.monto)}
        </span>
      ),
    },
    {
      clave: 'usuario',
      titulo: 'Registrado por',
      render: (m) => <span className="text-xs text-fg-muted">{m.usuario}</span>,
    },
  ], []);

  const columnasCuadres = useMemo(() => [
    {
      clave: 'abierto_en',
      titulo: 'Apertura / Cierre',
      render: (c) => (
        <div>
          <p className="font-medium text-fg">{etiquetaDiaLarga(c.abierto_en.slice(0, 10))}</p>
          <p className="text-xs text-fg-muted">
            {horaDe(c.abierto_en)} — {c.cerrado_en ? horaDe(c.cerrado_en) : 'En curso'}
          </p>
        </div>
      ),
    },
    {
      clave: 'caja',
      titulo: 'Caja y Sucursal',
      render: (c) => (
        <div>
          <p className="font-medium text-fg">{c.caja}</p>
          <p className="text-xs text-fg-muted">{c.sucursal}</p>
        </div>
      ),
    },
    {
      clave: 'cajero',
      titulo: 'Cajero',
      render: (c) => <span className="text-xs text-fg-muted">{c.cajero}</span>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (c) => (
        <EstadoBadge tipo={c.estado === 'ABIERTO' ? 'info' : 'exito'}>
          {c.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
        </EstadoBadge>
      ),
    },
    {
      clave: 'efectivo',
      titulo: 'Resultado Efectivo',
      render: (c) => {
        const ef = c.efectivo;
        if (!ef || !ef.resultado) return <span className="text-xs text-fg-muted">—</span>;
        if (ef.resultado === 'CUADRADO') {
          return <span className="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Cuadrado ($0.00)</span>;
        }
        if (ef.resultado === 'SOBRANTE') {
          return <span className="inline-flex rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">Sobrante (+{formatoDinero(ef.diferencia)})</span>;
        }
        return <span className="inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Faltante ({formatoDinero(ef.diferencia)})</span>;
      },
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      render: (c) => (
        <Button
          variante="ghost"
          onClick={() => verDetalleCuadre(c.id_turno)}
          className="!px-2.5 !py-1 text-xs"
          icono={Eye}
        >
          Ver cuadre
        </Button>
      ),
    },
  ], []);

  // ─── Render principal ────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-sm text-fg-muted">Cargando estado de caja y turnos…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Operación · Caja"
        titulo="Caja y turnos"
        descripcion="Gestión del ciclo operativo de caja: apertura de turnos, registro de entradas y salidas de efectivo, y arqueo con cuadre final."
        acciones={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variante="ghost"
              onClick={() => cargarTurno(true)}
              cargando={actualizando}
              icono={RefreshCw}
              aria-label="Actualizar datos de caja"
            >
              Actualizar
            </Button>
            {turno ? (
              <>
                {puedeMover && (
                  <Button
                    variante="secondary"
                    onClick={abrirModalMovimiento}
                    icono={Plus}
                  >
                    Nuevo movimiento
                  </Button>
                )}
                {puedeCerrar && (
                  <Button
                    variante="danger"
                    onClick={abrirModalCierre}
                    icono={Lock}
                  >
                    Cerrar turno
                  </Button>
                )}
              </>
            ) : (
              puedeAbrir && (
                <Button
                  variante="primary"
                  onClick={abrirModalApertura}
                  icono={Unlock}
                >
                  Abrir turno
                </Button>
              )
            )}
          </div>
        }
      />

      {errorCarga && (
        <BannerError
          error={errorCarga}
          onReintentar={() => cargarTurno(false)}
        />
      )}

      {/* CASO 1: TURNO ABIERTO */}
      {turno ? (
        <div className="space-y-6">
          {/* Tarjeta de estado del turno actual */}
          <section className="card flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary !p-5">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text">
                <Store size={24} aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-fg">
                    {turno.caja}
                  </h2>
                  <EstadoBadge tipo="info">Turno Abierto</EstadoBadge>
                </div>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {turno.sucursal} · Turno a cargo de <strong className="text-fg">{usuario?.username || 'Cajero'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <Clock size={15} aria-hidden="true" />
              <span>
                Abierto {etiquetaDiaLarga(turno.abierto_en.slice(0, 10))} a las {horaDe(turno.abierto_en)} ({haceCuanto(turno.abierto_en, Date.now())})
              </span>
            </div>
          </section>

          {/* Cuadrícula de métricas del turno */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metrica
              icono={Wallet}
              etiqueta="Fondo inicial"
              valor={formatoDinero(turno.monto_apertura)}
              tono="neutro"
            />
            <Metrica
              icono={CircleDollarSign}
              etiqueta="Ventas en efectivo"
              valor={formatoDinero(turno.ventas_efectivo)}
              tono="exito"
            />
            <Metrica
              icono={ArrowDownLeft}
              etiqueta="Ingresos extra"
              valor={formatoDinero(turno.ingresos_caja)}
              tono="exito"
            />
            <Metrica
              icono={ArrowUpRight}
              etiqueta="Egresos extra"
              valor={formatoDinero(turno.egresos_caja)}
              tono="aviso"
            />
            <Metrica
              icono={Scale}
              etiqueta="Efectivo esperado"
              valor={formatoDinero(turno.esperado_efectivo)}
              tono="primario"
            />
            <Metrica
              icono={Receipt}
              etiqueta="Ventas otros medios"
              valor={formatoDinero(
                (Number(turno.ventas_tarjeta || 0) + Number(turno.ventas_digital || 0)).toFixed(2),
              )}
              tono="info"
            />
          </div>

          {/* Navegación por pestañas */}
          {pestanasVisibles.length > 0 && (
            <Pestanas
              etiqueta="Secciones de caja"
              activa={pestanaActiva}
              onCambiar={setPestanaActiva}
              pestanas={pestanasVisibles}
            />
          )}

          {/* PESTAÑA: MOVIMIENTOS */}
          {pestanaActiva === 'movimientos' && (
            <Card
              titulo="Movimientos de efectivo del turno"
              descripcion="Registro de entradas extraordinarias (cambio, fondo extra) y salidas de efectivo (pagos menores, adelantos) de este turno."
              acciones={
                puedeMover && (
                  <Button
                    variante="secondary"
                    onClick={abrirModalMovimiento}
                    icono={Plus}
                    className="!px-3 !py-1.5 text-xs"
                  >
                    Registrar movimiento
                  </Button>
                )
              }
              sinPadding
            >
              <Table
                columnas={columnasMovimientos}
                filas={movimientos}
                idFila="id_movimiento"
                cargando={cargandoMovimientos}
                vacio="No se han registrado ingresos ni egresos extraordinarios durante este turno."
              />
            </Card>
          )}

          {/* PESTAÑA: VENTAS Y MEDIOS DE PAGO */}
          {pestanaActiva === 'ventas' && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card titulo="Efectivo en mostrador">
                <p className="text-3xl font-bold text-success">
                  {formatoDinero(turno.ventas_efectivo)}
                </p>
                <p className="mt-2 text-xs text-fg-muted">
                  Total de cobros realizados en billetes y monedas que deben estar físicamente en caja.
                </p>
              </Card>

              <Card titulo="Tarjetas de débito / crédito">
                <p className="text-3xl font-bold text-info">
                  {formatoDinero(turno.ventas_tarjeta)}
                </p>
                <p className="mt-2 text-xs text-fg-muted">
                  Cobros procesados mediante terminal POS. Debes conservar los vouchers para el cuadre.
                </p>
              </Card>

              <Card titulo="Pagos digitales y transferencias">
                <p className="text-3xl font-bold text-primary-text">
                  {formatoDinero(turno.ventas_digital)}
                </p>
                <p className="mt-2 text-xs text-fg-muted">
                  Cobros por Bitcoin (Chivo Wallet) y transferencias electrónicas acreditadas.
                </p>
              </Card>
            </div>
          )}

          {/* PESTAÑA: HISTORIAL DE CUADRES */}
          {pestanaActiva === 'cuadres' && puedeVerCuadres && (
            <Card
              titulo="Auditoría de cuadres y turnos anteriores"
              descripcion="Historial de turnos de todas las cajas asignadas con su resultado de arqueo."
              sinPadding
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 text-xs">
                <Select
                  etiqueta="Estado"
                  value={filtroEstadoCuadre}
                  onChange={(e) => setFiltroEstadoCuadre(e.target.value)}
                  opciones={[
                    { valor: '', texto: 'Todos los estados' },
                    { valor: 'ABIERTO', texto: 'Turnos abiertos' },
                    { valor: 'CERRADO', texto: 'Turnos cerrados' },
                  ]}
                  className="w-40"
                />
                <Button
                  variante="ghost"
                  onClick={cargarCuadresHistorial}
                  cargando={cargandoCuadres}
                  className="!px-3 !py-1.5 self-end"
                >
                  Filtrar
                </Button>
              </div>
              <Table
                columnas={columnasCuadres}
                filas={cuadres}
                idFila="id_turno"
                cargando={cargandoCuadres}
                vacio="No hay registros de cuadres que coincidan con los filtros."
              />
            </Card>
          )}
        </div>
      ) : (
        /* CASO 2: SIN TURNO ABIERTO */
        <div className="space-y-6">
          <Card className="text-center py-12">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-text">
              <Wallet size={32} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-fg">
              No tienes ningún turno abierto
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
              Para registrar cobros en el punto de venta o realizar movimientos de efectivo, inicia un nuevo turno en una caja disponible de tu sucursal.
            </p>
            {puedeAbrir && (
              <div className="mt-6 flex justify-center">
                <Button
                  variante="primary"
                  onClick={abrirModalApertura}
                  icono={Unlock}
                  className="!px-6 !py-2.5 font-semibold"
                >
                  Abrir turno de caja
                </Button>
              </div>
            )}
          </Card>

          {/* Si no tiene turno abierto pero puede auditar, mostramos el historial de cuadres abajo */}
          {puedeVerCuadres && (
            <Card
              titulo="Historial reciente de cuadres"
              descripcion="Consulta turnos cerrados y arqueos realizados en tus sucursales."
              sinPadding
            >
              <Table
                columnas={columnasCuadres}
                filas={cuadres}
                idFila="id_turno"
                cargando={cargandoCuadres}
                vacio="No hay turnos registrados aún."
              />
            </Card>
          )}
        </div>
      )}

      {/* ─── MODAL: APERTURA DE TURNO ────────────────────────────────────────── */}
      {mostrarApertura && (
        <Dialogo
          onCerrar={() => setMostrarApertura(false)}
          tamano="md"
          labelledBy="apertura-titulo"
          describedBy="apertura-descripcion"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Operación · Caja
              </p>
              <h2 id="apertura-titulo" className="mt-1 text-xl font-semibold">
                Abrir turno de caja
              </h2>
              <p id="apertura-descripcion" className="mt-1 text-xs text-fg-muted">
                Selecciona la caja de tu sucursal e ingresa el fondo de efectivo inicial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarApertura(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {errorApertura && (
            <div className="p-4 pb-0">
              <BannerError error={avisoLocal(errorApertura, 'No se pudo abrir el turno')} />
            </div>
          )}

          <form onSubmit={handleAbrirTurno} className="space-y-4 p-5">
            <div>
              <label htmlFor="apertura-caja" className="block text-sm font-medium text-fg">
                Caja punto de venta <span className="text-danger">*</span>
              </label>
              {cargandoCajas ? (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
                  <Spinner /> Cargando cajas disponibles…
                </div>
              ) : (
                <select
                  id="apertura-caja"
                  value={formApertura.idCaja}
                  onChange={(e) => setFormApertura({ ...formApertura, idCaja: e.target.value })}
                  className="input mt-1.5 w-full"
                  required
                >
                  <option value="" disabled>Selecciona una caja</option>
                  {cajas.map((c) => (
                    <option key={c.id_caja} value={c.id_caja} disabled={c.ocupada}>
                      {c.sucursal} — {c.nombre_identificador} ({c.codigo_punto_venta}) {c.ocupada ? ' · [Ocupada por otro turno]' : ' · [Disponible]'}
                    </option>
                  ))}
                </select>
              )}
              {cajas.length > 0 && cajas.every((c) => c.ocupada) && (
                <div className="mt-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-warning">
                  <p className="font-semibold">Todas las cajas registradas tienen un turno abierto</p>
                  <p className="mt-0.5 text-fg">
                    Por regla de negocio, cada caja solo admite un turno activo a la vez. Para abrir un turno en una de ellas, el cajero a cargo debe cerrar el turno previo.
                  </p>
                </div>
              )}
              {cajas.length === 0 && !cargandoCajas && (
                <p className="mt-1 text-xs text-warning">
                  No hay cajas activas configuradas para tus sucursales asignadas.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="apertura-monto" className="block text-sm font-medium text-fg">
                Monto de apertura / Fondo inicial ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="apertura-monto"
                  type="text"
                  inputMode="decimal"
                  value={formApertura.montoApertura}
                  onChange={(e) => setFormApertura({ ...formApertura, montoApertura: e.target.value })}
                  placeholder="0.00"
                  className="input w-full pl-8"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Efectivo inicial en caja para cambio. Puede ser 0.00 si inicia sin fondo.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                onClick={() => setMostrarApertura(false)}
                disabled={guardandoApertura}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variante="primary"
                cargando={guardandoApertura}
                disabled={!formApertura.idCaja || cargandoCajas}
                icono={Unlock}
              >
                Confirmar apertura
              </Button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* ─── MODAL: REGISTRAR MOVIMIENTO (INGRESO / EGRESO) ─────────────────── */}
      {mostrarMovimiento && (
        <Dialogo
          onCerrar={() => setMostrarMovimiento(false)}
          tamano="md"
          labelledBy="movimiento-titulo"
          describedBy="movimiento-descripcion"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Turno en curso · {turno?.caja}
              </p>
              <h2 id="movimiento-titulo" className="mt-1 text-xl font-semibold">
                Registrar movimiento de caja
              </h2>
              <p id="movimiento-descripcion" className="mt-1 text-xs text-fg-muted">
                Registra un ingreso extraordinario o egreso de efectivo en el turno activo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarMovimiento(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {errorMovimiento && (
            <div className="p-4 pb-0">
              <BannerError error={avisoLocal(errorMovimiento, 'Error en el movimiento')} />
            </div>
          )}

          <form onSubmit={handleRegistrarMovimiento} className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-fg">
                Tipo de movimiento <span className="text-danger">*</span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormMovimiento({ ...formMovimiento, tipo: 'INGRESO' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-semibold transition-colors ${
                    formMovimiento.tipo === 'INGRESO'
                      ? 'border-success bg-success-soft text-success shadow-xs'
                      : 'border-line bg-surface text-fg-muted hover:bg-muted'
                  }`}
                >
                  <TrendingUp size={16} aria-hidden="true" />
                  INGRESO (+)
                </button>
                <button
                  type="button"
                  onClick={() => setFormMovimiento({ ...formMovimiento, tipo: 'EGRESO' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-semibold transition-colors ${
                    formMovimiento.tipo === 'EGRESO'
                      ? 'border-warning bg-warning-soft text-warning shadow-xs'
                      : 'border-line bg-surface text-fg-muted hover:bg-muted'
                  }`}
                >
                  <TrendingDown size={16} aria-hidden="true" />
                  EGRESO (-)
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="movimiento-concepto" className="block text-sm font-medium text-fg">
                Concepto / Justificación <span className="text-danger">*</span>
              </label>
              <input
                id="movimiento-concepto"
                type="text"
                value={formMovimiento.concepto}
                onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })}
                placeholder={formMovimiento.tipo === 'INGRESO' ? 'Ej: Aporte extra para cambio' : 'Ej: Pago de hielo de emergencia'}
                className="input mt-1.5 w-full"
                maxLength={150}
                required
              />
              <p className="mt-1 text-xs text-fg-muted">
                Describe con claridad el motivo de la entrada o salida de dinero.
              </p>
            </div>

            <div>
              <label htmlFor="movimiento-monto" className="block text-sm font-medium text-fg">
                Monto ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="movimiento-monto"
                  type="text"
                  inputMode="decimal"
                  value={formMovimiento.monto}
                  onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value })}
                  placeholder="0.00"
                  className="input w-full pl-8"
                  required
                />
              </div>
              {formMovimiento.tipo === 'EGRESO' && turno?.esperado_efectivo && (
                <p className="mt-1 text-xs text-fg-muted">
                  Efectivo disponible en caja: <strong className="text-fg">{formatoDinero(turno.esperado_efectivo)}</strong>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                onClick={() => setMostrarMovimiento(false)}
                disabled={guardandoMovimiento}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variante={formMovimiento.tipo === 'INGRESO' ? 'primary' : 'secondary'}
                cargando={guardandoMovimiento}
                icono={formMovimiento.tipo === 'INGRESO' ? TrendingUp : TrendingDown}
              >
                Registrar {formMovimiento.tipo.toLowerCase()}
              </Button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* ─── MODAL: CIERRE DE TURNO Y ARQUEO ──────────────────────────────────── */}
      {mostrarCierre && (
        <Dialogo
          onCerrar={() => setMostrarCierre(false)}
          tamano="md"
          labelledBy="cierre-titulo"
          describedBy="cierre-descripcion"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-danger">
                Finalización de turno · {turno?.caja}
              </p>
              <h2 id="cierre-titulo" className="mt-1 text-xl font-semibold">
                Arqueo y cierre de caja
              </h2>
              <p id="cierre-descripcion" className="mt-1 text-xs text-fg-muted">
                Ingresa el monto físico contado para cada método. El sistema calculará el cuadre automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarCierre(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {errorCierre && (
            <div className="p-4 pb-0">
              <BannerError error={avisoLocal(errorCierre, 'No se pudo realizar el cierre')} />
            </div>
          )}

          <form onSubmit={handleCerrarTurno} className="space-y-4 p-5">
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-fg-muted space-y-1">
              <p className="font-semibold text-fg">Referencia del sistema:</p>
              <div className="flex justify-between">
                <span>Efectivo esperado en gaveta:</span>
                <span className="font-bold text-fg">{formatoDinero(turno?.esperado_efectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vouchers de tarjeta registrados:</span>
                <span className="font-medium text-fg">{formatoDinero(turno?.ventas_tarjeta)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagos digitales registrados:</span>
                <span className="font-medium text-fg">{formatoDinero(turno?.ventas_digital)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="cierre-efectivo" className="block text-sm font-medium text-fg">
                Efectivo físico contado ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="cierre-efectivo"
                  type="text"
                  inputMode="decimal"
                  value={formCierre.efectivo}
                  onChange={(e) => setFormCierre({ ...formCierre, efectivo: e.target.value })}
                  placeholder="0.00"
                  className="input w-full pl-8 font-semibold"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Total de billetes y monedas contados en la gaveta.
              </p>
            </div>

            <div>
              <label htmlFor="cierre-tarjeta" className="block text-sm font-medium text-fg">
                Vouchers de tarjeta contados ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="cierre-tarjeta"
                  type="text"
                  inputMode="decimal"
                  value={formCierre.tarjeta}
                  onChange={(e) => setFormCierre({ ...formCierre, tarjeta: e.target.value })}
                  placeholder="0.00"
                  className="input w-full pl-8 font-semibold"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Suma de los comprobantes emitidos por las terminales POS.
              </p>
            </div>

            <div>
              <label htmlFor="cierre-digital" className="block text-sm font-medium text-fg">
                Comprobantes digitales contados ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="cierre-digital"
                  type="text"
                  inputMode="decimal"
                  value={formCierre.digital}
                  onChange={(e) => setFormCierre({ ...formCierre, digital: e.target.value })}
                  placeholder="0.00"
                  className="input w-full pl-8 font-semibold"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Total de transacciones confirmadas por Bitcoin / Chivo Wallet o transferencia.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                onClick={() => setMostrarCierre(false)}
                disabled={guardandoCierre}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variante="danger"
                cargando={guardandoCierre}
                icono={Lock}
              >
                Cerrar turno y cuadrar
              </Button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* ─── MODAL: RESULTADO DE CUADRE DE CAJA ──────────────────────────────── */}
      {mostrarCuadre && cuadreDetalle && (
        <Dialogo
          onCerrar={() => setMostrarCuadre(false)}
          tamano="lg"
          labelledBy="cuadre-titulo"
          describedBy="cuadre-descripcion"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Auditoría · Cuadre de caja
              </p>
              <h2 id="cuadre-titulo" className="mt-1 text-xl font-semibold">
                Resumen de cuadre · {cuadreDetalle.caja}
              </h2>
              <p id="cuadre-descripcion" className="mt-1 text-xs text-fg-muted">
                {cuadreDetalle.sucursal} · Turno finalizado por {cuadreDetalle.cajero}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarCuadre(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-5 p-5">
            {/* Estado general del efectivo */}
            <div className="rounded-xl border border-line bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Resultado del arqueo en efectivo
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {cuadreDetalle.efectivo?.resultado === 'CUADRADO' ? (
                      <span className="inline-flex items-center gap-1.5 text-base font-bold text-success">
                        <CheckCircle2 size={18} aria-hidden="true" />
                        Turno cuadrado exactamente ($0.00 de diferencia)
                      </span>
                    ) : cuadreDetalle.efectivo?.resultado === 'SOBRANTE' ? (
                      <span className="inline-flex items-center gap-1.5 text-base font-bold text-info">
                        <AlertCircle size={18} aria-hidden="true" />
                        Sobrante de efectivo (+{formatoDinero(cuadreDetalle.efectivo?.diferencia)})
                      </span>
                    ) : cuadreDetalle.efectivo?.resultado === 'FALTANTE' ? (
                      <span className="inline-flex items-center gap-1.5 text-base font-bold text-danger">
                        <AlertTriangle size={18} aria-hidden="true" />
                        Faltante de efectivo ({formatoDinero(cuadreDetalle.efectivo?.diferencia)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-base font-medium text-fg-muted">
                        <Clock size={18} aria-hidden="true" />
                        Turno en curso (arqueo físico pendiente al cierre)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-fg-muted">
                  <p>Apertura: {horaDe(cuadreDetalle.abierto_en)}</p>
                  <p>Cierre: {cuadreDetalle.cerrado_en ? horaDe(cuadreDetalle.cerrado_en) : 'En curso'}</p>
                </div>
              </div>
            </div>

            {/* Tabla comparativa de cuadre por método */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
                Conciliación por medio de pago
              </h3>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-muted font-semibold uppercase text-fg-muted">
                    <tr>
                      <th className="px-3.5 py-2.5">Medio</th>
                      <th className="px-3.5 py-2.5 text-right">Esperado</th>
                      <th className="px-3.5 py-2.5 text-right">Contado</th>
                      <th className="px-3.5 py-2.5 text-right">Diferencia</th>
                      <th className="px-3.5 py-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="px-3.5 py-2.5 font-medium text-fg">Efectivo</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.efectivo?.esperado)}</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.efectivo?.contado)}</td>
                      <td className={`px-3.5 py-2.5 text-right font-bold ${cuadreDetalle.efectivo?.resultado === 'FALTANTE' ? 'text-danger' : cuadreDetalle.efectivo?.resultado === 'SOBRANTE' ? 'text-info' : cuadreDetalle.efectivo?.resultado === 'CUADRADO' ? 'text-success' : 'text-fg-muted'}`}>
                        {cuadreDetalle.efectivo?.resultado === 'SOBRANTE' ? '+' : ''}{formatoDinero(cuadreDetalle.efectivo?.diferencia)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cuadreDetalle.efectivo?.resultado === 'CUADRADO' ? 'bg-success-soft text-success' : cuadreDetalle.efectivo?.resultado === 'SOBRANTE' ? 'bg-info-soft text-info' : cuadreDetalle.efectivo?.resultado === 'FALTANTE' ? 'bg-danger-soft text-danger' : 'bg-muted text-fg-muted'}`}>
                          {cuadreDetalle.efectivo?.resultado || 'En curso'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 font-medium text-fg">Tarjeta</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.tarjeta?.esperado)}</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.tarjeta?.contado)}</td>
                      <td className={`px-3.5 py-2.5 text-right font-bold ${cuadreDetalle.tarjeta?.resultado === 'FALTANTE' ? 'text-danger' : cuadreDetalle.tarjeta?.resultado === 'SOBRANTE' ? 'text-info' : cuadreDetalle.tarjeta?.resultado === 'CUADRADO' ? 'text-success' : 'text-fg-muted'}`}>
                        {cuadreDetalle.tarjeta?.resultado === 'SOBRANTE' ? '+' : ''}{formatoDinero(cuadreDetalle.tarjeta?.diferencia)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cuadreDetalle.tarjeta?.resultado === 'CUADRADO' ? 'bg-success-soft text-success' : cuadreDetalle.tarjeta?.resultado === 'SOBRANTE' ? 'bg-info-soft text-info' : cuadreDetalle.tarjeta?.resultado === 'FALTANTE' ? 'bg-danger-soft text-danger' : 'bg-muted text-fg-muted'}`}>
                          {cuadreDetalle.tarjeta?.resultado || 'En curso'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 font-medium text-fg">Digital / Transferencias</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.digital?.esperado)}</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">{formatoDinero(cuadreDetalle.digital?.contado)}</td>
                      <td className={`px-3.5 py-2.5 text-right font-bold ${cuadreDetalle.digital?.resultado === 'FALTANTE' ? 'text-danger' : cuadreDetalle.digital?.resultado === 'SOBRANTE' ? 'text-info' : cuadreDetalle.digital?.resultado === 'CUADRADO' ? 'text-success' : 'text-fg-muted'}`}>
                        {cuadreDetalle.digital?.resultado === 'SOBRANTE' ? '+' : ''}{formatoDinero(cuadreDetalle.digital?.diferencia)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cuadreDetalle.digital?.resultado === 'CUADRADO' ? 'bg-success-soft text-success' : cuadreDetalle.digital?.resultado === 'SOBRANTE' ? 'bg-info-soft text-info' : cuadreDetalle.digital?.resultado === 'FALTANTE' ? 'bg-danger-soft text-danger' : 'bg-muted text-fg-muted'}`}>
                          {cuadreDetalle.digital?.resultado || 'En curso'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Desglose de operaciones adicionales */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-line p-3">
                <span className="text-fg-muted font-medium">Fondo de apertura:</span>
                <p className="mt-1 text-base font-semibold text-fg">{formatoDinero(cuadreDetalle.monto_apertura)}</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <span className="text-fg-muted font-medium">Movimientos extraordinarios:</span>
                <p className="mt-1 text-xs">
                  <span className="text-success font-semibold">+{formatoDinero(cuadreDetalle.ingresos_caja)}</span> /{' '}
                  <span className="text-danger font-semibold">-{formatoDinero(cuadreDetalle.egresos_caja)}</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-line">
              <Button
                variante="primary"
                onClick={() => setMostrarCuadre(false)}
              >
                Entendido y cerrar
              </Button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
