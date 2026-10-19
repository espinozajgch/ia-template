#!/usr/bin/env node
/**
 * colores-por-fichero.mjs — trinquete de color POR FICHERO, no agregado.
 *
 *   colores-por-fichero.mjs baseline [dir...]   fija el techo de cada fichero con lo que hay hoy
 *   colores-por-fichero.mjs validate [dir...]   falla si algún fichero SUBIÓ por encima de su techo
 *   colores-por-fichero.mjs report   [dir...]   los ficheros con más hex, sin juzgar
 *
 *   --ext .ts,.tsx     extensiones a recorrer (por defecto .ts,.tsx,.jsx,.vue)
 *   --json
 *
 * ── POR QUÉ UN TRINQUETE POR FICHERO, HABIENDO YA UNO GLOBAL (`ratchet.sh`) ──
 *
 * El ratchet genérico del núcleo cuenta OCURRENCIAS TOTALES: baja de 341 a 340 y vale
 * igual que si el fichero que de verdad importa hubiera empeorado y otro, sin relación,
 * hubiera mejorado por casualidad. El mismo problema que resuelve
 * `fiabilidad-pruebas/suelo-cobertura.mjs` para cobertura, aquí para color: el agregado
 * miente por construcción.
 *
 * Nació en un proyecto con 99 hex crudos repartidos en catorce archivos, algunos
 * legítimos —una gráfica necesita una rampa de color que no es la paleta de la interfaz;
 * un PDF se dibuja fuera del navegador, donde no hay variables CSS que valgan— y otros no.
 * El trinquete global no distinguía un archivo del otro; este sí: cada archivo tiene su
 * propio techo, heredado de lo que tenía al ponerse esto. Uno puede tener menos; en cuanto
 * tiene más, falla.
 *
 * ── CUÁNDO USAR ESTO EN VEZ DEL RATCHET GENÉRICO ────────────────────────────
 *
 * Si el detector nº 1 de `DETECTORES.md` («colores») ya basta —un solo número para todo
 * el repositorio—, no hace falta esto. Úsalo cuando haya archivos con una razón legítima
 * para tener más hex que el resto (gráficas, exportación a PDF/imagen) y quieras que esa
 * excepción quede **declarada y acotada**, no mezclada en el total.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const args = process.argv.slice(2);
const accion = args[0];
const json = args.includes("--json");
const ei = args.indexOf("--ext");
const EXT = ei >= 0 ? args[ei + 1].split(",") : [".ts", ".tsx", ".jsx", ".vue"];
const raices = args.slice(1).filter((a) => !a.startsWith("--") && !EXT.includes(a));
if (!raices.length) raices.push("src", "app");

const DIR = process.env.RATCHET_DIR || ".ratchets";
const BASE = join(DIR, "colores-por-fichero.json");
const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|tokens|theme|design-system)(\/|$)/;
/** Seis dígitos con almohadilla. Basta: es la forma en que se cuelan. */
const HEX = /#[0-9a-fA-F]{6}\b/g;

function listar(dir, acc = []) {
  let e;
  try { e = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const x of e) {
    const p = join(dir, x.name);
    if (IGNORAR.test(p)) continue;
    if (x.isDirectory()) listar(p, acc);
    else if (EXT.includes(extname(x.name))) acc.push(p);
  }
  return acc;
}

const medir = () => {
  const m = {};
  for (const r of raices) {
    if (!existsSync(r)) continue;
    for (const f of listar(r)) {
      const rel = relative(".", f).split("\\").join("/");
      m[rel] = (readFileSync(f, "utf8").match(HEX) ?? []).length;
    }
  }
  return m;
};

const actual = medir();
const total = Object.keys(actual).length;
if (!total) {
  console.error(`✗ colores-por-fichero: no hay ficheros analizables en ${raices.join(", ")} (${EXT.join(",")})`);
  process.exit(2);
}

if (accion === "baseline") {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(BASE, JSON.stringify({ ficheros: actual }, null, 2) + "\n");
  const conHex = Object.values(actual).filter((n) => n > 0).length;
  console.log(`línea base fijada: ${total} ficheros, ${conHex} con hex crudo`);
  console.log("Cuando un archivo legítimo gane un hex (una rampa nueva, un export nuevo), re-baseliniza");
  console.log("y di el motivo en el commit. Cuando llegue a cero, desaparece solo de la línea base.");
  process.exit(0);
}

if (accion === "report") {
  const top = Object.entries(actual).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (json) { console.log(JSON.stringify(top, null, 2)); process.exit(0); }
  if (!top.length) { console.log("ningún hex crudo en el árbol analizado"); process.exit(0); }
  console.log(`Los ${top.length} ficheros con más hex crudo:\n`);
  for (const [f, n] of top) console.log(`  ${String(n).padStart(4)}  ${f}`);
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
const holgados = [];
for (const [f, n] of Object.entries(actual)) {
  const t = techo[f] ?? 0;
  if (n > t) excedidos.push([f, t, n]);
  else if (t > 0 && n < t) holgados.push([f, t, n]);
}

if (json) { console.log(JSON.stringify({ excedidos, holgados }, null, 2)); process.exit(excedidos.length ? 1 : 0); }

if (!excedidos.length) {
  console.log(`✓ color: ningún fichero superó su techo  (${total} analizados)`);
  if (holgados.length) {
    console.log(`\n  ${holgados.length} fichero(s) bajaron — re-baseliniza para consolidar:`);
    for (const [f, t, n] of holgados) console.log(`    ${f}: ${n} (techo ${t})`);
  }
  process.exit(0);
}
console.log(`✗ ${excedidos.length} fichero(s) con más hex crudo del permitido:\n`);
for (const [f, t, n] of excedidos) console.log(`    ${f}: ${n} (techo ${t})`);
console.log("\n  El color sale de los tokens del design system, no de un hex nuevo.");
console.log("  Si de verdad hace falta uno —una rampa de gráfica, un export que se dibuja fuera del");
console.log("  navegador— sube el techo de ese fichero con `baseline` y di el motivo en el commit.");
process.exit(1);
