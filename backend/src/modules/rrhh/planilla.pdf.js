// Presentación PDF de planillas y boletas. Los valores recibidos se dibujan sin transformarlos.
// Colores sincronizados con frontend/src/index.css.
const COLORS = {
  alabastro: '0.969 0.961 0.941', blanco: '1 1 1', muted: '0.937 0.922 0.894',
  line: '0.867 0.839 0.796', espresso: '0.196 0.122 0.098', secondary: '0.353 0.310 0.271',
  terracota: '0.694 0.361 0.239', terracotaDark: '0.596 0.290 0.184', ocre: '0.882 0.651 0.318',
};
const limpiar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, '?').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
const pdfText = (x, y, size, texto, font = 'F1', color = COLORS.espresso, align = 'left') => {
  const safe = limpiar(texto); const approx = safe.length * size * 0.48;
  const start = align === 'center' ? x - approx / 2 : align === 'right' ? x - approx : x;
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${start.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET`;
};
const rect = (x, y, width, height, fill, stroke = null, lineWidth = 0.6) => {
  const commands = [`${fill} rg`, `${x} ${y} ${width} ${height} re`, 'f'];
  if (stroke) commands.push(`${lineWidth} w`, `${stroke} RG`, `${x} ${y} ${width} ${height} re`, 'S');
  return commands.join('\n');
};
const line = (x1, y1, x2, y2, color = COLORS.line, width = 0.6) => `${width} w ${color} RG ${x1} ${y1} m ${x2} ${y2} l S`;
const wrap = (texto, max = 42) => {
  const lines = []; let current = '';
  for (const word of String(texto).split(' ')) {
    if (`${current} ${word}`.trim().length > max && current) { lines.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current); return lines;
};

function planillaPage(textos) {
  const comandos = [rect(0, 0, 842, 595, COLORS.alabastro), rect(28, 28, 786, 539, COLORS.blanco, COLORS.line, 1)];
  comandos.push(rect(28, 513, 786, 54, COLORS.espresso));
  comandos.push(pdfText(48, 542, 18, textos[0] ?? 'Planilla mensual', 'F2', COLORS.blanco));
  comandos.push(line(48, 493, 794, 493, COLORS.ocre, 1.2));
  comandos.push(pdfText(48, 475, 9, textos[1] ?? '', 'F2'));
  const encabezado = (textos[2] ?? '').split('|').map((v) => v.trim());
  const filas = textos.slice(3).filter(Boolean).map((texto) => texto.split('|').map((v) => v.trim()));
  const columns = [48, 92, 298, 392, 480, 560, 640, 720, 794]; const top = 450; const headerHeight = 31;
  comandos.push(rect(48, top - headerHeight, 746, headerHeight, COLORS.muted, COLORS.line));
  for (let i = 0; i < encabezado.length; i += 1) {
    const center = (columns[i] + columns[i + 1]) / 2;
    wrap(encabezado[i], Math.max(8, Math.floor((columns[i + 1] - columns[i]) / 5.4))).slice(0, 2)
      .forEach((part, j) => comandos.push(pdfText(center, top - 12 - (j * 9), 7, part, 'F2', COLORS.espresso, 'center')));
  }
  let y = top - headerHeight;
  filas.forEach((fila, row) => {
    const height = 25; y -= height;
    comandos.push(rect(48, y, 746, height, row % 2 ? COLORS.alabastro : COLORS.blanco, COLORS.line));
    fila.forEach((value, i) => {
      const right = columns[i + 1] - 7; const isNumber = i === 0 || i >= 2;
      comandos.push(pdfText(isNumber ? right : columns[i] + 7, y + 9, 7.7, value, i === 0 ? 'F2' : 'F1', COLORS.secondary, isNumber ? 'right' : 'left'));
    });
  });
  comandos.push(rect(48, 45, 746, 20, COLORS.muted, COLORS.line));
  return comandos.join('\n');
}

function boletaPage(textos) {
  const comandos = [rect(0, 0, 595, 842, COLORS.alabastro), rect(30, 30, 535, 782, COLORS.blanco, COLORS.line, 1)];
  comandos.push(rect(30, 720, 535, 92, COLORS.espresso));
  comandos.push(pdfText(297.5, 766, 20, 'Boleta de pago a empleado', 'F2', COLORS.blanco, 'center'));
  comandos.push(rect(30, 680, 535, 40, COLORS.muted));
  comandos.push(pdfText(46, 701, 9, textos[1] ?? '', 'F2'));
  comandos.push(pdfText(46, 687, 8.5, textos[0] ?? '', 'F1', COLORS.secondary));
  comandos.push(line(46, 664, 549, 664, COLORS.terracota, 1.2));
  comandos.push(pdfText(155, 646, 10, 'INGRESOS', 'F2', COLORS.terracotaDark, 'center'));
  comandos.push(pdfText(404, 646, 10, 'RETENCIONES Y DEDUCCIONES', 'F2', COLORS.terracotaDark, 'center'));
  comandos.push(line(46, 635, 549, 635, COLORS.line));
  const campos = textos.slice(2).map((texto) => { const index = texto.indexOf(':'); return index > -1 ? [texto.slice(0, index + 1), texto.slice(index + 1).trim()] : [texto, '']; });
  const neto = campos.at(-1); const detalle = campos.slice(0, -1);
  const left = detalle.filter(([label]) => /^(DUI:|Salario base bruto:|Bonificaciones:)/i.test(label));
  const right = detalle.filter(([label]) => /^(ISSS laboral:|AFP laboral:|Retencion de renta:|Otros descuentos:)/i.test(label));
  const rows = Math.max(left.length, right.length);
  for (let i = 0; i < rows; i += 1) {
    const y = 616 - i * 24; const l = left[i]; const r = right[i];
    if (l) { comandos.push(pdfText(46, y, 8.5, l[0], 'F1', COLORS.secondary)); comandos.push(pdfText(275, y, 8.5, l[1], 'F2', COLORS.espresso, 'right')); }
    if (r) { comandos.push(pdfText(300, y, 8.5, r[0], 'F1', COLORS.secondary)); comandos.push(pdfText(549, y, 8.5, r[1], 'F2', COLORS.espresso, 'right')); }
    comandos.push(line(46, y - 8, 549, y - 8, COLORS.line, 0.35));
  }
  const summaryY = Math.max(170, 616 - rows * 24 - 28);
  comandos.push(rect(46, summaryY, 503, 30, COLORS.muted, COLORS.line));
  comandos.push(pdfText(56, summaryY + 11, 9, neto?.[0] ?? 'Salario liquido:', 'F2'));
  comandos.push(pdfText(549, summaryY + 11, 10, neto?.[1] ?? '', 'F2', COLORS.terracotaDark, 'right'));
  return comandos.join('\n');
}

function genericPage(textos) {
  const comandos = [rect(0, 0, 595, 842, COLORS.alabastro), rect(36, 36, 523, 770, COLORS.blanco, COLORS.line)];
  textos.slice(0, 48).forEach((texto, index) => comandos.push(pdfText(54, 770 - index * 14, 8, texto, index === 0 ? 'F2' : 'F1')));
  return comandos.join('\n');
}

function buildPdf(pages, width, height) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageRefs = [];
  pages.forEach((content, index) => {
    const pageId = 5 + index * 2; const contentId = pageId + 1; pageRefs.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
  let pdf = '%PDF-1.4\n'; const offsets = [];
  objects.forEach((object, index) => { offsets[index] = new TextEncoder().encode(pdf).length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export function generarPdf(textos) {
  const lines = Array.isArray(textos) ? textos : [];
  if (lines[0]?.startsWith('Planilla mensual')) {
    const rows = lines.slice(3);
    const pages = [];
    for (let i = 0; i < rows.length; i += 14) pages.push(planillaPage([...lines.slice(0, 3), ...rows.slice(i, i + 14)]));
    return buildPdf(pages.length ? pages : [planillaPage(lines)], 842, 595);
  }
  if (lines[0]?.startsWith('Boleta de pago')) return buildPdf([boletaPage(lines)], 595, 842);
  const pages = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(genericPage(lines.slice(i, i + 48)));
  return buildPdf(pages.length ? pages : [genericPage([])], 595, 842);
}
