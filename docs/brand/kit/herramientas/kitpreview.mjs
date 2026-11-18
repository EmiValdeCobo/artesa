// Hoja de revisión del kit. Uso: node kitpreview.mjs <carpetaKit>
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const K = resolve(process.argv[2]);
const im = (f, h, extra = '') => `<img src="svg/${f}" style="height:${h}px" ${extra}>`;
const tile = (bg, lbl, inner, cls = '') => `<div class="t ${cls}" style="background:${bg}"><span>${lbl}</span><div class="c">${inner}</div></div>`;
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>artesa · kit de marca</title><style>
body{margin:0;padding:28px;background:#e9e6e0;font:13px/1.4 system-ui,sans-serif;color:#222;width:1424px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:15px;margin:22px 0 8px}
.g{display:grid;gap:10px} .g4{grid-template-columns:repeat(4,1fr)} .g3{grid-template-columns:repeat(3,1fr)} .g5{grid-template-columns:repeat(5,1fr)}
.t{position:relative;border-radius:8px;min-height:170px;display:flex;align-items:center;justify-content:center;padding:28px 12px 12px}
.t>span{position:absolute;top:7px;left:10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.6}
.dark>span{color:#fff}.c{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;justify-content:center}
.px{image-rendering:pixelated;border:1px solid #0002}
.side{width:230px;height:300px;background:#321F19;border-radius:8px;padding:18px 14px;box-sizing:border-box}
.side i{display:block;height:9px;border-radius:5px;background:#F7F5F022;margin:13px 0}
.login{flex:1;height:300px;background:#F7F5F0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.login b{display:block;width:240px;height:34px;border:1px solid #321F1933;border-radius:8px;background:#fff}
.paper{background:#fff;width:210px;padding:12px;box-shadow:0 1px 3px #0003}.paper pre{font:10px/1.35 monospace;margin:8px 0 0}
.bit{filter:grayscale(1) contrast(60)} .tab{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #ccc;border-radius:7px 7px 0 0;padding:6px 10px}
.tab.dk{background:#35363a;color:#eee;border-color:#222}
</style><body>
<h1>artesa — kit de marca · concepto A "Masa enrollada"</h1><div>Todo en contornos rellenos (sin texto vivo). Máx. 2 colores: Terracota + Espresso (claro) / Ocre + Alabastro (oscuro).</div>

<h2>Lockups</h2><div class="g g4">
${tile('#F7F5F0', 'Horizontal · claro', im('logo-principal.svg', 70))}
${tile('#321F19', 'Horizontal · oscuro', im('logo-principal-oscuro.svg', 70), 'dark')}
${tile('#F7F5F0', 'Apilado · claro', im('logo-apilado.svg', 130))}
${tile('#321F19', 'Apilado · oscuro', im('logo-apilado-oscuro.svg', 130), 'dark')}
</div>

<h2>1 tinta, inverso y térmico</h2><div class="g g4">
${tile('#F7F5F0', '1 tinta Espresso', im('logo-principal-mono-oscuro.svg', 54) + im('isotipo-mono-oscuro.svg', 54))}
${tile('#321F19', '1 tinta inverso (Alabastro)', im('logo-principal-mono-claro.svg', 54) + im('isotipo-mono-claro.svg', 54), 'dark')}
${tile('#B15C3D', 'Sobre Terracota (inverso)', im('logo-principal-mono-claro.svg', 54), 'dark')}
${tile('#cfcac2', 'Recibo térmico 58 mm (1 bit)', `<div class="paper"><div class="bit" style="display:flex;justify-content:center">${im('logo-apilado-negro.svg', 70)}</div><pre>Restaurante Orígenes
San Salvador
--------------------------
1 Café de olla      $1.75
1 Pan dulce         $1.25
TOTAL               $3.00</pre></div>`)}
</div>

<h2>Símbolo, corte pequeño y escala</h2><div class="g g3">
${tile('#fff', 'Isotipo (≥ 33 px) · 256 / 96 / 48 / 32', im('isotipo.svg', 200) + im('isotipo.svg', 96) + im('isotipo.svg', 48) + im('isotipo.svg', 32))}
${tile('#fff', 'Corte pequeño (≤ 32 px) · 128 / 48 / 32 / 24 / 16', im('isotipo-pequeno.svg', 128) + im('isotipo-pequeno.svg', 48) + im('isotipo-pequeno.svg', 32) + im('isotipo-pequeno.svg', 24) + im('isotipo-pequeno.svg', 16))}
${tile('#321F19', 'Corte pequeño · oscuro', im('isotipo-pequeno-oscuro.svg', 128) + im('isotipo-pequeno-oscuro.svg', 32) + im('isotipo-pequeno-oscuro.svg', 16), 'dark')}
</div>

<h2>Favicon e íconos de app (PNG reales)</h2><div class="g g5">
${tile('#f4f4f4', 'Pestaña clara / oscura', `<div><div class="tab"><img src="png/favicon-16.png" width="16" height="16">artesa — POS</div><br><div class="tab dk"><img src="svg/favicon.svg" width="16" height="16">artesa — POS</div></div>`)}
${tile('#f4f4f4', 'favicon-16.png ×6 · favicon-32.png ×3', `<img class="px" src="png/favicon-16.png" width="96"><img class="px" src="png/favicon-32.png" width="96">`)}
${tile('#f4f4f4', 'apple-touch-icon 180', `<img src="png/apple-touch-icon.png" width="120" style="border-radius:26px">`)}
${tile('#f4f4f4', 'icon-192 / app-icon-48', `<img src="png/icon-192.png" width="120"><img src="png/app-icon-48.png" width="48">`)}
${tile('#f4f4f4', 'maskable 512 (máscara circular)', `<img src="png/icon-maskable-512.png" width="130" style="border-radius:50%">`)}
</div>

<h2>En contexto</h2><div style="display:flex;gap:10px">
<div class="side">${im('logo-principal-oscuro.svg', 30)}<div style="height:14px"></div><i></i><i></i><i></i><i></i><i></i></div>
<div class="side" style="width:76px;display:flex;flex-direction:column;align-items:center">${im('isotipo-mono-claro.svg', 34)}<div style="height:10px"></div><i style="width:34px"></i><i style="width:34px"></i><i style="width:34px"></i></div>
<div class="login">${im('logo-apilado.svg', 120)}<b></b><b></b><b style="background:#B15C3D;border:0"></b></div>
</div>
</body></html>`;
writeFileSync(join(K, 'preview-kit.html'), html);
execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--virtual-time-budget=3000', '--window-size=1480,1520', `--screenshot=${join(K, 'preview-kit.png')}`, pathToFileURL(join(K, 'preview-kit.html')).href], { stdio: 'ignore' });
console.log('ok');
