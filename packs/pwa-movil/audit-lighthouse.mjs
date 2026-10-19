#!/usr/bin/env node
/**
 * Auditoría Lighthouse de la build ya compilada, servida precomprimida.
 *
 *   node audit-lighthouse.mjs                       # móvil, perfil por defecto
 *   node audit-lighthouse.mjs --desktop
 *   node audit-lighthouse.mjs --dist dist           # ruta de la build (por defecto: la detecta)
 *   node audit-lighthouse.mjs --ruta /app            # qué página medir (por defecto: /)
 *   node audit-lighthouse.mjs --puerto 4173
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * Medir esto a mano sale mal de una forma silenciosa: un servidor estático sin
 * compresión entrega el JavaScript en crudo, y Lighthouse informa entonces de un
 * sitio varias veces más pesado que el real — en el proyecto de origen, 65 en
 * rendimiento sin comprimir contra 95 comprimido, sobre el mismo build. Aquí los
 * archivos se precomprimen antes de servirlos, que es lo que hace cualquier
 * despliegue real.
 *
 * Requiere el binario de Lighthouse como dependencia del proyecto
 * (`node_modules/.bin/lighthouse`): se invoca el binario local, no `npx`, porque
 * `npx` resuelve contra el registro y en un entorno sin red se queda esperando
 * sin decir nada.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync, mkdtempSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const argv = process.argv.slice(2);
const arg = (nombre, porDefecto = null) => {
  const i = argv.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : argv[i + 1];
};
const isDesktop = argv.includes("--desktop");
const PUERTO = Number(arg("puerto", 4173));
const RUTA = arg("ruta", "/");

/** Candidatos habituales, en orden. El primero que exista gana. */
const DIST = resolve(arg("dist") ?? ["dist", "build", "apps/web/dist", "out", "public"]
  .find((d) => { try { return statSync(resolve(d)).isDirectory(); } catch { return false; } }) ?? "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".xml", ".txt"]);

try {
  statSync(DIST);
} catch {
  console.error(`No hay build en ${DIST}. Compílala antes, o pasa la ruta con --dist <carpeta>.`);
  process.exit(1);
}

/** Todo el build en memoria, con su variante comprimida ya calculada. */
const files = new Map();
const collect = (dir, prefix = "") => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { collect(full, `${prefix}/${entry.name}`); continue; }
    const extension = extname(entry.name);
    const body = readFileSync(full);
    files.set(`${prefix}/${entry.name}`, {
      body,
      gzip: COMPRESSIBLE.has(extension) ? gzipSync(body, { level: 9 }) : null,
      type: TYPES[extension] ?? "application/octet-stream",
    });
  }
};
collect(DIST);

const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  // Una SPA resuelve sus rutas en el navegador: lo desconocido devuelve el index.
  const file = files.get(path) ?? files.get(`${path}/index.html`) ?? files.get("/index.html");
  const wantsGzip = /\bgzip\b/.test(request.headers["accept-encoding"] ?? "");
  const payload = wantsGzip && file.gzip ? file.gzip : file.body;
  response.writeHead(200, {
    "content-type": file.type,
    "content-length": payload.length,
    ...(payload === file.gzip ? { "content-encoding": "gzip", vary: "accept-encoding" } : {}),
    "cache-control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  response.end(request.method === "HEAD" ? undefined : payload);
});

// Sin este rechazo, un puerto ocupado por una auditoría anterior deja la promesa
// sin resolver: el script se queda colgado sin imprimir nada y parece que
// Lighthouse tarda, cuando en realidad no ha llegado a arrancar.
await new Promise((done, fail) => {
  server.once("error", (error) => {
    fail(error.code === "EADDRINUSE"
      ? new Error(`El puerto ${PUERTO} está ocupado. Cierra la auditoría anterior: lsof -ti tcp:${PUERTO} | xargs kill`)
      : error);
  });
  server.listen(PUERTO, done);
});
console.log(`Sirviendo ${files.size} archivos de ${DIST} en http://localhost:${PUERTO} (${isDesktop ? "escritorio" : "móvil"})`);

const reportPath = join(mkdtempSync(join(tmpdir(), "lh-")), "report.json");
try {
  // `spawn` y no una variante síncrona: el servidor de arriba vive en este mismo
  // proceso, y una llamada bloqueante deja el bucle de eventos parado mientras
  // Lighthouse pide la página — un interbloqueo perfecto, sin ningún error.
  await new Promise((done, fail) => {
    const lighthouse = spawn(resolve("node_modules/.bin/lighthouse"), [
      `http://localhost:${PUERTO}${RUTA}`,
      ...(isDesktop ? ["--preset=desktop"] : []),
      "--output=json",
      `--output-path=${reportPath}`,
      "--chrome-flags=--headless=new --no-sandbox",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--quiet",
    ], { stdio: ["ignore", "inherit", "inherit"] });
    lighthouse.on("error", fail);
    lighthouse.on("close", (code) => (code === 0 ? done() : fail(new Error(`Lighthouse terminó con código ${code}`))));
  });

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  // Qué elemento marca el pintado mayor y en qué se va el tiempo: sin esto,
  // optimizar el rendimiento es cambiar cosas a ver si baja el número.
  const lcpAudit = report.audits["largest-contentful-paint-element"];
  const nodo = lcpAudit?.details?.items?.[0]?.items?.[0]?.node;
  if (nodo) console.log(`\nElemento del LCP: ${(nodo.snippet ?? nodo.selector ?? "?").slice(0, 160)}`);
  const fases = lcpAudit?.details?.items?.[1]?.items ?? [];
  for (const fase of fases) console.log(`  ${String(fase.phase).padEnd(28)} ${Math.round(fase.timing)} ms`);
  console.log(`\n=== ${isDesktop ? "ESCRITORIO" : "MÓVIL"} · ${RUTA} ===`);
  for (const category of Object.values(report.categories)) {
    console.log(`${category.title}:`.padEnd(18), Math.round(category.score * 100));
  }
  console.log();
  for (const id of ["first-contentful-paint", "speed-index", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"]) {
    const audit = report.audits[id];
    if (audit) console.log(" ", audit.title.padEnd(28), String(audit.displayValue).padStart(8));
  }
  // Sin API detrás, una SPA registra fallos de red al pedirle datos. Son del
  // montaje de la prueba, no del sitio: conviene decirlo para que nadie los persiga.
  const consoleErrors = report.audits["errors-in-console"]?.details?.items ?? [];
  if (consoleErrors.length) {
    console.log(`\n  (${consoleErrors.length} errores de consola: posibles peticiones a una API que aquí no está levantada)`);
  }
} finally {
  server.close();
}
