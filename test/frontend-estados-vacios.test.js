// test/frontend-estados-vacios.test.js
// Verifica que ningún <EstadoVacio> en frontend/src/**/*.jsx use mensaje= ni descripcion=
// y que todos incluyan la prop titulo=.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const dirFrontend = join(raiz, 'frontend', 'src');

async function obtenerArchivosJsx(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const rutaCompleta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivos.push(...await obtenerArchivosJsx(rutaCompleta));
    } else if (entrada.isFile() && entrada.name.endsWith('.jsx')) {
      archivos.push(rutaCompleta);
    }
  }
  return archivos;
}

test('EstadoVacio: en desarrollo advierte con console.warn si falta titulo', async () => {
  const fuente = await readFile(join(dirFrontend, 'components', 'feedback', 'EstadoVacio.jsx'), 'utf8');
  assert.match(fuente, /console\.warn\(/, 'EstadoVacio debe llamar a console.warn si falta titulo');
  assert.match(fuente, /!titulo/, 'debe comprobar la ausencia de titulo');
});

test('EstadoVacio: ningún archivo usa mensaje= ni descripcion= y todos tienen titulo=', async () => {
  const archivos = await obtenerArchivosJsx(dirFrontend);
  const regexEstadoVacio = /<EstadoVacio\b([\s\S]*?)(?:\/?>|>)/g;
  const fallos = [];

  for (const archivo of archivos) {
    if (archivo.endsWith('EstadoVacio.jsx')) continue; // Excluir la definición del componente
    const contenido = await readFile(archivo, 'utf8');
    if (!contenido.includes('<EstadoVacio')) continue;

    let match;
    regexEstadoVacio.lastIndex = 0;
    while ((match = regexEstadoVacio.exec(contenido)) !== null) {
      const props = match[1];
      const rutaRelativa = archivo.replace(raiz, '').replace(/^[\\/]/, '');

      if (/\bmensaje\s*=/.test(props)) {
        fallos.push(`${rutaRelativa}: usa mensaje= en vez de titulo=`);
      }
      if (/\bdescripcion\s*=/.test(props)) {
        fallos.push(`${rutaRelativa}: usa descripcion= en vez de children`);
      }
      if (!/\btitulo\s*=/.test(props)) {
        fallos.push(`${rutaRelativa}: le falta la prop titulo=`);
      }
    }
  }

  assert.deepEqual(fallos, [], `Se encontraron usos incorrectos de EstadoVacio:\n${fallos.join('\n')}`);
});
