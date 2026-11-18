import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
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
  ShoppingBag,
  Package,
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
import Skeleton from '../../components/feedback/Skeleton.jsx';
import { BotonIcono, Button, Card, Select, Table } from '../../components/ui/index.js';
import { formatoDinero, formatoCentavos, horaDe, etiquetaDiaLarga, haceCuanto } from '../../utils/formato.js';
import { cajaApi } from '../../api/caja.api.js';
import { listarVentas, obtenerDetalleVenta } from '../pos/posApi.js';

const PATRON_MONTO = /^\d{1,8}(\.\d{1,2})?$/;

// Convierte un monto en texto ("12.5", "-3.00") a centavos enteros (BigInt) sin pasar por float.
// Devuelve null si el texto no es un monto válido.
const aCentavos = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(texto)) return null;
  const negativo = texto.startsWith('-');
  const [entera, decimales = ''] = texto.replace('-', '').split('.');
  const centavos = BigInt(entera) * 100n + BigInt(`${decimales}00`.slice(0, 2));
  return negativo ? -centavos : centavos;
};

// Clase de color para una diferencia de cuadre: cero = éxito, cualquier otra = peligro.
const claseDiferencia = (resultado) => {
  if (resultado === 'CUADRADO') return 'text-success-text';
  if (resultado === 'FALTANTE' || resultado === 'SOBRANTE') return 'text-danger-text';
  return 'text-fg-muted';
};

const ETIQUETA_RESULTADO = { CUADRADO: 'Cuadrado', SOBRANTE: 'Sobrante', FALTANTE: 'Faltante' };
const TIPO_RESULTADO = { CUADRADO: 'exito', SOBRANTE: 'aviso', FALTANTE: 'peligro' };

