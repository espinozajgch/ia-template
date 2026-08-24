#!/usr/bin/env node
/**
 * esquema.mjs — integridad de las migraciones y deriva del esquema.
 *
 *   esquema.mjs orden          [dir]   huecos, duplicados y desorden en la secuencia
 *   esquema.mjs sellos         [dir]   ¿cambió una migración ya sellada? (inmutabilidad)
 *   esquema.mjs sellar         [dir]   sella el estado actual — tras aplicar en producción
 *   esquema.mjs idempotencia   [dir]   DDL que no aguanta una segunda pasada
 *   esquema.mjs instantanea            vuelca el esquema vivo a un fichero VERSIONADO
 *   esquema.mjs deriva                 compara el esquema vivo con esa instantánea
 *
 * Reconoce las tres convenciones habituales sin configurar nada:
 *   001_nombre.sql · 0000_nombre.sql + _journal.json · 20260727134939_nombre/migration.sql
 *
 * ── Por qué cada comprobación ─────────────────────────────────────────────────
 *
 * ORDEN. Dos migraciones con el mismo número se aplican en un orden en la máquina de
 * quien las escribió y en otro en producción. El fallo aparece semanas después.
 *
 * SELLOS. Editar una migración ya aplicada es el error más caro: en tu máquina la base
 * está bien porque la aplicaste con la versión nueva; en producción sigue el efecto de
 * la vieja, y nada lo dice. Una migración aplicada es historia: se escribe la siguiente.
 *
 * IDEMPOTENCIA. Un despliegue se corta a la mitad y hay que reintentarlo. Si la migración
 * no aguanta una segunda pasada, el reintento falla y la base queda a medias, que es el
 * estado del que nadie sabe salir.
 *
 * DERIVA. Un índice creado a mano en producción, o una columna que el ORM cree que existe
 * y no está. El fallo se reproduce solo allí, y por eso cuesta días.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const [accion, ...resto] = process.argv.slice(2);
const json = resto.includes('--json');
const DIR = process.env.RATCHET_DIR || '.ratchets';

function localizarDir() {
  const dado = resto.find(a => !a.startsWith('--'));
  if (dado) return dado;
  for (const c of ['db/migrations', 'migrations', 'server/src/db/migrations', 'src/db/migrations',
                   'prisma/migrations', 'apps/api/prisma/migrations', 'alembic/versions', 'db/migrate']) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** Devuelve [{ orden, nombre, ruta, sql }] ordenado, sea cual sea la convención. */
function leerMigraciones(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'meta') continue;
    let ruta = null;
    if (e.isDirectory()) {                                  // prisma: <ts>_nombre/migration.sql
      for (const c of ['migration.sql', 'up.sql']) if (existsSync(join(dir, e.name, c))) ruta = join(dir, e.name, c);
      if (!ruta) continue;
    } else if (e.name.endsWith('.sql')) ruta = join(dir, e.name);
    else continue;
    const m = e.name.match(/^(\d+)/);
    out.push({
      orden: m ? m[1] : null,
      nombre: e.name.replace(/\.sql$/, ''),
      ruta,
      sql: (() => { try { return readFileSync(ruta, 'utf8'); } catch { return ''; } })(),
    });
  }
  return out.sort((a, b) => (a.orden || a.nombre).localeCompare(b.orden || b.nombre, 'en', { numeric: true }));
}

const dir = ['instantanea', 'deriva'].includes(accion) ? null : localizarDir();
if (!dir && !['instantanea', 'deriva'].includes(accion)) {
  console.error(`✗ no encuentro un directorio de migraciones.\n  Pásalo:  esquema.mjs ${accion || 'orden'} <ruta>`);
  process.exit(2);
}
const migs = dir ? leerMigraciones(dir) : [];
if (dir && !migs.length) { console.error(`✗ ${dir} no contiene migraciones`); process.exit(2); }

// ── orden ─────────────────────────────────────────────────────────────────────
// Excepciones DECLARADAS. Un verificador sin forma de declarar una excepción documentada
// grita cada corrida, y lo que se hace con eso es desactivarlo. Se declaran en
// .ratchets/esquema-excepciones.json, con la razón escrita:
//   { "fuera-del-journal": { "0012": "aplicada a mano en producción — ver CLAUDE.md" },
//     "hueco":             { "126":  "migración retirada antes de aplicarse" } }
function excepciones() {
  const f = join(DIR, 'esquema-excepciones.json');
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return {}; }
}

