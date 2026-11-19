import { useState, useEffect, useRef } from 'react';
import {
  Minus,
  Plus,
  ReceiptText,
  UserCheck,
  Search,
  X,
  UserPlus,
} from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button, Select } from '../../components/ui/index.js';
import BannerError from '../../components/feedback/BannerError.jsx';
import { ICONOS } from '../../config/iconos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import { calcularTotales, formatoMoneda, IVA } from './impuestos.js';
import { listarClientes, crearCliente } from './posApi.js';

// El crédito fiscal requiere POS_EMITIR_CCF (permiso distinto de POS_COBRAR).
const TIPOS_DOC = [
  { valor: 'FACTURA', texto: 'Consumidor final' },
  { valor: 'CCF', texto: 'Crédito fiscal (CCF)', permiso: 'POS_EMITIR_CCF' },
];

const FORM_CLIENTE_INICIAL = {
  nombre_razon_social: '',
  tipo_documento: '',
  num_documento: '',
  nrc: '',
  giro_economico: '',
  direccion: '',
  telefono: '',
  email: '',
};

const REGLAS_DOCUMENTO = {
  DUI: { regex: /^\d{8}-\d$/, placeholder: '00000000-0', maxLength: 10 },
  NIT: { regex: /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/, placeholder: '0614-290190-101-2', maxLength: 17 },
  PASAPORTE: { regex: /^[A-Za-z0-9]{6,12}$/, placeholder: 'A12345678', maxLength: 12 },
};

const REGEX_NRC = /^\d{2,8}-\d$/;
const REGEX_TELEFONO_SV = /^[267]\d{3}-?\d{4}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatearPorMascara(valor, grupos) {
  const digitos = valor.replace(/\D/g, '');
  const partes = [];
  let indice = 0;
  for (const tamano of grupos) {
    if (indice >= digitos.length) break;
    partes.push(digitos.slice(indice, indice + tamano));
    indice += tamano;
  }
  return partes.join('-');
}

function formatearNrc(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  if (digitos.length <= 1) return digitos;
  return `${digitos.slice(0, -1)}-${digitos.slice(-1)}`;
}

