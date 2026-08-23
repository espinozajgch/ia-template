#!/usr/bin/env node
/**
 * presupuesto.mjs — el rendimiento como número que rompe la puerta.
 *
 *   presupuesto.mjs medir            mide y compara contra presupuesto.json
 *   presupuesto.mjs fijar            fija el presupuesto con lo medido hoy
 *   presupuesto.mjs paquete          solo el peso del paquete (sin navegador, instantáneo)
 *
 *   --url http://localhost:3000   base (por defecto la de presupuesto.json)
 *   --solo /ruta                  medir una sola ruta
 *   --json
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * Un panel nuevo puede tumbar el desplazamiento de diseño de 0 a 0,296 y la puntuación de
 * rendimiento de 89 a 74 **sin que nada se ponga en rojo**: compila, pasa el análisis
 * estático y los tests siguen verdes. No pueden verlo — el fallo es que el panel nace
 * vacío y crece al llegar sus datos, empujando lo que tiene debajo. Eso solo se ve
 * pintando la página.
 *
 * ── La regla de los umbrales ─────────────────────────────────────────────────
 * No son aspiraciones: son **lo que las rutas ya dan hoy**, con margen para el ruido de la
 * medición. Un listón por encima de lo alcanzado convierte la puerta en un adorno que todo
 * el mundo aprende a ignorar; uno muy por debajo deja pasar justo lo que hay que cazar.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const accion = args[0] ?? 'medir';
const json = args.includes('--json');
const arg = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const CONF = 'presupuesto.json';

const porDefecto = {
  url: 'http://localhost:3000',
  // AJUSTAR: las rutas que de verdad importan. Tres bien elegidas valen más que quince.
  rutas: [{ ruta: '/', nombre: 'inicio' }],
  // Peso del paquete servido al primer pintado, en kilobytes.
  paquete: { dir: 'dist', kb: 0 },
  umbrales: { rendimiento: 0, cls: 0.05, lcp: 2500, tbt: 300 },
};
const conf = existsSync(CONF) ? { ...porDefecto, ...JSON.parse(readFileSync(CONF, 'utf8')) } : porDefecto;
if (arg('--url')) conf.url = arg('--url');

// ── peso del paquete: sin navegador, instantáneo ──────────────────────────────
function pesoPaquete(dir = conf.paquete.dir) {
  if (!existsSync(dir)) return null;
  let total = 0; const porTipo = {};
  (function rec(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { rec(p); continue; }
      // Solo lo que bloquea o retrasa el primer pintado.
      const ext = extname(e.name);
      if (!['.js', '.mjs', '.css'].includes(ext)) continue;
      if (/\.map$/.test(e.name)) continue;
      const kb = statSync(p).size / 1024;
      total += kb; porTipo[ext] = (porTipo[ext] ?? 0) + kb;
    }
  })(dir);
  return { kb: Math.round(total), porTipo: Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, Math.round(v)])) };
}

if (accion === 'paquete') {
  const p = pesoPaquete(arg('--dir') ?? conf.paquete.dir);
  if (!p) { console.error(`✗ no existe ${conf.paquete.dir}. Construye primero.`); process.exit(2); }
  if (json) { console.log(JSON.stringify(p, null, 2)); process.exit(0); }
  console.log(`Paquete: ${p.kb} KB  (${Object.entries(p.porTipo).map(([k, v]) => `${k} ${v}`).join(' · ')})`);
  if (conf.paquete.kb > 0) {
    const ok = p.kb <= conf.paquete.kb;
    console.log(`${ok ? '✓' : '✗'} presupuesto ${conf.paquete.kb} KB — ${ok ? 'dentro' : `SE PASA POR ${p.kb - conf.paquete.kb} KB`}`);
    process.exit(ok ? 0 : 1);
  }
  console.log('  (sin presupuesto fijado: corre `presupuesto.mjs fijar`)');
  process.exit(0);
}

// ── medición con navegador ────────────────────────────────────────────────────
function hayLighthouse() {
  try { execSync('npx --no-install lighthouse --version', { stdio: 'ignore' }); return true; } catch { return false; }
}
function medirRuta(url) {
  const salida = join(process.env.TMPDIR ?? '/tmp', `lh-${Date.now()}.json`);
  const r = spawnSync('npx', ['--no-install', 'lighthouse', url,
    '--only-categories=performance', '--output=json', `--output-path=${salida}`,
    '--chrome-flags=--headless=new --no-sandbox', '--quiet',
    // Móvil simulado: es el escenario en el que se rompe, y el que hay que gatear.
    '--preset=desktop' === '' ? '' : '--form-factor=mobile', '--screenEmulation.mobile',
  ].filter(Boolean), { encoding: 'utf8', timeout: 180_000 });
  if (r.status !== 0 || !existsSync(salida)) return { error: (r.stderr || 'lighthouse falló').split('\n').slice(-3).join(' ') };
  const d = JSON.parse(readFileSync(salida, 'utf8'));
  const a = d.audits ?? {};
  return {
    rendimiento: Math.round((d.categories?.performance?.score ?? 0) * 100),
    lcp: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
    cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    tbt: Math.round(a['total-blocking-time']?.numericValue ?? 0),
  };
}

if (!hayLighthouse()) {
  console.error(`✗ falta lighthouse.
  npm i -D lighthouse

  Mientras tanto, el peso del paquete sí se puede medir sin navegador:
  node presupuesto.mjs paquete`);
  process.exit(2);
}

const rutas = arg('--solo') ? conf.rutas.filter(r => r.ruta === arg('--solo')) : conf.rutas;
if (!rutas.length) { console.error('✗ ninguna ruta que medir'); process.exit(2); }

console.log(`Midiendo ${rutas.length} ruta(s) en ${conf.url} — móvil simulado\n`);
const medidas = [];
for (const r of rutas) {
  process.stdout.write(`  ${r.nombre.padEnd(16)} `);
  const m = medirRuta(conf.url + r.ruta);
  if (m.error) { console.log(`✗ ${m.error}`); medidas.push({ ...r, error: m.error }); continue; }
  console.log(`rend ${String(m.rendimiento).padStart(3)} · lcp ${String(m.lcp).padStart(5)} ms · cls ${m.cls.toFixed(3)} · tbt ${String(m.tbt).padStart(4)} ms`);
  medidas.push({ ...r, ...m });
}

if (accion === 'fijar') {
  const buenas = medidas.filter(m => !m.error);
  if (!buenas.length) { console.error('\n✗ ninguna medición válida'); process.exit(1); }
  // Margen para el ruido de la medición: si el umbral se pone en el valor exacto, la
  // puerta parpadea y deja de creerse.
  const nuevo = {
    ...conf,
    rutas: buenas.map(m => ({ ruta: m.ruta, nombre: m.nombre,
      umbrales: { rendimiento: Math.max(0, m.rendimiento - 5), cls: Number((m.cls + 0.02).toFixed(3)),
                  lcp: Math.round(m.lcp * 1.15), tbt: Math.round(m.tbt * 1.3 + 50) } })),
    paquete: { ...conf.paquete, kb: pesoPaquete()?.kb ?? conf.paquete.kb },
  };
  writeFileSync(CONF, JSON.stringify(nuevo, null, 2) + '\n');
  console.log(`\npresupuesto fijado en ${CONF}, con margen para el ruido de la medición.`);
  console.log('Los umbrales solo se mueven HACIA ARRIBA. Bajarlos para que pase la puerta');
  console.log('es exactamente lo que convierte esto en un adorno.');
  process.exit(0);
}

// ── comparar ──────────────────────────────────────────────────────────────────
const fallos = [];
for (const m of medidas) {
  if (m.error) { fallos.push(`${m.nombre}: no se pudo medir — ${m.error}`); continue; }
  const u = { ...conf.umbrales, ...(conf.rutas.find(r => r.ruta === m.ruta)?.umbrales ?? {}) };
  if (u.rendimiento && m.rendimiento < u.rendimiento) fallos.push(`${m.nombre}: rendimiento ${m.rendimiento} < ${u.rendimiento}`);
  if (u.cls && m.cls > u.cls)                          fallos.push(`${m.nombre}: cls ${m.cls} > ${u.cls}  ← algo crece después de pintarse`);
  if (u.lcp && m.lcp > u.lcp)                          fallos.push(`${m.nombre}: lcp ${m.lcp} ms > ${u.lcp} ms`);
  if (u.tbt && m.tbt > u.tbt)                          fallos.push(`${m.nombre}: tbt ${m.tbt} ms > ${u.tbt} ms`);
}
const paq = pesoPaquete();
if (paq && conf.paquete.kb > 0 && paq.kb > conf.paquete.kb) fallos.push(`paquete ${paq.kb} KB > ${conf.paquete.kb} KB`);

if (json) { console.log(JSON.stringify({ medidas, fallos, paquete: paq }, null, 2)); process.exit(fallos.length ? 1 : 0); }
if (!fallos.length) { console.log(`\n✓ dentro del presupuesto${paq ? `  ·  paquete ${paq.kb} KB` : ''}`); process.exit(0); }
console.log(`\n✗ ${fallos.length} fuera de presupuesto:\n`);
fallos.forEach(f => console.log(`    ${f}`));
console.log(`
  El desplazamiento de diseño (cls) es el que más se cuela: un bloque que nace vacío y
  crece al llegar sus datos empuja lo que tiene debajo. Se arregla reservando el espacio
  antes de tener el contenido.`);
process.exit(1);