if (accion === 'orden') {
  const exc = excepciones();
  const declarada = (tipo, clave) => {
    const g = exc[tipo] || {};
    return g[clave] ?? Object.entries(g).find(([k]) => String(clave).startsWith(k))?.[1] ?? null;
  };
  const problemas = [];
  const porOrden = new Map();
  for (const m of migs) {
    if (!m.orden) { problemas.push({ tipo: 'sin-numero', mig: m.nombre }); continue; }
    if (porOrden.has(m.orden)) problemas.push({ tipo: 'duplicado', mig: m.nombre, otro: porOrden.get(m.orden) });
    else porOrden.set(m.orden, m.nombre);
  }
  // Huecos solo tienen sentido en secuencias cortas y consecutivas, no en sellos de tiempo.
  const nums = [...porOrden.keys()].map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  const esSecuencia = nums.length > 1 && nums[nums.length - 1] - nums[0] < nums.length * 5;
  if (esSecuencia) {
    for (let i = nums[0]; i < nums[nums.length - 1]; i++) if (!nums.includes(i)) problemas.push({ tipo: 'hueco', numero: i });
  }
  // Coherencia con el journal, si lo hay
  const journal = [join(dir, 'meta', '_journal.json'), join(dir, '_journal.json')].find(existsSync);
  if (journal) {
    const j = JSON.parse(readFileSync(journal, 'utf8'));
    const enJournal = new Set((j.entries || []).map(e => e.tag));
    for (const m of migs) if (!enJournal.has(m.nombre)) problemas.push({ tipo: 'fuera-del-journal', mig: m.nombre });
    for (const t of enJournal) if (!migs.some(m => m.nombre === t)) problemas.push({ tipo: 'journal-sin-fichero', mig: t });
  }
  // La gravedad de un número repetido depende de QUIÉN decide el orden:
  //   · sin journal, lo decide el nombre del fichero → dos iguales se aplican en un orden
  //     en una máquina y en otro en la siguiente. Es un ERROR.
  //   · con journal, el orden está fijado ahí → el riesgo baja a que una persona (o una
  //     herramienta que ordene por nombre) se confunda. Es un AVISO.
  // Un journal que cita un fichero inexistente rompe la aplicación siempre: error.
  // Un journal no siempre es un fichero. Un ejecutor que ordena por nombre y guarda
  // versión + huella en una tabla da la MISMA garantía: el orden ya está fijado y es el
  // mismo en todas las máquinas. Se declara en esquema-excepciones.json:
  //   { "journal-externo": "scripts/migrate.mjs ordena con .sort() y sella en schema_migrations" }
  // Con journal —de fichero o declarado— un número repetido baja de error a aviso.
  const journalExterno = typeof exc['journal-externo'] === 'string' ? exc['journal-externo'] : null;
  const hayJournal = Boolean(journal) || Boolean(journalExterno);
  const ES_ERROR = new Set(hayJournal ? ['journal-sin-fichero'] : ['duplicado', 'journal-sin-fichero']);
  const clave = p => p.tipo === 'hueco' ? String(p.numero) : (p.mig || '');
  const vivos = [], silenciados = [];
  for (const p of problemas) {
    const razon = declarada(p.tipo, clave(p));
    if (razon && !ES_ERROR.has(p.tipo)) silenciados.push({ ...p, razon }); else vivos.push(p);
  }
  const errores = vivos.filter(p => ES_ERROR.has(p.tipo));
  const avisos  = vivos.filter(p => !ES_ERROR.has(p.tipo));

  if (json) { console.log(JSON.stringify({ errores, avisos, silenciados }, null, 2)); process.exit(errores.length ? 1 : 0); }

  const texto = p =>
      p.tipo === 'duplicado'           ? `número repetido: ${p.mig} y ${p.otro}\n      ${journal
          ? 'el journal fija el orden, así que se aplican bien — pero confunde a quien lo lee\n      y a cualquier herramienta que ordene por nombre'
          : 'el orden lo decide el nombre del fichero: se aplican en un orden en una máquina\n      y en otro en la siguiente'}`
    : p.tipo === 'hueco'               ? `falta el número ${p.numero}  —  ¿se retiró una migración?`
    : p.tipo === 'sin-numero'          ? `sin prefijo numérico: ${p.mig}`
    : p.tipo === 'fuera-del-journal'   ? `${p.mig} existe pero no está en el journal  —  ¿se aplicó a mano?`
    :                                    `el journal cita ${p.mig} y el fichero no existe`;

  if (errores.length) {
    console.log(`✗ ${errores.length} error(es) de orden en ${dir}:\n`);
    for (const p of errores) console.log(`    ${texto(p)}`);
  }
  if (avisos.length) {
    console.log(`${errores.length ? '\n' : ''}⚠ ${avisos.length} aviso(s):\n`);
    for (const p of avisos) console.log(`    ${texto(p)}`);
    console.log(`
  Si son decisiones tomadas a conciencia, decláralas con su razón en
  ${join(DIR, 'esquema-excepciones.json')} y dejarán de aparecer:

    { "fuera-del-journal": { "0012": "aplicada a mano en producción — ver AGENTS.md" },
      "hueco":             { "126":  "migración retirada antes de aplicarse" } }`);
  }
  if (silenciados.length) console.log(`\n  (${silenciados.length} excepción(es) declarada(s), no listadas)`);
  if (!errores.length && !avisos.length) console.log(`✓ orden: ${migs.length} migraciones, secuencia coherente${journal ? ' y journal al día' : ''}${silenciados.length ? `  ·  ${silenciados.length} excepción(es) declarada(s)` : ''}`);
  process.exit(errores.length ? 1 : 0);
}

