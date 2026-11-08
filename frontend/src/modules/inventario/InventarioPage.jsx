import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Boxes, PackageMinus, RefreshCw, Scale } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import CampoTexto from '../../components/forms/CampoTexto.jsx';
import { Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { traducirError } from '../../errors/traducirError.js';

const CANTIDAD_VALIDA = /^\d{1,10}(\.\d{1,4})?$/;
const SUCURSALES_VACIAS = [];

function esCantidadPositiva(valor) {
  return CANTIDAD_VALIDA.test(valor.trim()) && /[1-9]/.test(valor);
}

export default function InventarioPage() {
  const { usuario, tiene } = useAuth();
  const { notificar } = useAlert();
  const sucursales = usuario?.sucursales ?? SUCURSALES_VACIAS;
  const [idSucursal, setIdSucursal] = useState(() => String(sucursales[0]?.id_sucursal ?? ''));
  const [stock, setStock] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [errorStock, setErrorStock] = useState(null);
  const [errorAlertas, setErrorAlertas] = useState(null);
  const [errorMerma, setErrorMerma] = useState(null);
  const [idInsumo, setIdInsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ultimaSucursalIniciada = useRef(null);
  const numeroCarga = useRef(0);

  const cargarSucursal = useCallback(async (sucursal) => {
    if (!sucursal) return;
    const cargaActual = ++numeroCarga.current;
    const query = `?idSucursal=${encodeURIComponent(sucursal)}`;

    setCargandoStock(true);
    setCargandoAlertas(true);
    setStock([]);
    setAlertas([]);
    setErrorStock(null);
    setErrorAlertas(null);

    const cargarStock = async () => {
      try {
        const filas = await api.get(`/inventario/stock${query}`);
        if (cargaActual === numeroCarga.current) setStock(filas);
      } catch (error) {
        if (cargaActual === numeroCarga.current) setErrorStock(traducirError(error));
      } finally {
        if (cargaActual === numeroCarga.current) setCargandoStock(false);
      }
    };

    const cargarAlertas = async () => {
      try {
        const filas = await api.get(`/inventario/alertas${query}`);
        if (cargaActual === numeroCarga.current) setAlertas(filas);
      } catch (error) {
        if (cargaActual === numeroCarga.current) setErrorAlertas(traducirError(error));
      } finally {
        if (cargaActual === numeroCarga.current) setCargandoAlertas(false);
      }
    };

    await Promise.all([cargarStock(), cargarAlertas()]);
  }, []);

  useEffect(() => {
    if (!idSucursal) {
      setStock([]);
      setAlertas([]);
      return;
    }
    if (ultimaSucursalIniciada.current === idSucursal) return;
    ultimaSucursalIniciada.current = idSucursal;
    void cargarSucursal(idSucursal);
  }, [idSucursal, cargarSucursal]);

  const sucursalValida = sucursales.some((sucursal) => String(sucursal.id_sucursal) === idSucursal);
  const insumoSeleccionado = stock.find((fila) => String(fila.id_insumo) === idInsumo);
  const cantidadValida = esCantidadPositiva(cantidad);
  const motivoValido = motivo.trim().length >= 3 && motivo.trim().length <= 500;
  const puedeRegistrarMerma = Boolean(sucursalValida && insumoSeleccionado && cantidadValida && motivoValido && !enviando);

  const opcionesSucursal = useMemo(() => sucursales.map((sucursal) => ({
    valor: String(sucursal.id_sucursal),
    texto: sucursal.nombre,
  })), [sucursales]);

  const opcionesInsumo = useMemo(() => stock.map((fila) => ({
    valor: String(fila.id_insumo),
    texto: `${fila.insumo} · ${fila.unidad}`,
  })), [stock]);

  const cambiarSucursal = (evento) => {
    setIdSucursal(evento.target.value);
    setIdInsumo('');
    setErrorMerma(null);
  };

  const registrarMerma = async (evento) => {
    evento.preventDefault();
    if (!puedeRegistrarMerma || !insumoSeleccionado) return;

    setEnviando(true);
    setErrorMerma(null);
    try {
      await api.post(`/inventario/insumos/${insumoSeleccionado.id_insumo}/mermas`, {
        idSucursal: Number(idSucursal),
        cantidad: cantidad.trim(),
        motivo: motivo.trim(),
      });
      notificar.exito('Merma registrada', { mensaje: 'Se actualizó el inventario de la sucursal.' });
      setCantidad('');
      setMotivo('');
      await cargarSucursal(idSucursal);
    } catch (error) {
      setErrorMerma(traducirError(error));
    } finally {
      setEnviando(false);
    }
  };

  const columnasStock = [
    { clave: 'insumo', titulo: 'Insumo' },
    { clave: 'unidad', titulo: 'Unidad' },
    { clave: 'stock_actual', titulo: 'Stock actual', alinear: 'right' },
    { clave: 'stock_minimo', titulo: 'Stock mínimo', alinear: 'right' },
  ];

  const columnasAlertas = [
    { clave: 'insumo', titulo: 'Insumo' },
    { clave: 'unidad', titulo: 'Unidad' },
    { clave: 'nivel', titulo: 'Nivel', render: (fila) => (
      <EstadoBadge tipo={fila.nivel === 'AGOTADO' ? 'error' : 'alerta'}>{fila.nivel}</EstadoBadge>
    ) },
    { clave: 'stock_actual', titulo: 'Actual', alinear: 'right' },
    { clave: 'stock_minimo', titulo: 'Mínimo', alinear: 'right' },
    { clave: 'faltante', titulo: 'Faltante', alinear: 'right' },
  ];

  if (!sucursales.length) {
    return (
      <div className="space-y-6">
        <header><h1 className="font-display text-2xl font-semibold">Inventario</h1></header>
        <Card><EstadoVacio icono={Boxes} titulo="No tienes sucursales asignadas">
          Pide a una persona administradora que te asigne una sucursal para consultar el inventario.
        </EstadoVacio></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-muted">Operación</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Inventario</h1>
        </div>
        <div className="w-full sm:max-w-xs">
          <Select
            etiqueta="Sucursal"
            opciones={opcionesSucursal}
            value={idSucursal}
            onChange={cambiarSucursal}
            disabled={enviando}
          />
        </div>
      </header>

      <Card titulo="Stock por sucursal" descripcion="Existencias y mínimos informados por el sistema.">
        {errorStock && <BannerError className="mb-4" error={errorStock} onReintentar={() => cargarSucursal(idSucursal)} />}
        {cargandoStock ? <Spinner texto="Cargando stock…" />
          : errorStock ? null
            : stock.length === 0 ? <EstadoVacio icono={Boxes} titulo="No hay stock para esta sucursal">
            Cuando el inventario tenga existencias registradas, aparecerán aquí.
          </EstadoVacio>
            : <Table columnas={columnasStock} filas={stock} idFila="id_insumo" vacio="No hay existencias para mostrar." />}
      </Card>

      <Card titulo="Alertas de stock mínimo" descripcion="Alertas calculadas por el backend para la sucursal seleccionada.">
        {errorAlertas && <BannerError className="mb-4" error={errorAlertas} onReintentar={() => cargarSucursal(idSucursal)} />}
        {cargandoAlertas ? <Spinner texto="Cargando alertas…" />
          : errorAlertas ? null
            : alertas.length === 0 ? <EstadoVacio icono={AlertTriangle} titulo="No hay alertas de stock">
            No hay insumos bajo su mínimo en esta sucursal.
          </EstadoVacio>
            : <Table columnas={columnasAlertas} filas={alertas} idFila="insumo" vacio="No hay alertas para mostrar." />}
      </Card>

      {tiene('INV_REGISTRAR_MERMA') && (
        <Card titulo="Registrar merma" descripcion="El backend validará el stock disponible y registrará el movimiento.">
          {errorMerma && <BannerError className="mb-4" error={errorMerma} onCerrar={() => setErrorMerma(null)} />}
          {cargandoStock ? <Spinner texto="Cargando insumos…" />
            : errorStock ? <p className="text-sm text-fg-muted">No se puede cargar la lista de insumos hasta resolver el error de stock.</p>
              : !stock.length ? <EstadoVacio icono={PackageMinus} titulo="No hay insumos disponibles para seleccionar">
                Selecciona una sucursal con stock cargado antes de registrar una merma.
              </EstadoVacio> : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={registrarMerma}>
              <Select
                etiqueta="Insumo"
                opciones={opcionesInsumo}
                placeholder="Selecciona un insumo"
                value={idInsumo}
                onChange={(evento) => setIdInsumo(evento.target.value)}
                disabled={enviando || cargandoStock}
              />
              <div>
                <label htmlFor="inventario-cantidad-merma" className="mb-1.5 block text-sm font-medium">Cantidad</label>
                <CampoTexto
                  id="inventario-cantidad-merma"
                  icono={Scale}
                  type="number"
                  min="0.0001"
                  max="9999999999.9999"
                  step="0.0001"
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(evento) => setCantidad(evento.target.value)}
                  disabled={enviando}
                  required
                />
                <p className="mt-1 text-xs text-fg-muted">Hasta 4 decimales.</p>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="inventario-motivo-merma" className="mb-1.5 block text-sm font-medium">Motivo</label>
                <CampoTexto
                  id="inventario-motivo-merma"
                  icono={PackageMinus}
                  type="text"
                  maxLength={500}
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  disabled={enviando}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" icono={PackageMinus} cargando={enviando} disabled={!puedeRegistrarMerma}>
                  Registrar merma
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
