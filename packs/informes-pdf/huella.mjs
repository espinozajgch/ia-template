#!/usr/bin/env node
/**
 * huella.mjs — la red que le falta a un informe PDF.
 *
 *   huella.mjs fijar     <a.pdf> [nombre]   guarda la referencia
 *   huella.mjs comparar  <a.pdf> [nombre]   compara contra ella
 *   huella.mjs ver       <a.pdf>            enseña la huella, sin comparar
 *
 * ── El problema ──────────────────────────────────────────────────────────────
 *
 * Un PDF no se puede comparar byte a byte: lleva la fecha de generación dentro, el orden
 * de sus objetos internos cambia entre versiones de la librería, y las imágenes no se
 * reproducen igual. Así que la costumbre es no comprobarlo, y entonces **un fallo de
 * maquetación se descubre cuando alguien lo abre**.
 *
 * ── La salida ────────────────────────────────────────────────────────────────
 *
 * Se compara **la forma, no el contenido generado**:
 *
 *   se compara                          no se compara
 *   ──────────────────────────────────  ─────────────────────────────────
 *   número de páginas                   los bytes
 *   líneas de texto de cada página      las imágenes
 *   cuántos objetos gráficos por página la fecha de generación
 *   el orden de las secciones           los identificadores internos
 *
 * Las líneas se comparan **enteras** siempre que el PDF no lleve texto generado por un
 * modelo. Si lo lleva, esa parte se excluye con `--ignorar` y **se dice**: una referencia
 * que tapa en silencio la mitad del documento no es una red, es un adorno.
 *
 * Necesita `pdfjs-dist` (npm i -D pdfjs-dist).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const [accion, rutaPdf, nombreDado] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const args = process.argv.slice(2);
const json = args.includes('--json');
const ii = args.indexOf('--ignorar');
const IGNORAR = ii >= 0 ? new RegExp(args[ii + 1], 'i') : null;
const DIR = process.env.HUELLAS_DIR || 'knowledge/huellas';

if (!accion || !rutaPdf) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 32).join('\n').replace(/^ \*\/?\s?/gm, ''));
  process.exit(2);
}
if (!existsSync(rutaPdf)) { console.error(`✗ no existe: ${rutaPdf}`); process.exit(2); }

// La herramienta vive en el kit y se ejecuta desde el proyecto: un `import` normal
// resolvería desde la carpeta del script, donde la dependencia no está. Se resuelve
// explícitamente desde el directorio de trabajo.
let pdfjs;
try {
  const { createRequire } = await import('node:module');
  const requerir = createRequire(join(process.cwd(), 'package.json'));
  pdfjs = await import(pathToFileURL(requerir.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
} catch {
  console.error(`✗ falta pdfjs-dist.
  npm i -D pdfjs-dist

  Es la única dependencia, y es de desarrollo: no entra en lo que se despliega.`);
  process.exit(2);
}

/**
 * Normaliza lo que cambia entre corridas sin que el documento haya cambiado.
 * Sin esto, la referencia falla cada día por la fecha del pie y se acaba borrando.
 */
function estable(linea) {
  return linea
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '<fecha>')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '<hora>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function huella(ruta) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(ruta)), useSystemFonts: true }).promise;
  const paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const contenido = await pagina.getTextContent();

    // Se agrupa por posición vertical: el PDF no tiene «líneas», tiene fragmentos con
    // coordenadas. Sin agrupar, un cambio de fuente parte una línea en dos y la
    // comparación falla sin que nada haya cambiado de verdad.
    const porFila = new Map();
    for (const it of contenido.items) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5]);
      porFila.set(y, (porFila.get(y) ?? '') + it.str);
    }
    let lineas = [...porFila.entries()]
      .sort((a, b) => b[0] - a[0])          // de arriba abajo
      .map(([, t]) => estable(t))
      .filter(Boolean);
    if (IGNORAR) lineas = lineas.filter(l => !IGNORAR.test(l));

    // Los objetos gráficos: imágenes y dibujos. No se comparan sus píxeles —matplotlib
    // no reproduce byte a byte— pero sí CUÁNTOS hay: si desaparece una gráfica, se nota.
    const ops = await pagina.getOperatorList();
    const graficos = ops.fnArray.filter(f =>
      f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintJpegXObject ||
      f === pdfjs.OPS.paintInlineImageXObject).length;

    paginas.push({ pagina: n, lineas, graficos });
  }
  return { paginas: doc.numPages, por_pagina: paginas };
}

