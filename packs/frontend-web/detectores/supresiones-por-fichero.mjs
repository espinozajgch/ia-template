#!/usr/bin/env node
/**
 * supresiones-por-fichero.mjs — trinquete de `any` explícito POR FICHERO, no agregado.
 *
 *   supresiones-por-fichero.mjs baseline [dir...]   fija el techo de cada fichero con lo que hay hoy
 *   supresiones-por-fichero.mjs validate [dir...]   falla si algún fichero SUBIÓ por encima de su techo
 *   supresiones-por-fichero.mjs report   [dir...]   los ficheros con más `any`, sin juzgar
 *
 *   --ext .ts,.tsx     extensiones a recorrer (por defecto .ts,.tsx)
 *   --json
 *
 * ── Por qué esto y no el detector «supresiones» del catálogo ────────────────
 *
 * El detector nº 8 de `DETECTORES.md` es un `grep` agregado: cuenta `any`/`@ts-ignore`/
 * `@ts-nocheck` en TODO el árbol con un solo número. Sirve mientras nadie necesite
 * saber EN QUÉ ARCHIVO se coló — y ese «nadie necesita saberlo» dura hasta el día en
 * que hace falta.
 *
 * Nació en un backend TypeScript SIN ESLint —ni siquiera como dependencia—, donde el
 * trinquete de `any` del frontend (vía ESLint) simplemente no alcanzaba: el backend no
 * tenía NADA vigilando sus `any`. Mismo patrón que `colores-por-fichero.mjs`: un techo
 * por archivo, heredado de lo que había al ponerse esto, que solo puede bajar.
 *
 * No es un encargo de arreglar los `any` que ya existen — muchos son tests, donde un
 * doble o un mock tipado a `any` suele ser razonable. Lo que esto impide es que MAÑANA
 * sean más.
 *
 * ── Qué cuenta como `any` ─────────────────────────────────────────────────────
 *
 * El token en posición de tipo, en cualquiera de sus formas (`: any`, `as any`,
 * `any[]`, `<any>`, `Record<string, any>`…). Se descartan antes los comentarios y los
 * literales de cadena: la palabra «any» dentro de un mensaje de error o de una URL no
 * es un tipo. Es un barrido léxico, no un parser — no pretende entender TypeScript,
 * solo evitar los falsos positivos evidentes.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const args = process.argv.slice(2);
const accion = args[0];
const json = args.includes("--json");
const ei = args.indexOf("--ext");
const EXT = ei >= 0 ? args[ei + 1].split(",") : [".ts", ".tsx"];
const raices = args.slice(1).filter((a) => !a.startsWith("--") && !EXT.includes(a));
if (!raices.length) raices.push("src");

const DIR = process.env.RATCHET_DIR || ".ratchets";
const BASE = join(DIR, "supresiones-por-fichero.json");
const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/|$)/;

/** Quita comentarios y literales de cadena para que solo quede código. */
function sinComentariosNiCadenas(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:\\.|[^`\\])*`/g, "''")
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, "''");
}
const contarAny = (src) => (sinComentariosNiCadenas(src).match(/\bany\b/g) ?? []).length;

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
    for (const f of listar(r)) m[relative(".", f).split("\\").join("/")] = contarAny(readFileSync(f, "utf8"));
  }
  return m;
};

const actual = medir();
const total = Object.keys(actual).length;
if (!total) {
  console.error(`✗ supresiones-por-fichero: no hay ficheros analizables en ${raices.join(", ")} (${EXT.join(",")})`);
  process.exit(2);
}

if (accion === "baseline") {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(BASE, JSON.stringify({ ficheros: actual }, null, 2) + "\n");
  const conAny = Object.values(actual).filter((n) => n > 0).length;
  console.log(`línea base fijada: ${total} ficheros, ${conAny} con \`any\` explícito`);
  console.log("El número queda congelado: puede bajar, no subir. Si un archivo baja, re-baseliniza para consolidar.");
  process.exit(0);
}

if (accion === "report") {
  const top = Object.entries(actual).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (json) { console.log(JSON.stringify(top, null, 2)); process.exit(0); }
  if (!top.length) { console.log("ningún `any` explícito en el árbol analizado"); process.exit(0); }
  console.log(`Los ${top.length} ficheros con más \`any\`:\n`);
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
  console.log(`✓ supresiones: ningún fichero superó su techo de \`any\`  (${total} analizados)`);
  if (holgados.length) {
    console.log(`\n  ${holgados.length} fichero(s) bajaron — re-baseliniza para consolidar:`);
    for (const [f, t, n] of holgados) console.log(`    ${f}: ${n} (techo ${t})`);
  }
  process.exit(0);
}
console.log(`✗ ${excedidos.length} fichero(s) con más \`any\` del permitido:\n`);
for (const [f, t, n] of excedidos) console.log(`    ${f}: ${n} (techo ${t})`);
console.log("\n  El número está congelado: puede bajar, no subir.");
console.log("  Tipa el valor — si no lo conoces, `unknown` + estrechamiento suele bastar.");
console.log("  Si el `any` es deliberado y está justificado: re-baseliniza con `baseline`.");
process.exit(1);
