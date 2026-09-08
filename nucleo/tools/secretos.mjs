#!/usr/bin/env node
/**
 * secretos.mjs — busca credenciales en los ficheros que git TRACKEA, y en la URL del remoto.
 *
 *   node secretos.mjs            los ficheros trackeados + el remoto
 *   node secretos.mjs --diff     solo lo que cambia contra origin (rápido, para pre-push)
 *   node secretos.mjs --json
 *
 * Un secreto que entra una vez al historial está comprometido para siempre: reescribir el
 * historial no borra los forks, los clones ni los backups. Por eso el escaneo va ANTES del
 * commit, no después del incidente. Lo único que arregla una fuga es rotar la credencial.
 *
 * Este escáner NO imprime el valor encontrado — solo dónde está y de qué tipo es.
 * Imprimirlo lo copiaría al log de CI, que es exactamente el problema que evita.
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const soloDiff = args.includes('--diff');

const PATRONES = [
  { id: 'github-pat',   re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,                  que: 'token de acceso de GitHub' },
  { id: 'github-fine',  re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/,                que: 'token de GitHub de alcance fino' },
  { id: 'aws-key',      re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,                   que: 'clave de acceso de AWS' },
  { id: 'aws-secret',   re: /aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/i, que: 'secreto de AWS' },
  { id: 'privada',      re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,  que: 'clave privada' },
  { id: 'slack',        re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,                que: 'token de Slack' },
  { id: 'stripe',       re: /\b[sr]k_live_[A-Za-z0-9]{20,}\b/,                 que: 'clave de Stripe en vivo' },
  { id: 'google-api',   re: /\bAIza[0-9A-Za-z_-]{35}\b/,                       que: 'clave de API de Google' },
  { id: 'openai',       re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,             que: 'clave de OpenAI' },
  { id: 'anthropic',    re: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/,                   que: 'clave de Anthropic' },
  { id: 'jwt',          re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./,que: 'JSON Web Token' },
  { id: 'url-cred',     re: /\b[a-z][a-z0-9+.-]*:\/\/[^\/\s:@]+:[^\/\s:@]+@/i, que: 'credenciales dentro de una URL' },
  { id: 'asignacion',   re: /\b(?:password|passwd|secret|api_?key|access_?token|auth_?token)\s*[=:]\s*['"][^'"\s${}]{12,}['"]/i, que: 'credencial asignada literal' },
];
// Lo que parece secreto y no lo es: ejemplos, plantillas y referencias a variables.
const FALSO_POSITIVO = /(EJEMPLO|EXAMPLE|PLACEHOLDER|CHANGEME|XXXXX|\bTU_|<[^>]+>|\$\{|process\.env|os\.environ|import\.meta\.env|\bdummy\b|\bfake\b|\btest[-_]?key\b|\bsecrets\.[A-Z_]+)/i;
// Una línea de comentario que ENSEÑA el formato de una URL no es una fuga.
const COMENTARIO = /^\s*(#|\/\/|\*|--|;)/;
// URL a una base local o con usuario/clave de juguete: es configuración de test, no un secreto.
const URL_INOCUA = /:\/\/(?:[^@\/\s]*@)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|host|db|postgres|mysql|redis)(?::\d+)?(?:[\/?#]|$)/i
                 || null;
const CRED_JUGUETE = /:\/\/(user|test|postgres|mysql|root|admin|usuario|demo):(pass|test|postgres|mysql|root|admin|clave|demo|password|secret)@/i;
const BINARIO = /\.(png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tgz|woff2?|ttf|eot|mp[34]|mov|so|dylib|dll|wasm|lock)$/i;
// .env de ejemplo lleva claves sin valor a propósito; los baselines guardan cuentas, no secretos.
const EXENTOS = /(^|\/)(\.env[.\w-]*\.(example|sample|template|dist)|.*-baseline\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock|poetry\.lock|Cargo\.lock)$/;
// El patrón débil `asignacion` produce ruido en tests (contraseñas de juguete) y en
// ficheros de traducción (la palabra "password" es una etiqueta, no una credencial).
// Los patrones fuertes —claves de AWS, tokens, claves privadas— sí se aplican en todas partes.
const SOLO_FUERTES = /(\.(test|spec)\.[jt]sx?$|(^|\/)(tests?|__tests__|e2e|fixtures|__fixtures__|locales?|i18n|lang)[\/.]|\.stories\.|\.md$)/;

const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };

/**
 * Exclusiones DEL PROYECTO, en `.secretosignore` de su raíz.
 *
 * Antes el consejo para un falso positivo era «añádelo a EXENTOS», que está en este mismo
 * fichero — es decir: editar una herramienta que la siguiente reinstalación del kit
 * sobrescribe. La exclusión se pierde sin avisar y la puerta vuelve a rojo, o peor: alguien
 * la vuelve a añadir sin recordar por qué.
 *
 * Formato, una por línea:
 *
 *     backend/tests/test_registro.py   # señuelos: la prueba comprueba que se redactan
 *
 * **El motivo es obligatorio.** Una exclusión sin un porqué es cómo una fuga real se silencia
 * para siempre: dentro de un año nadie sabe si aquella línea era un señuelo o una credencial,
 * y en la duda se deja como está.
 *
 * Y se imprimen al final. Una lista de exclusiones que no se ve es una lista que crece.
 */
