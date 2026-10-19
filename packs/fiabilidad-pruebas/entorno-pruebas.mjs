#!/usr/bin/env node
/**
 * entorno-pruebas.mjs — caza las pruebas que sólo pueden pasar en una máquina.
 *
 *   entorno-pruebas.mjs [carpeta...]        por defecto: tests/
 *   --patron <nombre>=<regex>               patrón extra, propio del proyecto (repetible)
 *   --json
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * Nació el día que se empujaron 146 commits que nunca habían pasado por
 * integración continua. La primera corrida destapó cinco fallos, y cuatro eran
 * el mismo error con cuatro caras:
 *
 *   · una prueba se conectaba a una base por un host/puerto escrito a mano en
 *     vez de leer la variable de entorno que usa la aplicación real, y caía al
 *     puerto de desarrollo -> ECONNREFUSED 127.0.0.1:xxxx en cualquier otra
 *     máquina;
 *   · otra daba por sembrados unos identificadores que solo existen en datos
 *     de demostración que la integración no ejecuta;
 *   · un listón de Lighthouse calibrado en un Mac -> 93 en local, 69 y 75 en el
 *     runner, contra un mínimo de 88;
 *   · un `setTimeout(60)` para que dos peticiones se solaparan -> verde en una
 *     corrida y rojo en la siguiente, con el mismo código.
 *
 * Las cuatro compartían firma: **verde en el portátil, imposible en cualquier
 * otra parte**. Y las cuatro sobrevivieron meses porque el único sitio donde se
 * distinguen no se estaba ejecutando.
 *
 * Un proyecto puede tener ya trinquetes para tamaño, orden de migraciones,
 * sellos y cobertura, y ninguno para esto — que en la cantera de este kit es lo
 * que más veces ha fallado.
 *
 * ── LO QUE MIRA, Y LO QUE NO ────────────────────────────────────────────────
 *
 * Dos reglas por defecto, las dos con casi ningún falso positivo. Una regla que
 * empieza con veinte incumplimientos se desactiva el primer día; éstas nacen en
 * verde.
 *
 * NO se prohíbe `localhost`/`127.0.0.1` como valor de RESPALDO:
 * `process.env.X ?? "...localhost:5432..."` es correcto —es lo que se usa
 * cuando no hay variable—. Lo que se caza es la conexión escrita a mano **sin
 * ningún** `process.env` alrededor: eso es lo que no puede resolver nada fuera
 * del portátil de quien la escribió.
 *
 * NO se prohíbe `setTimeout` en un bucle de sondeo con techo: esperar a que una
 * condición se cumpla, comprobándola, es la forma correcta. Lo que se caza es
 * dormir una vez y confiar en que el mundo haya avanzado.
 *
 * Para lo que la regla no puede saber, hay salida explícita: una línea con
 * `trinquete-entorno: permitido` y el motivo, en el mismo bloque.
 *
 * ── PATRONES PROPIOS DEL PROYECTO ───────────────────────────────────────────
 *
 * El caso que motivó esto era más preciso que la regla genérica de abajo: una
 * prueba se conectaba como `pulso_app@` y no leía `APP_DATABASE_URL`. Eso es
 * conocimiento del proyecto —el nombre del usuario de base de datos, el nombre
 * de la variable correcta— que esta herramienta no puede adivinar. Se declara
 * así:
 *
 *   entorno-pruebas.mjs --patron 'identidad=pulso_app@(?!.*APP_DATABASE_URL)'
 *
 * El nombre (`identidad`) es solo para el mensaje; la regex se evalúa contra el
 * texto completo del fichero.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const raices = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--patron");
if (!raices.length) raices.push("tests");

const patronesPropios = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] !== "--patron") continue;
  const [nombre, ...resto] = (argv[i + 1] ?? "").split("=");
  if (nombre && resto.length) patronesPropios.push({ nombre, regex: new RegExp(resto.join("=")) });
}

const PERMITIDO = /trinquete-entorno:\s*permitido/;

/** Conexión local escrita a mano: esquema conocido o `usuario@host` con puerto,
 *  apuntando a localhost/127.0.0.1, SIN `process.env` en los 80 caracteres previos. */
const CONEXION_LOCAL = /(?:[a-z][\w+-]*:\/\/|\b[\w.-]+@)(?:localhost|127\.0\.0\.1)(?::\d{2,5})?/gi;

