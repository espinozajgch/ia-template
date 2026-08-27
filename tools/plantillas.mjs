#!/usr/bin/env node
/**
 * plantillas.mjs — que ningún ejemplo se lea como si fuera de este proyecto.
 *
 *   node plantillas.mjs [dir]     comprueba. Sale con 1 si algo falla.
 *
 * ## Qué atrapa, y por qué costó encontrarlo
 *
 * El kit instala hojas y prompts **ya rellenados**, a propósito: una hoja bien rellenada
 * enseña qué nivel de detalle hace falta y una plantilla vacía no enseña nada. El precio
 * es que lo instalado son las respuestas de OTRO proyecto —modelos, rutas de fichero,
 * hallazgos— con formato de verdad.
 *
 * **Eso no es contexto neutro: es contexto falso, y un agente lo obedece igual que el
 * bueno.** Se descubrió el 2026-08-26: el pack `app-ia` instalaba ocho hojas de tres
 * proyectos distintos —un bot de Discord, un recomendador de scouting y una cartelera de
 * pronósticos— sin que ninguna lo dijera, y `ARCHITECTURE_PROMPT.md` traía una tabla de
 * «ficheros donde aparecen los bugs» de una API que el proyecto destino no tiene.
 *
 * La regla es simple: **si un fichero instalable nombra un proyecto concreto, tiene que
 * llevar la advertencia.** No se prohíbe el ejemplo; se prohíbe el ejemplo mudo.
 *
 * ## Lo que este verificador NO hace
 *
 * No juzga si el contenido es bueno ni si está al día. Comprueba una sola cosa, la que se
 * puede comprobar sin leerlo: que lo que huele a proyecto ajeno esté marcado.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.argv[2] ?? ".";

/**
 * Dónde vive lo que se instala **como contenido del proyecto destino**.
 *
 * No es «todo lo que se instala», y la diferencia es la que hace útil a este verificador:
 *
 *   · `packs/*​/hojas/`   → `agente/sistema/`   las hojas del proyecto
 *   · `packs/*​/activos/` → `knowledge/wiki/`   la wiki del proyecto
 *   · `prompts/`         → `agente/prompts/`   lo que el agente EJECUTA
 *
 * Un `PACK.md` también se instala, pero se lee en la voz del kit —«este patrón viene de
 * hipismo»— y ahí nombrar el origen es **procedencia útil**, no contexto falso: dice que
 * el patrón salió de un sistema real y no de una idea. La primera versión de esto marcaba
 * los PACK.md y daba once avisos, siete de ellos buenos. Un verificador que grita por lo
 * correcto se apaga, y entonces no avisa de lo que sí importa.
 */
const ZONAS = ["packs/*/hojas", "packs/*/activos", "prompts"];

/** La marca que declara «esto es un ejemplo de otro sitio». */
const MARCA = /ES UN EJEMPLO|ES DE OTRO PROYECTO|<!-- ejemplo-rellenado -->/;

/**
 * Nombres propios de los proyectos de la casa.
 *
 * Va como lista explícita y no como heurística: adivinar «esto parece un nombre de
 * proyecto» daría falsos positivos en cada párrafo que cite una biblioteca. Cuando entre
 * un proyecto nuevo, se añade aquí — y que haya que tocarlo es la señal de que alguien
 * está metiendo su contenido en el kit.
 */
const PROYECTOS = [
  "futbot", "hipismo", "pulso", "ppsport", "My Own Business",
  "professional-football-hub", "APP_DUX", "APP_Osasuna",
];

function ficheros(dir, salida = []) {
  for (const e of readdirSync(dir)) {
    if (e === ".git" || e === "node_modules") continue;
    const completo = join(dir, e);
    if (statSync(completo).isDirectory()) ficheros(completo, salida);
    else if (e.endsWith(".md")) salida.push(completo);
  }
  return salida;
}

const mudos = [];
let revisados = 0;

/** Expande el `*` de las zonas sin depender de glob del intérprete de órdenes. */
function expandir(patron) {
  if (!patron.includes("*")) return [join(RAIZ, patron)];
  const [antes, despues] = patron.split("/*/");
  let hijos;
  try { hijos = readdirSync(join(RAIZ, antes)); } catch { return []; }
  return hijos.map((h) => join(RAIZ, antes, h, despues));
}

for (const zona of ZONAS.flatMap(expandir)) {
  let lista;
  try { lista = ficheros(zona); } catch { continue; }
  for (const f of lista) {
    const texto = readFileSync(f, "utf8");
    revisados += 1;
    if (MARCA.test(texto)) continue;
    const citados = PROYECTOS.filter((p) => texto.toLowerCase().includes(p.toLowerCase()));
    if (citados.length) mudos.push({ f: relative(RAIZ, f), citados });
  }
}

if (mudos.length) {
  console.log(`\n✗ ${mudos.length} fichero(s) instalables nombran un proyecto concreto y NO lo advierten:\n`);
  for (const m of mudos) console.log(`    ${m.f}\n      cita: ${m.citados.join(", ")}`);
  console.log("\n  Un ejemplo sin advertencia se instala como si fuera de quien lo recibe, y");
  console.log("  un agente lo obedece igual que al contexto bueno. Añade arriba del fichero");
  console.log("  la advertencia diciendo DE QUÉ PROYECTO salió y que hay que reemplazarlo.");
  console.log("  Si la mención es de pasada y no hay nada que reemplazar, reformula sin el");
  console.log("  nombre propio: el kit no debería necesitar nombrar a sus proyectos.\n");
  process.exit(1);
}

console.log(`✓ plantillas: ${revisados} fichero(s) instalables, ninguno cita un proyecto sin advertirlo`);
