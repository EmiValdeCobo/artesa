import { useCallback, useEffect, useMemo, useState } from 'react';
import Dialogo from '../../components/Dialogo.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import Skeleton from '../../components/feedback/Skeleton.jsx';
import { Button, Select } from '../../components/ui/index.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { formatearUnidades, enteroParaInput } from '../../utils/formato.js';
import { traducirError } from '../../errors/traducirError.js';
import { actualizarStockMinimo, getStock, registrarMovimiento } from './inventarioApi.js';

export default function DialogoExistenciasInsumo({ insumo, sucursales, onCerrar }) {
  const { notificar, notificarError } = useAlert();
  const [sucursal, setSucursal] = useState(String(sucursales[0]?.id_sucursal ?? ''));
  const [stock, setStock] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('INVENTARIO_INICIAL');
  const [motivo, setMotivo] = useState('');
  const [minimo, setMinimo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const opciones = useMemo(() => sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre })), [sucursales]);

  const cargar = useCallback(async () => {
    if (!sucursal) return;
    setCargando(true);
    try {
      const resultado = await getStock(sucursal);
      const filas = Array.isArray(resultado) ? resultado : (resultado?.data ?? []);
      const fila = filas.find((x) => String(x.id_insumo) === String(insumo.id_insumo));
      setStock(fila ?? { stock_actual: '0', stock_minimo: '0' });
      setMinimo(enteroParaInput(fila?.stock_minimo) || '0');
      setErrorCarga(null);
    } catch (err) { setErrorCarga(traducirError(err)); }
    finally { setCargando(false); }
  }, [sucursal, insumo.id_insumo]);
  useEffect(() => { cargar(); }, [cargar]);

  const registrar = async (evento) => {
    evento.preventDefault();
    if (!cantidad.trim() || Number(cantidad) <= 0) {
      notificar.advertencia('Cantidad inválida', { mensaje: 'Ingresa una cantidad mayor a cero.' });
      return;
    }
    if (!motivo.trim() || motivo.trim().length < 3) {
      notificar.advertencia('Motivo requerido', { mensaje: 'Describe el motivo del movimiento (mínimo 3 caracteres).' });
      return;
    }
    try {
      await registrarMovimiento(insumo.id_insumo, { idSucursal: Number(sucursal), idInsumo: Number(insumo.id_insumo), cantidad: cantidad.trim(), tipo, motivo: motivo.trim() });
      setCantidad(''); setMotivo('');
      notificar.exito('Entrada de inventario registrada.');
      await cargar();
    } catch (err) { notificarError(err); }
  };
  const guardarMinimo = async (evento) => {
    evento.preventDefault();
    if (minimo === '' || Number(minimo) < 0) {
      notificar.advertencia('Stock mínimo inválido', { mensaje: 'Ingresa un stock mínimo mayor o igual a cero.' });
      return;
    }
    try {
      await actualizarStockMinimo(insumo.id_insumo, { idSucursal: Number(sucursal), stockMinimo: minimo.trim() });
      notificar.exito('Stock mínimo actualizado.');
      await cargar();
    } catch (err) { notificarError(err); }
  };

  const unidad = insumo.codigo_unidad ?? insumo.unidad ?? '';
  const valorStock = (valor) => (cargando ? <Skeleton className="mt-1 h-6 w-16" /> : <span className="tabular-nums">{formatearUnidades(valor)}</span>);

  return <Dialogo onCerrar={onCerrar} tamano="md" labelledBy="existencias-insumo-titulo" describedBy="existencias-insumo-descripcion">
    <header className="px-6 pt-6">
      <h2 id="existencias-insumo-titulo" className="text-h3">Existencias: {insumo.nombre}</h2>
      <p id="existencias-insumo-descripcion" className="mt-1 text-body text-fg-muted">Consulta y ajusta el inventario por sucursal.</p>
    </header>
    <div className="space-y-4 px-6 py-5">
      {errorCarga && <BannerError error={errorCarga} onReintentar={cargar} onCerrar={() => setErrorCarga(null)} />}
      <Select etiqueta="Sucursal" opciones={opciones} value={sucursal} onChange={(e) => setSucursal(e.target.value)} />
      <dl className="grid grid-cols-2 gap-4 rounded-md bg-muted p-4" aria-busy={cargando}>
        <div><dt className="text-label-sm text-fg-muted">Stock actual</dt><dd className="mt-1 text-h3">{valorStock(stock?.stock_actual)} <span className="text-body-sm font-normal text-fg-muted">{unidad}</span></dd></div>
        <div><dt className="text-label-sm text-fg-muted">Stock mínimo</dt><dd className="mt-1 text-h3">{valorStock(stock?.stock_minimo)}</dd></div>
      </dl>
      <form id="form-entrada-existencias" onSubmit={registrar} className="space-y-4 border-t border-line pt-4">
        <h3 className="rotulo">Registrar entrada</h3>
        <Select etiqueta="Tipo de movimiento" opciones={[{ valor: 'INVENTARIO_INICIAL', texto: 'Inventario inicial' }, { valor: 'AJUSTE', texto: 'Ajuste' }]} value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="existencias-cantidad" className="mb-1.5 block text-label">Cantidad <span className="text-danger-text">*</span></label>
            <input id="existencias-cantidad" className="input text-right tabular-nums" type="number" min="1" step="1" placeholder="1" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </div>
          <div>
            <label htmlFor="existencias-motivo" className="mb-1.5 block text-label">Motivo <span className="text-danger-text">*</span></label>
            <input id="existencias-motivo" className="input" minLength={3} maxLength={500} required value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
      </form>
      <form onSubmit={guardarMinimo} className="space-y-4 border-t border-line pt-4">
        <h3 className="rotulo">Stock mínimo</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="existencias-minimo" className="mb-1.5 block text-label">Mínimo por sucursal <span className="text-danger-text">*</span></label>
            <input id="existencias-minimo" className="input text-right tabular-nums" type="number" min="0" step="1" placeholder="0" required value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </div>
          <Button type="submit" variante="ghost" disabled={!sucursal || cargando}>Guardar mínimo</Button>
        </div>
      </form>
    </div>
    <footer className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
      <Button variante="ghost" onClick={onCerrar}>Cerrar</Button>
      <Button type="submit" form="form-entrada-existencias" variante="primary" disabled={!sucursal || cargando}>Registrar entrada</Button>
    </footer>
  </Dialogo>;
}