// ── sellos ────────────────────────────────────────────────────────────────────
const SELLOS = join(DIR, 'migraciones.json');
const sello = s => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

if (accion === 'sellar') {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(SELLOS, JSON.stringify(Object.fromEntries(migs.map(m => [m.nombre, sello(m.sql)])), null, 2) + '\n');
  console.log(`sellado: ${migs.length} migraciones.`);
  console.log('Vuelve a sellar SOLO tras aplicar las nuevas en producción. Nunca para tapar una edición.');
  process.exit(0);
}
if (accion === 'sellos') {
  if (!existsSync(SELLOS)) { console.error(`✗ sin sellos. Corre primero:  esquema.mjs sellar ${dir}`); process.exit(1); }
  const previos = JSON.parse(readFileSync(SELLOS, 'utf8'));
  const editadas = [], borradas = [];
  for (const [n, h] of Object.entries(previos)) {
    const m = migs.find(x => x.nombre === n);
    if (!m) borradas.push(n);
    else if (sello(m.sql) !== h) editadas.push(n);
  }
  const nuevas = migs.filter(m => !(m.nombre in previos)).map(m => m.nombre);
  if (json) { console.log(JSON.stringify({ editadas, borradas, nuevas }, null, 2)); process.exit(editadas.length + borradas.length ? 1 : 0); }
  if (!editadas.length && !borradas.length) {
    console.log(`✓ sellos: ninguna migración sellada cambió${nuevas.length ? `  ·  ${nuevas.length} nueva(s): ${nuevas.join(', ')}` : ''}`);
    process.exit(0);
  }
  console.log('✗ el historial de migraciones cambió:\n');
  for (const n of editadas) console.log(`    EDITADA  ${n}`);
  for (const n of borradas) console.log(`    BORRADA  ${n}`);
  console.log(`
  Una migración ya aplicada es historia. En tu máquina la base está bien porque la
  aplicaste con la versión nueva; en producción sigue el efecto de la vieja, y nada lo dice.
  Revierte el cambio y escribe la SIGUIENTE migración.`);
  process.exit(1);
}

// ── idempotencia ──────────────────────────────────────────────────────────────
/*
 * ¿El ejecutor envuelve cada migración en una transacción?
 *
 * Si lo hace, una migración que falla a medias se deshace ENTERA y el reintento arranca
 * limpio: la idempotencia sentencia a sentencia deja de ser lo que evita el desastre. En
 * PostgreSQL el DDL es transaccional, así que el envoltorio funciona también para
 * `CREATE TABLE` y `ADD CONSTRAINT`; en MySQL u Oracle no, y ahí el aviso sigue vivo.
 *
 * Sin esta comprobación la herramienta gritaba 41 sentencias en un proyecto cuyo ejecutor
 * envuelve todo en `BEGIN … COMMIT/ROLLBACK` (pulso, 2026-08-23). Un verificador que avisa
 * de algo que el proyecto ya resolvió es un verificador que se acaba desactivando.
 */
function ejecutorTransaccional() {
  for (const cand of ['scripts/migrate.mjs', 'scripts/migrate.js', 'scripts/migrar.mjs',
                      'db/migrate.mjs', 'migrate.mjs']) {
    try {
      const src = readFileSync(cand, 'utf8');
      if (/\bBEGIN\b/i.test(src) && /\bROLLBACK\b/i.test(src) && /\bCOMMIT\b/i.test(src)) return cand;
    } catch { /* no está: se prueba el siguiente */ }
  }
  return null;
}

