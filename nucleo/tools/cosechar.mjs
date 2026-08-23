#!/usr/bin/env node
/**
 * cosechar.mjs — qué de este proyecto merece subir al kit, y qué del kit falta aquí.
 *
 *   cosechar.mjs            las dos direcciones
 *   cosechar.mjs subir      solo lo que este proyecto tiene y el kit no
 *   cosechar.mjs bajar      solo lo que el kit tiene y este proyecto no
 *   --kit <ruta>            por defecto ~/ia-template
 *   --json
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * La versión anterior del kit se quedó atrás mientras los proyectos avanzaban: había
 * camino de ida —copiar el kit al proyecto— y no había camino de vuelta. Las mejoras se
 * quedaban donde nacían, y el mismo fichero acabó con seis versiones distintas en seis
 * repositorios.
 *
 * Esto no sube nada solo: **propone**. Subir una regla al kit es una decisión, y la regla
 * que la gobierna es que una regla entra en el núcleo cuando ha sido útil en DOS proyectos
 * distintos. Con uno, va a un pack; si es de un dominio concreto, ni eso.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const accion = args.find(a => !a.startsWith('--')) ?? 'todo';
const json = args.includes('--json');
const ki = args.indexOf('--kit');
const KIT = ki >= 0 ? args[ki + 1] : join(homedir(), 'ia-template');

if (!existsSync(join(KIT, 'instalar.sh'))) {
  console.error(`✗ no encuentro el kit en ${KIT}\n  Pásalo:  cosechar.mjs --kit /ruta/al/kit`);
  process.exit(2);
}

const sello = t => createHash('sha256').update(String(t).replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 12);
const leer = f => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
const listar = (d, filtro = () => true, acc = []) => {
  let e; try { e = readdirSync(d, { withFileTypes: true }); } catch { return acc; }
  for (const x of e) {
    const p = join(d, x.name);
    if (/(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/|$)/.test(p)) continue;
    if (x.isDirectory()) listar(p, filtro, acc); else if (filtro(p)) acc.push(p);
  }
  return acc;
};

// ── qué compara ───────────────────────────────────────────────────────────────
// Solo las piezas que el kit sabe versionar. Comparar el código de la aplicación no tiene
// sentido: es del proyecto.
const ZONAS = [
  { nombre: 'skills',        local: '.claude/skills',  kit: 'nucleo/skills',    filtro: p => basename(p) === 'SKILL.md' },
  { nombre: 'protocolo',     local: 'agente/protocolo', kit: 'nucleo/protocolo', filtro: p => extname(p) === '.md' },
  { nombre: 'herramientas',  local: 'agente/tools',    kit: 'nucleo/tools',     filtro: p => /\.(mjs|sh)$/.test(p) },
  { nombre: 'packs',         local: 'agente/packs',    kit: 'packs',            filtro: p => /\.(md|mdc|sh|mjs|ts|sql|yml)$/.test(p) },
  { nombre: 'prompts',       local: 'agente/prompts',  kit: 'prompts',          filtro: p => extname(p) === '.md' },
  { nombre: 'plantillas CI', local: 'agente/ci',       kit: 'nucleo/ci',        filtro: p => /\.(yml|md)$/.test(p) },
];

const subir = [], bajar = [], divergentes = [];
for (const z of ZONAS) {
  const dl = z.local, dk = join(KIT, z.kit);
  const enLocal = new Map(listar(dl, z.filtro).map(p => [relative(dl, p), p]));
  const enKit   = new Map(listar(dk, z.filtro).map(p => [relative(dk, p), p]));

  for (const [rel, p] of enLocal) {
    if (!enKit.has(rel)) { subir.push({ zona: z.nombre, rel, ruta: p, motivo: 'no existe en el kit' }); continue; }
    const a = leer(p), b = leer(enKit.get(rel));
    if (a && b && sello(a) !== sello(b)) {
      const la = a.split('\n').length, lb = b.split('\n').length;
      divergentes.push({ zona: z.nombre, rel, ruta: p, lineasProyecto: la, lineasKit: lb,
                         // Crecer suele significar que aquí se aprendió algo.
                         direccion: la > lb ? 'el proyecto creció' : la < lb ? 'el kit creció' : 'mismo tamaño, distinto contenido' });
    }
  }
  for (const [rel, p] of enKit) if (!enLocal.has(rel)) bajar.push({ zona: z.nombre, rel, ruta: p });
}

// ── señales propias del proyecto que el kit no tiene ──────────────────────────
// Lo más valioso a cosechar no son ficheros del kit modificados, sino cosas que el
// proyecto inventó: validadores, ratchets, verificadores.
const inventos = [];
// En un monorepo los validadores viven en client/scripts, server/scripts, apps/*/tools…
// Buscar solo en la raíz encuentra una fracción.
const dondeViven = ['scripts', 'tools', 'ops', 'bin'];
for (const sub of ['.', ...(existsSync('.') ? readdirSync('.', { withFileTypes: true })
      .filter(e => e.isDirectory() && !/^(node_modules|\.|dist|build|coverage)/.test(e.name))
      .map(e => e.name) : [])]) {
  for (const d of dondeViven.map(x => sub === '.' ? x : join(sub, x))) {
  for (const p of listar(d, f => /\.(mjs|js|sh|py|ts)$/.test(f))) {
    const n = basename(p);
    if (!/valid|check|verif|audit|ratchet|gate|lint|budget|presupuesto|drift|deriva|scan/i.test(n)) continue;
    if (existsSync(join(KIT, 'nucleo/tools', n))) continue;
    const src = leer(p) ?? '';
    inventos.push({ ruta: p, lineas: src.split('\n').length,
                    // La primera línea de comentario que NO sea el shebang ni una regla
                    // de guiones: suele decir para qué sirve el script.
                    que: (src.split('\n')
                            .filter(l => /^\s*(#|\/\/|\*)/.test(l) && !/^#!/.test(l) && !/^[\s#/*-]+$/.test(l))
                            .map(l => l.replace(/^\s*(#|\/\/|\*)\s?/, '').trim())
                            .find(l => l.length > 12) ?? '').slice(0, 100) });
  }
  }
}
// Y los ratchets fijados aquí que el catálogo del kit no contempla.
const ratchets = existsSync('.ratchets')
  ? readdirSync('.ratchets').filter(f => !f.includes('.') || f.endsWith('.json')).map(f => f.replace(/\.json$/, ''))
  : [];

if (json) { console.log(JSON.stringify({ kit: KIT, subir, bajar, divergentes, inventos, ratchets }, null, 2)); process.exit(0); }

const linea = '─'.repeat(64);
console.log(`Kit: ${KIT}\n`);

if (accion === 'todo' || accion === 'subir') {
  console.log(`${linea}\nLO QUE ESTE PROYECTO PODRÍA APORTAR AL KIT\n${linea}\n`);

  if (inventos.length) {
    console.log(`  Verificadores propios que el kit no tiene (${inventos.length}):\n`);
    for (const i of inventos.slice(0, 15)) console.log(`    ${i.ruta}  (${i.lineas} líneas)${i.que ? `\n        ${i.que}` : ''}`);
    console.log('');
  }
  if (divergentes.length) {
    const crecidos = divergentes.filter(d => d.direccion === 'el proyecto creció');
    if (crecidos.length) {
      console.log(`  Ficheros del kit que aquí crecieron (${crecidos.length}) — mira si lo aprendido sirve fuera:\n`);
      for (const d of crecidos.slice(0, 15)) console.log(`    ${d.zona}/${d.rel}\n        ${d.lineasKit} → ${d.lineasProyecto} líneas`);
      console.log('');
    }
  }
  if (subir.length) {
    console.log(`  Ficheros que existen aquí y no en el kit (${subir.length}):\n`);
    for (const s of subir.slice(0, 20)) console.log(`    ${s.zona}/${s.rel}`);
    if (subir.length > 20) console.log(`    … y ${subir.length - 20} más`);
    console.log('');
  }
  if (ratchets.length) console.log(`  Ratchets fijados aquí: ${ratchets.join(', ')}\n`);
  if (!inventos.length && !divergentes.length && !subir.length) console.log('  Nada que aportar: este proyecto usa el kit sin desviarse.\n');

  console.log(`  LA REGLA: una pieza entra en el NÚCLEO cuando ha sido útil en DOS proyectos
  distintos. Con uno solo, va a un pack. Si es de un dominio concreto, a prompts/_dominio
  y no se instala por defecto. Sin esa regla el núcleo vuelve a engordar.\n`);
}

if (accion === 'todo' || accion === 'bajar') {
  console.log(`${linea}\nLO QUE EL KIT TIENE Y AQUÍ FALTA\n${linea}\n`);
  const porZona = new Map();
  for (const b of bajar) { if (!porZona.has(b.zona)) porZona.set(b.zona, []); porZona.get(b.zona).push(b.rel); }
  if (!porZona.size) console.log('  Nada: el proyecto está al día con el kit.\n');
  for (const [zona, rels] of porZona) {
    console.log(`  ${zona} (${rels.length}):`);
    for (const r of rels.slice(0, 10)) console.log(`    ${r}`);
    if (rels.length > 10) console.log(`    … y ${rels.length - 10} más`);
    console.log('');
  }
  const atrasados = divergentes.filter(d => d.direccion === 'el kit creció');
  if (atrasados.length) {
    console.log(`  Ficheros donde el kit avanzó y aquí no (${atrasados.length}):\n`);
    for (const d of atrasados.slice(0, 10)) console.log(`    ${d.zona}/${d.rel}   ${d.lineasProyecto} → ${d.lineasKit} líneas en el kit`);
    console.log('');
  }
  if (porZona.size || atrasados.length) console.log(`  Para traerlo:  ${KIT}/instalar.sh . <packs>\n  (no sobrescribe nada; lo que ya existe se reporta y se decide a mano)\n`);
}
