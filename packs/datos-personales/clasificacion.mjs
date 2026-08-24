#!/usr/bin/env node
/**
 * clasificacion.mjs — qué columnas parecen datos personales y no están declaradas.
 *
 *   clasificacion.mjs              contra la base viva (necesita DATABASE_URL y psql)
 *   clasificacion.mjs --estatico   sobre las migraciones
 *   clasificacion.mjs --json
 *
 * Lee el inventario de `knowledge/wiki/inventario-datos-personales.md` y compara con lo
 * que hay. Señala:
 *
 *   · columnas que PARECEN datos personales y no están en el inventario
 *   · columnas declaradas en el inventario que ya no existen
 *   · texto libre, que es sumidero de datos personales sin tipar
 *
 * ── Lo que este detector NO puede hacer ──────────────────────────────────────
 *
 * Adivinar. Detecta por nombre de columna, y hay trampas que ningún detector por nombre
 * atrapa: dinero guardado como texto porque el criterio es lenguaje natural, un campo
 * llamado `referencia` que en realidad guarda un número de documento, una columna de
 * notas donde el equipo apunta diagnósticos.
 *
 * Sirve para que el inventario no se quede atrás cuando alguien añade una tabla. La
 * clasificación la hace una persona.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const json = args.includes('--json');
const estatico = args.includes('--estatico');
const ESQUEMA = process.env.ESQUEMA_DB || 'public';
const INVENTARIO = process.env.INVENTARIO || 'knowledge/wiki/inventario-datos-personales.md';

// Nombres que casi siempre indican un dato personal. Se buscan por subcadena sobre el
// nombre normalizado, salvo los cortos, que colisionarían.
const INDICIOS_PARCIAL = [
  'email', 'correo', 'telefono', 'phone', 'movil', 'whatsapp',
  'direccion', 'address', 'domicilio', 'codigopostal', 'postal',
  'pasaporte', 'passport', 'nacimiento', 'birth', 'edad',
  'salario', 'salary', 'nomina', 'iban', 'cuenta_banc', 'tarjeta',
  'diagnostic', 'medic', 'alergia', 'lesion', 'clinic', 'sangre',
  'genero', 'sexo', 'etnia', 'religion', 'ideolog', 'sindicat',
  'huella', 'biometric', 'geoloc', 'latitud', 'longitud',
  'contrasena', 'password', 'token',
];
const INDICIOS_EXACTO = new Set(['dni', 'nif', 'nie', 'cif', 'rif', 'cuit', 'cuil', 'rfc', 'ssn', 'cbu', 'ip']);
// Sumideros: texto libre donde acaba cualquier cosa.
const SUMIDEROS = ['nota', 'observ', 'comentario', 'descripcion', 'detalle', 'texto', 'mensaje'];

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const pareceDato = c => { const n = norm(c); return INDICIOS_EXACTO.has(n) || INDICIOS_PARCIAL.some(t => n.includes(norm(t))); };
const esSumidero = c => SUMIDEROS.some(t => norm(c).includes(t));

function leerInventario() {
  if (!existsSync(INVENTARIO)) return null;
  const texto = readFileSync(INVENTARIO, 'utf8');
  const declaradas = new Set();
  // Se aceptan dos formas: `tabla.columna` en cualquier parte, o filas de tabla markdown
  // cuya primera celda sea `tabla.columna`.
  for (const m of texto.matchAll(/`([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)`/gi)) {
    declaradas.add(`${m[1].toLowerCase()}.${m[2].toLowerCase()}`);
  }
  const sinDatos = new Set();
  const bloque = texto.match(/sin datos personales[\s\S]{0,2000}/i);
  if (bloque) for (const m of bloque[0].matchAll(/`([a-z_][a-z0-9_]*)`/gi)) sinDatos.add(m[1].toLowerCase());
  return { declaradas, sinDatos };
}

function columnasEstaticas() {
  let dir = null;
  for (const c of ['db/migrations', 'migrations', 'server/src/db/migrations', 'src/db/migrations', 'prisma/migrations'])
    if (existsSync(c)) { dir = c; break; }
  if (!dir) return null;
  const sql = [];
  const rec = d => { for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) rec(p); else if (extname(p) === '.sql') sql.push(readFileSync(p, 'utf8'));
  } };
  rec(dir);
  const texto = sql.join('\n').replace(/--.*$/gm, '');
  const out = [];
  const añadir = (tabla, nombre, tipo) => {
    if (/^(constraint|primary|foreign|unique|check|exclude|like|partition)$/i.test(nombre)) return;
    out.push({ tabla: tabla.toLowerCase(), columna: nombre.toLowerCase(), tipo: (tipo || 'text').toLowerCase() });
  };

  // CREATE TABLE. El cuerpo se corta en el paréntesis que CIERRA la definición, contando
  // niveles: `numeric(14,2)` y `CHECK (a IN (1,2))` llevan paréntesis dentro, y buscar el
  // primer `)` parte la tabla por la mitad.
  for (const m of texto.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:[\w"]+\.)?"?(\w+)"?\s*\(/gi)) {
    const tabla = m[1];
    let nivel = 1, i = m.index + m[0].length;
    const inicio = i;
    while (i < texto.length && nivel > 0) {
      if (texto[i] === '(') nivel++;
      else if (texto[i] === ')') nivel--;
      i++;
    }
    // Las comas de primer nivel separan columnas; las de dentro de un paréntesis no.
    const cuerpo = texto.slice(inicio, i - 1);
    let prof = 0, actual = '';
    const partes = [];
    for (const ch of cuerpo) {
      if (ch === '(') prof++;
      else if (ch === ')') prof--;
      if (ch === ',' && prof === 0) { partes.push(actual); actual = ''; } else actual += ch;
    }
    partes.push(actual);
    for (const parte of partes) {
      const c = parte.trim().match(/^"?(\w+)"?\s+(\w+)/);
      if (c) añadir(tabla, c[1], c[2]);
    }
  }

  // ALTER TABLE … ADD COLUMN: una columna añadida después es tan dato personal como una
  // creada al principio, y es justo la que se olvida de declarar.
  for (const m of texto.matchAll(/ALTER TABLE(?:\s+IF EXISTS)?\s+(?:[\w"]+\.)?"?(\w+)"?\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s+(\w+)/gi)) {
    añadir(m[1], m[2], m[3]);
  }

  // Sin duplicados: una columna puede aparecer creada y luego alterada.
  const vistas = new Set();
  return out.filter(c => { const k = `${c.tabla}.${c.columna}`; if (vistas.has(k)) return false; vistas.add(k); return true; });
}

function columnasVivas() {
  const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!url) { console.error('define DATABASE_URL, o usa --estatico'); process.exit(2); }
  try { execSync('command -v psql', { stdio: 'ignore' }); }
  catch { console.error('psql no está en el PATH. Usa --estatico.'); process.exit(2); }
  const SQL = `SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = '${ESQUEMA}' ORDER BY table_name, ordinal_position`;
  const salida = execSync(['psql', '-tA', '-F', JSON.stringify('|'), JSON.stringify(url), '-c',
    JSON.stringify(SQL.replace(/\s+/g, ' ').trim())].join(' '), { encoding: 'utf8' });
  return salida.trim().split('\n').filter(Boolean).map(l => {
    const [tabla, columna, tipo] = l.split('|');
    return { tabla, columna, tipo };
  });
}

const columnas = estatico ? columnasEstaticas() : columnasVivas();
if (!columnas || !columnas.length) { console.error('no encuentro columnas que analizar'); process.exit(2); }

const inv = leerInventario();
const sospechosas = columnas.filter(c => pareceDato(c.columna));
const sumideros = columnas.filter(c => esSumidero(c.columna) && /text|varchar|char|json/.test(c.tipo));

const sinDeclarar = inv
  ? sospechosas.filter(c => !inv.declaradas.has(`${c.tabla}.${c.columna}`) && !inv.sinDatos.has(c.tabla))
  : sospechosas;
const declaradasQueYaNoExisten = inv
  ? [...inv.declaradas].filter(d => !columnas.some(c => `${c.tabla}.${c.columna}` === d))
  : [];

if (json) { console.log(JSON.stringify({ inventario: !!inv, sospechosas, sinDeclarar, sumideros, declaradasQueYaNoExisten }, null, 2)); process.exit(sinDeclarar.length ? 1 : 0); }

console.log(`${columnas.length} columnas · ${sospechosas.length} parecen datos personales\n`);

if (!inv) {
  console.log(`⚠ NO HAY INVENTARIO en ${INVENTARIO}`);
  console.log('  Sin él no se puede responder a quien pida sus datos, ni borrarlos, ni saber');
  console.log('  qué se filtró si algo se filtra. En muchas jurisdicciones es obligación legal.\n');
  console.log('  Estas son las columnas que habría que clasificar:\n');
  const porTabla = new Map();
  for (const c of sospechosas) { if (!porTabla.has(c.tabla)) porTabla.set(c.tabla, []); porTabla.get(c.tabla).push(c.columna); }
  for (const [t, cs] of [...porTabla].sort()) console.log(`    ${t}: ${cs.join(', ')}`);
  console.log(`\n  Plantilla: knowledge/wiki/inventario-datos-personales.md`);
  process.exit(1);
}

let fallo = 0;
if (sinDeclarar.length) {
  fallo = 1;
  console.log(`✗ ${sinDeclarar.length} columna(s) que parecen datos personales y NO están en el inventario:\n`);
  const porTabla = new Map();
  for (const c of sinDeclarar) { if (!porTabla.has(c.tabla)) porTabla.set(c.tabla, []); porTabla.get(c.tabla).push(c.columna); }
  for (const [t, cs] of [...porTabla].sort()) console.log(`    ${t}: ${cs.join(', ')}`);
  console.log('\n  O se clasifican, o se declara la tabla como sin datos personales.\n');
}
if (declaradasQueYaNoExisten.length) {
  console.log(`⚠ ${declaradasQueYaNoExisten.length} entrada(s) del inventario que ya no existen:`);
  declaradasQueYaNoExisten.slice(0, 10).forEach(d => console.log(`    ${d}`));
  console.log('    Un inventario con entradas muertas deja de leerse.\n');
}
if (sumideros.length) {
  console.log(`⚠ ${sumideros.length} columna(s) de texto libre — sumideros de datos sin tipar:`);
  sumideros.slice(0, 10).forEach(c => console.log(`    ${c.tabla}.${c.columna}`));
  console.log('    Ahí acaba cualquier cosa: un diagnóstico, un teléfono, una observación');
  console.log('    sobre la vida de alguien. Ningún detector por nombre lo va a ver.\n');
}
if (!fallo && !declaradasQueYaNoExisten.length) console.log('✓ el inventario cubre todo lo que parece dato personal');

console.log(`
  Este detector va por NOMBRE de columna. Lo que no atrapa:
    · dinero guardado como texto porque el criterio es lenguaje natural
    · un campo «referencia» que en realidad guarda un número de documento
    · un derivado —un embedding sobre texto sensible— que hereda la clasificación
  Sirve para que el inventario no se quede atrás. Clasificar lo hace una persona.`);
process.exit(fallo);
