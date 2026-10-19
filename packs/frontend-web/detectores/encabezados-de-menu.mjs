#!/usr/bin/env node
/**
 * encabezados-de-menu.mjs — una página alcanzable desde el menú principal no repite el
 * título que el propio menú o la barra superior ya muestran.
 *
 *   node encabezados-de-menu.mjs
 *   --config <config.json>   por defecto: encabezados-de-menu.config.json junto a este
 *                            fichero, si no existe: .encabezados-de-menu.json en la raíz
 *   --json
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * El menú y la barra superior ya identifican en qué sección está quien usa la aplicación.
 * Un `<h1>` (o el componente de encabezado del sistema de diseño) repitiendo el mismo
 * título dentro del contenido es redundante en pantalla grande y ocupa espacio que en
 * móvil ya es escaso — y nadie lo nota en revisión porque, mirado solo, el título de la
 * página «parece» correcto.
 *
 * ── Por qué una lista declarada y no un barrido de todo `src/` ────────────────
 *
 * No toda pantalla tiene este problema: un modal, un panel lateral o una página que NO
 * cuelga del menú principal puede necesitar su propio encabezado. La regla aplica
 * exactamente a las páginas que el menú ya titula, así que el proyecto las declara — igual
 * que declara qué rol ARIA está reservado a un componente en `contrato-componente.mjs`.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const ci = args.indexOf("--config");

const CONFIG = ci >= 0 ? args[ci + 1]
  : [join(import.meta.dirname, "encabezados-de-menu.config.json"), ".encabezados-de-menu.json"].find(existsSync);
if (!CONFIG || !existsSync(CONFIG)) {
  console.error("✗ sin configuración de páginas de menú.");
  console.error("  Copia encabezados-de-menu.config.ejemplo.json a .encabezados-de-menu.json en la raíz,");
  console.error("  lista las páginas que cuelgan de tu menú principal, y vuelve a correr esto.");
  process.exit(2);
}
let CFG;
try { CFG = JSON.parse(readFileSync(CONFIG, "utf8")); }
catch (e) { console.error(`✗ ${CONFIG} no es JSON válido: ${e.message}`); process.exit(2); }
const paginas = CFG.paginas ?? [];
const prohibido = (CFG.prohibido ?? []).map((p) => new RegExp(p));
if (!paginas.length || !prohibido.length) {
  console.error(`✗ ${CONFIG} debe declarar "paginas" (array no vacío) y "prohibido" (array no vacío de patrones)`);
  process.exit(2);
}

const hallazgos = [];
const noEncontradas = [];
for (const pagina of paginas) {
  const ruta = resolve(pagina);
  if (!existsSync(ruta)) { noEncontradas.push(pagina); continue; }
  const lineas = readFileSync(ruta, "utf8").split("\n");
  lineas.forEach((linea, i) => {
    for (const patron of prohibido) if (patron.test(linea)) {
      hallazgos.push({ pagina, linea: i + 1, texto: linea.trim().slice(0, 140) });
      break;
    }
  });
}

if (json) { console.log(JSON.stringify({ hallazgos, noEncontradas }, null, 2)); process.exit(hallazgos.length ? 1 : 0); }

if (noEncontradas.length) console.log(`⚠ ${noEncontradas.length} página(s) listada(s) y no encontrada(s) — ¿se movieron?: ${noEncontradas.join(", ")}\n`);

if (!hallazgos.length) {
  console.log(`✓ encabezados-de-menu: ${paginas.length} página(s) de menú sin encabezado repetido`);
  process.exit(0);
}
console.log(`✗ ${hallazgos.length} encabezado(s) repetido(s) en una página del menú:\n`);
for (const h of hallazgos) console.log(`    ${h.pagina}:${h.linea}  ${h.texto}`);
console.log("\n  El menú y la barra superior ya identifican la sección; no repitas el título dentro.");
process.exit(1);