export default function Carrito({
  items,
  tipoDocumento,
  onTipoDocumento,
  clienteSeleccionado = null,
  onSeleccionarCliente,
  dispatch,
  onCobrar,
  onVaciar,
  etiquetaCobro: textoCobro,
}) {
  const { tiene } = useAuth();
  const { notificar, notificarError } = useAlert();
  const puedeVerClientes = tiene('POS_GESTIONAR_CLIENTES') || tiene('POS_COBRAR');
  const puedeCrearClientes = tiene('POS_GESTIONAR_CLIENTES') || tiene('POS_COBRAR');
  const tipos = TIPOS_DOC.filter((t) => !t.permiso || tiene(t.permiso));
  const { subtotal, iva, total } = calcularTotales(items);
  const unidades = items.reduce((n, i) => n + i.cantidad, 0);

  // Buscador de clientes
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [terminoCliente, setTerminoCliente] = useState('');
  const [resultadosCliente, setResultadosCliente] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const buscarRef = useRef(null);
  const entradaBusquedaRef = useRef(null);
  const clienteFilaRef = useRef(null);
  const filasRef = useRef(new Map());
  const itemsPreviosRef = useRef(items);

  useEffect(() => {
    const previos = itemsPreviosRef.current;
    const cambiado = [...items].reverse().find((item) => previos.find((anterior) => anterior.id_producto === item.id_producto)?.cantidad !== item.cantidad);
    if (cambiado) filasRef.current.get(cambiado.id_producto)?.scrollIntoView?.({ block: 'nearest' });
    itemsPreviosRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!buscandoCliente) return undefined;
    entradaBusquedaRef.current?.focus();
    const cerrarFuera = (evento) => {
      if (clienteFilaRef.current && !clienteFilaRef.current.contains(evento.target)) {
        setBuscandoCliente(false);
        setTerminoCliente('');
        buscarRef.current?.focus();
      }
    };
    const cerrarEscape = (evento) => {
      if (evento.key === 'Escape') {
        setBuscandoCliente(false);
        setTerminoCliente('');
        buscarRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [buscandoCliente]);

  // Modal de registro rápido de cliente
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState(FORM_CLIENTE_INICIAL);
  const [errorCliente, setErrorCliente] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const esCCF = tipoDocumento === 'CCF';
  const clienteValidoParaCCF = Boolean(
    clienteSeleccionado?.nrc && clienteSeleccionado?.giro_economico,
  );
  const bloqueoPorCCF = esCCF && !clienteValidoParaCCF;

  useEffect(() => {
    if (!buscandoCliente || !puedeVerClientes) return undefined;
    const timer = setTimeout(async () => {
      setCargandoClientes(true);
      try {
        const lista = await listarClientes({
          q: terminoCliente.trim(),
          soloCcf: esCCF,
        });
        setResultadosCliente(Array.isArray(lista) ? lista.slice(0, 6) : []);
      } catch {
        setResultadosCliente([]);
      } finally {
        setCargandoClientes(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [buscandoCliente, terminoCliente, esCCF, puedeVerClientes]);

  const elegirCliente = (c) => {
    if (onSeleccionarCliente) onSeleccionarCliente(c);
    setBuscandoCliente(false);
    setTerminoCliente('');
    buscarRef.current?.focus();
  };

  const abrirModalNuevoCliente = () => {
    setFormCliente({
      ...FORM_CLIENTE_INICIAL,
      nombre_razon_social: terminoCliente.trim(),
    });
    setErrorCliente('');
    setModalNuevoCliente(true);
  };

  const handleCambioFormCliente = (e) => {
    const { name, value } = e.target;

    if (name === 'tipo_documento') {
      setFormCliente((prev) => ({ ...prev, tipo_documento: value, num_documento: '' }));
      return;
    }

    if (name === 'num_documento') {
      let limpio = value;
      if (formCliente.tipo_documento === 'DUI') {
        limpio = formatearPorMascara(value, [8, 1]);
      } else if (formCliente.tipo_documento === 'NIT') {
        const soloDigitos = value.replace(/\D/g, '');
        limpio =
          soloDigitos.length <= 9
            ? formatearPorMascara(soloDigitos, [8, 1])
            : formatearPorMascara(soloDigitos, [4, 6, 3, 1]);
      } else if (formCliente.tipo_documento === 'PASAPORTE') {
        limpio = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
      }
      setFormCliente((prev) => ({ ...prev, num_documento: limpio }));
      return;
    }

    if (name === 'nrc') {
      setFormCliente((prev) => ({ ...prev, nrc: formatearNrc(value) }));
      return;
    }

    if (name === 'telefono') {
      setFormCliente((prev) => ({ ...prev, telefono: formatearPorMascara(value, [4, 4]) }));
      return;
    }

    setFormCliente((prev) => ({ ...prev, [name]: value }));
  };

  const reglaDocActual = REGLAS_DOCUMENTO[formCliente.tipo_documento] ?? null;

  const handleGuardarNuevoCliente = async (e) => {
    e.preventDefault();
    setErrorCliente('');

    const nombreTrim = formCliente.nombre_razon_social.trim();
    const docTrim = formCliente.num_documento.trim();
    const nrcTrim = formCliente.nrc.trim();
    const giroTrim = formCliente.giro_economico.trim();
    const telTrim = formCliente.telefono.trim();
    const emailTrim = formCliente.email.trim();

    if (nombreTrim.length < 2) {
      const msg = 'El nombre o razón social debe tener al menos 2 caracteres.';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (docTrim && !formCliente.tipo_documento) {
      const msg = 'Selecciona el tipo de documento (DUI, NIT o Pasaporte).';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (formCliente.tipo_documento && !docTrim) {
      const msg = `Ingresa el número de ${formCliente.tipo_documento}.`;
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (reglaDocActual && docTrim && !reglaDocActual.regex.test(docTrim)) {
      const msg = `Formato inválido para ${formCliente.tipo_documento} (ej. ${reglaDocActual.placeholder}).`;
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (esCCF && (!nrcTrim || !giroTrim)) {
      const msg = 'Para emitir Crédito Fiscal (CCF), tanto el NRC como el Giro Económico son obligatorios.';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if ((nrcTrim && !giroTrim) || (!nrcTrim && giroTrim)) {
      const msg = 'Si ingresas datos fiscales CCF, debes completar tanto el NRC como el Giro Económico.';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (nrcTrim && !REGEX_NRC.test(nrcTrim)) {
      const msg = 'NRC inválido: debe tener de 2 a 8 dígitos, guion y dígito verificador (ej. 123456-7).';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (telTrim && !REGEX_TELEFONO_SV.test(telTrim)) {
      const msg = 'Teléfono inválido: debe tener 8 dígitos de El Salvador iniciando con 2, 6 o 7.';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }
    if (emailTrim && !REGEX_EMAIL.test(emailTrim)) {
      const msg = 'El correo electrónico no tiene un formato válido.';
      setErrorCliente(msg);
      notificar.advertencia('Validación requerida', { mensaje: msg });
      return;
    }

    const payload = {
      nombre_razon_social: nombreTrim,
      tipo_documento: formCliente.tipo_documento || null,
      num_documento: docTrim || null,
      nrc: nrcTrim || null,
      giro_economico: giroTrim || null,
      direccion: formCliente.direccion.trim() || null,
      telefono: telTrim || null,
      email: emailTrim || null,
    };

    setGuardandoCliente(true);
    try {
      const creado = await crearCliente(payload);
      const clienteAfiliado = creado?.cliente ?? creado ?? { id_cliente: Date.now(), ...payload };
      elegirCliente(clienteAfiliado);
      setModalNuevoCliente(false);
      setFormCliente(FORM_CLIENTE_INICIAL);
      notificar.exito('Cliente registrado y afiliado', { mensaje: clienteAfiliado.nombre_razon_social });
    } catch (err) {
      notificarError(err);
    } finally {
      setGuardandoCliente(false);
    }
  };

  return (
    <aside id="pedido-actual" className="flex h-auto flex-col gap-3 scroll-mt-20 rounded-lg border border-line bg-surface p-4 shadow-xs lg:h-full lg:min-h-0 lg:gap-2" aria-label="Pedido actual">
      <header className="relative shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body font-semibold">Pedido actual · <span aria-live="polite" aria-atomic="true">{unidades} {unidades === 1 ? 'producto' : 'productos'}</span></h2>
          {items.length > 0 && <Button variante="ghost" tamano="sm" className="h-control-sm shrink-0 !px-2 text-label-sm" onClick={onVaciar}>Vaciar</Button>}
        </div>
        {tipos.length < 2 ? <p className="text-label-sm text-fg-muted">Documento: {tipos[0].texto}</p> : (
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Tipo de documento">
            {tipos.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={tipoDocumento === t.valor} onClick={() => onTipoDocumento(t.valor)}
                className={`h-control-sm rounded-md px-2 text-label-sm font-medium ${tipoDocumento === t.valor ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
                {t.texto}
              </button>
            ))}
          </div>
        )}

        {/* Afiliación de cliente (Opcional para FCF / Cliente Premium, Obligatorio con NRC para CCF) */}
        <div ref={clienteFilaRef} className="relative flex min-w-0 items-center gap-1.5 text-label-sm">
          <span className="shrink-0 text-fg-muted">Cliente:</span>
          <span className="min-w-0 flex-1 truncate font-medium text-fg" title={clienteSeleccionado?.nombre_razon_social || undefined}>
            {clienteSeleccionado?.nombre_razon_social || 'Consumidor final'}
          </span>
          {clienteSeleccionado && <button type="button" onClick={() => onSeleccionarCliente?.(null)} className="btn-ghost h-control-sm !px-1.5 text-label-sm text-danger" aria-label="Quitar cliente"><X size={14} /> Quitar</button>}
          {puedeCrearClientes && !clienteSeleccionado && <button type="button" onClick={abrirModalNuevoCliente} className="btn-ghost h-control-sm !px-1.5 text-label-sm"><UserPlus size={14} /> Nuevo</button>}
          {puedeVerClientes && <button
            ref={buscarRef}
            type="button"
            aria-expanded={buscandoCliente}
            onClick={() => setBuscandoCliente((prev) => !prev)}
            className="btn-ghost h-control-sm !px-1.5 text-label-sm text-primary-text"
          ><Search size={14} /> Buscar</button>}

          {buscandoCliente && (
            <div className="absolute right-0 top-full z-20 mt-1 w-full rounded-md border border-line bg-surface p-2 shadow-md" role="dialog" aria-label="Buscar cliente">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  ref={entradaBusquedaRef}
                  type="text"
                  value={terminoCliente}
                  onChange={(e) => setTerminoCliente(e.target.value)}
                  placeholder={esCCF ? 'Buscar por nombre, NIT o NRC...' : 'Buscar cliente por nombre, DUI o NIT...'}
                  className="input h-control-sm w-full pl-8 pr-2 text-body-sm"
                />
              </div>
              <div className="scroll-fino mt-1 max-h-56 divide-y divide-line overflow-y-auto rounded-md border border-line bg-surface">
                {cargandoClientes ? (
                  <p className="p-2 text-center text-label-sm text-fg-muted">Buscando clientes...</p>
                ) : resultadosCliente.length === 0 ? (
                  <div className="space-y-1.5 p-2.5 text-center">
                    <p className="text-label-sm text-fg-muted">
                      No se encontraron clientes registrados.
                    </p>
                    {puedeCrearClientes && (
                      <button
                        type="button"
                        onClick={abrirModalNuevoCliente}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-label-sm font-semibold text-primary-text hover:opacity-90"
                      >
                        <UserPlus size={14} /> Registrar y afiliar ahora
                      </button>
                    )}
                  </div>
                ) : (
                  resultadosCliente.map((c) => (
                    <button
                      key={c.id_cliente}
                      type="button"
                      onClick={() => elegirCliente(c)}
                      className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-body-sm hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{c.nombre_razon_social}</p>
                        <p className="truncate text-label-sm text-fg-muted">
                          {c.nrc ? `NRC: ${c.nrc}` : c.num_documento ? `${c.tipo_documento}: ${c.num_documento}` : 'Cliente afiliado'}
                        </p>
                      </div>
                      <UserCheck size={14} className="shrink-0 text-primary-text" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {esCCF && bloqueoPorCCF && <p id="pos-ccf-bloqueo" className="sr-only">Selecciona un cliente con NRC y giro económico para cobrar con crédito fiscal.</p>}
      <div className="min-h-32 flex-1 overflow-hidden rounded-md border border-line bg-surface lg:min-h-0">
        <div className="scroll-fino h-full min-h-32 overflow-y-auto px-3 [scrollbar-gutter:stable] lg:min-h-0">
          {items.length === 0 ? (
            <div className="flex min-h-32 h-full flex-col items-center justify-center gap-2 text-center text-body-sm text-fg-muted">
              <ReceiptText size={26} aria-hidden="true" />
              <div><p className="font-medium text-fg">Tu pedido está vacío</p><p>Toca un producto del menú para agregarlo.</p></div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li ref={(elemento) => elemento ? filasRef.current.set(i.id_producto, elemento) : filasRef.current.delete(i.id_producto)} key={i.id_producto} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="line-clamp-2 text-label text-fg">{i.nombre}</p>
                    <p className="text-label-sm tabular-nums text-fg-muted">{formatoMoneda(i.precio)} c/u</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1">
                      <BotonIcono icono={Minus} className="size-control-sm justify-center" etiqueta={`Quitar una unidad de ${i.nombre}`}
                        onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad - 1 })} />
                      <span className="w-6 text-center text-body-sm font-semibold tabular-nums" aria-live="polite">{i.cantidad}</span>
                      <BotonIcono icono={Plus} className="size-control-sm justify-center" etiqueta={`Agregar una unidad de ${i.nombre}`} disabled={i.cantidad >= i.stock}
                        onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad + 1 })} />
                    </div>
                    <p className="w-16 text-right text-body-sm font-semibold tabular-nums">{formatoMoneda(i.precio * i.cantidad)}</p>
                    <BotonIcono icono={ICONOS.eliminar} tono="peligro" className="size-control-sm justify-center" etiqueta={`Eliminar ${i.nombre}`}
                      onClick={() => dispatch({ tipo: 'quitar', id: i.id_producto })} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-line pt-2">
        <dl className="space-y-0.5 text-body-sm tabular-nums">
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd>{formatoMoneda(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">IVA ({IVA * 100}%)</dt><dd>{formatoMoneda(iva)}</dd></div>
          <div className="flex items-end justify-between border-t border-line pt-1"><dt className="text-label text-fg">Total</dt><dd className="text-kpi text-fg">{formatoMoneda(total)}</dd></div>
        </dl>
        <Button tamano="lg" className="mt-2 w-full" disabled={!items.length || bloqueoPorCCF} aria-describedby={bloqueoPorCCF ? 'pos-ccf-bloqueo' : undefined} onClick={onCobrar}>{textoCobro}</Button>
      </footer>

      {/* Modal rápido de registro y afiliación de cliente */}
      {modalNuevoCliente && (
        <Dialogo
          onCerrar={() => !guardandoCliente && setModalNuevoCliente(false)}
          tamano="lg"
          labelledBy="titulo-afiliar-cliente-pos"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-widest text-primary-text">
                Operación · Punto de venta
              </p>
              <h2 id="titulo-afiliar-cliente-pos" className="mt-1 text-xl font-semibold text-fg">
                Registrar y afiliar cliente al pedido
              </h2>
            </div>
            <BotonIcono icono={ICONOS.cerrar} etiqueta="Cerrar modal" onClick={() => setModalNuevoCliente(false)} />
          </div>

          <form onSubmit={handleGuardarNuevoCliente} className="space-y-4 p-5">
            {errorCliente && <BannerError error={{ titulo: 'No se pudo registrar el cliente', mensaje: errorCliente, accion: '' }} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                  <label className="mb-1 block text-label-sm font-semibold text-fg">
                  Nombre o Razón Social <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="nombre_razon_social"
                  required
                  maxLength={150}
                  value={formCliente.nombre_razon_social}
                  onChange={handleCambioFormCliente}
                  placeholder="Ej. Inversiones Café S.A. de C.V."
                  className="input h-10 w-full"
                />
              </div>

              <div>
                <label htmlFor="pos-cliente-tipo-documento" className="mb-1 block text-label-sm font-semibold text-fg">Tipo de documento</label>
                <Select
                  id="pos-cliente-tipo-documento"
                  name="tipo_documento"
                  value={formCliente.tipo_documento}
                  onChange={handleCambioFormCliente}
                  opciones={[
                    { valor: '', texto: 'Ninguno' },
                    { valor: 'DUI', texto: 'DUI (El Salvador)' },
                    { valor: 'NIT', texto: 'NIT / DUI Homologado' },
                    { valor: 'PASAPORTE', texto: 'Pasaporte' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-label-sm font-semibold text-fg">Número de documento</label>
                <input
                  type="text"
                  name="num_documento"
                  disabled={!formCliente.tipo_documento}
                  maxLength={reglaDocActual?.maxLength ?? 20}
                  value={formCliente.num_documento}
                  onChange={handleCambioFormCliente}
                  placeholder={reglaDocActual ? `Ej. ${reglaDocActual.placeholder}` : 'Selecciona tipo primero'}
                  className="input h-10 w-full disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="rounded-md border border-line bg-muted p-4 text-center sm:col-span-2">
                <p className="mb-3 text-label-sm font-semibold text-primary-text">
                  Datos fiscales para Crédito Fiscal (CCF) {esCCF ? '— Obligatorios para este comprobante' : '— Opcional'}
                </p>
                <div className="mx-auto grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col items-center">
                    <label className="mb-1.5 block text-label-sm font-medium text-fg">
                      NRC {esCCF && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="text"
                      name="nrc"
                      maxLength={10}
                      value={formCliente.nrc}
                      onChange={handleCambioFormCliente}
                      placeholder="123456-7"
                      className="input h-10 w-full text-center font-mono"
                    />
                    <span className="mt-1 text-label-sm text-fg-muted">2 a 8 dígitos + guion + dígito</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="mb-1.5 block text-label-sm font-medium text-fg">
                      Giro económico {esCCF && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="text"
                      name="giro_economico"
                      maxLength={150}
                      value={formCliente.giro_economico}
                      onChange={handleCambioFormCliente}
                      placeholder="Ej. Servicios de alimentación"
                      className="input h-10 w-full text-center"
                    />
                    <span className="mt-1 text-label-sm text-fg-muted">Actividad registrada en MH</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-label-sm font-semibold text-fg">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  maxLength={9}
                  value={formCliente.telefono}
                  onChange={handleCambioFormCliente}
                  placeholder="2222-0000"
                  className="input h-10 w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-label-sm font-semibold text-fg">Correo electrónico</label>
                <input
                  type="email"
                  name="email"
                  maxLength={120}
                  value={formCliente.email}
                  onChange={handleCambioFormCliente}
                  placeholder="facturacion@empresa.com"
                  className="input h-10 w-full"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-label-sm font-semibold text-fg">Dirección fiscal / entrega</label>
                <input
                  type="text"
                  name="direccion"
                  maxLength={500}
                  value={formCliente.direccion}
                  onChange={handleCambioFormCliente}
                  placeholder="Colonia, calle, municipio..."
                  className="input h-10 w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-line pt-4">
              <Button variante="ghost" disabled={guardandoCliente} onClick={() => setModalNuevoCliente(false)}>
                Cancelar
              </Button>
              <Button type="submit" variante="primary" cargando={guardandoCliente}>
                Guardar y afiliar al pedido
              </Button>
            </div>
          </form>
        </Dialogo>
      )}
    </aside>
  );
}
