import { useState, useEffect, useCallback, useMemo } from 'react';
import { Briefcase, Plus, RefreshCw, X, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { rrhhApi } from '../../api/rrhh.api.js';
import { useAlert } from '../../components/feedback/AlertProvider.jsx';
import BannerError from '../../components/feedback/BannerError.jsx';
import EstadoBadge from '../../components/feedback/EstadoBadge.jsx';
import EstadoVacio from '../../components/feedback/EstadoVacio.jsx';
import EncabezadoPagina from '../../components/display/EncabezadoPagina.jsx';
import Metrica from '../../components/display/Metrica.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { BotonIcono, Button, Card, Select, Spinner, Table } from '../../components/ui/index.js';
import { ICONOS } from '../../config/iconos.js';
import { formatoDinero } from '../../utils/formato.js';
import { mascaraDecimal, completarDecimales, PATRONES } from '../../utils/mascaras.js';

const FORMULARIO_VACIO = {
  nombre: '',
  salarioBase: '365.00',
};

export default function PuestosPage() {
  const { notificar, confirm } = useAlert();

  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [puestoEditando, setPuestoEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [erroresForm, setErroresForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const cargarPuestos = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true);
    else setCargando(true);
    setErrorCarga(null);
    try {
      const data = await rrhhApi.listarPuestos();
      setPuestos(data || []);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudo cargar la lista de puestos.');
    } finally {
      if (silencioso) setActualizando(false);
      else setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPuestos();
  }, [cargarPuestos]);

  const abrirModalCrear = () => {
    setPuestoEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setErroresForm({});
    setErrorModal(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (puesto) => {
    setPuestoEditando(puesto);
    setFormulario({
      nombre: puesto.nombre,
      salarioBase: puesto.salario_base,
    });
    setErroresForm({});
    setErrorModal(null);
    setModalAbierto(true);
  };

  const validarFormulario = () => {
    const errs = {};
    const nom = formulario.nombre.trim();
    if (!nom) errs.nombre = 'El nombre del puesto es obligatorio.';
    else if (nom.length < 2) errs.nombre = 'Debe tener al menos 2 caracteres.';
    else if (nom.length > 50) errs.nombre = 'Máximo 50 caracteres.';

    const sal = String(formulario.salarioBase).trim();
    if (!sal) errs.salarioBase = 'El salario base es obligatorio.';
    else if (!PATRONES.monto.test(sal) || Number(sal) <= 0) {
      errs.salarioBase = 'Debe ser un número mayor a cero (ej: 365.00).';
    }

    setErroresForm(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setGuardando(true);
    setErrorModal(null);

    const payload = {
      nombre: formulario.nombre.trim(),
      salarioBase: completarDecimales(formulario.salarioBase),
    };

    try {
      if (puestoEditando) {
        await rrhhApi.actualizarPuesto(puestoEditando.id_puesto, payload);
        notificar.exito('Puesto actualizado correctamente');
      } else {
        await rrhhApi.crearPuesto(payload);
        notificar.exito('Puesto creado exitosamente');
      }
      setModalAbierto(false);
      await cargarPuestos(true);
    } catch (err) {
      setErrorModal(err.message || 'No se pudo guardar el puesto.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (puesto) => {
    const accion = puesto.activo ? 'desactivar' : 'activar';
    const seguro = await confirm(
      `¿Deseas ${accion} el puesto «${puesto.nombre}»? ${
        puesto.activo ? 'Los empleados asignados no podrán recibir nuevos contratos.' : ''
      }`,
      {
        titulo: `${puesto.activo ? 'Desactivar' : 'Activar'} puesto`,
        destructivo: puesto.activo,
        etiquetaAceptar: puesto.activo ? 'Sí, desactivar' : 'Sí, activar',
      }
    );

    if (!seguro) return;

    try {
      if (puesto.activo) {
        await rrhhApi.desactivarPuesto(puesto.id_puesto);
        notificar.exito(`Puesto «${puesto.nombre}» desactivado`);
      } else {
        await rrhhApi.activarPuesto(puesto.id_puesto);
        notificar.exito(`Puesto «${puesto.nombre}» activado`);
      }
      await cargarPuestos(true);
    } catch (err) {
      notificar.error(err.message || `No se pudo ${accion} el puesto.`);
    }
  };

  // Filtrado
  const puestosFiltrados = useMemo(() => {
    return puestos.filter((p) => {
      const coincideTexto = !filtroTexto || p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      const coincideEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVOS' && p.activo) ||
        (filtroEstado === 'INACTIVOS' && !p.activo);
      return coincideTexto && coincideEstado;
    });
  }, [puestos, filtroTexto, filtroEstado]);

  // Métricas
  const metricas = useMemo(() => {
    const total = puestos.length;
    const activos = puestos.filter((p) => p.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [puestos]);

  const columnas = useMemo(
    () => [
      {
        clave: 'nombre',
        titulo: 'Puesto / Cargo',
        render: (p) => (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-text">
              <Briefcase size={16} aria-hidden="true" />
            </span>
            <span className="font-semibold text-fg">{p.nombre}</span>
          </div>
        ),
      },
      {
        clave: 'salario_base',
        titulo: 'Salario Base (Mensual)',
        alinear: 'right',
        render: (p) => (
          <span className="font-medium text-fg">{formatoDinero(p.salario_base)}</span>
        ),
      },
      {
        clave: 'activo',
        titulo: 'Estado',
        render: (p) => (
          <EstadoBadge tipo={p.activo ? 'exito' : 'inactivo'}>
            {p.activo ? 'Activo' : 'Inactivo'}
          </EstadoBadge>
        ),
      },
      {
        clave: 'acciones',
        titulo: 'Acciones',
        alinear: 'right',
        render: (p) => (
          <div className="flex items-center justify-end gap-1.5">
            <BotonIcono
              icono={ICONOS.editar}
              etiqueta={`Editar puesto ${p.nombre}`}
              titulo="Editar"
              onClick={() => abrirModalEditar(p)}
            />
            {p.activo ? (
              <BotonIcono
                icono={ICONOS.desactivar}
                tono="aviso"
                etiqueta={`Desactivar puesto ${p.nombre}`}
                titulo="Desactivar"
                onClick={() => toggleEstado(p)}
              />
            ) : (
              <BotonIcono
                icono={ICONOS.activar}
                tono="exito"
                etiqueta={`Activar puesto ${p.nombre}`}
                titulo="Activar"
                onClick={() => toggleEstado(p)}
              />
            )}
          </div>
        ),
      },
    ],
    []
  );

  if (cargando) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-sm text-fg-muted">Cargando catálogo de puestos…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Gestión · RR. HH."
        titulo="Puestos de trabajo"
        descripcion="Catálogo de cargos laborales y salarios base de referencia para el personal de la empresa."
        acciones={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variante="ghost"
              onClick={() => cargarPuestos(true)}
              cargando={actualizando}
              icono={RefreshCw}
              aria-label="Actualizar lista de puestos"
            >
              Actualizar
            </Button>
            <Button variante="primary" onClick={abrirModalCrear} icono={Plus}>
              Nuevo puesto
            </Button>
          </div>
        }
      />

      {errorCarga && (
        <BannerError
          error={{ titulo: 'Error al cargar puestos', mensaje: errorCarga }}
          onReintentar={() => cargarPuestos(false)}
        />
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metrica
          icono={Briefcase}
          etiqueta="Total de puestos"
          valor={metricas.total}
          tono="primario"
        />
        <Metrica
          icono={CheckCircle2}
          etiqueta="Puestos activos"
          valor={metricas.activos}
          tono="exito"
        />
        <Metrica
          icono={AlertCircle}
          etiqueta="Puestos inactivos"
          valor={metricas.inactivos}
          tono="aviso"
        />
      </div>

      {/* Contenido principal */}
      <Card sinPadding>
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre de puesto…"
              className="input w-full text-xs"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              opciones={[
                { valor: 'TODOS', texto: 'Todos los estados' },
                { valor: 'ACTIVOS', texto: 'Solo activos' },
                { valor: 'INACTIVOS', texto: 'Solo inactivos' },
              ]}
              tamano="sm"
            />
          </div>
        </div>

        {/* Tabla */}
        <Table
          columnas={columnas}
          filas={puestosFiltrados}
          idFila="id_puesto"
          vacio={
            <EstadoVacio
              icono={Briefcase}
              mensaje="No se encontraron puestos"
              descripcion={
                filtroTexto || filtroEstado !== 'TODOS'
                  ? 'Intenta ajustar los filtros de búsqueda.'
                  : 'Registra el primer puesto laboral de la empresa.'
              }
            />
          }
        />
      </Card>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <Dialogo
          onCerrar={() => setModalAbierto(false)}
          tamano="md"
          labelledBy="modal-puesto-titulo"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-text">
                Gestión · RR. HH.
              </p>
              <h2 id="modal-puesto-titulo" className="mt-1 text-xl font-semibold text-fg">
                {puestoEditando ? 'Editar puesto' : 'Nuevo puesto de trabajo'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Cerrar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {errorModal && (
            <div className="p-4 pb-0">
              <BannerError error={{ titulo: 'No se pudo guardar el puesto', mensaje: errorModal }} />
            </div>
          )}

          <form onSubmit={handleGuardar} className="space-y-4 p-5">
            <div>
              <label htmlFor="puesto-nombre" className="block text-sm font-medium text-fg">
                Nombre del puesto <span className="text-danger">*</span>
              </label>
              <input
                id="puesto-nombre"
                type="text"
                value={formulario.nombre}
                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                placeholder="Ej: Barista, Cajero, Administrador"
                maxLength={50}
                className={`input mt-1.5 w-full ${erroresForm.nombre ? 'border-danger' : ''}`}
                required
              />
              {erroresForm.nombre && (
                <p className="mt-1 text-xs text-danger">{erroresForm.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="puesto-salario" className="block text-sm font-medium text-fg">
                Salario base mensual ($) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
                  $
                </span>
                <input
                  id="puesto-salario"
                  type="text"
                  inputMode="decimal"
                  value={formulario.salarioBase}
                  onChange={(e) =>
                    setFormulario({ ...formulario, salarioBase: mascaraDecimal(e.target.value, 2) })
                  }
                  placeholder="365.00"
                  className={`input w-full pl-8 ${erroresForm.salarioBase ? 'border-danger' : ''}`}
                  required
                />
              </div>
              {erroresForm.salarioBase ? (
                <p className="mt-1 text-xs text-danger">{erroresForm.salarioBase}</p>
              ) : (
                <p className="mt-1 text-xs text-fg-muted">
                  Salario base de referencia conforme a ley o política de la empresa.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button
                variante="ghost"
                type="button"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button variante="primary" type="submit" cargando={guardando}>
                {puestoEditando ? 'Guardar cambios' : 'Crear puesto'}
              </Button>
            </div>
          </form>
        </Dialogo>
      )}
    </div>
  );
}
