#!/usr/bin/env node
/**
 * tamano.mjs — trinquete de tamaño de archivo.
 *
 *   node tamano.mjs baseline [dir...]   fija la línea base con lo que hay hoy
 *   node tamano.mjs validate [dir...]   falla si algún archivo CRECIÓ o si nace uno grande
 *
 * A diferencia de `ratchet.sh`, este NO falla cuando un fichero encoge: solo lo sugiere.
 * La distinción no es un descuido. En un trinquete de CUENTA —cuántas ocurrencias de algo—
 * bajar es raro y consolidarlo cuesta una línea, así que fallar es correcto: obliga a
 * cerrar el hueco entre lo medido y el umbral. Aquí la línea base es un MAPA de ciento y
 * pico ficheros, y encoger pasa en casi cada refactor: fallar añadiría un commit de
 * re-fijado a cada cambio, y un trinquete que estorba en cada cambio se desactiva.
 *   node tamano.mjs report   [dir...]   los más grandes, sin juzgar
 *
 *   --limite N   umbral para archivos NUEVOS (por defecto 400 líneas)
 *   --json
 *
 * Por qué un trinquete y no un límite duro: un límite duro sobre un repositorio con
 * archivos de 2.000 líneas bloquea todo el trabajo desde el primer día, así que se
 * desactiva y deja de medir. El trinquete acepta lo que hay y solo prohíbe que empeore.
 *
 * Qué atrapa: el componente dios y el router dios. Ningún test los detecta —el código
 * funciona— pero cada línea que se les añade encarece todo lo que venga después.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const accion = args[0];
const json = args.includes('--json');
const li = args.indexOf('--limite');
const LIMITE = li >= 0 ? Number(args[li + 1]) : 400;
const raices = args.slice(1).filter(a => !a.startsWith('--') && a !== String(LIMITE));
if (!raices.length) raices.push('src', 'app', 'lib', 'server', 'client');

const DIR = process.env.RATCHET_DIR || '.ratchets';
const BASE = join(DIR, 'tamano.json');
const EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rb', '.java', '.php'];
const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|out|coverage|\.next|\.venv|venv|__pycache__|vendor|migrations|locales|__fixtures__)(\/|$)/;
const ES_TEST = /\.(test|spec)\.|(^|\/)tests?\//;

function listar(dir, acc = []) {
  let e; try { e = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const x of e) {
    const p = join(dir, x.name);
    if (IGNORAR.test(p)) continue;
    if (x.isDirectory()) listar(p, acc);
    else if (EXT.includes(extname(x.name)) && !ES_TEST.test(p)) acc.push(p);
  }
  return acc;
}
const medir = () => {
  const m = {};
  for (const r of raices) for (const f of listar(r)) {
    try { m[f] = readFileSync(f, 'utf8').split('\n').length; } catch {}
  }
  return m;
};

const actual = medir();
const total = Object.keys(actual).length;
/*
 * Cero ficheros NO es «limpio»: es «no se ha mirado nada».
 *
 * Sale con 2 y no con 0. La convención de las herramientas del kit es:
 *   0 = comprobado y bien · 1 = comprobado y hay problemas · 2 = NO se pudo comprobar
 *
 * `cobertura.mjs` y `esquema.mjs` ya la seguían; éstas dos salían con 0, y eso significa que
 * un `ciclos.mjs src` en CI con el directorio renombrado a `app` pasa la puerta para siempre
 * sin analizar una línea. Un verificador que aprueba lo que no ha leído es peor que no
 * tenerlo, porque nadie vuelve a mirarlo.
 */
if (!total) {
  console.error(`✗ tamano: no hay ficheros analizables en ${raices.join(', ')}`);
  console.error('  Comprueba la ruta: esto NO es «todo dentro del límite», es «no se ha comprobado».');
  process.exit(2);
}

if (accion === 'baseline') {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(BASE, JSON.stringify({ limite: LIMITE, ficheros: actual }, null, 2) + '\n');
  const g = Object.entries(actual).filter(([, n]) => n > LIMITE).length;
  console.log(`línea base fijada: ${total} ficheros, ${g} por encima de ${LIMITE} líneas`);
  console.log('Documenta en el commit POR QUÉ se re-baseliniza. Nunca para esconder un descuido.');
  process.exit(0);
}

if (accion === 'report') {
  const top = Object.entries(actual).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (json) { console.log(JSON.stringify(top, null, 2)); process.exit(0); }
  console.log(`Los 20 más grandes de ${total} ficheros:\n`);
  for (const [f, n] of top) console.log(`  ${String(n).padStart(6)}  ${f}${n > LIMITE ? '  ←' : ''}`);
  process.exit(0);
}

if (accion !== 'validate') {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 18).join('\n').replace(/^ \* ?/gm, ''));
  process.exit(2);
}

if (!existsSync(BASE)) {
  console.error(`✗ sin línea base. Corre primero:  node ${relative(process.cwd(), process.argv[1])} baseline`);
  process.exit(1);
}
const { limite = LIMITE, ficheros: base } = JSON.parse(readFileSync(BASE, 'utf8'));
const crecidos = [], nuevosGrandes = [];
for (const [f, n] of Object.entries(actual)) {
  if (f in base) { if (n > base[f]) crecidos.push([f, base[f], n]); }
  else if (n > limite) nuevosGrandes.push([f, n]);
}
const bajados = Object.entries(actual).filter(([f, n]) => f in base && n < base[f]).length;

if (json) { console.log(JSON.stringify({ crecidos, nuevosGrandes, bajados }, null, 2)); process.exit(crecidos.length + nuevosGrandes.length ? 1 : 0); }

if (!crecidos.length && !nuevosGrandes.length) {
  console.log(`✓ tamaño: ningún fichero creció${bajados ? `, ${bajados} encogieron` : ''}  (${total} analizados)`);
  if (bajados) console.log(`  Re-baseliniza para consolidar:  node ${relative(process.cwd(), process.argv[1])} baseline`);
  process.exit(0);
}
if (crecidos.length) {
  console.log(`✗ ${crecidos.length} fichero(s) crecieron:\n`);
  for (const [f, a, b] of crecidos.sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])))
    console.log(`    ${f}\n      ${a} → ${b} líneas  (+${b - a})`);
}
if (nuevosGrandes.length) {
  console.log(`\n✗ ${nuevosGrandes.length} fichero(s) NUEVOS por encima de ${limite} líneas:\n`);
  for (const [f, n] of nuevosGrandes) console.log(`    ${f}  (${n} líneas)`);
}
console.log(`\n  Un fichero que crece es una responsabilidad que se está mezclando con otra.`);
console.log(`  Si el crecimiento es deliberado y aceptado, re-baseliniza y di por qué en el commit.`);
process.exit(1);
