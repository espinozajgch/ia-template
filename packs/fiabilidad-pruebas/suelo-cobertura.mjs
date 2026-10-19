#!/usr/bin/env node
/**
 * suelo-cobertura.mjs — un mínimo por FICHERO, para lo que el agregado tapa.
 *
 *   suelo-cobertura.mjs validar        falla si algún fichero vigilado bajó
 *   suelo-cobertura.mjs fijar          re-fija el suelo con lo medido hoy
 *   suelo-cobertura.mjs vigilar <f>    añade un fichero a la vigilancia
 *
 * ── POR QUÉ HACE FALTA, HABIENDO YA UN TRINQUETE DE COBERTURA ───────────────
 *
 * El trinquete global mide el conjunto, y el conjunto miente por construcción.
 * Medido en el proyecto de origen:
 *
 *     scripts/avisos.mjs      26,5 % líneas · 25,0 % ramas · 20,0 % funciones
 *     todos los ficheros      92,8 % líneas · 89,0 % ramas · 89,1 % funciones
 *
 * `scripts/avisos.mjs` era el único camino por el que un recordatorio llegaba a
 * una persona. Estaba al 20 % de funciones y el número global no se inmutaba,
 * porque ciento treinta ficheros bien probados lo sostenían. Un fichero puede
 * hundirse todo lo que quiera mientras sus hermanos compensen.
 *
 * Y no era una preocupación teórica: una auditoría posterior encontró TRES
 * defectos reales en ese mismo fichero —mensajes reclamados por un adaptador
 * que no sabía entregarlos, un adaptador que marcaba como enviado lo que solo
 * había impreso— y los tres pasaron con cientos de pruebas en verde alrededor.
 *
 * ── QUÉ HACE Y QUÉ NO ──────────────────────────────────────────────────────
 *
 * No pone un listón aspiracional: arranca en lo MEDIDO hoy y solo puede subir.
 * Un mínimo por encima de lo real deja la puerta en rojo permanente y acaba
 * bajándose o ignorándose.
 *
 * Tampoco vigila todo: solo lo que se declara. La lista es corta a propósito, y
 * lo que entra en ella es lo que duele cuando falla en silencio.
 *
 * ── DÓNDE SE CALIBRA EL SUELO ──────────────────────────────────────────────
 *
 * En el entorno MÁS ESTRICTO de los que lo validan, que es la integración
 * continua, y no en una máquina de desarrollo. La cobertura de un mismo
 * fichero no es la misma en los dos: la base sembrada no es igual, y en local
 * suele haber datos de demostración que ejecutan ramas que en integración no
 * existen. Al fijar un mínimo nuevo, mira el número del runner, no el de tu
 * portátil — el mismo trinquete nació calibrado en local una vez, y su primera
 * corrida en integración lo tumbó.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BASE = ".ratchets/cobertura-suelo.json";
const LCOV = process.env.LCOV ?? "coverage/lcov.info";
const [accion = "validar", argumento] = process.argv.slice(2);

if (!existsSync(LCOV)) {
  console.error(`✗ no encuentro ${LCOV}. Corre primero las pruebas con cobertura:  npm run test:cobertura`);
  process.exit(2);
}

/** Lee del lcov los tres pares encontrado/alcanzado que ya vienen calculados. */
function medir() {
  const medidas = {};
  let actual = null;
  for (const linea of readFileSync(LCOV, "utf8").split("\n")) {
    if (linea.startsWith("SF:")) { actual = linea.slice(3).trim(); medidas[actual] = {}; continue; }
    if (!actual) continue;
    const [clave, valor] = linea.split(":");
    if (["LF", "LH", "BRF", "BRH", "FNF", "FNH"].includes(clave)) medidas[actual][clave] = Number(valor);
    if (linea.startsWith("end_of_record")) actual = null;
  }
  const pct = (alcanzado, encontrado) => (encontrado ? (alcanzado / encontrado) * 100 : 100);
  const salida = {};
  for (const [fichero, m] of Object.entries(medidas)) {
    salida[fichero] = {
      lineas: pct(m.LH ?? 0, m.LF ?? 0),
      ramas: pct(m.BRH ?? 0, m.BRF ?? 0),
      funciones: pct(m.FNH ?? 0, m.FNF ?? 0),
    };
  }
  return salida;
}

const medido = medir();
const suelo = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : { ficheros: {} };
const uno = (n) => Math.floor(n * 10) / 10;

if (accion === "vigilar") {
  if (!argumento) { console.error("✗ falta el fichero:  suelo-cobertura.mjs vigilar scripts/avisos.mjs"); process.exit(2); }
  if (!medido[argumento]) { console.error(`✗ ${argumento} no aparece en ${LCOV}: ninguna prueba lo ejecuta`); process.exit(2); }
  suelo.ficheros[argumento] = Object.fromEntries(Object.entries(medido[argumento]).map(([k, v]) => [k, uno(v)]));
  writeFileSync(BASE, JSON.stringify(suelo, null, 2) + "\n");
  console.log(`✓ ${argumento} vigilado desde ${JSON.stringify(suelo.ficheros[argumento])}`);
  process.exit(0);
}

if (accion === "fijar") {
  let subidos = 0;
  for (const fichero of Object.keys(suelo.ficheros)) {
    const hoy = medido[fichero];
    if (!hoy) continue;
    for (const clave of ["lineas", "ramas", "funciones"]) {
      if (uno(hoy[clave]) > suelo.ficheros[fichero][clave]) { suelo.ficheros[fichero][clave] = uno(hoy[clave]); subidos++; }
    }
  }
  writeFileSync(BASE, JSON.stringify(suelo, null, 2) + "\n");
  console.log(`✓ suelo consolidado: ${subidos} mínimo(s) subieron. Nunca baja: para eso existe.`);
  process.exit(0);
}

const vigilados = Object.keys(suelo.ficheros);
if (!vigilados.length) {
  console.log("suelo-cobertura: no hay ficheros vigilados todavía");
  process.exit(0);
}

const caidas = [];
for (const fichero of vigilados) {
  const hoy = medido[fichero];
  if (!hoy) {
    caidas.push(`${fichero}\n      ya no aparece en la cobertura: o se renombró, o dejó de ejecutarlo ninguna prueba`);
    continue;
  }
  for (const clave of ["lineas", "ramas", "funciones"]) {
    const minimo = suelo.ficheros[fichero][clave];
    if (uno(hoy[clave]) < minimo)
      caidas.push(`${fichero}\n      ${clave}: ${uno(hoy[clave])} % — el mínimo medido era ${minimo} %`);
  }
}

if (!caidas.length) {
  console.log(`✓ suelo: ${vigilados.length} fichero(s) vigilados, ninguno bajó`);
  process.exit(0);
}
console.log(`✗ ${caidas.length} cobertura(s) por debajo de lo que ya se había alcanzado:\n`);
for (const c of caidas) console.log(`    ${c}\n`);
console.log("  El agregado sigue en verde: por eso existe este mínimo por fichero.");
console.log("  Si la bajada es deliberada, di por qué en el commit y re-fija:  node agente/packs/fiabilidad-pruebas/suelo-cobertura.mjs fijar");
process.exit(1);