if (accion === 'idempotencia') {
  const estricto = resto.includes('--estricto');
  const di = resto.indexOf('--desde');
  const desde = di >= 0 ? resto[di + 1] : null;
  const REGLAS = [
    { re: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY\s+IF\s+NOT\s+EXISTS|IF\s+NOT\s+EXISTS)/i, di: 'CREATE INDEX sin IF NOT EXISTS' },
    { re: /\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i,                di: 'CREATE TABLE sin IF NOT EXISTS' },
    { re: /\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?!IF\s+NOT\s+EXISTS)(?!.*OR\s+REPLACE)/i, di: 'CREATE VIEW sin OR REPLACE' },
    { re: /\bCREATE\s+TYPE\s+/i,                                       di: 'CREATE TYPE (no admite IF NOT EXISTS: envolver en DO $$)' },
    { re: /\bALTER\s+TABLE\s+\S+\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/i, di: 'ADD COLUMN sin IF NOT EXISTS' },
    { re: /\bALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN\s+(?!IF\s+EXISTS)/i,  di: 'DROP COLUMN sin IF EXISTS' },
    { re: /\bDROP\s+(TABLE|INDEX|VIEW|TYPE|SEQUENCE)\s+(?!IF\s+EXISTS)/i, di: 'DROP sin IF EXISTS' },
    { re: /\bADD\s+CONSTRAINT\s+/i,                                    di: 'ADD CONSTRAINT (no admite IF NOT EXISTS: comprobar en pg_constraint)' },
    { re: /\bINSERT\s+INTO\s+(?![\s\S]{0,400}ON\s+CONFLICT)/i,         di: 'INSERT sin ON CONFLICT' },
  ];
  const hallazgos = [];
  const aRevisar = desde ? migs.slice(migs.findIndex(m => m.nombre.startsWith(desde))) : migs;
  for (const m of aRevisar) {
    const lineas = m.sql.split('\n');
    lineas.forEach((l, i) => {
      if (/^\s*(--|\/\*)/.test(l)) return;
      for (const r of REGLAS) if (r.re.test(l)) { hallazgos.push({ mig: m.nombre, linea: i + 1, que: r.di, texto: l.trim().slice(0, 90) }); break; }
    });
  }
  if (json) { console.log(JSON.stringify(hallazgos, null, 2)); process.exit(hallazgos.length ? 1 : 0); }
  const conTransaccion = ejecutorTransaccional();
  if (conTransaccion && hallazgos.length) {
    console.log(`✓ idempotencia: ${hallazgos.length} sentencia(s) no aguantarían una segunda pasada por sí solas,`);
    console.log(`  pero ${conTransaccion} envuelve cada migración en BEGIN … COMMIT/ROLLBACK: una que falla`);
    console.log(`  se deshace entera y el reintento arranca limpio. El aviso no aplica aquí.`);
    console.log(`  (usa --estricto para verlas de todas formas)`);
    if (!estricto) process.exit(0);
  }
  if (!hallazgos.length) { console.log(`✓ idempotencia: las ${aRevisar.length} migraciones revisadas aguantan una segunda pasada`); process.exit(0); }
  const porMig = new Map();
  for (const h of hallazgos) { if (!porMig.has(h.mig)) porMig.set(h.mig, []); porMig.get(h.mig).push(h); }
  console.log(`⚠ ${hallazgos.length} sentencia(s) que NO aguantan un reintento, en ${porMig.size} migración(es):\n`);
  for (const [mig, hs] of porMig) {
    console.log(`    ${mig}`);
    for (const h of hs.slice(0, 4)) console.log(`      línea ${h.linea}: ${h.que}\n        ${h.texto}`);
    if (hs.length > 4) console.log(`      … y ${hs.length - 4} más`);
  }
  console.log(`
  Un despliegue se corta a la mitad y hay que reintentarlo: si la migración no aguanta la
  segunda pasada, el reintento falla y la base queda a medias.

  Las ya aplicadas en producción NO se editan — quedan como aviso para las siguientes.
  La comprobación de verdad es aplicar las migraciones DOS VECES en la integración
  continua: ver agente/ci/github/integracion.yml

  Por eso esto AVISA y no falla: hacerlo fallar por migraciones históricas que no se
  pueden tocar deja la puerta en rojo permanente, y una puerta siempre en rojo se apaga.
  Para gatear solo lo nuevo:   esquema.mjs idempotencia --desde <primera-nueva> --estricto`);
  process.exit(estricto && hallazgos.length ? 1 : 0);
}

