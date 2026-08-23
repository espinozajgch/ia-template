#!/usr/bin/env node
/**
 * cobertura.mjs — umbrales de cobertura por capa, y el fallo que los hace inútiles.
 *
 *   cobertura.mjs proponer     [resumen]  umbrales a partir de lo MEDIDO hoy
 *   cobertura.mjs enmascarados [resumen]  ficheros hundidos que su capa está tapando
 *   cobertura.mjs excluidos    [resumen]  código real fuera del cómputo
 *   cobertura.mjs validar      [resumen]  contra .ratchets/cobertura.json — solo puede subir
 *
 * `resumen` es el coverage-summary.json del reporter `json-summary`
 * (por defecto se busca en coverage/ y en los coverage/ de cada subproyecto).
 *
 * ── Los tres fallos que este script existe para evitar ────────────────────────
 *
 * 1 · ENMASCARAMIENTO POR AGREGACIÓN. Un umbral sobre `src/pages/**` mete noventa
 *     ficheros en UN grupo: uno hundido al 15 % se compensa con hermanos al 100 % y la
 *     puerta nunca se entera. El remedio es un umbral con la ruta de ESE fichero, que
 *     funciona como umbral por fichero sin activarlo para todo el repositorio.
 *
 * 2 · UMBRAL ASPIRACIONAL. Un piso por encima de lo real deja la puerta en rojo
 *     permanente, y acaba bajándose o ignorándose. El trinquete solo sirve si arranca
 *     en lo medido y sube.
 *
 * 3 · EXCLUIR PARA INFLAR. Sacar `routes/` o `pages/` del cómputo sube el número y no
 *     mejora nada. Un 93 % que excluye la mitad del código es peor que un 44 % honesto,
 *     porque el 93 % impide ver el problema.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, extname } from 'node:path';

const [accion, ...resto] = process.argv.slice(2);
const json = resto.includes('--json');
const METRICAS = ['lines', 'statements', 'functions', 'branches'];
const DIR = process.env.RATCHET_DIR || '.ratchets';
const BASE = join(DIR, 'cobertura.json');

function localizar() {
  const dado = resto.find(a => !a.startsWith('--'));
  if (dado) return dado;
  for (const c of ['coverage/coverage-summary.json', 'client/coverage/coverage-summary.json',
                   'server/coverage/coverage-summary.json', '.coverage/coverage-summary.json']) {
    if (existsSync(c)) return c;
  }
  return null;
}
const ruta = localizar();
if (!ruta || !existsSync(ruta)) {
  console.error(`✗ no encuentro coverage-summary.json.

  Actívalo en la configuración de cobertura:
    vitest/jest → coverage: { reporter: ['text', 'json-summary'] }
    pytest      → pytest --cov --cov-report=json

  Luego corre los tests con cobertura y vuelve.`);
  process.exit(2);
}
const bruto = JSON.parse(readFileSync(ruta, 'utf8'));
const raizProy = resolve(dirname(ruta), '..');
const ficheros = Object.entries(bruto)
  .filter(([k]) => k !== 'total')
  .map(([k, v]) => [relative(raizProy, resolve(k)).replace(/\\/g, '/'), v]);
if (!ficheros.length) { console.error('✗ el resumen no tiene ficheros'); process.exit(2); }

const pct = (v, m) => (v?.[m]?.pct ?? 100);
/** Capa = los dos primeros segmentos de la ruta. Es la granularidad que usa la gente. */
const capaDe = f => f.split('/').slice(0, 2).join('/');
const suelo = n => Math.max(0, Math.floor(n));

const capas = new Map();
for (const [f, v] of ficheros) {
  const c = capaDe(f);
  if (!capas.has(c)) capas.set(c, []);
  capas.get(c).push([f, v]);
}
const agregado = lista => Object.fromEntries(METRICAS.map(m => {
  const tot = lista.reduce((a, [, v]) => a + (v?.[m]?.total ?? 0), 0);
  const cub = lista.reduce((a, [, v]) => a + (v?.[m]?.covered ?? 0), 0);
  return [m, tot ? (cub / tot) * 100 : 100];
}));

