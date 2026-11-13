import { useCallback, useEffect, useMemo, useState } from 'react';
import Dialogo from '../../components/Dialogo.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import { Button, Select } from '../../components/ui/index.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { traducirError } from '../../errors/traducirError.js';
import { actualizarStockMinimo, getStock, registrarMovimiento } from './inventarioApi.js';

export default function DialogoExistenciasInsumo({ insumo, sucursales, onCerrar }) {
  const { notificar } = useAlert();
  const [sucursal, setSucursal] = useState(String(sucursales[0]?.id_sucursal ?? ''));
  const [stock, setStock] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('INVENTARIO_INICIAL');
  const [motivo, setMotivo] = useState('');
  const [minimo, setMinimo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const opciones = useMemo(() => sucursales.map((s) => ({ valor: String(s.id_sucursal), texto: s.nombre })), [sucursales]);

  const cargar = useCallback(async () => {
    if (!sucursal) return;
    setCargando(true);
    try {
      const resultado = await getStock(sucursal);
      const filas = Array.isArray(resultado) ? resultado : (resultado?.data ?? []);
      const fila = filas.find((x) => String(x.id_insumo) === String(insumo.id_insumo));
      setStock(fila ?? { stock_actual: '0.0000', stock_minimo: '0.0000' });
      setMinimo(String(fila?.stock_minimo ?? '0.0000'));
      setError(null);
    } catch (err) { setError(traducirError(err)); }
    finally { setCargando(false); }
  }, [sucursal, insumo.id_insumo]);
  useEffect(() => { cargar(); }, [cargar]);

  const registrar = async (evento) => {
    evento.preventDefault();
    try {
      await registrarMovimiento(insumo.id_insumo, { idSucursal: Number(sucursal), idInsumo: Number(insumo.id_insumo), cantidad: cantidad.trim(), tipo, motivo: motivo.trim() });
      setCantidad(''); setMotivo('');
      notificar.exito('Entrada de inventario registrada.');
      await cargar();
    } catch (err) { setError(traducirError(err)); }
  };
  const guardarMinimo = async (evento) => {
    evento.preventDefault();
    try {
      await actualizarStockMinimo(insumo.id_insumo, { idSucursal: Number(sucursal), stockMinimo: minimo.trim() });
      notificar.exito('Stock mínimo actualizado.');
      await cargar();
    } catch (err) { setError(traducirError(err)); }
  };

  return <Dialogo onCerrar={onCerrar} tamano="md" labelledBy="existencias-insumo-titulo">
    <div className="p-5 sm:p-6 space-y-5">
      <header><h2 id="existencias-insumo-titulo" className="text-lg font-semibold">Existencias: {insumo.nombre}</h2><p className="text-sm text-fg-muted">Consulta y ajusta el inventario por sucursal.</p></header>
      {error && <BannerError error={error} onCerrar={() => setError(null)} />}
      <Select etiqueta="Sucursal" opciones={opciones} value={sucursal} onChange={(e) => setSucursal(e.target.value)} />
      <div className="rounded-lg border border-line bg-muted/30 p-3 text-sm"><p>Stock actual: <strong>{cargando ? '…' : stock?.stock_actual ?? '—'} {insumo.codigo_unidad ?? insumo.unidad ?? ''}</strong></p><p>Stock mínimo: <strong>{cargando ? '…' : stock?.stock_minimo ?? '—'}</strong></p></div>
      <form onSubmit={registrar} className="space-y-3 border-t border-line pt-4">
        <h3 className="font-semibold">Registrar entrada</h3>
        <Select etiqueta="Tipo de movimiento" opciones={[{ valor: 'INVENTARIO_INICIAL', texto: 'Inventario inicial' }, { valor: 'AJUSTE', texto: 'Ajuste' }]} value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <label className="block text-sm">Cantidad<input className="input mt-1" type="number" min="0.0001" step="0.0001" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
        <label className="block text-sm">Motivo<input className="input mt-1" minLength={3} maxLength={500} required value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        <Button type="submit" variante="primary" disabled={!sucursal || cargando}>Registrar entrada</Button>
      </form>
      <form onSubmit={guardarMinimo} className="space-y-3 border-t border-line pt-4">
        <h3 className="font-semibold">Stock mínimo</h3>
        <label className="block text-sm">Mínimo por sucursal<input className="input mt-1" type="number" min="0" step="0.0001" required value={minimo} onChange={(e) => setMinimo(e.target.value)} /></label>
        <Button type="submit" variante="ghost" disabled={!sucursal || cargando}>Guardar mínimo</Button>
      </form>
    </div>
  </Dialogo>;
}
