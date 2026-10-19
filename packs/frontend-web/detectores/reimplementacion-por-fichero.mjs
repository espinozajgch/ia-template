#!/usr/bin/env node
/**
 * reimplementacion-por-fichero.mjs — trinquete POR FICHERO de un componente reimplementado
 * a mano, detectado por la FIRMA de clases que solo aparece cuando alguien lo reconstruye.
 *
 *   node reimplementacion-por-fichero.mjs baseline [dir...]
 *   node reimplementacion-por-fichero.mjs validate [dir...]
 *   node reimplementacion-por-fichero.mjs report   [dir...]
 *
 *   --reglas <config.json>   por defecto: reimplementacion-por-fichero.reglas.json junto a
 *                            este fichero, si no existe: .reimplementacion-por-fichero.json
 *   --json
 *
 * ── Por qué una firma de clases, y no un nombre de componente ────────────────
 *
 * `contrato-componente.mjs` atrapa un ROL ARIA o un slot reimplementado — cosas que un
 * atributo declara. Esto atrapa algo que ningún atributo declara: un contenedor
 * reconstruido a mano a base de utilidades de Tailwind que, JUNTAS, reproducen un
 * componente del sistema de diseño sin pasar por él. Nace de un caso real: un switcher
 * segmentado hand-rolled —`bg-surface-elevated` + `p-1` + `rounded-xl` envolviendo
 * botones— que perdía la semántica `radiogroup`/`radio` y la navegación por teclado que
 * el componente `<SegmentedTabs>` ya resolvía.
 *
 * Tres clases sueltas no son nada —cada una tiene cien usos legítimos—. Las TRES juntas,
 * en el mismo `className`, fuera del propio componente canónico, sí lo son.
 *
 * ── Por qué un trinquete y no una regla dura ──────────────────────────────────
 *
 * Igual que `tamano.mjs` y `colores-por-fichero.mjs`: un techo por archivo, heredado de lo
 * que había al ponerse esto, que solo puede bajar. Un proyecto real no nace limpio.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, normalize } from "node:path";

const args = process.argv.slice(2);
const accion = args[0];
const json = args.includes("--json");
const ri = args.indexOf("--reglas");
const raices = args.filter((a, i) => i > 0 && !a.startsWith("--") && args[i - 1] !== "--reglas");
if (!raices.length) raices.push("src");

const CONFIG = ri >= 0 ? args[ri + 1]
  : [join(import.meta.dirname, "reimplementacion-por-fichero.reglas.json"), ".reimplementacion-por-fichero.json"].find(existsSync);
if (!CONFIG || !existsSync(CONFIG)) {
  console.error("✗ sin reglas de reimplementación.");
  console.error("  Copia reimplementacion-por-fichero.reglas.ejemplo.json a .reimplementacion-por-fichero.json");
  console.error("  en la raíz, ajusta la firma de clases a tu componente hand-rolled real, y reintenta.");
  process.exit(2);
}
let REGLAS;
try { REGLAS = JSON.parse(readFileSync(CONFIG, "utf8")); }
catch (e) { console.error(`✗ ${CONFIG} no es JSON válido: ${e.message}`); process.exit(2); }
if (!Array.isArray(REGLAS) || !REGLAS.length) {
  console.error(`✗ ${CONFIG} debe ser un array no vacío de { id, canonico, clasesCoOcurrentes }`);
  process.exit(2);
}

const DIR = process.env.RATCHET_DIR || ".ratchets";
const BASE = join(DIR, "reimplementacion-por-fichero.json");
const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/|$)/;
const ES_TEST = /\.(test|spec)\.tsx?$/;
const CLASSNAME_RE = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;

function listar(dir, acc = []) {
  let e;
  try { e = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const x of e) {
    const p = join(dir, x.name);
    if (IGNORAR.test(p)) continue;
    if (x.isDirectory()) { listar(p, acc); continue; }
    if (extname(x.name) === ".tsx" && !ES_TEST.test(x.name)) acc.push(p);
  }
  return acc;
}

function contar(contenido, regla) {
  let n = 0;
  let m;
  CLASSNAME_RE.lastIndex = 0;
  while ((m = CLASSNAME_RE.exec(contenido)) !== null) {
    const cls = m[1] ?? m[2] ?? "";
    if (regla.clasesCoOcurrentes.every((token) => new RegExp(token).test(cls))) n++;
  }
  return n;
}

const medir = () => {
  const m = {};
  for (const raiz of raices) {
    if (!existsSync(raiz)) continue;
    for (const f of listar(resolve(raiz))) {
      const rel = relative(".", f).replaceAll("\\", "/");
      const contenido = readFileSync(f, "utf8");
      const porRegla = {};
      for (const regla of REGLAS) {
        if (normalize(rel) === normalize(regla.canonico)) continue;
        const n = contar(contenido, regla);
        if (n > 0) porRegla[regla.id] = n;
      }
      if (Object.keys(porRegla).length) m[rel] = porRegla;
    }
  }
  return m;
};

const actual = medir();
const total = Object.keys(actual).length;

if (accion === "baseline") {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(BASE, JSON.stringify({ ficheros: actual }, null, 2) + "\n");
  console.log(`línea base fijada: ${total} fichero(s) con reimplementación detectada`);
  console.log("El número queda congelado por regla y por archivo: puede bajar, no subir.");
  process.exit(0);
}

if (accion === "report") {
  if (json) { console.log(JSON.stringify(actual, null, 2)); process.exit(0); }
  if (!total) { console.log("ninguna reimplementación detectada en el árbol analizado"); process.exit(0); }
  console.log(`${total} fichero(s) con reimplementación:\n`);
  for (const [f, porRegla] of Object.entries(actual)) console.log(`  ${f}: ${JSON.stringify(porRegla)}`);
  process.exit(0);
}

if (accion !== "validate") {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(2, 8).join("\n").replace(/^ \* ?/gm, ""));
  process.exit(2);
}

if (!existsSync(BASE)) {
  console.error(`✗ sin línea base. Corre primero:  node ${relative(process.cwd(), process.argv[1])} baseline`);
  process.exit(1);
}
const { ficheros: techo } = JSON.parse(readFileSync(BASE, "utf8"));
const excedidos = [];
for (const [f, porRegla] of Object.entries(actual)) {
  for (const [id, n] of Object.entries(porRegla)) {
    const t = techo[f]?.[id] ?? 0;
    if (n > t) excedidos.push({ fichero: f, id, n, techo: t });
  }
}

if (json) { console.log(JSON.stringify(excedidos, null, 2)); process.exit(excedidos.length ? 1 : 0); }
if (!excedidos.length) { console.log(`✓ reimplementación: ningún fichero superó su techo (${total} con alguna ya conocida)`); process.exit(0); }
console.log(`✗ ${excedidos.length} regresión(es):\n`);
for (const e of excedidos) console.log(`    ${e.fichero} [${e.id}]: ${e.n} (techo ${e.techo})`);
console.log("\n  Usa el componente canónico. Si el crecimiento es deliberado: re-baseliniza.");
process.exit(1);