// ── enmascarados ──────────────────────────────────────────────────────────────
// Un fichero está enmascarado si queda MUY por debajo del agregado de su capa y la capa
// está en verde. Es el caso que ningún umbral por glob detecta.
function enmascarados(margen = 20) {
  const out = [];
  for (const [c, lista] of capas) {
    if (lista.length < 3) continue;                 // con dos ficheros no hay dónde esconderse
    const agr = agregado(lista);
    for (const [f, v] of lista) {
      for (const m of METRICAS) {
        const total = v?.[m]?.total ?? 0;
        if (total < 5) continue;                    // ficheros diminutos: ruido
        const p = pct(v, m);
        if (agr[m] - p >= margen) { out.push({ fichero: f, capa: c, metrica: m, fichero_pct: p, capa_pct: agr[m] }); break; }
      }
    }
  }
  return out.sort((a, b) => (a.capa_pct - a.fichero_pct) < (b.capa_pct - b.fichero_pct) ? 1 : -1);
}

// ── excluidos ─────────────────────────────────────────────────────────────────
// Código fuente que existe en disco y NO aparece en el resumen: o no se ejecuta nunca,
// o está excluido del cómputo. Las dos cosas hay que saberlas.
function excluidos() {
  const EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py'];
  const IGN = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|__pycache__|\.venv|venv)(\/|$)/;
  const ES_TEST = /\.(test|spec)\.|(^|\/)(tests?|__tests__|e2e|__fixtures__|fixtures)(\/)/;
  const vistos = new Set(ficheros.map(([f]) => f));
  const enDisco = [];
  (function rec(d) {
    let e; try { e = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const p = join(d, x.name);
      if (IGN.test(p)) continue;
      if (x.isDirectory()) rec(p);
      else if (EXT.includes(extname(x.name)) && !ES_TEST.test(p)) enDisco.push(relative(raizProy, resolve(p)).replace(/\\/g, '/'));
    }
  })(join(raizProy, 'src'));
  const fuera = enDisco.filter(f => !vistos.has(f));
  const porCapa = new Map();
  for (const f of fuera) {
    const c = capaDe(f);
    let n = 0; try { n = readFileSync(join(raizProy, f), 'utf8').split('\n').length; } catch {}
    const a = porCapa.get(c) || { capa: c, ficheros: 0, lineas: 0, ejemplos: [] };
    a.ficheros++; a.lineas += n; if (a.ejemplos.length < 3) a.ejemplos.push(f);
    porCapa.set(c, a);
  }
  return [...porCapa.values()].sort((a, b) => b.lineas - a.lineas);
}

// ── acciones ──────────────────────────────────────────────────────────────────
const rotulo = n => n.toFixed(1).padStart(5);

if (accion === 'proponer') {
  const global = agregado(ficheros);
  const porCapa = {};
  for (const [c, lista] of [...capas].sort()) {
    if (lista.length < 2) continue;
    porCapa[c + '/**'] = Object.fromEntries(METRICAS.map(m => [m, suelo(agregado(lista)[m])]));
  }
  const perFichero = {};
  for (const e of enmascarados()) perFichero[e.fichero] = Object.fromEntries(METRICAS.map(m => [m, suelo(pct(bruto[join(raizProy, e.fichero)] ?? Object.fromEntries(ficheros)[e.fichero], m))]));
  const propuesta = { ...Object.fromEntries(METRICAS.map(m => [m, suelo(global[m])])), ...porCapa, ...perFichero };
  if (json) { console.log(JSON.stringify(propuesta, null, 2)); process.exit(0); }
  console.log(`Umbrales medidos hoy en ${ruta}. Pégalos en tu configuración de cobertura.\n`);
  console.log('thresholds: ' + JSON.stringify(propuesta, null, 2).split('\n').join('\n') + '\n');
  console.log('Reglas que los mantienen honestos:');
  console.log('  · arrancan en LO MEDIDO, no en un 100 aspiracional — un piso irreal se acaba bajando;');
  console.log('  · solo se mueven HACIA ARRIBA, cuando se suman tests;');
  console.log('  · las entradas de un solo fichero son umbrales por fichero: no las borres,');
  console.log('    son las que impiden que su capa los vuelva a tapar.');
  process.exit(0);
}

