#!/usr/bin/env node
/**
 * pureza.mjs — comprueba que un puerto no importa infraestructura.
 *
 *   pureza.mjs <fichero-o-carpeta>...  [--permitir zod,type-fest]
 *
 * ── Por qué hace falta una comprobación automática ───────────────────────────
 *
 * Un puerto define QUÉ necesita la aplicación, no cómo se hace. En el momento en que
 * importa el SDK del proveedor, la clase del driver o `node:fs`, deja de ser un puerto y
 * pasa a ser esa implementación con otro nombre — y el día de la migración no sirve.
 *
 * Nadie lo hace a propósito. Pasa así: alguien necesita un tipo del SDK para tipar un
 * parámetro, lo importa «solo para el tipo», y seis meses después medio puerto habla el
 * idioma del proveedor. En la revisión de código no salta: es una línea de import.
 *
 * Por eso se comprueba solo.
 *
 * ── A qué se apunta, y a qué NO ─────────────────────────────────────────────
 *
 * Solo a los ficheros de PUERTO. Un adaptador importa infraestructura por definición —es
 * su trabajo— y un módulo de infraestructura, como el que sostiene el contexto de la
 * petición, también. Apuntar a todo el proyecto produce ruido y enseña a ignorar la
 * herramienta.
 *
 *     pureza.mjs src/puertos/            ← bien
 *     pureza.mjs src/                    ← mal: marcará todos los adaptadores
 *
 * Reconoce TypeScript/JavaScript y Python. Sin dependencias.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const pi = args.indexOf('--permitir');
const PERMITIDOS = new Set((pi >= 0 ? (args[pi + 1] || '') : '').split(',').map(s => s.trim()).filter(Boolean));
const rutas = args.filter((a, i) => !a.startsWith('--') && !(pi >= 0 && i === pi + 1));

if (!rutas.length) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 22).join('\n').replace(/^ \*\/?\s?/gm, ''));
  process.exit(2);
}

/**
 * Lo que un puerto NO puede importar.
 *
 * Se listan familias, no paquetes concretos: un puerto que importa CUALQUIER cosa de
 * `node:` ya está atado al entorno de ejecución, y uno que importa un SDK de nube ya está
 * atado a ese proveedor.
 */
const PROHIBIDO = [
  { re: /^node:/,                                  que: 'el entorno de ejecución' },
  { re: /^(fs|path|http|https|net|crypto|child_process|os|dns|tls|zlib|worker_threads)$/, que: 'el entorno de ejecución' },
  { re: /^(pg|mysql|mysql2|sqlite3|better-sqlite3|mongodb|redis|ioredis)$/, que: 'un motor de base de datos' },
  { re: /^(drizzle-orm|prisma|@prisma|typeorm|sequelize|knex|mongoose)$/,   que: 'un ORM' },
  { re: /^(@aws-sdk|aws-sdk|@google-cloud|@azure|firebase-admin)$/,         que: 'un proveedor de nube' },
  { re: /^(openai|@anthropic-ai|@google\/gener|cohere|replicate|langchain)$/, que: 'un proveedor de modelos' },
  { re: /^(express|fastify|koa|next|@nestjs|hapi)$/,                        que: 'un marco web' },
  { re: /^(axios|node-fetch|got|undici|httpx|requests|superagent)$/,        que: 'un cliente HTTP' },
  { re: /^(nodemailer|@sendgrid|resend|twilio)$/,                           que: 'un proveedor de mensajería' },
  { re: /^(boto3|botocore|psycopg2?|sqlalchemy|pymysql|pymongo)$/,          que: 'infraestructura (Python)' },
];

const RE_TS = [
  /^\s*import\s+(?:[\w*{}\n\r\t, ]+\s+from\s+)?['"]([^'"]+)['"]/gm,
  /^\s*export\s+(?:\*|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
const RE_PY = [
  /^\s*from\s+([.\w]+)\s+import\b/gm,
  /^\s*import\s+([.\w]+)/gm,
];

function ficheros(ruta, acc = []) {
  if (!existsSync(ruta)) return acc;
  if (statSync(ruta).isFile()) { acc.push(ruta); return acc; }
  for (const e of readdirSync(ruta, { withFileTypes: true })) {
    const p = join(ruta, e.name);
    if (/node_modules|__pycache__|\.git/.test(p)) continue;
    if (e.isDirectory()) ficheros(p, acc);
    else if (['.ts', '.tsx', '.js', '.mjs', '.py'].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const hallazgos = [];
let revisados = 0;

for (const ruta of rutas) {
  for (const f of ficheros(ruta)) {
    revisados++;
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    // Fuera comentarios: un import citado en la documentación del propio fichero no es
    // un import, y señalarlo enseña a ignorar la herramienta.
    const limpio = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|#).*$/gm, '')
                      .replace(/"""[\s\S]*?"""/g, '');
    const py = extname(f) === '.py';
    for (const re of py ? RE_PY : RE_TS) {
      re.lastIndex = 0;
      for (const m of limpio.matchAll(re)) {
        const spec = m[1];
        if (spec.startsWith('.')) continue;                      // relativo: es del dominio
        const raiz = py ? spec.split('.')[0] : (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
        if (PERMITIDOS.has(raiz) || PERMITIDOS.has(spec)) continue;
        const mal = PROHIBIDO.find(p => p.re.test(spec) || p.re.test(raiz));
        if (mal) hallazgos.push({ fichero: relative(process.cwd(), f), importa: spec, que: mal.que });
      }
    }
  }
}

if (json) { console.log(JSON.stringify({ revisados, hallazgos }, null, 2)); process.exit(hallazgos.length ? 1 : 0); }

if (!hallazgos.length) {
  console.log(`✓ ${revisados} fichero(s): ningún puerto importa infraestructura`);
  process.exit(0);
}
console.log(`✗ ${hallazgos.length} import(s) que atan el puerto a una implementación:\n`);
for (const h of hallazgos) console.log(`    ${h.fichero}\n      importa "${h.importa}" — eso es ${h.que}`);
console.log(`
  Un puerto define QUÉ necesita la aplicación, no cómo se hace. Al importar el SDK del
  proveedor deja de ser un puerto y pasa a ser esa implementación con otro nombre.

  Suele empezar por un TIPO: alguien necesita tipar un parámetro, lo importa «solo para el
  tipo», y seis meses después medio puerto habla el idioma del proveedor. La salida es
  declarar el tipo que la aplicación necesita, no el que el proveedor ofrece.

  Si un import es legítimo —una librería de validación, por ejemplo— decláralo:
      pureza.mjs <ruta> --permitir zod`);
process.exit(1);