function ficheros(dir, acc = []) {
  let entradas;
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entradas) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { ficheros(p, acc); continue; }
    if (/\.(test\.)?[mc]?[jt]s$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** Trocea por `test("...")` para poder razonar dentro de una prueba y no del fichero. */
function bloques(fuente) {
  const cortes = [...fuente.matchAll(/\b(?:test|it)\(\s*["'`]/g)].map((m) => m.index);
  if (!cortes.length) return [{ inicio: 0, texto: fuente }];
  return cortes.map((inicio, i) => ({
    inicio,
    texto: fuente.slice(inicio, cortes[i + 1] ?? fuente.length),
  }));
}

const linea = (fuente, indice) => fuente.slice(0, indice).split("\n").length;

const hallazgos = [];

for (const raiz of raices) {
  let esDir = false;
  try { esDir = statSync(raiz).isDirectory(); } catch { continue; }
  for (const fichero of esDir ? ficheros(raiz) : [raiz]) {
    const fuente = readFileSync(fichero, "utf8");
    const rel = relative(process.cwd(), fichero);

    /* Los dos escapes se miran por BLOQUE (la prueba donde cae la coincidencia), no por
       fichero entero: un escape declarado en una prueba no puede silenciar las demás. */
    for (const b of bloques(fuente)) {
      const permitidoAqui = PERMITIDO.test(b.texto);

      /* REGLA 1 — conexión local escrita a mano, sin `process.env` cerca. */
      if (!permitidoAqui) {
        for (const m of b.texto.matchAll(CONEXION_LOCAL)) {
          const antes = b.texto.slice(Math.max(0, m.index - 80), m.index);
          if (/process\.env/.test(antes)) continue;
          hallazgos.push({
            fichero: rel, linea: linea(fuente, b.inicio + m.index),
            que: `conexión local escrita a mano (\`${m[0]}\`), sin leer de \`process.env\``,
            porque: "la integración continua no tiene ese host ni ese puerto. Si la aplicación real\n"
              + "      resuelve esta conexión desde una variable de entorno, la prueba debe leer la\n"
              + "      misma variable — no repetir el valor que solo existe en un portátil.",
          });
        }
      }

      /* REGLA 2 — un solape coordinado con el reloj. */
      if (!permitidoAqui) {
        const dormida = b.texto.match(/setTimeout\([^,)]+,\s*(\d{2,})\s*\)/);
        const conTecho = dormida
          && /Promise\.race\(/.test(b.texto.slice(Math.max(0, b.texto.indexOf(dormida[0]) - 300),
                                                  b.texto.indexOf(dormida[0])));
        if (dormida && !conTecho && /Promise\.all\(/.test(b.texto)) {
          hallazgos.push({
            fichero: rel, linea: linea(fuente, b.inicio + b.texto.indexOf(dormida[0])),
            que: `solape coordinado con un reloj (setTimeout de ${dormida[1]} ms junto a Promise.all)`,
            porque: "la prueba mide una ventana de tiempo, no un comportamiento. En una máquina\n"
              + "      cargada la ventana no se cumple y la prueba cae al azar. Se coordina con\n"
              + "      promesas: que la primera no suelte hasta que la prueba se lo diga.",
          });
        }
      }
    }

    /* PATRONES PROPIOS — conocimiento del proyecto que esta herramienta no tiene.
       El escape se mira en las 200 columnas alrededor de la coincidencia, no en el
       fichero entero, por el mismo motivo que arriba. */
    for (const { nombre, regex } of patronesPropios) {
      const m = regex.exec(fuente);
      if (m && PERMITIDO.test(fuente.slice(Math.max(0, m.index - 200), m.index + 200))) continue;
      if (m) hallazgos.push({
        fichero: rel, linea: linea(fuente, m.index),
        que: `patrón propio «${nombre}»`,
        porque: `declarado con --patron '${nombre}=${regex.source}'`,
      });
    }
  }
}

if (json) { console.log(JSON.stringify(hallazgos, null, 2)); process.exit(hallazgos.length ? 1 : 0); }

if (!hallazgos.length) {
  console.log("✓ entorno: ninguna prueba atada a la máquina de quien la escribió");
  process.exit(0);
}

console.log(`✗ ${hallazgos.length} prueba(s) que dependen del entorno de quien las escribió:\n`);
for (const h of hallazgos) {
  console.log(`    ${h.fichero}:${h.linea}`);
  console.log(`      ${h.que}`);
  console.log(`      ${h.porque}\n`);
}
console.log("  Si el caso es legítimo, decláralo con el motivo en el mismo bloque:");
console.log("      /* trinquete-entorno: permitido — <por qué esto sí puede correr en cualquier sitio> */");
process.exit(1);
