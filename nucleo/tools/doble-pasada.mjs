#!/usr/bin/env node
/**
 * doble-pasada.mjs — cada migración NUEVA se aplica dos veces sobre una base efímera.
 *
 *   node doble-pasada.mjs --motor postgres --servidor postgresql://localhost:5432 \
 *        --preparar 'DATABASE_URL="$DOBLE_PASADA_URL" npm run db:migrate'
 *
 *   --motor      postgres | mysql
 *   --servidor   URL del servidor SIN base: postgresql://usuario@host:puerto · mysql://root@127.0.0.1:3306
 *   --preparar   orden (sh) que deja la base efímera con TODAS las migraciones, con el
 *                ejecutor del propio proyecto. Recibe en el entorno:
 *                  DOBLE_PASADA_URL · DOBLE_PASADA_BASE · DOBLE_PASADA_HOST · DOBLE_PASADA_PUERTO
 *                  DOBLE_PASADA_USUARIO · DOBLE_PASADA_CLAVE
 *   --dir        carpeta de migraciones (si no, se busca: db/migrations, db/mysql,
 *                prisma/migrations, src/db/migrations, apps/api/prisma/migrations)
 *   --base       rama o commit contra el que se decide qué es «nuevo» (por defecto
 *                origin/main, o main, o master: la primera que exista). Se usa su
 *                merge-base con HEAD. En CI: `github.event.before` o la base del PR, y el
 *                checkout con `fetch-depth: 0`.
 *
 * ## Qué comprueba, y por qué no basta con mirar el SQL
 *
 * `esquema.mjs idempotencia` lee el SQL y avisa del DDL que no aguanta un reintento. Eso
 * atrapa `CREATE TABLE` sin `IF NOT EXISTS`, pero no un `UPDATE` que la segunda vez choca
 * con un `CHECK`, ni una política que ya existe, ni un `USING` que sólo falla contra el
 * esquema real. Esto lo ejecuta: prepara la base con el ejecutor del proyecto —que aplica
 * cada migración una vez— y vuelve a ejecutar tal cual cada una de las nuevas. Si alguna
 * falla la segunda vez, un despliegue cortado a la mitad no se podría reintentar.
 *
 * Portado del gate H-127 de ElevenOffice (`assertNewMigrationsApply.ts`), que es quien lo
 * tenía, sin su dependencia de Drizzle ni de un snapshot.
 *
 * ## Lo que NO hace en silencio
 *
 * Si no puede saber qué migraciones son nuevas —no hay rama base—, FALLA. Un verificador
 * que no encuentra nada que verificar y dice «OK» es indistinguible de uno que verificó; a
 * ElevenOffice le pasó (OPS-02). Con cero migraciones nuevas lo dice y sale en 0 sin crear
 * base, que es lo rápido.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) =>
  a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1]]] : acc, []));

const salir = (msg, code = 1) => { console.error(`✗ ${msg}`); process.exit(code); };
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();

const motor = args.motor;
if (!['postgres', 'mysql'].includes(motor)) salir('--motor tiene que ser postgres o mysql', 2);
if (!args.servidor) salir('--servidor es obligatorio (URL del servidor sin base)', 2);
if (!args.preparar) salir('--preparar es obligatorio (la orden que aplica todas las migraciones)', 2);

const CANDIDATOS = ['db/migrations', 'db/mysql', 'prisma/migrations', 'src/db/migrations',
  'server/src/db/migrations', 'apps/api/prisma/migrations'];
const dir = args.dir ?? CANDIDATOS.find((d) => existsSync(d) && statSync(d).isDirectory());
if (!dir) salir(`no encuentro la carpeta de migraciones; indícala con --dir (probé ${CANDIDATOS.join(', ')})`, 2);

// ── Qué es nuevo ─────────────────────────────────────────────────────────────
// En CI la base es el commit anterior al push (`github.event.before`) o la base del PR:
// si se trabaja directamente en main, el merge-base con origin/main sería el propio HEAD
// y nunca habría nada nuevo. El primer push de una rama trae `before` = 0000…: se ignora.
const pedida = args.base && !/^0+$/.test(args.base) ? args.base : null;
const refs = pedida ? [pedida] : ['origin/main', 'main', 'origin/master', 'master'];
const base = refs.find((r) => { try { git('rev-parse', '--verify', '--quiet', `${r}^{commit}`); return true; } catch { return false; } });
if (!base) salir(`no hay rama base (${refs.join(', ')}): sin ella no sé qué migraciones son nuevas, y no voy a decir «OK» sin haber mirado`);
const desde = git('merge-base', base, 'HEAD');

const esMigracion = (f) => /\.sql$/.test(f);
const nuevas = [...new Set([
  ...git('diff', '--name-only', '--diff-filter=A', desde, '--', dir).split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', '--', dir).split('\n'),
])].filter((f) => f && esMigracion(f)).sort();

if (!nuevas.length) {
  console.log(`✓ 0 migraciones nuevas en ${dir} desde ${base} (${desde.slice(0, 8)}): nada que aplicar dos veces`);
  process.exit(0);
}
console.log(`${nuevas.length} migración(es) nueva(s) en ${dir} desde ${base} (${desde.slice(0, 8)}):`);
for (const f of nuevas) console.log(`  · ${f}`);

// ── Base efímera ─────────────────────────────────────────────────────────────
const servidor = new URL(args.servidor);
const nombre = `doble_pasada_${process.pid}_${Date.now().toString(36)}`;
const host = servidor.hostname || 'localhost';
const puerto = servidor.port || (motor === 'postgres' ? '5432' : '3306');
const usuario = decodeURIComponent(servidor.username || (motor === 'postgres' ? process.env.USER ?? 'postgres' : 'root'));
const clave = decodeURIComponent(servidor.password || '');
const url = `${servidor.protocol}//${servidor.username ? `${servidor.username}${servidor.password ? `:${servidor.password}` : ''}@` : ''}${host}:${puerto}/${nombre}`;

const pg = ['-h', host, '-p', puerto, '-U', usuario];
const my = ['-h', host, '-P', puerto, '-u', usuario, ...(clave ? [`-p${clave}`] : [])];
const envPg = { ...process.env, ...(clave ? { PGPASSWORD: clave } : {}) };
const correr = (orden, a, extra = {}) => spawnSync(orden, a, { encoding: 'utf8', env: { ...envPg, ...extra } });

const crear = motor === 'postgres'
  ? correr('createdb', [...pg, nombre])
  : correr('mysql', [...my, '-e', `CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`]);
if (crear.status !== 0) salir(`no pude crear la base efímera: ${(crear.stderr || crear.error?.message || '').trim()}`);

let fallos = 0;
try {
  const preparar = spawnSync('sh', ['-c', args.preparar], {
    stdio: 'inherit',
    env: { ...envPg, DOBLE_PASADA_URL: url, DOBLE_PASADA_BASE: nombre, DOBLE_PASADA_HOST: host,
      DOBLE_PASADA_PUERTO: puerto, DOBLE_PASADA_USUARIO: usuario, DOBLE_PASADA_CLAVE: clave },
  });
  if (preparar.status !== 0) {
    console.error('✗ la primera pasada —el ejecutor del proyecto— falló: la migración ni siquiera aplica una vez');
    fallos++;
  } else {
    console.log('\nSegunda pasada:');
    for (const f of nuevas) {
      const r = motor === 'postgres'
        ? correr('psql', [...pg, '-d', nombre, '-v', 'ON_ERROR_STOP=1', '-q', '-f', f])
        : spawnSync('mysql', [...my, nombre], { input: execFileSync('cat', [f]), encoding: 'utf8' });
      if (r.status === 0) console.log(`  ✓ ${f}`);
      else {
        fallos++;
        console.log(`  ✗ ${f}\n      ${(r.stderr || '').trim().split('\n').slice(0, 3).join('\n      ')}`);
      }
    }
  }
} finally {
  if (motor === 'postgres') correr('dropdb', [...pg, '--if-exists', nombre]);
  else correr('mysql', [...my, '-e', `DROP DATABASE IF EXISTS \`${nombre}\``]);
}

if (fallos) {
  console.error(`\n✗ ${fallos} fallo(s). Una migración que no aguanta la segunda pasada deja a medias el reintento de un despliegue cortado.`);
  process.exit(1);
}
console.log(`\n✓ las ${nuevas.length} migración(es) nueva(s) aguantan una segunda pasada`);
