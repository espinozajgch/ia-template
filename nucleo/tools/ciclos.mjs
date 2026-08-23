#!/usr/bin/env node
/**
 * ciclos.mjs — detecta ciclos de importación.
 *
 *   node ciclos.mjs [directorio...] [--json] [--max N]
 *
 * Un ciclo A→B→A no rompe nada hoy: el empaquetador lo resuelve y los tests pasan. Rompe
 * el día que alguien mueve una inicialización al cuerpo del módulo y uno de los dos lados
 * recibe `undefined` en tiempo de carga — un fallo que solo aparece en producción, según
 * el orden en que se cargó el bundle.
 *
 * Ningún test funcional detecta esto. Por eso es un verificador aparte.
 *
 * Soporta JavaScript/TypeScript (import, export-from, require, import dinámico) y Python
 * (import, from ... import). Sin dependencias.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const maxIdx = args.indexOf('--max');
const MAX = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 0;   // 0 = ningún ciclo permitido
const raices = args.filter(a => !a.startsWith('--') && a !== String(MAX));
if (!raices.length) raices.push('src', 'app', 'lib');

const EXT_JS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const EXT_PY = ['.py'];
const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|out|coverage|\.next|\.venv|venv|__pycache__|vendor)(\/|$)/;

function listar(dir, acc = []) {
  let entradas;
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entradas) {
    const p = join(dir, e.name);
    if (IGNORAR.test(p)) continue;
    if (e.isDirectory()) listar(p, acc);
    else if ([...EXT_JS, ...EXT_PY].includes(extname(e.name))) acc.push(p);
  }
  return acc;
}

// Imports ESTÁTICOS: se resuelven al CARGAR el módulo, y son los que producen el fallo
// —uno de los dos lados recibe `undefined` durante la inicialización.
const RE_JS_ESTATICOS = [
  /^\s*import\s+(?:[\w*{}\n\r\t, ]+\s+from\s+)?['"]([^'"]+)['"]/gm,
  /^\s*export\s+(?:\*|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm,
  /^\s*(?:const|let|var)\s+.*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
];
// Imports DINÁMICOS: `import('x')` dentro de una función se ejecuta al LLAMARLA, mucho
// después de que ambos módulos estén cargados. No solo no rompe: es el remedio estándar
// para romper un ciclo estático. Se detectan aparte y se informan, no se reportan como
// fallo — señalarlos empuja a «arreglarlos» haciéndolos estáticos, que es introducir el
// problema de verdad.
const RE_JS_DINAMICOS = [
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
const RE_PY = [
  /^\s*from\s+([.\w]+)\s+import\b/gm,
  /^\s*import\s+([.\w]+)/gm,
];
// `from . import a, b` importa los SUBMÓDULOS hermanos a y b, no el __init__ del paquete.
// Modelarlo como una arista hacia __init__ inventa ciclos que no existen: en Python el
// mecanismo de módulos parcialmente inicializados lo resuelve, y la forma es idiomática.
const RE_PY_HERMANOS = /^\s*from\s+(\.+)\s+import\s+([^\n#]+)/gm;

/** Resuelve un especificador relativo a un fichero real del proyecto, o null si es externo. */
function resolverJS(desde, spec) {
  if (!spec.startsWith('.')) return null;                 // paquete externo o alias: fuera
  const base = resolve(dirname(desde), spec);
  for (const c of [base, ...EXT_JS.map(e => base + e), ...EXT_JS.map(e => join(base, 'index' + e))]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}
function resolverPY(desde, spec, ficheros) {
  if (!spec.startsWith('.')) return null;
  const subidas = spec.match(/^\.+/)[0].length;
  let dir = dirname(desde);
  for (let i = 1; i < subidas; i++) dir = dirname(dir);
  const resto = spec.slice(subidas).replace(/\./g, '/');
  for (const c of [join(dir, resto + '.py'), join(dir, resto, '__init__.py')]) {
    if (ficheros.has(resolve(c))) return resolve(c);
  }
  return null;
}

const ficheros = raices.flatMap(r => listar(r)).map(f => resolve(f));
const conjunto = new Set(ficheros);
if (!ficheros.length) {
  console.log(`ciclos: no hay ficheros analizables en ${raices.join(', ')}`);
  process.exit(0);
}

// grafo — dos, en realidad: el de carga (peligroso) y el diferido (informativo)
const grafo = new Map();
const grafoDiferido = new Map();
for (const f of ficheros) {
  const py = extname(f) === '.py';
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');  // fuera comentarios
  const recoger = (regexes) => {
    const destinos = new Set();
    for (const re of regexes) {
      re.lastIndex = 0;
      for (const m of src.matchAll(re)) {
        const d = py ? resolverPY(f, m[1], conjunto) : resolverJS(f, m[1]);
        if (d && d !== f && conjunto.has(d)) destinos.add(d);
      }
    }
    return [...destinos];
  };
  let estaticos = recoger(py ? RE_PY : RE_JS_ESTATICOS);
  if (py) {
    // Quitar la arista falsa hacia __init__ y poner la real hacia cada submódulo.
    const propioInit = resolverPY(f, '.', conjunto);
    const hermanos = new Set();
    RE_PY_HERMANOS.lastIndex = 0;
    let m;
    while ((m = RE_PY_HERMANOS.exec(src)) !== null) {
      for (const nombre of m[2].split(',')) {
        const limpio = nombre.trim().split(/\s+as\s+/)[0].replace(/[()]/g, '').trim();
        if (!limpio || limpio === '*') continue;
        const d = resolverPY(f, m[1] + limpio, conjunto);
        if (d && d !== f) hermanos.add(d);
      }
    }
    if (hermanos.size && propioInit) estaticos = estaticos.filter(d => d !== propioInit);
    estaticos = [...new Set([...estaticos, ...hermanos])];
  }
  grafo.set(f, estaticos);
  grafoDiferido.set(f, py ? [] : recoger(RE_JS_DINAMICOS));
}

// Tarjan: componentes fuertemente conexos. Cada componente de más de un nodo es un ciclo.
let idx = 0; const num = new Map(), bajo = new Map(), pila = [], enPila = new Set(), ciclos = [];
function fuerte(v) {
  num.set(v, idx); bajo.set(v, idx); idx++; pila.push(v); enPila.add(v);
  for (const w of grafo.get(v) || []) {
    if (!num.has(w)) { fuerte(w); bajo.set(v, Math.min(bajo.get(v), bajo.get(w))); }
    else if (enPila.has(w)) bajo.set(v, Math.min(bajo.get(v), num.get(w)));
  }
  if (bajo.get(v) === num.get(v)) {
    const comp = []; let w;
    do { w = pila.pop(); enPila.delete(w); comp.push(w); } while (w !== v);
    if (comp.length > 1) ciclos.push(comp.reverse());
    else if ((grafo.get(v) || []).includes(v)) ciclos.push([v]);   // auto-importación
  }
}
for (const v of grafo.keys()) if (!num.has(v)) fuerte(v);

// Ciclos que SOLO existen gracias a un import diferido: se informan, no se reportan.
const idxDif = new Map(), bajoDif = new Map(), pilaDif = [], enPilaDif = new Set(), ciclosDif = [];
let idxD = 0;
const grafoTotal = new Map([...grafo].map(([k, v]) => [k, [...new Set([...v, ...(grafoDiferido.get(k) || [])])]]));
function fuerteDif(v) {
  idxDif.set(v, idxD); bajoDif.set(v, idxD); idxD++; pilaDif.push(v); enPilaDif.add(v);
  for (const w of grafoTotal.get(v) || []) {
    if (!idxDif.has(w)) { fuerteDif(w); bajoDif.set(v, Math.min(bajoDif.get(v), bajoDif.get(w))); }
    else if (enPilaDif.has(w)) bajoDif.set(v, Math.min(bajoDif.get(v), idxDif.get(w)));
  }
  if (bajoDif.get(v) === idxDif.get(v)) {
    const comp = []; let w;
    do { w = pilaDif.pop(); enPilaDif.delete(w); comp.push(w); } while (w !== v);
    if (comp.length > 1) ciclosDif.push(comp.reverse());
  }
}
for (const v of grafoTotal.keys()) if (!idxDif.has(v)) fuerteDif(v);
const clave = c => [...c].sort().join('|');
const yaReportados = new Set(ciclos.map(clave));
const soloDiferidos = ciclosDif.filter(c => !yaReportados.has(clave(c)));

const rel = f => relative(process.cwd(), f);
if (json) { console.log(JSON.stringify({ ficheros: ficheros.length, ciclos: ciclos.map(c => c.map(rel)), ciclosDiferidos: soloDiferidos.map(c => c.map(rel)) }, null, 2)); }
else if (!ciclos.length) {
  console.log(`✓ sin ciclos de carga  (${ficheros.length} ficheros analizados)`);
  if (soloDiferidos.length) {
    console.log(`\n  ${soloDiferidos.length} ciclo(s) existen solo a través de un import() diferido:`);
    soloDiferidos.forEach(c => console.log(`      ${c.map(rel).join(' ↔ ')}`));
    console.log(`  No son un problema: un import() dentro de una función se ejecuta cuando se
  llama, con ambos módulos ya cargados. De hecho es el remedio estándar para romper un
  ciclo de carga — convertirlos en estáticos sería introducir el fallo.`);
  }
}
else {
  console.log(`✗ ${ciclos.length} ciclo(s) de importación  (${ficheros.length} ficheros analizados)\n`);
  ciclos.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.length === 1 ? 'auto-importación' : c.length + ' módulos'}`);
    c.forEach(f => console.log(`       ${rel(f)}`));
    console.log(`       ↺ vuelve a ${rel(c[0])}\n`);
  });
  console.log('  Para romperlo: extrae lo compartido a un tercer módulo, o invierte la');
  console.log('  dependencia pasando lo que hace falta como parámetro.');
}
process.exit(ciclos.length > MAX ? 1 : 0);