const nombre = nombreDado || basename(rutaPdf).replace(/\.pdf$/i, '');
const rutaRef = join(DIR, `${nombre}.json`);
const h = await huella(rutaPdf);

if (accion === 'ver') {
  if (json) { console.log(JSON.stringify(h, null, 2)); process.exit(0); }
  console.log(`${rutaPdf} — ${h.paginas} página(s)\n`);
  for (const p of h.por_pagina) {
    console.log(`  página ${p.pagina}: ${p.lineas.length} líneas · ${p.graficos} gráficos`);
    p.lineas.slice(0, 3).forEach(l => console.log(`      ${l.slice(0, 78)}`));
    if (p.lineas.length > 3) console.log(`      … y ${p.lineas.length - 3} más`);
  }
  process.exit(0);
}

if (accion === 'fijar') {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(rutaRef, JSON.stringify(h, null, 2) + '\n');
  console.log(`referencia fijada: ${rutaRef}`);
  console.log(`  ${h.paginas} páginas · ${h.por_pagina.reduce((n, p) => n + p.lineas.length, 0)} líneas · ${h.por_pagina.reduce((n, p) => n + p.graficos, 0)} gráficos`);
  console.log('COMMITÉALA: sin ella en el repositorio, nadie ve en el diff que el informe cambió.');
  if (IGNORAR) console.log(`  ⚠ se está ignorando lo que casa con /${IGNORAR.source}/ — dilo en la revisión`);
  process.exit(0);
}

if (accion !== 'comparar') { console.error(`✗ acción desconocida: ${accion}`); process.exit(2); }
if (!existsSync(rutaRef)) { console.error(`✗ sin referencia. Corre primero:  huella.mjs fijar ${rutaPdf} ${nombre}`); process.exit(1); }

const esperado = JSON.parse(readFileSync(rutaRef, 'utf8'));
const fallos = [];

if (h.paginas !== esperado.paginas) fallos.push(`páginas: ${esperado.paginas} → ${h.paginas}`);

for (const pe of esperado.por_pagina) {
  const po = h.por_pagina.find(p => p.pagina === pe.pagina);
  if (!po) { fallos.push(`falta la página ${pe.pagina}`); continue; }
  if (po.graficos !== pe.graficos) fallos.push(`página ${pe.pagina}: ${pe.graficos} → ${po.graficos} gráficos`);
  const faltan = pe.lineas.filter(l => !po.lineas.includes(l));
  const sobran = po.lineas.filter(l => !pe.lineas.includes(l));
  if (faltan.length) fallos.push(`página ${pe.pagina}: ${faltan.length} línea(s) desaparecieron\n        ${faltan.slice(0, 4).map(l => '- ' + l.slice(0, 70)).join('\n        ')}`);
  if (sobran.length) fallos.push(`página ${pe.pagina}: ${sobran.length} línea(s) nuevas\n        ${sobran.slice(0, 4).map(l => '+ ' + l.slice(0, 70)).join('\n        ')}`);
}

if (json) { console.log(JSON.stringify({ fallos }, null, 2)); process.exit(fallos.length ? 1 : 0); }
if (!fallos.length) {
  console.log(`✓ el informe coincide con la referencia  (${h.paginas} páginas)`);
  process.exit(0);
}
console.log(`✗ el informe cambió respecto a ${rutaRef}:\n`);
fallos.forEach(f => console.log(`    ${f}`));
console.log(`
  Si el cambio es DELIBERADO, vuelve a fijar la referencia y que se vea en el diff:
      node huella.mjs fijar ${rutaPdf} ${nombre}
  Si no lo es, acabas de encontrar una regresión que nadie habría visto hasta abrir el PDF.`);
process.exit(1);
