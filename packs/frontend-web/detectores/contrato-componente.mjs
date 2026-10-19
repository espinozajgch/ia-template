#!/usr/bin/env node
/**
 * contrato-componente.mjs — un rol ARIA o una marca de slot solo puede vivir en SU
 * componente canónico; en cualquier otro sitio es una reimplementación a mano.
 *
 *   node contrato-componente.mjs [carpeta...]     por defecto: src
 *   --reglas <config.json>                        por defecto: contrato-componente.reglas.json junto a este fichero,
 *                                                  si no existe: .contrato-componente.json en la raíz del proyecto
 *   --json
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * Un componente compartido —un portal de dropdown, un tooltip— resuelve algo que no se ve
 * a simple vista: recorte por `overflow`, posicionamiento, navegación por teclado, el rol
 * ARIA correcto. Reimplementarlo a mano en otra pantalla pierde todo eso en silencio, y el
 * detector `#5` del catálogo (`componentes-esquivados`) lo caza con `grep` — útil, pero un
 * `grep` no sabe leer un atributo JSX: no distingue `role="tooltip"` de un comentario que
 * dice "role tooltip", ni ve el atributo si el formateador lo puso en otra línea.
 *
 * Esto usa el compilador de TypeScript para leer el AST de verdad: el atributo, su nombre,
 * su valor literal, sin heurísticas de texto. Mismo principio que ya usan
 * `validate-modal-contract.mjs` y `validate-tooltips.mjs` del proyecto de origen.
 *
 * ── Qué prohibir, y por qué no viene con reglas por defecto ───────────────────
 *
 * El rol y el componente canónico son de TU sistema de diseño. Copia
 * [`contrato-componente.reglas.ejemplo.json`](contrato-componente.reglas.ejemplo.json),
 * ajusta a tus componentes compartidos y guárdalo como `.contrato-componente.json` en la
 * raíz del proyecto.
 *
 * Requiere el paquete `typescript` como dependencia del proyecto (cualquier app TSX ya
 * lo tiene). Si no está instalado, lo dice y sale — no intenta leer el archivo con texto.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join, relative, resolve, normalize } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const ri = args.indexOf("--reglas");
const raices = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--reglas");
if (!raices.length) raices.push("src");

const CONFIG = ri >= 0 ? args[ri + 1]
  : [join(import.meta.dirname, "contrato-componente.reglas.json"), ".contrato-componente.json"].find(existsSync);
if (!CONFIG || !existsSync(CONFIG)) {
  console.error("✗ sin reglas de contrato de componente.");
  console.error("  Copia contrato-componente.reglas.ejemplo.json a .contrato-componente.json en la raíz,");
  console.error("  ajusta el rol y el componente canónico a tu sistema de diseño, y vuelve a correr esto.");
  process.exit(2);
}
let REGLAS;
try { REGLAS = JSON.parse(readFileSync(CONFIG, "utf8")); }
catch (e) { console.error(`✗ ${CONFIG} no es JSON válido: ${e.message}`); process.exit(2); }
if (!Array.isArray(REGLAS) || !REGLAS.length) {
  console.error(`✗ ${CONFIG} debe ser un array no vacío de { id, canonico, detectar, mensaje }`);
  process.exit(2);
}

let ts;
try { ({ default: ts } = await import("typescript")); }
catch {
  console.error("✗ falta el paquete `typescript` como dependencia del proyecto.");
  process.exit(2);
}

const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/|$)/;
const ES_TEST = /\.(test|spec)\.tsx?$/;

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

function atributoLiteral(opening, source, nombre) {
  const attr = opening.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.getText(source) === nombre,
  );
  if (!attr?.initializer || !ts.isStringLiteral(attr.initializer)) return null;
  return attr.initializer.text;
}

const hallazgos = [];
for (const raiz of raices) {
  if (!existsSync(raiz)) continue;
  for (const archivo of listar(resolve(raiz))) {
    const rel = relative(".", archivo).replaceAll("\\", "/");
    const source = ts.createSourceFile(archivo, readFileSync(archivo, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visitar(node) {
      const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
      if (opening) {
        const rol = atributoLiteral(opening, source, "role");
        const clase = atributoLiteral(opening, source, "className") ?? "";
        const slot = atributoLiteral(opening, source, "data-slot");
        for (const regla of REGLAS) {
          if (normalize(rel) === normalize(regla.canonico)) continue;
          const d = regla.detectar ?? {};
          const coincideRol = d.rol && rol === d.rol;
          const coincideSlot = d.dataSlotContiene && slot?.includes(d.dataSlotContiene);
          const coincideClases = !d.clasesCoOcurrentes
            || (coincideRol && d.clasesCoOcurrentes.every((c) => clase.includes(c)));
          if ((coincideRol || coincideSlot) && coincideClases) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart());
            hallazgos.push({ fichero: rel, linea: line + 1, id: regla.id, mensaje: regla.mensaje });
          }
        }
      }
      ts.forEachChild(node, visitar);
    }
    visitar(source);
  }
}

if (json) { console.log(JSON.stringify(hallazgos, null, 2)); process.exit(hallazgos.length ? 1 : 0); }

if (!hallazgos.length) {
  console.log(`✓ contrato-componente: sin reimplementaciones fuera de su componente canónico (${REGLAS.length} regla(s))`);
  process.exit(0);
}
console.log(`✗ ${hallazgos.length} reimplementación(es) fuera de su componente canónico:\n`);
for (const h of hallazgos) console.log(`    ${h.fichero}:${h.linea} [${h.id}]  ${h.mensaje}`);
process.exit(1);
