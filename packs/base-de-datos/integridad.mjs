#!/usr/bin/env node
/**
 * integridad.mjs — cuánta de la integridad la impone la base, y cuánta se confía al código.
 *
 *   integridad.mjs                 informe sobre la base viva (necesita DATABASE_URL y psql)
 *   integridad.mjs --estatico      sobre las migraciones, sin conexión
 *   integridad.mjs --json
 *
 * ── Por qué se mide esto ─────────────────────────────────────────────────────
 *
 * Una regla que solo vive en el código de la aplicación se rompe desde la consola, desde un
 * script de importación, desde el siguiente servicio que se conecte y desde el endpoint que
 * alguien escriba con prisa un viernes.
 *
 * Comparando dos proyectos de la misma cantera: uno tiene 347 restricciones CHECK y 511
 * claves foráneas; otro, con un dominio igual de rico, tiene 23 y 35. En el segundo la
 * integridad la sostiene entera la aplicación, y hay 36 sitios distintos escribiendo.
 *
 * ── Lo que NO dice este informe ──────────────────────────────────────────────
 *
 * Que más restricciones sea mejor. Dice DÓNDE NO HAY NINGUNA, que es distinto: una tabla
 * sin una sola comprobación es una tabla donde cualquier valor entra.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const json = args.includes('--json');
const estatico = args.includes('--estatico');
const ESQUEMA = process.env.ESQUEMA_DB || 'public';

function localizarMigraciones() {
  for (const c of ['db/migrations', 'migrations', 'server/src/db/migrations', 'src/db/migrations',
                   'prisma/migrations', 'apps/api/prisma/migrations']) if (existsSync(c)) return c;
  return null;
}
function sqlDeMigraciones(dir) {
  const out = [];
  const rec = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (extname(p) === '.sql') out.push(readFileSync(p, 'utf8'));
    }
  };
  rec(dir);
  return out.join('\n');
}

if (estatico) {
  const dir = localizarMigraciones();
  if (!dir) { console.error('no encuentro migraciones'); process.exit(2); }
  const sql = sqlDeMigraciones(dir);
  const cuenta = re => (sql.match(re) || []).length;
  const r = {
    tablas:     cuenta(/CREATE TABLE/gi),
    check:      cuenta(/\bCHECK\s*\(/gi),
    foraneas:   cuenta(/\bREFERENCES\b/gi),
    unicas:     cuenta(/\bUNIQUE\b/gi),
    noNulos:    cuenta(/\bNOT NULL\b/gi),
    indices:    cuenta(/CREATE\s+(UNIQUE\s+)?INDEX/gi),
    porDefecto: cuenta(/\bDEFAULT\b/gi),
  };
  if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log(`Sobre ${dir} — recuento estático\n`);
  for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}`);
  const porTabla = r.tablas ? ((r.check + r.foraneas + r.unicas) / r.tablas).toFixed(1) : '0';
  console.log(`\n  ${porTabla} restricciones por tabla creada.`);
  console.log('  Es un recuento sobre texto: sirve para comparar proyectos, no como medida exacta.');
  console.log('  Para saber QUÉ TABLA no tiene ninguna, corre sin --estatico contra la base.');
  process.exit(0);
}

const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
if (!url) { console.error('define DATABASE_URL, o usa --estatico'); process.exit(2); }
try { execSync('command -v psql', { stdio: 'ignore' }); }
catch { console.error('psql no está en el PATH. Usa --estatico.'); process.exit(2); }

const SQL = `SELECT c.relname
  , count(*) FILTER (WHERE con.contype = 'c')
  , count(*) FILTER (WHERE con.contype = 'f')
  , count(*) FILTER (WHERE con.contype = 'u')
  , count(*) FILTER (WHERE con.contype = 'p')
  , (SELECT count(*) FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull)
  , (SELECT count(*) FROM pg_index i WHERE i.indrelid = c.oid)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_constraint con ON con.conrelid = c.oid
  WHERE c.relkind = 'r' AND n.nspname = '${ESQUEMA}'
  GROUP BY c.oid, c.relname ORDER BY c.relname`;

let salida;
try {
  // La consulta va en UNA línea: al pasarla por el intérprete de órdenes, los saltos
  // se escapan como texto literal y psql recibe una barra invertida donde esperaba SQL.
  const enUnaLinea = SQL.replace(/\s+/g, ' ').trim();
  salida = execSync(['psql', '-tA', '-F', JSON.stringify('|'), JSON.stringify(url), '-c', JSON.stringify(enUnaLinea)].join(' '),
    { encoding: 'utf8' });
} catch (e) { console.error(`la consulta falló: ${String(e.message).split('\n')[0]}`); process.exit(2); }

const tablas = salida.trim().split('\n').filter(Boolean).map(l => {
  const [nombre, ch, fk, un, pk, nn, ix] = l.split('|');
  return { nombre, check: +ch, foraneas: +fk, unicas: +un, primarias: +pk, noNulos: +nn, indices: +ix };
});
if (!tablas.length) { console.error(`no hay tablas en el esquema "${ESQUEMA}"`); process.exit(2); }

const sinPrimaria    = tablas.filter(t => !t.primarias);
const sinRestriccion = tablas.filter(t => !t.check && !t.foraneas && !t.unicas);
const sinNoNulos     = tablas.filter(t => t.noNulos <= 1);
const sinIndices     = tablas.filter(t => t.indices <= 1);
const total = k => tablas.reduce((n, t) => n + t[k], 0);

if (json) { console.log(JSON.stringify({ tablas, sinPrimaria, sinRestriccion, sinNoNulos, sinIndices }, null, 2)); process.exit(0); }

console.log(`Esquema "${ESQUEMA}" — ${tablas.length} tablas\n`);
console.log(`  CHECK ${String(total('check')).padStart(4)}   foráneas ${String(total('foraneas')).padStart(4)}   únicas ${String(total('unicas')).padStart(4)}`);
console.log(`  NOT NULL ${String(total('noNulos')).padStart(4)}   índices ${String(total('indices')).padStart(4)}\n`);

let grave = 0;
if (sinPrimaria.length) {
  grave++;
  console.log(`✗ ${sinPrimaria.length} tabla(s) SIN CLAVE PRIMARIA:`);
  sinPrimaria.forEach(t => console.log(`      ${t.nombre}`));
  console.log('    Sin ella no hay forma de referirse a una fila concreta ni de replicar.\n');
}
if (sinRestriccion.length) {
  console.log(`⚠ ${sinRestriccion.length} tabla(s) sin NINGUNA restricción de dominio:`);
  sinRestriccion.slice(0, 12).forEach(t => console.log(`      ${t.nombre}`));
  if (sinRestriccion.length > 12) console.log(`      … y ${sinRestriccion.length - 12} más`);
  console.log('    Cualquier valor entra. Lo que las gobierne vive solo en el código.\n');
}
if (sinNoNulos.length) {
  console.log(`⚠ ${sinNoNulos.length} tabla(s) donde casi todo admite NULL:`);
  sinNoNulos.slice(0, 8).forEach(t => console.log(`      ${t.nombre}  (${t.noNulos} columnas obligatorias)`));
  console.log('    Un campo que el negocio exige y la base admite vacío acaba vacío.\n');
}
if (sinIndices.length) {
  console.log(`⚠ ${sinIndices.length} tabla(s) sin más índice que su clave:`);
  sinIndices.slice(0, 8).forEach(t => console.log(`      ${t.nombre}`));
  console.log('    Si se consultan por otra columna, cada consulta lee la tabla entera.\n');
}
if (!grave && !sinRestriccion.length && !sinNoNulos.length && !sinIndices.length)
  console.log('✓ todas las tablas tienen clave primaria, restricciones e índices');

console.log(`
  Esto NO dice que más restricciones sea mejor: dice dónde no hay NINGUNA.
  Una regla que solo vive en el código se rompe desde la consola, desde un script de
  importación y desde el siguiente servicio que se conecte.`);
process.exit(grave ? 1 : 0);