export default function CajaPage() {
  const { usuario, tiene } = useAuth();
  const { notificar, notificarError, confirm } = useAlert();

  // Permisos específicos de caja
  const puedeAbrir = tiene('CAJA_ABRIR_TURNO');
  const puedeMover = tiene('CAJA_MOVIMIENTOS');
  const puedeCerrar = tiene('CAJA_CERRAR_TURNO');
  const puedeCerrarCualquiera = tiene('CAJA_CERRAR_CUALQUIER_TURNO');
  const puedeVerCuadres = tiene('CAJA_VER_CUADRES');

  // Estados generales de la pantalla
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [turno, setTurno] = useState(null);

  // Pestañas
  const [pestanaActiva, setPestanaActiva] = useState('ventas-turno');

  // Movimientos del turno
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  // Apertura de turno
  const [mostrarApertura, setMostrarApertura] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [formApertura, setFormApertura] = useState({ idCaja: '', montoApertura: '0.00' });
  const [guardandoApertura, setGuardandoApertura] = useState(false);

  // Registro de movimiento
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [formMovimiento, setFormMovimiento] = useState({ tipo: 'EGRESO', concepto: '', monto: '' });
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  // Cierre de turno y arqueo
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [turnoParaCierre, setTurnoParaCierre] = useState(null);
  const [formCierre, setFormCierre] = useState({ efectivo: '0.00', tarjeta: '0.00', digital: '0.00' });
  const [guardandoCierre, setGuardandoCierre] = useState(false);

  const handleCargarMontosEsperados = () => {
    const target = (turnoParaCierre && turnoParaCierre.id_turno) ? turnoParaCierre : turno;
    if (!target) return;
    const ef = target.esperado_efectivo ?? target.efectivo?.esperado ?? '0.00';
    const tj = target.ventas_tarjeta ?? target.tarjeta?.esperado ?? target.ventas?.tarjeta ?? '0.00';
    const dg = target.ventas_digital ?? target.digital?.esperado ?? target.ventas?.digital ?? '0.00';

    setFormCierre({
      efectivo: String(Number(ef || 0).toFixed(2)),
      tarjeta: String(Number(tj || 0).toFixed(2)),
      digital: String(Number(dg || 0).toFixed(2)),
    });
  };

  // Diálogo de cuadre (tras cierre o para ver auditoría)
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  const [cuadreDetalle, setCuadreDetalle] = useState(null);

  // Historial de cuadres (para usuarios con CAJA_VER_CUADRES)
  const [cuadres, setCuadres] = useState([]);
  const [cargandoCuadres, setCargandoCuadres] = useState(false);
  const [filtroEstadoCuadre, setFiltroEstadoCuadre] = useState('');
  const [filtroDesdeCuadre, setFiltroDesdeCuadre] = useState('');
  const [filtroHastaCuadre, setFiltroHastaCuadre] = useState('');

  // Historial de ventas del turno activo
  const [ventasTurno, setVentasTurno] = useState([]);
  const [cargandoVentasTurno, setCargandoVentasTurno] = useState(false);
  const [ventaDetalleSeleccionada, setVentaDetalleSeleccionada] = useState(null);
  const [cargandoDetalleVenta, setCargandoDetalleVenta] = useState(false);
  const [mostrarDetalleVenta, setMostrarDetalleVenta] = useState(false);

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

  const cargarVentasTurno = useCallback(async (idTurno) => {
    if (!idTurno) return;
    setCargandoVentasTurno(true);
    try {
      const lista = await listarVentas({ idTurno });
      setVentasTurno(lista || []);
    } catch (err) {
      console.error('Error al cargar ventas del turno:', err);
    } finally {
      setCargandoVentasTurno(false);
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
        await cargarVentasTurno(turnoActivo.id_turno);
      }
    } catch (err) {
      // 404 es el estado normal cuando el usuario no tiene turno abierto
      if (err.status === 404 || /no tienes un turno abierto/i.test(err.message || '')) {
        setTurno(null);
        setMovimientos([]);
        setVentasTurno([]);
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
  }, [cargarMovimientos, cargarVentasTurno]);

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
      notificarError(err);
    } finally {
      setCargandoCajas(false);
    }
  };

  const handleAbrirTurno = async (e) => {
    e.preventDefault();

    const idCajaNum = Number(formApertura.idCaja);
    if (!idCajaNum || idCajaNum <= 0) {
      notificar.advertencia('Validación requerida', { mensaje: 'Debes seleccionar una caja válida.' });
      return;
    }

    const montoLimpio = formApertura.montoApertura.trim();
    if (!PATRON_MONTO.test(montoLimpio)) {
      notificar.advertencia('Monto inválido', { mensaje: 'El monto de apertura debe ser un número positivo con hasta 2 decimales (ej: 50.00).' });
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
      notificarError(err);
    } finally {
      setGuardandoApertura(false);
    }
  };

  // ─── Registro de movimiento ──────────────────────────────────────────────────
  const abrirModalMovimiento = () => {
    setFormMovimiento({ tipo: 'EGRESO', concepto: '', monto: '' });
    setMostrarMovimiento(true);
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();

    if (!turno?.id_turno) return;

    const conceptoLimpio = formMovimiento.concepto.trim();
    if (conceptoLimpio.length < 3) {
      notificar.advertencia('Concepto inválido', { mensaje: 'El concepto debe tener al menos 3 caracteres descriptivos.' });
      return;
    }

    const montoLimpio = formMovimiento.monto.trim();
    if (!PATRON_MONTO.test(montoLimpio) || Number(montoLimpio) <= 0) {
      notificar.advertencia('Monto inválido', { mensaje: 'El monto debe ser un número mayor a cero con hasta 2 decimales.' });
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
      notificarError(err);
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  // ─── Cierre de turno y arqueo ───────────────────────────────────────────────
  const abrirModalCierre = (turnoObjetivo = null) => {
    const objetivoValido = (turnoObjetivo && typeof turnoObjetivo === 'object' && turnoObjetivo.id_turno)
      ? turnoObjetivo
      : null;
    setTurnoParaCierre(objetivoValido);
    // Pre-llenamos con 0.00
    setFormCierre({ efectivo: '0.00', tarjeta: '0.00', digital: '0.00' });
    setMostrarCierre(true);
  };

  const handleCerrarTurno = async (e) => {
    e.preventDefault();

    const turnoActivoACerrar = turnoParaCierre || turno;
    if (!turnoActivoACerrar?.id_turno) return;

    const efectivoLimpio = formCierre.efectivo.trim();
    const tarjetaLimpia = formCierre.tarjeta.trim();
    const digitalLimpio = formCierre.digital.trim();

    if (!PATRON_MONTO.test(efectivoLimpio)) {
      notificar.advertencia('Conteo inválido', { mensaje: 'El conteo de efectivo debe ser un monto válido (ej: 0.00).' });
      return;
    }
    if (!PATRON_MONTO.test(tarjetaLimpia)) {
      notificar.advertencia('Conteo inválido', { mensaje: 'El conteo de vouchers de tarjeta debe ser un monto válido (ej: 0.00).' });
      return;
    }
    if (!PATRON_MONTO.test(digitalLimpio)) {
      notificar.advertencia('Conteo inválido', { mensaje: 'El conteo de pagos digitales debe ser un monto válido (ej: 0.00).' });
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
      const resultadoCuadre = await cajaApi.cerrarTurno(turnoActivoACerrar.id_turno, {
        efectivo: efectivoLimpio,
        tarjeta: tarjetaLimpia,
        digital: digitalLimpio,
      });

      notificar.exito('Turno cerrado y cuadre calculado exitosamente');
      setMostrarCierre(false);
      setCuadreDetalle(resultadoCuadre);
      setMostrarCuadre(true);
      if (turno?.id_turno === turnoActivoACerrar.id_turno) {
        setTurno(null);
        setMovimientos([]);
        setVentasTurno([]);
      }
      setTurnoParaCierre(null);
      if (puedeVerCuadres) {
        cargarCuadresHistorial();
      }
    } catch (err) {
      notificarError(err);
    } finally {
      setGuardandoCierre(false);
    }
  };

  const verDetalleCuadre = useCallback(async (idTurno) => {
    try {
      const cuadre = await cajaApi.obtenerCuadre(idTurno);
      setCuadreDetalle(cuadre);
      setMostrarCuadre(true);
    } catch (err) {
      notificarError(err);
    }
  }, [notificarError]);

  const verDetalleVenta = useCallback(async (idVenta) => {
    setCargandoDetalleVenta(true);
    try {
      const detalle = await obtenerDetalleVenta(idVenta);
      setVentaDetalleSeleccionada(detalle?.data ?? detalle);
      setMostrarDetalleVenta(true);
    } catch (err) {
      notificarError(err);
    } finally {
      setCargandoDetalleVenta(false);
    }
  }, [notificarError]);

  // ─── Pestañas y columnas ─────────────────────────────────────────────────────
  const pestanasVisibles = useMemo(() => {
    const lista = [];
    if (turno) {
      lista.push({ clave: 'ventas-turno', texto: 'Historial de ventas', icono: ShoppingBag, total: ventasTurno.length });
      lista.push({ clave: 'ventas', texto: 'Medios de pago y ventas', icono: Receipt });
      if (puedeVerCuadres) {
        lista.push({ clave: 'cuadres', texto: 'Historial de cuadres', icono: History, total: cuadres.length });
      }
      lista.push({ clave: 'movimientos', texto: 'Movimientos de caja', icono: Wallet, total: movimientos.length });
    } else if (puedeVerCuadres) {
      lista.push({ clave: 'cuadres', texto: 'Historial de cuadres', icono: History, total: cuadres.length });
    }
    return lista;
  }, [turno, movimientos.length, ventasTurno.length, puedeVerCuadres, cuadres.length]);

  const columnasMovimientos = useMemo(() => [
    {
      clave: 'creado_en',
      titulo: 'Hora',
      tipo: 'fecha',
      valorOrden: (m) => m.creado_en,
      render: (m) => (
        <div>
          <p className="font-medium text-fg">{horaDe(m.creado_en)}</p>
          <p className="text-body-sm text-fg-muted">{haceCuanto(m.creado_en, Date.now())}</p>
        </div>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      tipo: 'texto',
      valorOrden: (m) => m.tipo,
      render: (m) => (
        <span className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted">
          {m.tipo === 'INGRESO'
            ? <TrendingUp size={16} strokeWidth={1.75} className="text-success-text" aria-hidden="true" />
            : <TrendingDown size={16} strokeWidth={1.75} className="text-danger-text" aria-hidden="true" />}
          {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
        </span>
      ),
    },
    {
      clave: 'concepto',
      titulo: 'Concepto / Motivo',
      tipo: 'texto',
      valorOrden: (m) => m.concepto,
      render: (m) => <span className="font-medium text-fg">{m.concepto}</span>,
    },
    {
      clave: 'monto',
      titulo: 'Monto',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (m) => m.monto,
      render: (m) => (
        <span className={`font-medium tabular-nums ${m.tipo === 'INGRESO' ? 'text-success-text' : 'text-danger-text'}`}>
          {m.tipo === 'INGRESO' ? '+' : '−'}{formatoDinero(m.monto)}
        </span>
      ),
    },
    {
      clave: 'usuario',
      titulo: 'Registrado por',
      tipo: 'texto',
      clase: 'hidden md:table-cell',
      valorOrden: (m) => m.usuario,
      render: (m) => <span className="text-body-sm text-fg-muted">{m.usuario}</span>,
    },
  ], []);

  const columnasCuadres = useMemo(() => [
    {
      clave: 'abierto_en',
      titulo: 'Apertura / Cierre',
      tipo: 'fecha',
      valorOrden: (c) => c.abierto_en,
      render: (c) => (
        <div>
          <p className="font-medium text-fg">{etiquetaDiaLarga(c.abierto_en.slice(0, 10))}</p>
          <p className="text-body-sm text-fg-muted">
            {horaDe(c.abierto_en)} — {c.cerrado_en ? horaDe(c.cerrado_en) : 'En curso'}
          </p>
        </div>
      ),
    },
    {
      clave: 'caja',
      titulo: 'Caja y Sucursal',
      tipo: 'texto',
      valorOrden: (c) => `${c.caja} ${c.sucursal}`,
      render: (c) => (
        <div>
          <p className="font-medium text-fg">{c.caja}</p>
          <p className="text-body-sm text-fg-muted">{c.sucursal}</p>
        </div>
      ),
    },
    {
      clave: 'cajero',
      titulo: 'Cajero',
      tipo: 'texto',
      valorOrden: (c) => c.cajero,
      render: (c) => <span className="text-body-sm text-fg-muted">{c.cajero}</span>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (c) => c.estado,
      render: (c) => (
        <EstadoBadge tipo={c.estado === 'ABIERTO' ? 'info' : 'exito'}>
          {c.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
        </EstadoBadge>
      ),
    },
    {
      clave: 'efectivo',
      titulo: 'Resultado Efectivo',
      tipo: 'dinero',
      valorOrden: (c) => c.efectivo?.diferencia ?? '0.00',
      render: (c) => {
        const ef = c.efectivo;
        if (!ef || !ef.resultado) return <span className="text-body-sm text-fg-muted">—</span>;
        return (
          <span className="inline-flex flex-col items-end gap-0.5">
            <span className={`font-medium tabular-nums ${claseDiferencia(ef.resultado)}`}>
              {ef.resultado === 'SOBRANTE' ? '+' : ''}{formatoDinero(ef.diferencia)}
            </span>
            <span className="text-body-sm text-fg-muted">{ETIQUETA_RESULTADO[ef.resultado] || ef.resultado}</span>
          </span>
        );
      },
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (c) => {
        const esAbierto = c.estado === 'ABIERTO';
        const puedeCerrarEste = esAbierto && (puedeCerrarCualquiera || (puedeCerrar && (c.id_usuario === usuario?.id || c.cajero === usuario?.username)));
        return (
          <div className="flex items-center justify-end gap-1">
            {puedeCerrarEste && (
              <BotonIcono
                icono={Lock}
                etiqueta={`Cerrar turno de ${c.caja}`}
                titulo="Cerrar turno"
                onClick={() => abrirModalCierre(c)}
              />
            )}
            <BotonIcono
              icono={Eye}
              etiqueta={`Ver cuadre de ${c.caja}`}
              titulo="Ver cuadre"
              onClick={() => verDetalleCuadre(c.id_turno)}
            />
          </div>
        );
      },
    },
  ], [verDetalleCuadre, puedeCerrarCualquiera, puedeCerrar, usuario]);

  const columnasVentasTurno = useMemo(() => [
    {
      clave: 'fecha_emision',
      titulo: 'Fecha / Hora',
      tipo: 'fecha',
      valorOrden: (v) => v.fecha_emision,
      render: (v) => (
        <div>
          <p className="font-medium text-fg">{horaDe(v.fecha_emision)}</p>
          <p className="text-body-sm text-fg-muted">{haceCuanto(v.fecha_emision, Date.now())}</p>
        </div>
      ),
    },
    {
      clave: 'comprobante',
      titulo: 'Comprobante',
      tipo: 'texto',
      valorOrden: (v) => `${v.tipo_comprobante} ${String(v.correlativo ?? '').padStart(10, '0')}`,
      render: (v) => (
        <div>
          <p className="font-medium text-fg">{v.tipo_comprobante}</p>
          <p className="text-body-sm text-fg-muted">{v.correlativo}</p>
        </div>
      ),
    },
    {
      clave: 'cajero',
      titulo: 'Cajero',
      tipo: 'texto',
      valorOrden: (v) => v.cajero_username,
      render: (v) => <span className="text-body-sm text-fg-muted">{v.cajero_username}</span>,
    },
    {
      clave: 'total_venta',
      titulo: 'Total',
      tipo: 'dinero',
      alinear: 'right',
      valorOrden: (v) => v.total,
      render: (v) => (
        <span className="font-medium tabular-nums text-fg">{formatoDinero(v.total)}</span>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      tipo: 'texto',
      valorOrden: (v) => v.estado,
      render: (v) => (
        <EstadoBadge tipo={v.estado === 'ANULADA' ? 'peligro' : 'exito'}>
          {v.estado === 'ANULADA' ? 'Anulada' : 'Válida'}
        </EstadoBadge>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alinear: 'right',
      ordenable: false,
      render: (v) => (
        <BotonIcono
          icono={Eye}
          etiqueta={`Ver detalle de ${v.tipo_comprobante} ${v.correlativo}`}
          titulo="Ver detalle"
          onClick={() => verDetalleVenta(v.id_venta)}
          cargando={cargandoDetalleVenta}
        />
      ),
    },
  ], [verDetalleVenta, cargandoDetalleVenta]);

  const columnasConciliacion = useMemo(() => [
    {
      clave: 'medio',
      titulo: 'Medio',
      tipo: 'texto',
      render: (fila) => <span className="font-medium text-fg">{fila.medio}</span>,
    },
    {
      clave: 'esperado',
      titulo: 'Esperado',
      tipo: 'dinero',
      alinear: 'right',
      render: (fila) => <span className="font-medium">{formatoDinero(fila.esperado)}</span>,
    },
    {
      clave: 'contado',
      titulo: 'Contado',
      tipo: 'dinero',
      alinear: 'right',
      render: (fila) => <span className="font-medium">{formatoDinero(fila.contado)}</span>,
    },
    {
      clave: 'diferencia',
      titulo: 'Diferencia',
      tipo: 'dinero',
      alinear: 'right',
      render: (fila) => (
        <span className={`font-semibold tabular-nums ${claseDiferencia(fila.resultado)}`}>
          {fila.resultado === 'SOBRANTE' ? '+' : ''}
          {formatoDinero(fila.diferencia)}
        </span>
      ),
    },
    {
      clave: 'resultado',
      titulo: 'Estado',
      tipo: 'texto',
      alinear: 'center',
      render: (fila) => (
        <EstadoBadge tipo={TIPO_RESULTADO[fila.resultado] || 'cargando'}>
          {ETIQUETA_RESULTADO[fila.resultado] || fila.resultado}
        </EstadoBadge>
      ),
    },
  ], []);

  const columnasDetalleProductos = useMemo(() => [
    {
      clave: 'nombre_producto',
      titulo: 'Producto',
      tipo: 'texto',
      render: (d) => <span className="font-medium text-fg">{d.nombre_producto}</span>,
    },
    {
      clave: 'cantidad',
      titulo: 'Cant.',
      tipo: 'numero',
      alinear: 'right',
      render: (d) => <span className="text-fg-muted">{d.cantidad}</span>,
    },
    {
      clave: 'precio_unitario',
      titulo: 'P. Unit.',
      tipo: 'dinero',
      alinear: 'right',
      render: (d) => <span className="text-fg-muted">{formatoDinero(d.precio_unitario)}</span>,
    },
    {
      clave: 'subtotal_linea',
      titulo: 'Subtotal',
      tipo: 'dinero',
      alinear: 'right',
      render: (d) => <span className="font-semibold text-fg">{formatoDinero(d.subtotal_linea)}</span>,
    },
  ], []);

  // ─── Conteo del cierre: diferencia en vivo por medio (centavos enteros, sin float) ──
  const objetivoCierre = turnoParaCierre || turno;
  const filasConteo = useMemo(() => {
    const t = objetivoCierre || {};
    const medios = [
      { clave: 'efectivo', medio: 'Efectivo en gaveta', icono: Banknote, ayuda: 'Billetes y monedas contados.', esperado: t.esperado_efectivo ?? t.efectivo?.esperado },
      { clave: 'tarjeta', medio: 'Vouchers de tarjeta', icono: CreditCard, ayuda: 'Comprobantes de las terminales POS.', esperado: t.ventas_tarjeta ?? t.tarjeta?.esperado ?? t.ventas?.tarjeta },
      { clave: 'digital', medio: 'Pagos digitales', icono: Smartphone, ayuda: 'Chivo Wallet / transferencias.', esperado: t.ventas_digital ?? t.digital?.esperado ?? t.ventas?.digital },
    ];
    return medios.map((m) => {
      const esperado = aCentavos(m.esperado ?? '0') ?? 0n;
      const contado = aCentavos(formCierre[m.clave]);
      const diferencia = contado === null ? null : contado - esperado;
      return { ...m, esperadoCent: esperado, diferencia };
    });
  }, [objetivoCierre, formCierre]);

  // ─── Render principal ────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only" role="status">Cargando estado de caja y turnos…</span>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Operación · Caja y turnos"
        titulo="Caja y turnos"
        descripcion="Apertura de turnos, entradas y salidas de efectivo, y arqueo con cuadre final."
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variante="ghost"
              onClick={() => cargarTurno(true)}
              cargando={actualizando}
              icono={RefreshCw}
              aria-label="Actualizar datos de caja"
            >
              Actualizar
            </Button>
            {!turno && puedeAbrir && (
              <Button variante="primary" onClick={abrirModalApertura} icono={Unlock}>
                Abrir turno
              </Button>
            )}
          </div>
        }
      />

      {errorCarga && (
        <BannerError
          error={errorCarga}
          onReintentar={() => cargarTurno(false)}
          onCerrar={() => setErrorCarga(null)}
        />
      )}

      {/* CASO 1: TURNO ABIERTO */}
      {turno ? (
        <div className="space-y-6">
          {/* Estado del turno actual */}
          <Card
            icono={Store}
            titulo={turno.caja}
            descripcion={`${turno.sucursal} · a cargo de ${usuario?.username || 'Cajero'}`}
            acciones={
              <div className="flex flex-wrap items-center gap-2">
                {puedeMover && (
                  <Button variante="ghost" tamano="sm" onClick={abrirModalMovimiento} icono={Plus}>
                    Nuevo movimiento
                  </Button>
                )}
                {puedeCerrar && (
                  <Button variante="primary" tamano="sm" onClick={() => abrirModalCierre()} icono={Lock}>
                    Cerrar turno
                  </Button>
                )}
              </div>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-label-sm text-fg-muted">Estado</dt>
                <dd className="mt-1"><EstadoBadge tipo="info">Turno abierto</EstadoBadge></dd>
              </div>
              <div>
                <dt className="text-label-sm text-fg-muted">Monto inicial</dt>
                <dd className="mt-1 font-semibold tabular-nums text-fg">{formatoDinero(turno.monto_apertura)}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-fg-muted">Apertura</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-1.5 text-body-sm text-fg">
                  <Clock size={16} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />
                  <span className="tabular-nums">
                    {etiquetaDiaLarga(turno.abierto_en.slice(0, 10))} · {horaDe(turno.abierto_en)}
                  </span>
                  <span className="text-fg-muted">({haceCuanto(turno.abierto_en, Date.now())})</span>
                </dd>
              </div>
            </dl>
          </Card>

          {/* KPIs del turno */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica icono={Scale} etiqueta="Efectivo esperado" valor={formatoDinero(turno.esperado_efectivo)} />
            <Metrica icono={CircleDollarSign} etiqueta="Ventas en efectivo" valor={formatoDinero(turno.ventas_efectivo)} />
            <Metrica
              icono={ArrowDownLeft}
              etiqueta="Ingresos / egresos extra"
              valor={`+${formatoDinero(turno.ingresos_caja)} / −${formatoDinero(turno.egresos_caja)}`}
            />
            <Metrica
              icono={Receipt}
              etiqueta="Ventas otros medios"
              valor={formatoCentavos((aCentavos(turno.ventas_tarjeta ?? '0') ?? 0n) + (aCentavos(turno.ventas_digital ?? '0') ?? 0n))}
            />
          </div>

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
              sinPadding
              icono={Wallet}
              titulo="Movimientos de efectivo del turno"
              descripcion={`${movimientos.length} registros`}
            >
              {puedeMover && (
                <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                  <p className="text-body-sm text-fg-muted">Entradas (cambio, fondo extra) y salidas (pagos menores, adelantos).</p>
                  <Button variante="ghost" tamano="sm" className="ml-auto" onClick={abrirModalMovimiento} icono={Plus}>
                    Registrar movimiento
                  </Button>
                </div>
              )}
              <Table
                idTabla="caja_movimientos"
                columnas={columnasMovimientos}
                filas={movimientos}
                idFila="id_movimiento"
                cargando={cargandoMovimientos}
                ordenInicial={{ clave: 'creado_en', direccion: 'desc' }}
                vacio={
                  <EstadoVacio icono={ArrowUpRight} titulo="Sin movimientos">
                    No se han registrado ingresos ni egresos extraordinarios durante este turno.
                  </EstadoVacio>
                }
              />
            </Card>
          )}

          {/* PESTAÑA: VENTAS Y MEDIOS DE PAGO */}
          {pestanaActiva === 'ventas' && (
            <Card sinPadding icono={Receipt} titulo="Medios de pago del turno" descripcion="Cobros acumulados por medio de pago">
              <dl className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
                {[
                  { titulo: 'Efectivo en mostrador', icono: Banknote, valor: turno.ventas_efectivo, ayuda: 'Billetes y monedas que deben estar físicamente en caja.' },
                  { titulo: 'Tarjetas de débito / crédito', icono: CreditCard, valor: turno.ventas_tarjeta, ayuda: 'Cobros por terminal POS. Conserva los vouchers para el cuadre.' },
                  { titulo: 'Pagos digitales y transferencias', icono: Smartphone, valor: turno.ventas_digital, ayuda: 'Cobros por Bitcoin (Chivo Wallet) y transferencias acreditadas.' },
                ].map((m) => (
                  <div key={m.titulo} className="p-5">
                    <dt className="flex items-center gap-2 text-label-sm text-fg-muted">
                      <m.icono size={16} strokeWidth={1.75} aria-hidden="true" />
                      {m.titulo}
                    </dt>
                    <dd className="kpi mt-2 text-kpi">{formatoDinero(m.valor)}</dd>
                    <dd className="mt-1 text-body-sm text-fg-muted">{m.ayuda}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* PESTAÑA: HISTORIAL DE VENTAS DEL TURNO */}
          {pestanaActiva === 'ventas-turno' && turno && (
            <Card
              sinPadding
              icono={ShoppingBag}
              titulo="Ventas realizadas en este turno"
              descripcion={`${ventasTurno.length} registros`}
              acciones={
                <Button
                  variante="ghost"
                  tamano="sm"
                  onClick={() => cargarVentasTurno(turno.id_turno)}
                  cargando={cargandoVentasTurno}
                  icono={RefreshCw}
                >
                  Recargar
                </Button>
              }
            >
              <Table
                idTabla="caja_ventas_turno"
                columnas={columnasVentasTurno}
                filas={ventasTurno}
                idFila="id_venta"
                cargando={cargandoVentasTurno}
                ordenInicial={{ clave: 'fecha_emision', direccion: 'desc' }}
                vacio={
                  <EstadoVacio icono={ShoppingBag} titulo="No hay ventas registradas en este turno">
                    Las ventas aparecerán aquí en cuanto se registre algún cobro en el punto de venta.
                  </EstadoVacio>
                }
              />
            </Card>
          )}

          {/* PESTAÑA: HISTORIAL DE CUADRES */}
          {pestanaActiva === 'cuadres' && puedeVerCuadres && (
            <Card
              sinPadding
              icono={History}
              titulo="Auditoría de cuadres y turnos anteriores"
              descripcion={`${cuadres.length} registros`}
            >
              <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
                <Select
                  etiqueta="Estado"
                  value={filtroEstadoCuadre}
                  onChange={(e) => setFiltroEstadoCuadre(e.target.value)}
                  opciones={[
                    { valor: '', texto: 'Todos los estados' },
                    { valor: 'ABIERTO', texto: 'Turnos abiertos' },
                    { valor: 'CERRADO', texto: 'Turnos cerrados' },
                  ]}
                  className="w-44"
                />
                <Button
                  variante="ghost"
                  tamano="sm"
                  onClick={cargarCuadresHistorial}
                  cargando={cargandoCuadres}
                >
                  Filtrar
                </Button>
                {filtroEstadoCuadre && (
                  <Button variante="ghost" tamano="sm" className="ml-auto" onClick={() => setFiltroEstadoCuadre('')}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
              <Table
                idTabla="caja_cuadres"
                columnas={columnasCuadres}
                filas={cuadres}
                idFila="id_turno"
                cargando={cargandoCuadres}
                ordenInicial={{ clave: 'abierto_en', direccion: 'desc' }}
                vacio={
                  <EstadoVacio icono={History} titulo="Sin cuadres">
                    No hay registros de cuadres que coincidan con los filtros.
                  </EstadoVacio>
                }
              />
            </Card>
          )}
        </div>
      ) : (
        /* CASO 2: SIN TURNO ABIERTO */
        <div className="space-y-6">
          <Card icono={Store} titulo="Estado del turno">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge tipo="inactivo">Sin turno</EstadoBadge>
              <h2 className="text-h3">No tienes ningún turno abierto</h2>
            </div>
            <p className="mt-1 max-w-xl text-body text-fg-muted">
              Para registrar cobros en el punto de venta o realizar movimientos de efectivo, inicia un nuevo turno en una caja disponible de tu sucursal.
            </p>
          </Card>

          {/* Si no tiene turno abierto pero puede auditar, mostramos el historial de cuadres abajo */}
          {puedeVerCuadres && (
            <Card
              sinPadding
              icono={History}
              titulo="Historial reciente de cuadres"
              descripcion={`${cuadres.length} registros`}
            >
              <Table
                idTabla="caja_cuadres"
                columnas={columnasCuadres}
                filas={cuadres}
                idFila="id_turno"
                cargando={cargandoCuadres}
                ordenInicial={{ clave: 'abierto_en', direccion: 'desc' }}
                vacio={
                  <EstadoVacio icono={History} titulo="Sin turnos registrados">
                    Los arqueos aparecerán aquí cuando se cierre el primer turno.
                  </EstadoVacio>
                }
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
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <h2 id="apertura-titulo" className="text-h3">Abrir turno de caja</h2>
              <p id="apertura-descripcion" className="mt-1 text-body text-fg-muted">
                Selecciona la caja de tu sucursal e ingresa el fondo de efectivo inicial.
              </p>
            </div>
            <BotonIcono icono={X} etiqueta="Cerrar modal" onClick={() => setMostrarApertura(false)} />
          </div>

          <form onSubmit={handleAbrirTurno}>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label htmlFor="apertura-caja" className="mb-1.5 block text-label">
                  Caja punto de venta <span className="text-danger-text">*</span>
                </label>
                {cargandoCajas ? (
                  <div role="status" aria-label="Cargando cajas disponibles…">
                    <Skeleton className="h-control-md w-full" />
                  </div>
                ) : (
                  <Select
                    id="apertura-caja"
                    requerido
                    value={formApertura.idCaja}
                    onChange={(e) => setFormApertura({ ...formApertura, idCaja: e.target.value })}
                    placeholder="Selecciona una caja"
                    opciones={[
                      { valor: '', texto: 'Selecciona una caja', deshabilitado: true },
                      ...cajas.map((c) => ({
                        valor: String(c.id_caja),
                        texto: `${c.sucursal} — ${c.nombre_identificador} (${c.codigo_punto_venta}) ${c.ocupada ? ' · [Ocupada por otro turno]' : ' · [Disponible]'}`,
                        deshabilitado: c.ocupada,
                      })),
                    ]}
                  />
                )}
                {cajas.length > 0 && cajas.every((c) => c.ocupada) && (
                  <div className="mt-2 flex gap-2 rounded-md border border-line bg-warning-soft px-4 py-3 text-body-sm text-warning-text">
                    <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Todas las cajas registradas tienen un turno abierto</p>
                      <p className="mt-0.5">
                        Por regla de negocio, cada caja solo admite un turno activo a la vez. Para abrir un turno en una de ellas, el cajero a cargo debe cerrar el turno previo.
                      </p>
                    </div>
                  </div>
                )}
                {cajas.length === 0 && !cargandoCajas && (
                  <p className="mt-1.5 text-body-sm text-warning-text">
                    No hay cajas activas configuradas para tus sucursales asignadas.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="apertura-monto" className="mb-1.5 block text-label">
                  Monto de apertura / Fondo inicial ($) <span className="text-danger-text">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true">$</span>
                  <input
                    id="apertura-monto"
                    type="text"
                    inputMode="decimal"
                    value={formApertura.montoApertura}
                    onChange={(e) => setFormApertura({ ...formApertura, montoApertura: e.target.value })}
                    placeholder="0.00"
                    className="input w-full pl-8 text-right tabular-nums"
                    aria-describedby="apertura-monto-ayuda"
                    required
                  />
                </div>
                <p id="apertura-monto-ayuda" className="mt-1.5 text-body-sm text-fg-muted">
                  Efectivo inicial en caja para cambio. Puede ser 0.00 si inicia sin fondo.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <Button variante="ghost" onClick={() => setMostrarApertura(false)} disabled={guardandoApertura}>
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
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <h2 id="movimiento-titulo" className="text-h3">Registrar movimiento de caja</h2>
              <p id="movimiento-descripcion" className="mt-1 text-body text-fg-muted">
                Ingreso extraordinario o egreso de efectivo en el turno activo · {turno?.caja}
              </p>
            </div>
            <BotonIcono icono={X} etiqueta="Cerrar modal" onClick={() => setMostrarMovimiento(false)} />
          </div>

          <form onSubmit={handleRegistrarMovimiento}>
            <div className="space-y-4 px-6 py-5">
              <fieldset>
                <legend className="mb-1.5 block text-label">
                  Tipo de movimiento <span className="text-danger-text">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-muted p-1" role="radiogroup">
                  {[
                    { valor: 'INGRESO', texto: 'Ingreso (+)', icono: TrendingUp, color: 'text-success-text' },
                    { valor: 'EGRESO', texto: 'Egreso (−)', icono: TrendingDown, color: 'text-danger-text' },
                  ].map((op) => {
                    const activo = formMovimiento.tipo === op.valor;
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setFormMovimiento({ ...formMovimiento, tipo: op.valor })}
                        className={`flex h-control-sm items-center justify-center gap-2 rounded-sm text-body-sm font-medium transition-colors ${
                          activo ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        <op.icono size={16} strokeWidth={1.75} className={activo ? op.color : ''} aria-hidden="true" />
                        {op.texto}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="movimiento-concepto" className="mb-1.5 block text-label">
                  Concepto / Justificación <span className="text-danger-text">*</span>
                </label>
                <input
                  id="movimiento-concepto"
                  type="text"
                  value={formMovimiento.concepto}
                  onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })}
                  placeholder={formMovimiento.tipo === 'INGRESO' ? 'Ej: Aporte extra para cambio' : 'Ej: Pago de hielo de emergencia'}
                  className="input w-full"
                  maxLength={150}
                  aria-describedby="movimiento-concepto-ayuda"
                  required
                />
                <p id="movimiento-concepto-ayuda" className="mt-1.5 text-body-sm text-fg-muted">
                  Describe con claridad el motivo de la entrada o salida de dinero.
                </p>
              </div>

              <div>
                <label htmlFor="movimiento-monto" className="mb-1.5 block text-label">
                  Monto ($) <span className="text-danger-text">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true">$</span>
                  <input
                    id="movimiento-monto"
                    type="text"
                    inputMode="decimal"
                    value={formMovimiento.monto}
                    onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value })}
                    placeholder="0.00"
                    className="input w-full pl-8 text-right tabular-nums"
                    required
                  />
                </div>
                {formMovimiento.tipo === 'EGRESO' && turno?.esperado_efectivo && (
                  <p className="mt-1.5 text-body-sm text-fg-muted">
                    Efectivo disponible en caja: <strong className="font-medium tabular-nums text-fg">{formatoDinero(turno.esperado_efectivo)}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <Button variante="ghost" onClick={() => setMostrarMovimiento(false)} disabled={guardandoMovimiento}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variante="primary"
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
          onCerrar={() => {
            setMostrarCierre(false);
            setTurnoParaCierre(null);
          }}
          tamano="lg"
          labelledBy="cierre-titulo"
          describedBy="cierre-descripcion"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <h2 id="cierre-titulo" className="text-h3">Arqueo y cierre de caja</h2>
              <p id="cierre-descripcion" className="mt-1 text-body text-fg-muted">
                {objetivoCierre?.caja}{objetivoCierre?.cajero ? ` (${objetivoCierre.cajero})` : ''} · Ingresa el monto contado por medio; el sistema calculará el cuadre.
              </p>
            </div>
            <BotonIcono
              icono={X}
              etiqueta="Cerrar modal"
              onClick={() => {
                setMostrarCierre(false);
                setTurnoParaCierre(null);
              }}
            />
          </div>

          <form onSubmit={handleCerrarTurno}>
            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="rotulo">Conteo por medio de pago</p>
                <Button variante="ghost" tamano="sm" icono={Scale} onClick={handleCargarMontosEsperados}>
                  Cargar montos esperados
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[520px] text-body-sm">
                  <thead className="bg-muted text-label-sm text-fg-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">Medio</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Esperado</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Contado</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filasConteo.map((fila) => {
                      const dif = fila.diferencia;
                      const claseDif = dif === null ? 'text-fg-muted' : dif === 0n ? 'text-success-text' : 'text-danger-text';
                      return (
                        <tr key={fila.clave}>
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            <span className="flex items-center gap-2 font-medium text-fg">
                              <fila.icono size={16} strokeWidth={1.75} className="text-fg-subtle" aria-hidden="true" />
                              {fila.medio}
                            </span>
                            <span className="mt-0.5 block text-body-sm text-fg-muted">{fila.ayuda}</span>
                          </th>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted">{formatoCentavos(fila.esperadoCent)}</td>
                          <td className="px-4 py-3">
                            <label htmlFor={`cierre-${fila.clave}`} className="sr-only">{fila.medio} contado ($)</label>
                            <input
                              id={`cierre-${fila.clave}`}
                              type="text"
                              inputMode="decimal"
                              value={formCierre[fila.clave]}
                              onChange={(e) => setFormCierre({ ...formCierre, [fila.clave]: e.target.value })}
                              placeholder="0.00"
                              className="input ml-auto h-control-sm w-32 text-right tabular-nums"
                              aria-invalid={dif === null ? true : undefined}
                              required
                            />
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${claseDif}`} aria-live="polite">
                            {dif === null ? '—' : `${dif > 0n ? '+' : ''}${formatoCentavos(dif)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-body-sm text-fg-muted">
                La diferencia es orientativa; el resultado final (cuadrado, sobrante o faltante) lo calcula el sistema al cerrar.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <Button variante="ghost" onClick={() => setMostrarCierre(false)} disabled={guardandoCierre}>
                Cancelar
              </Button>
              <Button type="submit" variante="danger" cargando={guardandoCierre} icono={Lock}>
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
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <h2 id="cuadre-titulo" className="text-h3">Resumen de cuadre · {cuadreDetalle.caja}</h2>
              <p id="cuadre-descripcion" className="mt-1 text-body text-fg-muted">
                {cuadreDetalle.sucursal} · Turno finalizado por {cuadreDetalle.cajero}
              </p>
            </div>
            <BotonIcono icono={X} etiqueta="Cerrar modal" onClick={() => setMostrarCuadre(false)} />
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Estado general del efectivo */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
              <div>
                <p className="rotulo">Resultado del arqueo en efectivo</p>
                <div className="mt-1">
                  {cuadreDetalle.efectivo?.resultado === 'CUADRADO' ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-success-text">
                      <CheckCircle2 size={20} strokeWidth={1.75} aria-hidden="true" />
                      Turno cuadrado exactamente ($0.00 de diferencia)
                    </span>
                  ) : cuadreDetalle.efectivo?.resultado === 'SOBRANTE' ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-danger-text">
                      <AlertCircle size={20} strokeWidth={1.75} aria-hidden="true" />
                      Sobrante de efectivo (+{formatoDinero(cuadreDetalle.efectivo?.diferencia)})
                    </span>
                  ) : cuadreDetalle.efectivo?.resultado === 'FALTANTE' ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-danger-text">
                      <AlertTriangle size={20} strokeWidth={1.75} aria-hidden="true" />
                      Faltante de efectivo ({formatoDinero(cuadreDetalle.efectivo?.diferencia)})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium text-fg-muted">
                      <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
                      Turno en curso (arqueo físico pendiente al cierre)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-body-sm tabular-nums text-fg-muted">
                <p>Apertura: {horaDe(cuadreDetalle.abierto_en)}</p>
                <p>Cierre: {cuadreDetalle.cerrado_en ? horaDe(cuadreDetalle.cerrado_en) : 'En curso'}</p>
              </div>
            </div>

            {/* Tabla comparativa de cuadre por método */}
            <div>
              <h3 className="rotulo mb-2">Conciliación por medio de pago</h3>
              <div className="overflow-hidden rounded-lg border border-line">
                <Table
                  columnas={columnasConciliacion}
                  filas={[
                    {
                      id: 'efectivo',
                      medio: 'Efectivo',
                      esperado: cuadreDetalle.efectivo?.esperado,
                      contado: cuadreDetalle.efectivo?.contado,
                      diferencia: cuadreDetalle.efectivo?.diferencia,
                      resultado: cuadreDetalle.efectivo?.resultado || 'En curso',
                    },
                    {
                      id: 'tarjeta',
                      medio: 'Tarjeta',
                      esperado: cuadreDetalle.tarjeta?.esperado,
                      contado: cuadreDetalle.tarjeta?.contado,
                      diferencia: cuadreDetalle.tarjeta?.diferencia,
                      resultado: cuadreDetalle.tarjeta?.resultado || 'En curso',
                    },
                    {
                      id: 'digital',
                      medio: 'Digital / Transferencias',
                      esperado: cuadreDetalle.digital?.esperado,
                      contado: cuadreDetalle.digital?.contado,
                      diferencia: cuadreDetalle.digital?.diferencia,
                      resultado: cuadreDetalle.digital?.resultado || 'En curso',
                    },
                  ]}
                  idFila="id"
                  paginacion={false}
                  scrollVertical={false}
                  minAncho="min-w-[500px]"
                />
              </div>
            </div>

            {/* Desglose de operaciones adicionales */}
            <dl className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-line p-4">
                <dt className="text-label-sm text-fg-muted">Fondo de apertura</dt>
                <dd className="mt-1 font-semibold tabular-nums text-fg">{formatoDinero(cuadreDetalle.monto_apertura)}</dd>
              </div>
              <div className="rounded-lg border border-line p-4">
                <dt className="text-label-sm text-fg-muted">Movimientos extraordinarios</dt>
                <dd className="mt-1 tabular-nums">
                  <span className="font-semibold text-success-text">+{formatoDinero(cuadreDetalle.ingresos_caja)}</span>
                  <span className="text-fg-muted"> / </span>
                  <span className="font-semibold text-danger-text">−{formatoDinero(cuadreDetalle.egresos_caja)}</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
            <Button variante="primary" onClick={() => setMostrarCuadre(false)}>
              Entendido y cerrar
            </Button>
          </div>
        </Dialogo>
      )}

      {/* ─── MODAL: DETALLE DE VENTA ──────────────────────────────────────── */}
      {mostrarDetalleVenta && ventaDetalleSeleccionada && (
        <Dialogo
          onCerrar={() => { setMostrarDetalleVenta(false); setVentaDetalleSeleccionada(null); }}
          tamano="lg"
          labelledBy="detalle-venta-titulo"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <p className="rotulo">Detalle de venta</p>
              <h2 id="detalle-venta-titulo" className="mt-1 text-h3">
                {ventaDetalleSeleccionada.tipo_comprobante} — <span className="font-mono">{ventaDetalleSeleccionada.correlativo}</span>
              </h2>
            </div>
            <BotonIcono
              icono={X}
              etiqueta="Cerrar detalle"
              onClick={() => { setMostrarDetalleVenta(false); setVentaDetalleSeleccionada(null); }}
            />
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-fg-muted">
              <span className="flex items-center gap-1.5 tabular-nums">
                <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                {etiquetaDiaLarga(ventaDetalleSeleccionada.fecha_emision?.slice(0, 10))} — {horaDe(ventaDetalleSeleccionada.fecha_emision)}
              </span>
              <EstadoBadge tipo={ventaDetalleSeleccionada.estado === 'ANULADA' ? 'peligro' : 'exito'}>
                {ventaDetalleSeleccionada.estado === 'ANULADA' ? 'Anulada' : 'Válida'}
              </EstadoBadge>
              {ventaDetalleSeleccionada.cajero_username && (
                <span>Cajero: <strong className="font-medium text-fg">{ventaDetalleSeleccionada.cajero_username}</strong></span>
              )}
            </div>

            <div>
              <h3 className="rotulo mb-2 flex items-center gap-2">
                <Package size={16} strokeWidth={1.75} aria-hidden="true" />
                Productos / servicios
              </h3>
              {ventaDetalleSeleccionada.detalles?.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-line">
                  <Table
                    columnas={columnasDetalleProductos}
                    filas={ventaDetalleSeleccionada.detalles.map((d, i) => ({
                      ...d,
                      _id: d.id_detalle ?? i,
                    }))}
                    idFila="_id"
                    paginacion={false}
                    scrollVertical={false}
                    minAncho="min-w-[450px]"
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-line p-4 text-body-sm text-fg-muted">Sin detalle de productos disponible.</p>
              )}
            </div>

            {ventaDetalleSeleccionada.pagos?.length > 0 && (
              <div>
                <h3 className="rotulo mb-2 flex items-center gap-2">
                  <CircleDollarSign size={16} strokeWidth={1.75} aria-hidden="true" />
                  Medios de pago
                </h3>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {ventaDetalleSeleccionada.pagos.map((p, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-2.5 text-body-sm">
                      <span className="text-fg-muted">{p.metodo}</span>
                      <span className="font-medium tabular-nums text-fg">{formatoDinero(p.monto)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="font-medium text-fg">Total de la venta</span>
              <span className="kpi text-kpi">{formatoDinero(ventaDetalleSeleccionada.total)}</span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              variante="ghost"
              onClick={() => { setMostrarDetalleVenta(false); setVentaDetalleSeleccionada(null); }}
            >
              Cerrar
            </Button>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