// ── instantánea y deriva ──────────────────────────────────────────────────────
// La instantánea va al REPOSITORIO, no a .ratchets: tiene que verse en el diff. Un
// cambio de esquema que nadie revisa es como no tenerlo. Si la instantánea vive fuera
// del control de versiones, la deriva se detecta pero no se puede revisar ni discutir.
const INSTANTANEA = process.env.ESQUEMA_INSTANTANEA
  ?? ['db/esquema.snapshot.sql', 'server/src/db/esquema.snapshot.sql', 'prisma/esquema.snapshot.sql']
      .find(f => existsSync(dirname(f))) ?? 'db/esquema.snapshot.sql';
function volcar() {
  const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!url) { console.error('✗ define DATABASE_URL (o TEST_DATABASE_URL) para volcar el esquema'); process.exit(2); }
  try { execSync('command -v pg_dump', { stdio: 'ignore' }); }
  catch { console.error('✗ pg_dump no está instalado'); process.exit(2); }
  try {
    return execSync(`pg_dump --schema-only --no-owner --no-privileges --no-comments "${url}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      // Ruido que cambia entre volcados y entre versiones de pg_dump. Los `\restrict`
      // de pg_dump 18 llevan un token ALEATORIO en cada ejecución: sin filtrarlos, la
      // comprobación de deriva falla siempre y se acaba desactivando.
      .filter(l => !/^--|^SET |^SELECT pg_catalog|^\\(un)?restrict\b|^\s*$/.test(l))
      .join('\n');
  } catch (e) { console.error(`✗ pg_dump falló: ${String(e.message).split('\n')[0]}`); process.exit(2); }
}
if (accion === 'instantanea') {
  mkdirSync(dirname(INSTANTANEA), { recursive: true });
  const nuevo = volcar();
  const previo = existsSync(INSTANTANEA) ? readFileSync(INSTANTANEA, 'utf8') : null;
  writeFileSync(INSTANTANEA, nuevo);
  const n = nuevo.split('\n').length;
  if (previo === null) {
    console.log(`instantánea creada: ${INSTANTANEA}  (${n} líneas)`);
  } else if (previo === nuevo) {
    console.log(`✓ ${INSTANTANEA} ya estaba al día  (${n} líneas)`);
  } else {
    const antes = previo.split('\n'), sa = new Set(antes), so = new Set(nuevo.split('\n'));
    console.log(`instantánea actualizada: ${INSTANTANEA}  (${n} líneas, `
      + `+${nuevo.split('\n').filter(l => !sa.has(l)).length} / -${antes.filter(l => !so.has(l)).length})`);
  }
  console.log('COMMITÉALA. Un cambio de esquema que nadie revisa en el diff es como no tenerlo.');
  process.exit(0);
}
if (accion === 'deriva') {
  if (!existsSync(INSTANTANEA)) { console.error(`✗ sin instantánea. Corre primero:  esquema.mjs instantanea`); process.exit(1); }
  const antes = readFileSync(INSTANTANEA, 'utf8').split('\n');
  const ahora = volcar().split('\n');
  const sa = new Set(antes), so = new Set(ahora);
  const soloVivo = ahora.filter(l => !sa.has(l)), soloInst = antes.filter(l => !so.has(l));
  if (json) { console.log(JSON.stringify({ soloVivo, soloInst }, null, 2)); process.exit(soloVivo.length + soloInst.length ? 1 : 0); }
  if (!soloVivo.length && !soloInst.length) { console.log('✓ deriva: el esquema vivo coincide con la instantánea'); process.exit(0); }
  console.log(`✗ el esquema vivo y la instantánea no coinciden:\n`);
  if (soloVivo.length) { console.log(`  EN LA BASE y no en la instantánea (${soloVivo.length}):`); soloVivo.slice(0, 15).forEach(l => console.log(`    + ${l.trim().slice(0, 100)}`)); }
  if (soloInst.length) { console.log(`\n  EN LA INSTANTÁNEA y no en la base (${soloInst.length}):`); soloInst.slice(0, 15).forEach(l => console.log(`    - ${l.trim().slice(0, 100)}`)); }
  console.log(`
  Un "+" suele ser un cambio hecho a mano en la base que no está en ninguna migración:
  desaparecerá en el próximo entorno que se cree de cero.
  Un "-" suele ser una migración que no se aplicó.`);
  process.exit(1);
}

console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 30).join('\n').replace(/^ \*\/?\s?/gm, ''));
process.exit(2);