if (accion === 'enmascarados') {
  const e = enmascarados();
  if (json) { console.log(JSON.stringify(e, null, 2)); process.exit(e.length ? 1 : 0); }
  if (!e.length) { console.log('✓ ningún fichero hundido bajo el agregado de su capa'); process.exit(0); }
  console.log(`✗ ${e.length} fichero(s) que su capa está tapando:\n`);
  for (const x of e) console.log(`    ${x.fichero}\n      ${x.metrica}: ${rotulo(x.fichero_pct)} %   ·   la capa ${x.capa} agrega ${rotulo(x.capa_pct)} %`);
  console.log(`
  El umbral sobre la capa entera está en verde porque los hermanos compensan. Añade una
  entrada de umbral con la RUTA DE ESTE FICHERO —funciona como umbral por fichero— con el
  piso en lo que mide hoy, y súbelo a medida que le sumes tests.`);
  process.exit(1);
}

if (accion === 'excluidos') {
  const x = excluidos();
  if (json) { console.log(JSON.stringify(x, null, 2)); process.exit(0); }
  if (!x.length) { console.log('✓ todo el código de src/ entra en el cómputo'); process.exit(0); }
  const lineas = x.reduce((a, c) => a + c.lineas, 0);
  console.log(`⚠ ${x.reduce((a,c)=>a+c.ficheros,0)} fichero(s) de src/ (${lineas.toLocaleString('es')} líneas) NO aparecen en el resumen:\n`);
  for (const c of x) {
    console.log(`    ${c.capa}  —  ${c.ficheros} ficheros, ${c.lineas.toLocaleString('es')} líneas`);
    for (const e of c.ejemplos) console.log(`        ${e}`);
  }
  console.log(`
  O no los ejecuta ningún test —y entonces su cobertura real es 0—, o están excluidos del
  cómputo. Las dos cosas hay que saberlas: un porcentaje alto que excluye la mitad del
  código es peor que uno bajo y honesto, porque impide ver el problema.`);
  process.exit(0);
}

if (accion === 'validar') {
  const global = agregado(ficheros);
  if (!existsSync(BASE)) {
    mkdirSync(DIR, { recursive: true });
    const b = { global: Object.fromEntries(METRICAS.map(m => [m, suelo(global[m])])),
                capas: Object.fromEntries([...capas].filter(([, l]) => l.length >= 2).map(([c, l]) => [c, Object.fromEntries(METRICAS.map(m => [m, suelo(agregado(l)[m])]))])) };
    writeFileSync(BASE, JSON.stringify(b, null, 2) + '\n');
    console.log(`línea base de cobertura fijada con lo medido hoy (${METRICAS.map(m => `${m} ${rotulo(global[m])}`).join(' · ')})`);
    process.exit(0);
  }
  const base = JSON.parse(readFileSync(BASE, 'utf8'));
  const bajadas = [];
  for (const m of METRICAS) if (global[m] < base.global[m]) bajadas.push(['global', m, base.global[m], global[m]]);
  for (const [c, u] of Object.entries(base.capas || {})) {
    if (!capas.has(c)) continue;
    const a = agregado(capas.get(c));
    for (const m of METRICAS) if (a[m] < u[m]) bajadas.push([c, m, u[m], a[m]]);
  }
  if (json) { console.log(JSON.stringify(bajadas, null, 2)); process.exit(bajadas.length ? 1 : 0); }
  if (!bajadas.length) { console.log(`✓ cobertura: nada bajó  (global ${METRICAS.map(m => `${m} ${rotulo(global[m])}`).join(' · ')})`); process.exit(0); }
  console.log(`✗ ${bajadas.length} umbral(es) por debajo de la línea base:\n`);
  for (const [d, m, antes, ahora] of bajadas) console.log(`    ${d} · ${m}: ${rotulo(antes)} % → ${rotulo(ahora)} %`);
  console.log(`
  Añade tests. NO bajes el piso: un umbral que se re-baseliniza hacia abajo deja de medir.`);
  process.exit(1);
}

console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 32).join('\n').replace(/^ \*\/?\s?/gm, ''));
process.exit(2);
