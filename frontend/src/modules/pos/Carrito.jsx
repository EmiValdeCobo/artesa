import { useState, useEffect } from 'react';
import {
  Minus,
  Plus,
  ReceiptText,
  UserCheck,
  Building2,
  Search,
  X,
  Sparkles,
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
    <aside id="pedido-actual" className="card flex h-full max-h-[85dvh] scroll-mt-20 flex-col !p-0 lg:max-h-none" aria-label="Pedido actual">
      <header className="shrink-0 border-b border-line p-4">
        <h2 className="font-semibold">Pedido actual</h2>
        <p className="text-xs text-fg-muted">{unidades} {unidades === 1 ? 'producto' : 'productos'}</p>
        {tipos.length < 2 ? <p className="mt-3 text-xs text-fg-muted">Documento: {tipos[0].texto}</p> : (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de documento">
            {tipos.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={tipoDocumento === t.valor} onClick={() => onTipoDocumento(t.valor)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${tipoDocumento === t.valor ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>
                {t.texto}
              </button>
            ))}
          </div>
        )}

        {/* Afiliación de cliente (Opcional para FCF / Cliente Premium, Obligatorio con NRC para CCF) */}
        <div className="mt-3 rounded-lg border border-line bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-fg">
              {esCCF ? 'Contribuyente CCF *' : 'Cliente afiliado (opcional)'}
            </span>
            {clienteSeleccionado ? (
              <button
                type="button"
                onClick={() => onSeleccionarCliente && onSeleccionarCliente(null)}
                className="inline-flex items-center gap-1 text-[11px] text-danger hover:underline"
              >
                <X size={12} /> Quitar
              </button>
            ) : (
              <div className="inline-flex items-center gap-2.5">
                {puedeCrearClientes && (
                  <button
                    type="button"
                    onClick={abrirModalNuevoCliente}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-text hover:underline"
                  >
                    <UserPlus size={12} /> Nuevo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBuscandoCliente((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-fg hover:underline"
                >
                  <Search size={12} /> {buscandoCliente ? 'Cerrar' : 'Buscar'}
                </button>
              </div>
            )}
          </div>

          {clienteSeleccionado ? (
            <div className="mt-1.5 flex items-start justify-between gap-2 rounded-md border border-line bg-surface p-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate font-semibold text-fg">
                  {clienteSeleccionado.nrc ? <Building2 size={13} className="shrink-0 text-primary-text" /> : <Sparkles size={13} className="shrink-0 text-primary-text" />}
                  {clienteSeleccionado.nombre_razon_social}
                </p>
                <p className="text-[11px] text-fg-muted">
                  {clienteSeleccionado.nrc
                    ? `NRC: ${clienteSeleccionado.nrc} · ${clienteSeleccionado.giro_economico}`
                    : clienteSeleccionado.num_documento
                      ? `${clienteSeleccionado.tipo_documento}: ${clienteSeleccionado.num_documento} · Cliente afiliado`
                      : 'Cliente frecuente / afiliado'}
                </p>
                {esCCF && !clienteValidoParaCCF && (
                  <p className="mt-1 text-[11px] font-medium text-danger">
                    Este cliente no posee NRC ni giro económico para emitir CCF.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBuscandoCliente(true)}
                className="shrink-0 text-[11px] font-medium text-primary-text hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">
              {esCCF
                ? 'Selecciona o registra un cliente con NRC y giro.'
                : 'Sin afiliar: se emitirá como Consumidor Final.'}
            </p>
          )}

          {buscandoCliente && (
            <div className="mt-2 space-y-1.5 border-t border-line pt-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  type="text"
                  value={terminoCliente}
                  onChange={(e) => setTerminoCliente(e.target.value)}
                  placeholder={esCCF ? 'Buscar por nombre, NIT o NRC...' : 'Buscar cliente por nombre, DUI o NIT...'}
                  className="input w-full !py-1.5 pl-7 pr-2 text-xs"
                />
              </div>
              <div className="max-h-36 divide-y divide-line overflow-y-auto rounded-md border border-line bg-surface">
                {cargandoClientes ? (
                  <p className="p-2 text-center text-[11px] text-fg-muted">Buscando clientes...</p>
                ) : resultadosCliente.length === 0 ? (
                  <div className="space-y-1.5 p-2.5 text-center">
                    <p className="text-[11px] text-fg-muted">
                      No se encontraron clientes registrados.
                    </p>
                    {puedeCrearClientes && (
                      <button
                        type="button"
                        onClick={abrirModalNuevoCliente}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-text hover:opacity-90"
                      >
                        <UserPlus size={12} /> Registrar y afiliar ahora
                      </button>
                    )}
                  </div>
                ) : (
                  resultadosCliente.map((c) => (
                    <button
                      key={c.id_cliente}
                      type="button"
                      onClick={() => elegirCliente(c)}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{c.nombre_razon_social}</p>
                        <p className="truncate text-[10px] text-fg-muted">
                          {c.nrc ? `NRC: ${c.nrc}` : c.num_documento ? `${c.tipo_documento}: ${c.num_documento}` : 'Cliente afiliado'}
                        </p>
                      </div>
                      <UserCheck size={13} className="shrink-0 text-primary-text" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto py-4 pl-4 pr-2 [scrollbar-gutter:stable]">
        {items.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-fg-muted">
            <ReceiptText size={26} aria-hidden="true" />
            <p>Toca un producto del catálogo para empezar el pedido.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id_producto} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{i.nombre}</p>
                  <p className="text-xs text-fg-muted">{formatoMoneda(i.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <BotonIcono icono={Minus} className="h-9 w-9 justify-center" etiqueta={`Quitar una unidad de ${i.nombre}`}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad - 1 })} />
                  <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{i.cantidad}</span>
                  <BotonIcono icono={Plus} className="h-9 w-9 justify-center" etiqueta={`Agregar una unidad de ${i.nombre}`} disabled={i.cantidad >= i.stock}
                    onClick={() => dispatch({ tipo: 'cambiarCantidad', id: i.id_producto, cantidad: i.cantidad + 1 })} />
                </div>
                <p className="w-16 text-right text-sm font-semibold">{formatoMoneda(i.precio * i.cantidad)}</p>
                <BotonIcono icono={ICONOS.eliminar} tono="peligro" className="h-9 w-9 justify-center" etiqueta={`Eliminar ${i.nombre}`}
                  onClick={() => dispatch({ tipo: 'quitar', id: i.id_producto })} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="shrink-0 border-t border-line p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd>{formatoMoneda(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">IVA ({IVA * 100}%)</dt><dd>{formatoMoneda(iva)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatoMoneda(total)}</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <Button variante="ghost" disabled={!items.length} onClick={() => dispatch({ tipo: 'vaciar' })}>Vaciar</Button>
          <Button disabled={!items.length || bloqueoPorCCF} onClick={onCobrar}>Cobrar {formatoMoneda(total)}</Button>
        </div>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
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
                <label className="mb-1 block text-xs font-semibold text-fg">
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
                <label htmlFor="pos-cliente-tipo-documento" className="mb-1 block text-xs font-semibold text-fg">Tipo de documento</label>
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
                <label className="mb-1 block text-xs font-semibold text-fg">Número de documento</label>
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

              <div className="rounded-xl border border-line bg-muted/40 p-4 text-center sm:col-span-2">
                <p className="mb-3 text-xs font-semibold text-primary-text">
                  Datos fiscales para Crédito Fiscal (CCF) {esCCF ? '— Obligatorios para este comprobante' : '— Opcional'}
                </p>
                <div className="mx-auto grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col items-center">
                    <label className="mb-1.5 block text-xs font-medium text-fg">
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
                    <span className="mt-1 text-[11px] text-fg-muted">2 a 8 dígitos + guion + dígito</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="mb-1.5 block text-xs font-medium text-fg">
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
                    <span className="mt-1 text-[11px] text-fg-muted">Actividad registrada en MH</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-fg">Teléfono</label>
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
                <label className="mb-1 block text-xs font-semibold text-fg">Correo electrónico</label>
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
                <label className="mb-1 block text-xs font-semibold text-fg">Dirección fiscal / entrega</label>
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