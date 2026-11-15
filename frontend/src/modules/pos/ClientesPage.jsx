import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Pencil, Trash2, Building2, UserCheck, X, Info } from 'lucide-react';
import Dialogo from '../../components/Dialogo.jsx';
import { Button } from '../../components/ui/index.js';
import { listarClientes, crearCliente, actualizarCliente, eliminarCliente } from './posApi.js';

const FORM_INICIAL = {
  nombre_razon_social: '',
  tipo_documento: '',
  num_documento: '',
  nrc: '',
  giro_economico: '',
  direccion: '',
  email: '',
  telefono: '',
};

const REGLAS_DOCUMENTO = {
  DUI: {
    regex: /^\d{8}-\d$/,
    placeholder: '00000000-0',
    maxLength: 10,
    ayuda: 'DUI El Salvador: 9 dígitos con guion antes del verificador (ej. 01234567-8).',
  },
  NIT: {
    regex: /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/,
    placeholder: '0614-290190-101-2 o 01234567-8',
    maxLength: 17,
    ayuda: 'NIT El Salvador: 14 dígitos (0000-000000-000-0) o DUI homologado de 9 dígitos (00000000-0).',
  },
  PASAPORTE: {
    regex: /^[A-Za-z0-9]{6,12}$/,
    placeholder: 'A12345678',
    maxLength: 12,
    ayuda: 'Pasaporte: entre 6 y 12 caracteres alfanuméricos sin espacios ni guiones.',
  },
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

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloCcf, setSoloCcf] = useState(false);

  // Modal de formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal de confirmación de eliminación
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await listarClientes({ q: busqueda, soloCcf });
      setClientes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el catálogo de clientes');
    } finally {
      setCargando(false);
    }
  }, [busqueda, soloCcf]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes();
    }, 250);
    return () => clearTimeout(timer);
  }, [cargarClientes]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_INICIAL);
    setErrorForm('');
    setModalAbierto(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente);
    setForm({
      nombre_razon_social: cliente.nombre_razon_social ?? '',
      tipo_documento: cliente.tipo_documento ?? '',
      num_documento: cliente.num_documento ?? '',
      nrc: cliente.nrc ?? '',
      giro_economico: cliente.giro_economico ?? '',
      direccion: cliente.direccion ?? '',
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'tipo_documento') {
      setForm((prev) => ({ ...prev, tipo_documento: value, num_documento: '' }));
      return;
    }

    if (name === 'num_documento') {
      let limpio = value;
      if (form.tipo_documento === 'DUI') {
        limpio = formatearPorMascara(value, [8, 1]);
      } else if (form.tipo_documento === 'NIT') {
        const soloDigitos = value.replace(/\D/g, '');
        limpio = soloDigitos.length <= 9
          ? formatearPorMascara(soloDigitos, [8, 1])
          : formatearPorMascara(soloDigitos, [4, 6, 3, 1]);
      } else if (form.tipo_documento === 'PASAPORTE') {
        limpio = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
      }
      setForm((prev) => ({ ...prev, num_documento: limpio }));
      return;
    }

    if (name === 'nrc') {
      setForm((prev) => ({ ...prev, nrc: formatearNrc(value) }));
      return;
    }

    if (name === 'telefono') {
      setForm((prev) => ({ ...prev, telefono: formatearPorMascara(value, [4, 4]) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reglaDocActual = REGLAS_DOCUMENTO[form.tipo_documento] ?? null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm('');

    const nombreTrim = form.nombre_razon_social.trim();
    const docTrim = form.num_documento.trim();
    const nrcTrim = form.nrc.trim();
    const giroTrim = form.giro_economico.trim();
    const telTrim = form.telefono.trim();
    const emailTrim = form.email.trim();

    if (nombreTrim.length < 2) {
      setErrorForm('El nombre o razón social debe tener al menos 2 caracteres.');
      return;
    }
    if (docTrim && !form.tipo_documento) {
      setErrorForm('Selecciona el tipo de documento (DUI, NIT o Pasaporte).');
      return;
    }
    if (form.tipo_documento && !docTrim) {
      setErrorForm(`Ingresa el número de ${form.tipo_documento}.`);
      return;
    }
    if (reglaDocActual && docTrim && !reglaDocActual.regex.test(docTrim)) {
      setErrorForm(reglaDocActual.ayuda);
      return;
    }
    if ((nrcTrim && !giroTrim) || (!nrcTrim && giroTrim)) {
      setErrorForm('Para contribuyentes CCF, tanto el NRC como el Giro Económico son obligatorios.');
      return;
    }
    if (nrcTrim && !REGEX_NRC.test(nrcTrim)) {
      setErrorForm('NRC inválido para El Salvador: debe tener de 2 a 8 dígitos, guion y 1 dígito verificador (ej. 123456-7).');
      return;
    }
    if (telTrim && !REGEX_TELEFONO_SV.test(telTrim)) {
      setErrorForm('Teléfono inválido: debe contener 8 dígitos de El Salvador iniciando con 2, 6 o 7 (ej. 2222-0000 o 70001234).');
      return;
    }
    if (emailTrim && !REGEX_EMAIL.test(emailTrim)) {
      setErrorForm('El correo electrónico no tiene un formato válido (ej. cliente@dominio.com).');
      return;
    }

    const payload = {
      nombre_razon_social: nombreTrim,
      tipo_documento: form.tipo_documento || null,
      num_documento: docTrim || null,
      nrc: nrcTrim || null,
      giro_economico: giroTrim || null,
      direccion: form.direccion.trim() || null,
      email: emailTrim || null,
      telefono: telTrim || null,
    };

    setGuardando(true);
    try {
      if (editando) {
        await actualizarCliente(editando.id_cliente, payload);
      } else {
        await crearCliente(payload);
      }
      setModalAbierto(false);
      await cargarClientes();
    } catch (err) {
      setErrorForm(err.message || 'Ocurrió un error al guardar el cliente');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;
    setEliminando(true);
    try {
      await eliminarCliente(clienteAEliminar.id_cliente);
      setClienteAEliminar(null);
      await cargarClientes();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el cliente');
      setClienteAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
            Operación · POS
          </p>
          <h1 className="mt-1 text-2xl font-bold text-fg">Clientes y Contribuyentes</h1>
          <p className="text-sm text-fg-muted">
            Registro de clientes para Factura Consumidor Final (FCF) y Crédito Fiscal (CCF).
          </p>
        </div>
        <Button variante="primary" onClick={abrirNuevo} icono={UserPlus}>
          Nuevo cliente
        </Button>
      </div>

      {/* Barra de búsqueda y filtro */}
      <div className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, razón social, DUI, NIT o NRC..."
            className="input w-full pl-9"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={soloCcf}
            onChange={(e) => setSoloCcf(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-primary"
          />
          Solo contribuyentes CCF (con NRC)
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Tabla con los colores exactos del sistema (bg-surface, bg-muted, border-line, text-fg) */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="px-4 py-3">Nombre / Razón social</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Tipo fiscal</th>
                <th className="px-4 py-3">NRC / Giro</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                    No se encontraron clientes con los criterios actuales.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const esContribuyente = Boolean(c.nrc && c.giro_economico);
                  return (
                    <tr key={c.id_cliente} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-fg">
                        {c.nombre_razon_social}
                        {c.direccion && (
                          <div className="text-xs font-normal text-fg-muted">{c.direccion}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fg">
                        {c.num_documento ? `${c.tipo_documento}: ${c.num_documento}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {esContribuyente ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-text">
                            <Building2 className="h-3 w-3" /> Apto CCF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                            <UserCheck className="h-3 w-3" /> Consumidor Final
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fg">
                        {esContribuyente ? (
                          <div>
                            <span className="font-mono font-semibold">{c.nrc}</span>
                            <div className="text-xs text-fg-muted">{c.giro_economico}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        <div>{c.telefono || 'Sin teléfono'}</div>
                        <div>{c.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(c)}
                            title="Editar cliente"
                            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-primary-text"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setClienteAEliminar(c)}
                            title="Eliminar cliente"
                            className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <Dialogo onCerrar={() => !guardando && setModalAbierto(false)} tamano="lg" labelledBy="titulo-modal-cliente">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Catálogo · Clientes
              </p>
              <h2 id="titulo-modal-cliente" className="mt-1 text-xl font-semibold text-fg">
                {editando ? 'Editar cliente' : 'Registrar nuevo cliente'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            {errorForm && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                {errorForm}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="group sm:col-span-2">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Nombre o Razón Social <span className="text-danger">*</span></span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Info className="h-3 w-3" /> Mín. 2 caracteres (nombre legal o comercial)
                  </span>
                </label>
                <input
                  type="text"
                  name="nombre_razon_social"
                  required
                  maxLength={150}
                  title="Nombre completo de persona natural o razón social de empresa (2 a 150 caracteres)."
                  value={form.nombre_razon_social}
                  onChange={handleChange}
                  placeholder="Ej. Inversiones Café S.A. de C.V."
                  className="input w-full"
                />
              </div>

              <div className="group">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Tipo de documento</span>
                  <span className="text-[11px] font-normal text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    DUI, NIT o Pasaporte
                  </span>
                </label>
                <select
                  name="tipo_documento"
                  title="Selecciona el tipo de identificación oficial en El Salvador."
                  value={form.tipo_documento}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Ninguno</option>
                  <option value="DUI">DUI (El Salvador)</option>
                  <option value="NIT">NIT / DUI Homologado</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <div className="group">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Número de documento</span>
                  <span className="text-[11px] font-normal text-primary-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {reglaDocActual ? reglaDocActual.placeholder : 'Elige tipo primero'}
                  </span>
                </label>
                <input
                  type="text"
                  name="num_documento"
                  disabled={!form.tipo_documento}
                  maxLength={reglaDocActual?.maxLength ?? 20}
                  title={reglaDocActual ? reglaDocActual.ayuda : 'Selecciona primero un tipo de documento.'}
                  value={form.num_documento}
                  onChange={handleChange}
                  placeholder={reglaDocActual ? `Ej. ${reglaDocActual.placeholder}` : 'Selecciona tipo primero'}
                  className="input w-full disabled:cursor-not-allowed disabled:opacity-50"
                />
                {reglaDocActual && (
                  <p className="mt-1 hidden text-[11px] text-fg-muted group-hover:block group-focus-within:block">
                    {reglaDocActual.ayuda}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-line bg-muted/40 p-3.5 sm:col-span-2">
                <p className="mb-2.5 text-xs font-semibold text-primary-text">
                  Datos fiscales para Crédito Fiscal (CCF) — Obligatorios ambos si emite CCF
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="group">
                    <label className="mb-1 flex items-center justify-between text-xs font-medium text-fg">
                      <span>NRC</span>
                      <span className="text-[11px] text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        2 a 8 dígitos + guion + 1 dígito
                      </span>
                    </label>
                    <input
                      type="text"
                      name="nrc"
                      maxLength={10}
                      title="Número de Registro de Contribuyente (Ministerio de Hacienda SV): de 2 a 8 dígitos, guion y dígito verificador (ej. 123456-7)."
                      value={form.nrc}
                      onChange={handleChange}
                      placeholder="123456-7"
                      className="input w-full"
                    />
                  </div>
                  <div className="group">
                    <label className="mb-1 flex items-center justify-between text-xs font-medium text-fg">
                      <span>Giro económico</span>
                      <span className="text-[11px] text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        Actividad registrada en MH
                      </span>
                    </label>
                    <input
                      type="text"
                      name="giro_economico"
                      maxLength={150}
                      title="Actividad económica principal registrada en Hacienda (obligatorio junto con el NRC)."
                      value={form.giro_economico}
                      onChange={handleChange}
                      placeholder="Ej. Servicios de alimentación"
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Teléfono</span>
                  <span className="text-[11px] font-normal text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    8 dígitos SV (inicia 2, 6 o 7)
                  </span>
                </label>
                <input
                  type="text"
                  name="telefono"
                  maxLength={9}
                  title="Teléfono de El Salvador: 8 dígitos iniciando con 2, 6 o 7 (ej. 2222-0000 o 70001234)."
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="2222-0000"
                  className="input w-full"
                />
              </div>

              <div className="group">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Correo electrónico</span>
                  <span className="text-[11px] font-normal text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Para envío de DTE
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  maxLength={120}
                  title="Dirección de correo electrónico válida para entrega de comprobante DTE (ej. facturacion@empresa.com)."
                  value={form.email}
                  onChange={handleChange}
                  placeholder="facturacion@empresa.com"
                  className="input w-full"
                />
              </div>

              <div className="group sm:col-span-2">
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Dirección fiscal / entrega</span>
                  <span className="text-[11px] font-normal text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Departamento, municipio y calle
                  </span>
                </label>
                <input
                  type="text"
                  name="direccion"
                  maxLength={500}
                  title="Dirección física o fiscal del cliente (departamento, municipio, colonia o calle)."
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Colonia, calle, municipio..."
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-line pt-4">
              <Button variante="ghost" disabled={guardando} onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" variante="primary" cargando={guardando}>
                {editando ? 'Guardar cambios' : 'Registrar cliente'}
              </Button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* Modal Confirmar Eliminación */}
      {clienteAEliminar && (
        <Dialogo rol="alertdialog" tamano="sm" onCerrar={() => !eliminando && setClienteAEliminar(null)}>
          <div className="space-y-4 p-6">
            <h3 className="text-lg font-bold text-fg">Eliminar cliente</h3>
            <p className="text-sm text-fg-muted">
              ¿Estás seguro de eliminar a <strong className="text-fg">{clienteAEliminar.nombre_razon_social}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button variante="ghost" disabled={eliminando} onClick={() => setClienteAEliminar(null)}>
                Cancelar
              </Button>
              <Button variante="danger" cargando={eliminando} onClick={confirmarEliminacion}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}