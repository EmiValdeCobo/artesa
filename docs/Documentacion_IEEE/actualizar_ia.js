import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../..');
const usoIaPath = path.join(rootDir, 'docs', 'USO_IA.md');
const outputPath = path.join(__dirname, 'secciones', 'ia_tabla_autogenerada.tex');

function escaparLatex(texto) {
  if (!texto) return '';
  return texto
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function generarTablaIa() {
  if (!fs.existsSync(usoIaPath)) {
    console.error(`No se encontró el archivo: ${usoIaPath}`);
    return;
  }

  const contenido = fs.readFileSync(usoIaPath, 'utf-8');
  const lineas = contenido.split(/\r?\n/);
  
  const filas = [];

  for (const linea of lineas) {
    const trimmed = linea.trim();
    if (!trimmed || trimmed.startsWith('Formato:') || trimmed.startsWith('#')) continue;

    const partes = trimmed.split('|').map((p) => p.trim());
    if (partes.length >= 4) {
      const fecha = partes[0] || '';
      const integrante = partes[1] || '';
      const herramienta = partes[2] || '';
      const proposito = partes[3] || '';
      const verificador = partes[partes.length - 1] || 'Equipo';

      // Filtrar fechas no válidas o encabezados
      if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;

      filas.push({
        fecha,
        integrante,
        herramienta,
        proposito: proposito.length > 90 ? proposito.substring(0, 87) + '...' : proposito,
        verificador: verificador.length > 30 ? verificador.substring(0, 27) + '...' : verificador,
      });
    }
  }

  // Tomar las últimas 12 o todas
  const filasSeleccionadas = filas.slice(-12);

  let tex = `% Archivo autogenerado por actualizar_ia.js desde docs/USO_IA.md\n`;
  tex += `% Fecha de actualización: ${new Date().toISOString().split('T')[0]}\n\n`;
  tex += `\\begin{table*}[htbp]\n`;
  tex += `\\caption{Registro Dinámico de Intervenciones con IA (Sincronizado con docs/USO\\_IA.md)}\n`;
  tex += `\\label{tab:registro_ia_dinamico}\n`;
  tex += `\\centering\\scriptsize\n`;
  tex += `\\begin{tabularx}{\\textwidth}{llllXX}\n`;
  tex += `\\toprule\n`;
  tex += `\\textbf{Fecha} & \\textbf{Integrante} & \\textbf{Herramienta} & \\textbf{Propósito / Módulo} & \\textbf{Detalle de la Asistencia} & \\textbf{Verificación Humana} \\\\\n`;
  tex += `\\midrule\n`;

  for (const f of filasSeleccionadas) {
    tex += `${escaparLatex(f.fecha)} & ${escaparLatex(f.integrante)} & ${escaparLatex(f.herramienta)} & ${escaparLatex(f.proposito.split(':')[0])} & ${escaparLatex(f.proposito)} & ${escaparLatex(f.verificador)} \\\\\n`;
  }

  tex += `\\bottomrule\n`;
  tex += `\\end{tabularx}\n`;
  tex += `\\end{table*}\n`;

  fs.writeFileSync(outputPath, tex, 'utf-8');
  console.log(`[OK] Tabla de IA actualizada exitosamente en: ${outputPath}`);
  console.log(`[OK] Total de registros procesados: ${filasSeleccionadas.length}`);
}

generarTablaIa();
