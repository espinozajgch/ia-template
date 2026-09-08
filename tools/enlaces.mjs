#!/usr/bin/env node
/**
 * enlaces.mjs — ningún enlace del kit puede romperse UNA VEZ INSTALADO.
 *
 *   node tools/enlaces.mjs <ruta-del-proyecto-instalado>
 *
 * ── Por qué se comprueba en el proyecto y no en el kit ─────────────────────
 *
 * El kit tiene ficheros escritos desde DOS posiciones distintas, y esa es la fuente de casi
 * todos sus enlaces rotos:
 *
 *   · `README.md`, `AGENTS.md` de la raíz, `docs/` → se quedan aquí, y sus rutas son de aquí.
 *   · `nucleo/*`, `packs/*`, `prompts/*`          → se INSTALAN, y sus rutas tienen que ser
 *                                                    correctas allí, no aquí.
 *
 * Un enlace como `../skills/tarea/SKILL.md` desde `nucleo/protocolo/` resuelve perfectamente
 * en el kit —`nucleo/skills/` existe— y apunta a `agente/skills/`, que no existe, en todos
 * los proyectos instalados. Comprobarlo aquí lo da por bueno; comprobarlo allí lo caza.
 *
 * Ha pasado tres veces: el enlace de la skill de preproducción al checklist, las cuatro
 * referencias a skills de `00_CICLO.md`, y las rutas del checklist a `packs/`.
 *
 * Sale con 2 si no puede comprobar —la convención del kit— y con 1 si encuentra enlaces rotos.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const raiz = process.argv[2];
if (!raiz) { console.error('✗ falta la ruta del proyecto instalado'); process.exit(2); }
try { if (!statSync(raiz).isDirectory()) throw 0; }
catch { console.error(`✗ no es un directorio: ${raiz}`); process.exit(2); }

/*
 * Lo que NO es del proyecto.
 *
 * Un README de una biblioteca de terceros con un enlace roto no es un problema de este
 * proyecto, y contarlo sepulta los que sí lo son: en futbot-v2, `.venv/` aportaba la mitad
 * del ruido y escondía dos enlaces reales de sus propias skills.
 *
 * La lista cubre los ecosistemas que aparecen en los proyectos de la casa —Node, Python,
 * Rust, PHP— porque una lista corta se queda corta justo en el proyecto que no la tenía.
 */
const SALTAR = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'out',
  '.venv', 'venv', 'env', 'site-packages', '__pycache__',
  '.mypy_cache', '.pytest_cache', '.ruff_cache', '.tox',
  'vendor', 'target', '.gradle', '.terraform', '.codebase-memory',
]);
const docs = [];
(function recorrer(dir) {
  for (const n of readdirSync(dir)) {
    if (SALTAR.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (/\.(md|mdc)$/.test(n)) docs.push(p);
  }
})(raiz);

if (docs.length === 0) {
  console.error(`✗ no hay documentos que comprobar en ${raiz}`);
  console.error('  Esto NO es «sin enlaces rotos»: es «no se ha comprobado».');
  process.exit(2);
}

const rotos = [];
for (const doc of docs) {
  const texto = readFileSync(doc, 'utf8');
  for (const m of texto.matchAll(/\]\((?!https?:|#|mailto:|data:)([^)#\s]+)/g)) {
    const destino = m[1];
    /* Un marcador de plantilla no es un enlace roto: es un hueco a rellenar, y el detector
       de plantillas ya lo vigila por su lado. */
    if (/[[\]<>{]/.test(destino)) continue;
    try { statSync(resolve(dirname(doc), destino)); }
    catch { rotos.push([relative(raiz, doc), destino]); }
  }
}

if (rotos.length === 0) {
  console.log(`✓ sin enlaces rotos  (${docs.length} documentos)`);
  process.exit(0);
}
console.log(`✗ ${rotos.length} enlace(s) roto(s) en el proyecto instalado:\n`);
for (const [doc, destino] of rotos) console.log(`    ${doc}\n      → ${destino}`);
console.log(`
  Recuerda que un fichero de \`nucleo/\` o \`packs/\` se instala en OTRO sitio: sus rutas
  relativas tienen que ser correctas allí. Si ninguna posición funciona para las dos, escribe
  la ruta como texto en vez de como enlace, y di desde dónde se cuenta.`);
process.exit(1);