function exclusionesDelProyecto() {
  const raiz = sh('git rev-parse --show-toplevel').trim();
  if (!raiz) return { rutas: [], sinMotivo: [] };
  let texto;
  try { texto = readFileSync(`${raiz}/.secretosignore`, 'utf8'); } catch { return { rutas: [], sinMotivo: [] }; }

  const rutas = [], sinMotivo = [];
  for (const [i, linea] of texto.split('\n').entries()) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const almohadilla = limpia.indexOf('#');
    const ruta = (almohadilla === -1 ? limpia : limpia.slice(0, almohadilla)).trim();
    const motivo = almohadilla === -1 ? '' : limpia.slice(almohadilla + 1).trim();
    if (!ruta) continue;
    if (!motivo) { sinMotivo.push(`${i + 1}: ${ruta}`); continue; }
    rutas.push({ ruta, motivo });
  }
  return { rutas, sinMotivo };
}

const { rutas: exclusiones, sinMotivo } = exclusionesDelProyecto();
if (sinMotivo.length) {
  console.error('✗ .secretosignore tiene exclusiones sin motivo:\n');
  for (const l of sinMotivo) console.error(`    ${l}`);
  console.error('\n  Escribe el porqué tras una almohadilla. Sin él, dentro de un año nadie');
  console.error('  sabrá si aquello era un señuelo o una credencial de verdad.');
  process.exit(2);
}
/* Coincide por prefijo: una línea puede nombrar un fichero o una carpeta entera. */
const excluido = (f) => exclusiones.find((e) => f === e.ruta || f.startsWith(e.ruta.replace(/\/*$/, '/')));
if (!sh('git rev-parse --is-inside-work-tree').trim()) {
  console.error('✗ esto no es un repositorio de git'); process.exit(2);
}

const hallazgos = [];

// 1 · el remoto (git remote -v lista fetch y push por separado: contar el remoto una vez)
//
// Se reutiliza el MISMO patrón `url-cred` que se aplica a los ficheros, y no uno propio.
// Aquí había uno propio con el dos puntos opcional —`[^\/\s:@]+:?[^\/\s:@]*@`— así que
// `https://usuario@github.com/…` salía como «credencial embebida». Un nombre de usuario en
// la URL no es una credencial: es lo que git escribe solo al clonar.
//
// El falso positivo no era inocuo. Dejaba la puerta en rojo de forma permanente en
// cualquier repositorio clonado así, y una puerta que siempre está roja por el mismo motivo
// es una puerta que se deja de mirar — que es justo lo contrario de para lo que existe.
// Encontrado el 2026-09-06 en este mismo repositorio.
const PATRON_URL_CRED = PATRONES.find((p) => p.id === 'url-cred').re;
const remotosSucios = new Set();
for (const linea of sh('git remote -v').trim().split('\n').filter(Boolean)) {
  const [nombre, url = ''] = linea.split(/\s+/);
  if (PATRON_URL_CRED.test(url)) remotosSucios.add(nombre);
}
for (const nombre of remotosSucios) {
  hallazgos.push({ donde: '.git/config', linea: 0, tipo: 'url-cred',
    que: `credencial embebida en la URL del remoto "${nombre}"` });
}

// 2 · los ficheros
const ficheros = (soloDiff
  ? sh('git diff --name-only --diff-filter=ACMR @{u}..HEAD') || sh('git diff --name-only --diff-filter=ACMR HEAD')
  : sh('git ls-files')
).trim().split('\n').filter(Boolean);

/*
 * Cero ficheros en un escaneo completo NO es «limpio»: es «no se ha mirado nada».
 *
 * `git ls-files` sólo lista lo que está en el índice. En un repositorio recién creado —o tras
 * un `git init` sin `git add`— devuelve vacío, y esto imprimía «✓ sin secretos (0 ficheros)»
 * con código 0 teniendo un token dentro del árbol de trabajo.
 *
 * Es exactamente lo que el kit le dice a los proyectos que no hagan: un guion que sale en
 * verde sin comprobar nada es peor que uno que falta, porque nadie vuelve a mirarlo. Y es el
 * PRIMER comando que el instalador manda ejecutar a quien acaba de instalar el kit.
 *
 * Sale con 2 y no con 1 para poder distinguirlo: 1 es «hay secretos», 2 es «no se pudo
 * comprobar». Un CI que trate los dos igual falla igual, y quien lea el log ve cuál fue.
 *
 * En `--diff` no aplica: cero ficheros ahí significa que no ha cambiado nada, que sí es una
 * respuesta legítima.
 */
if (!soloDiff && ficheros.length === 0) {
  const mensaje = 'no hay ficheros que escanear: `git ls-files` no devuelve nada.\n'
    + '  Si el repositorio es nuevo, haz `git add` antes — lo que no está en el índice no se mira.\n'
    + '  Esto NO es un «sin secretos»: es un «no se ha comprobado».';
  if (json) { console.log(JSON.stringify({ error: 'nada-que-escanear' }, null, 2)); }
  else { console.error(`✗ ${mensaje}`); }
  process.exit(2);
}

const excluidos = [];
for (const f of ficheros) {
  if (BINARIO.test(f) || EXENTOS.test(f)) continue;
  const razon = excluido(f);
  if (razon) { excluidos.push(f); continue; }
  let st; try { st = statSync(f); } catch { continue; }
  if (!st.isFile() || st.size > 2_000_000) continue;
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  if (src.includes('\0')) continue;
  src.split('\n').forEach((linea, i) => {
    if (linea.length > 2000) return;
    if (COMENTARIO.test(linea)) return;                 // un comentario que enseña el formato no filtra nada
    const debil = SOLO_FUERTES.test(f);
    for (const p of PATRONES) {
      if (debil && (p.id === 'asignacion' || p.id === 'url-cred')) continue;
      if (p.id === 'url-cred' && (URL_INOCUA.test(linea) || CRED_JUGUETE.test(linea))) continue;
      if (p.re.test(linea) && !FALSO_POSITIVO.test(linea)) {
        hallazgos.push({ donde: f, linea: i + 1, tipo: p.id, que: p.que });
        break;              // un hallazgo por línea basta
      }
    }
  });
}

if (json) { console.log(JSON.stringify(hallazgos, null, 2)); process.exit(hallazgos.length ? 1 : 0); }
/* Las exclusiones se imprimen SIEMPRE, con o sin hallazgos. Una lista que no se ve crece. */
const resumenExclusiones = () => {
  if (!excluidos.length) return;
  console.log(`\n  ${excluidos.length} fichero(s) excluido(s) por .secretosignore:`);
  for (const f of excluidos) console.log(`    ${f}  — ${excluido(f).motivo}`);
};

if (!hallazgos.length) {
  console.log(`✓ sin secretos${soloDiff ? ' en el diff' : ''}  (${ficheros.length} ficheros, remoto limpio)`);
  resumenExclusiones();
  process.exit(0);
}
console.log(`✗ ${hallazgos.length} posible(s) secreto(s):\n`);
for (const h of hallazgos) console.log(`    ${h.donde}${h.linea ? ':' + h.linea : ''}\n      ${h.que}  [${h.tipo}]`);
console.log(`
  NO se imprime el valor: copiarlo al log de CI es el mismo problema.

  Si es real:  1. ROTAR la credencial — es lo único que arregla una fuga.
               2. Sacarla del código y leerla del entorno.
               3. Reescribir el historial NO basta: los clones y forks la conservan.
  Si es un falso positivo: exclúyelo con una constante que el patrón no reconozca,
  o añádelo a \`.secretosignore\` en la raíz del proyecto, CON el motivo tras una
  almohadilla. Ese fichero es tuyo y sobrevive a reinstalar el kit; editar esta
  herramienta, no.`);
  resumenExclusiones();
process.exit(1);
