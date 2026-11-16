import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  aplicarMascara, completarDecimales, mascaraCodigo, mascaraDecimal, mascaraEntero, mascaraTelefono, mostrarTelefono, validarMascara,
} from '../frontend/src/utils/mascaras.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('máscaras: teléfono 2222-3333, idempotente y respeta valores históricos al mostrar', () => {
  assert.equal(mascaraTelefono('22223333'), '2222-3333');
  assert.equal(mascaraTelefono('2222-3333'), '2222-3333');
  assert.equal(mascaraTelefono('(503) 2222 33334'), '5032-2223');
  assert.equal(mascaraTelefono('222'), '222');
  assert.equal(mostrarTelefono('22223333'), '2222-3333');
  assert.equal(mostrarTelefono('+503 2222'), '+503 2222');
  assert.equal(validarMascara('telefono', '2222-333'), 'El teléfono debe tener 8 dígitos con formato 2222-3333.');
  assert.equal(validarMascara('telefono', ''), '');
  assert.equal(validarMascara('telefono', '2222-3333'), '');
});

test('máscaras: código, enteros y montos sin float', () => {
  assert.equal(mascaraCodigo('m0-01x'), 'M001');
  assert.equal(validarMascara('codigo', 'M01', { requerido: true }), 'El código debe tener 4 letras o números, por ejemplo M001.');
  assert.equal(mascaraEntero('0012a5'), '125');
  assert.equal(mascaraDecimal('1,256'), '1.25');
  assert.equal(mascaraDecimal('.5'), '0.5');
  assert.equal(mascaraDecimal('12.3.4', 2), '12.34');
  assert.equal(completarDecimales('12.5'), '12.50');
  assert.equal(completarDecimales('0.1'), '0.10');
  assert.equal(completarDecimales(''), '');
  assert.equal(aplicarMascara('monto', '9999999999.999'), '9999999999.99');
  assert.equal(validarMascara('correo', 'a@b'), 'Escribe un correo válido, por ejemplo nombre@dominio.com.');
});

test('UI compartida: BotonIcono usa etiqueta como aria-label/title y CustomSelect pinta el menú en un portal', async () => {
  const [boton, select, iconos] = await Promise.all([
    leer('frontend/src/components/ui/BotonIcono.jsx'),
    leer('frontend/src/components/ui/CustomSelect.jsx'),
    leer('frontend/src/config/iconos.js'),
  ]);
  assert.match(boton, /aria-label=\{etiqueta\}/);
  assert.match(boton, /title=\{titulo \?\? etiqueta\}/);
  assert.match(select, /createPortal\(/);
  assert.match(select, /position: 'fixed'/);
  assert.match(select, /e\.stopPropagation\(\)/, 'Escape no debe cerrar el diálogo contenedor');
  assert.match(select, /aria-activedescendant/);
  assert.match(iconos, /editar: Edit3/);
});

test('UI alcance: Seguridad, Sucursales y Dashboard ya no usan <select> nativo ni iconos de acción ad hoc', async () => {
  const paginas = await Promise.all([
    'frontend/src/modules/seguridad/UsuariosPage.jsx',
    'frontend/src/modules/seguridad/RolesPermisosPage.jsx',
    'frontend/src/modules/dashboard/DashboardPage.jsx',
    'frontend/src/modules/empresa/SucursalesPage.jsx',
  ].map(leer));
  for (const codigo of paginas) {
    assert.doesNotMatch(codigo, /<select\b/);
    assert.doesNotMatch(codigo, /<Pencil\b/);
  }
  const sucursales = paginas[3];
  assert.match(sucursales, /AperturaSucursalDialogo/);
  assert.match(sucursales, /if \(!editandoId\) setApertura\(guardada\)/);
});
