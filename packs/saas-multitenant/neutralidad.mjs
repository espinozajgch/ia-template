#!/usr/bin/env node
/**
 * neutralidad.mjs — nada de un cliente concreto hardcodeado en código que sirve a todos.
 *
 *   neutralidad.mjs [carpeta...]              por defecto: src
 *   --prohibidos <config.json>                por defecto: neutralidad.prohibidos.json junto a este fichero,
 *                                              si no existe: busca .neutralidad.json en la raíz del proyecto
 *   --json
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * «La marca por cliente es datos, no ramas de código» es fácil de aceptar y fácil de
 * romper sin querer: un nombre de cliente, un identificador o el nombre de una persona
 * de ESE cliente se cuela en una condición, un comentario con un ejemplo real, o un
 * valor por defecto puesto «solo para probar» que nadie quitó. Cada uno es el principio
 * de una bifurcación — un `if (cliente === 'Acme')` no se revierte solo.
 *
 * ── Qué prohibir, y por qué no viene con una lista por defecto ───────────────
 *
 * A diferencia de los otros detectores del kit, aquí no hay nada universal que prohibir:
 * el nombre de TU primer cliente no significa nada para otro proyecto. Por eso esto
 * necesita un fichero de configuración propio — ver
 * [`neutralidad.prohibidos.ejemplo.json`](neutralidad.prohibidos.ejemplo.json) — con los
 * nombres, personas, códigos de entidad y roles que nacieron atados al primer cliente y
 * no deberían aparecer en el código que sirve a los demás.
 *
 * Las migraciones históricas y los snapshots de esquema quedan fuera por defecto: ahí el
 * nombre del primer cliente es historia, no acoplamiento vivo.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const pi = args.indexOf("--prohibidos");
const raices = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--prohibidos");
if (!raices.length) raices.push("src");

const CONFIG = pi >= 0 ? args[pi + 1]
  : [join(import.meta.dirname, "neutralidad.prohibidos.json"), ".neutralidad.json"].find(existsSync);
if (!CONFIG || !existsSync(CONFIG)) {
  console.error("✗ sin configuración de términos prohibidos.");
  console.error("  Copia neutralidad.prohibidos.ejemplo.json a .neutralidad.json en la raíz del proyecto,");
  console.error("  rellénalo con los nombres/códigos de tu primer cliente, y vuelve a correr esto.");
  process.exit(2);
}
let PROHIBIDOS;
try { PROHIBIDOS = JSON.parse(readFileSync(CONFIG, "utf8")); }
catch (e) { console.error(`✗ ${CONFIG} no es JSON válido: ${e.message}`); process.exit(2); }
if (!Array.isArray(PROHIBIDOS) || !PROHIBIDOS.length) {
  console.error(`✗ ${CONFIG} debe ser un array no vacío de { id, patron }`);
  process.exit(2);
}
const REGLAS = PROHIBIDOS.map((r) => ({ id: r.id, re: new RegExp(r.patron, "i") }));

const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const IGNORAR = [
  /(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/|$)/,
  /(^|\/)db\/migrations\//,
  /schema-snapshot\.sql$/,
  /\.test\.[cm]?[jt]sx?$/,
  /(^|\/)e2e\//,
];

function listar(dir, acc = []) {
  let e;
  try { e = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const x of e) {
    const p = join(dir, x.name);
    if (x.isDirectory()) { listar(p, acc); continue; }
    if (EXT.has(extname(x.name))) acc.push(p);
  }
  return acc;
}

const hallazgos = [];
for (const raiz of raices) {
  if (!existsSync(raiz)) continue;
  for (const archivo of listar(resolve(raiz))) {
    const rel = relative(".", archivo).replaceAll("\\", "/");
    if (IGNORAR.some((p) => p.test(rel))) continue;
    const lineas = readFileSync(archivo, "utf8").split("\n");
    lineas.forEach((linea, i) => {
      for (const r of REGLAS) if (r.re.test(linea)) {
        hallazgos.push({ fichero: rel, linea: i + 1, id: r.id, texto: linea.trim().slice(0, 120) });
        break;
      }
    });
  }
}

if (json) { console.log(JSON.stringify(hallazgos, null, 2)); process.exit(hallazgos.length ? 1 : 0); }

if (!hallazgos.length) {
  console.log(`✓ neutralidad: sin acoplamiento a un cliente concreto en código runtime (${REGLAS.length} patrón(es) comprobado(s))`);
  process.exit(0);
}
console.log(`✗ ${hallazgos.length} línea(s) con acoplamiento a un cliente concreto:\n`);
for (const h of hallazgos) console.log(`    ${h.fichero}:${h.linea} [${h.id}]  ${h.texto}`);
console.log("\n  Usa el identificador de organización, branding por configuración o catálogos por");
console.log("  cliente — nunca una condición ni un valor literal de uno en código que sirve a todos.");
process.exit(1);
