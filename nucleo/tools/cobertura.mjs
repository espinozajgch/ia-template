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
  /* El corredor propio de Node (`node --test --experimental-test-coverage`) sólo emite
     lcov. Cada vez más proyectos lo usan y sin esto la herramienta no arrancaba en
     ninguno de ellos — pasó en pulso el 2026-08-23. Se convierte al vuelo. */
  for (const c of ['coverage/lcov.info', '.coverage/lcov.info', 'lcov.info']) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** lcov → la forma de `coverage-summary.json`, que es lo que sabe leer el resto. */
function desdeLcov(texto) {
  const salida = {}; let fichero = null, lf = 0, lh = 0, bf = 0, bh = 0, fnf = 0, fnh = 0;
  const cerrar = () => {
    if (!fichero) return;
    salida[fichero] = {
      lines:      { total: lf,  covered: lh,  pct: lf  ? +(lh  * 100 / lf ).toFixed(2) : 100 },
      branches:   { total: bf,  covered: bh,  pct: bf  ? +(bh  * 100 / bf ).toFixed(2) : 100 },
      functions:  { total: fnf, covered: fnh, pct: fnf ? +(fnh * 100 / fnf).toFixed(2) : 100 },
      statements: { total: lf,  covered: lh,  pct: lf  ? +(lh  * 100 / lf ).toFixed(2) : 100 },
    };
    fichero = null; lf = lh = bf = bh = fnf = fnh = 0;
  };
  for (const linea of texto.split('\n')) {
    const [clave, ...val] = linea.trim().split(':');
    const v = val.join(':');
    if (clave === 'SF') { cerrar(); fichero = v; }
    else if (clave === 'LF') lf = +v; else if (clave === 'LH') lh = +v;
    else if (clave === 'BRF') bf = +v; else if (clave === 'BRH') bh = +v;
    else if (clave === 'FNF') fnf = +v; else if (clave === 'FNH') fnh = +v;
    else if (clave === 'end_of_record') cerrar();
  }
  cerrar();
  return salida;
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
const crudo = readFileSync(ruta, 'utf8');
const bruto = ruta.endsWith('.info') ? desdeLcov(crudo) : JSON.parse(crudo);
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
  const IGN = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|__pycache__|\.venv|venv|agente)(\/|$)/;
  const ES_TEST = /\.(test|spec)\.|(^|\/)(tests?|__tests__|e2e|__fixtures__|fixtures)(\/)/;
  const vistos = new Set(ficheros.map(([f]) => f));
  const enDisco = [];
  function rec(d) {
    let e; try { e = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const p = join(d, x.name);
      if (IGN.test(p)) continue;
      if (x.isDirectory()) rec(p);
      else if (EXT.includes(extname(x.name)) && !ES_TEST.test(p)) enDisco.push(relative(raizProy, resolve(p)).replace(/\\/g, '/'));
    }
  }
  // `src` no es universal. Un proyecto de Next tiene el código en `app/`, uno de Python
  // en un paquete con su nombre, un monorepo en `packages/`. Asumirlo hacía que esta
  // comprobación diera ✓ sin haber mirado nada: el peor resultado posible, porque un
  // verificador que no encuentra nada y calla se lee igual que uno que no encuentra fallos.
  const RAICES = ['src', 'app', 'lib', 'server', 'client', 'pages', 'api', 'scripts', 'db', 'packages', 'apps']
    .filter(r => { try { return statSync(join(raizProy, r)).isDirectory(); } catch { return false; } });
  if (!RAICES.length) rec(raizProy); else for (const r of RAICES) rec(join(raizProy, r));
  const fuera = enDisco.filter(f => !vistos.has(f));
  const porCapa = new Map();
  for (const f of fuera) {
    const c = capaDe(f);
    let n = 0; try { n = readFileSync(join(raizProy, f), 'utf8').split('\n').length; } catch {}
    // `ejemplos` es para el humano que lee la salida; `todos` es para el trinquete,
    // que necesita la lista entera y no una muestra.
    const a = porCapa.get(c) || { capa: c, ficheros: 0, lineas: 0, ejemplos: [], todos: [] };
    a.ficheros++; a.lineas += n; a.todos.push(f); if (a.ejemplos.length < 3) a.ejemplos.push(f);
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
  if (!x.length) { console.log('✓ todo el código fuente entra en el cómputo'); process.exit(0); }
  const lineas = x.reduce((a, c) => a + c.lineas, 0);
  console.log(`⚠ ${x.reduce((a,c)=>a+c.ficheros,0)} fichero(s) (${lineas.toLocaleString('es')} líneas) NO aparecen en el resumen:\n`);
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

/*
 * `fuera` — trinquete sobre el código que NO entra en el cómputo.
 *
 * Un porcentaje de cobertura solo significa algo si se sabe sobre qué se calcula. Un 92 %
 * medido sobre un cuarto del código no es un 92 %: es un 92 % de un cuarto, y se lee igual
 * de bien que el de verdad. Ésta es la diferencia entre «no sabemos qué cubren las pruebas»
 * y «lo sabemos, y lo estamos reduciendo».
 *
 * No exige cubrirlo todo hoy —eso pondría la puerta en rojo permanente y acabaría
 * desactivada—. Fija lo que hay y prohíbe que crezca: un fichero nuevo que ningún test
 * ejecute salta al momento, mientras la deuda vieja se drena al ritmo que se pueda.
 */
if (accion === 'fuera') {
  const F = join(DIR, 'cobertura-fuera.json');
  const hoy = excluidos().flatMap(c => c.todos ?? c.ejemplos);
  const actuales = new Set(hoy);
  if (!existsSync(F)) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(F, JSON.stringify({ ficheros: [...actuales].sort() }, null, 2) + '\n');
    console.log(`✓ línea base: ${actuales.size} fichero(s) fuera del cómputo.\n
    A partir de ahora esa lista solo puede encoger. Cubrir uno y quitarlo de aquí es el
    trabajo; añadir uno nuevo es lo que este trinquete existe para impedir.`);
    process.exit(0);
  }
  const base = new Set(JSON.parse(readFileSync(F, 'utf8')).ficheros ?? []);
  const nuevos = [...actuales].filter(f => !base.has(f)).sort();
  const cubiertos = [...base].filter(f => !actuales.has(f)).sort();
  if (cubiertos.length) {
    // Que la lista encoja sola no basta: si no se re-fija, mañana vuelve a caber uno nuevo
    // en el hueco que dejó el que se cubrió, y el trinquete deja de morder.
    console.log(`✓ ${cubiertos.length} fichero(s) han entrado en el cómputo desde la línea base:`);
    for (const f of cubiertos.slice(0, 10)) console.log(`      ${f}`);
    console.log(`\n    Re-fija la línea base para que el hueco no se pueda volver a ocupar:\n      rm ${F} && node ${'agente/tools/cobertura.mjs'} fuera\n`);
  }
  if (!nuevos.length) {
    console.log(`✓ nada nuevo fuera del cómputo  ·  ${actuales.size} fichero(s) de deuda declarada`);
    process.exit(0);
  }
  console.log(`✗ ${nuevos.length} fichero(s) que ningún test ejecuta y no estaban en la línea base:\n`);
  for (const f of nuevos) console.log(`      ${f}`);
  console.log(`
    O no los cubre ninguna prueba —y entonces su cobertura real es 0, por mucho que el
    porcentaje global siga en verde—, o algo los sacó del cómputo. Escribe la prueba, o
    declara el motivo añadiéndolo a ${F}.`);
  process.exit(1);
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
