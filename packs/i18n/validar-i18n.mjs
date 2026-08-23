#!/usr/bin/env node
/**
 * validar-i18n.mjs — paridad de claves entre idiomas y variante regional del idioma base.
 *
 *   validar-i18n.mjs paridad  [dir]   claves que faltan o sobran en algún idioma
 *   validar-i18n.mjs variante [dir]   formas de la variante prohibida en el copy
 *   validar-i18n.mjs formato  [dir]   interpolaciones y plurales que no cuadran entre idiomas
 *   validar-i18n.mjs todo     [dir]   las tres
 *
 * Lee ficheros de locale `.json`, `.ts` o `.js` que exporten un objeto plano o anidado.
 *
 * ── Por qué cada comprobación ────────────────────────────────────────────────
 *
 * PARIDAD. Una clave que existe en un idioma y no en otro produce, según la librería, o
 * el nombre crudo de la clave en pantalla o una excepción. Se comprueba con un comando,
 * no a ojo: nadie compara cuatro ficheros de mil líneas.
 *
 * VARIANTE. El idioma no es una sola cosa. Si el producto habla español neutro (tuteo)
 * y alguien escribe «Seleccioná», la marca suena a otro país. Es una decisión de producto
 * y por tanto se gatea, no se corrige en revisión.
 *
 * FORMATO. Si el español dice «Hola {nombre}» y el inglés «Hello {name}», uno de los dos
 * enseña la llave cruda al usuario. Y una clave con plurales en un idioma y sin ellos en
 * otro rompe en el que falta.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const [accion = 'todo', ...resto] = process.argv.slice(2);
const json = resto.includes('--json');

function localizar() {
  const dado = resto.find(a => !a.startsWith('--'));
  if (dado) return dado;
  for (const c of ['src/i18n/locales', 'src/locales', 'locales', 'src/i18n', 'app/locales',
                   'public/locales', 'messages', 'src/lang', 'lang']) if (existsSync(c)) return c;
  return null;
}
const dir = localizar();
if (!dir) { console.error('✗ no encuentro los ficheros de idioma.\n  Pásalos:  validar-i18n.mjs todo <ruta>'); process.exit(2); }
if (!existsSync(dir)) { console.error(`✗ no existe la ruta: ${dir}`); process.exit(2); }

/** Aplana {a:{b:'x'}} → {'a.b':'x'} */
function aplanar(o, prefijo = '', salida = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const clave = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, clave, salida);
    else salida[clave] = Array.isArray(v) ? v.join('|') : String(v ?? '');
  }
  return salida;
}

/** Extrae el objeto de un .ts/.js sin ejecutarlo: se busca el primer literal de objeto. */
function leerLocale(ruta) {
  const src = readFileSync(ruta, 'utf8');
  if (extname(ruta) === '.json') return aplanar(JSON.parse(src));
  const i = src.indexOf('{');
  const j = src.lastIndexOf('}');
  if (i < 0 || j < i) return {};
  try {
    // Literal de objeto de JS, no JSON: se evalúa en un contexto sin acceso a nada.
    const objeto = new Function(`"use strict"; return (${src.slice(i, j + 1)});`)();
    return aplanar(objeto);
  } catch { return null; }
}

const ficheros = readdirSync(dir)
  .filter(f => /\.(json|ts|js|mjs)$/.test(f) && !/\.(test|spec|d)\./.test(f))
  .map(f => ({ idioma: basename(f).replace(/\.\w+$/, ''), ruta: join(dir, f) }))
  .filter(f => statSync(f.ruta).isFile());

if (ficheros.length < 1) { console.error(`✗ ${dir} no contiene ficheros de idioma`); process.exit(2); }

const locales = {};
const ilegibles = [];
for (const f of ficheros) {
  const d = leerLocale(f.ruta);
  if (d === null || Object.keys(d).length === 0) ilegibles.push(f.ruta); else locales[f.idioma] = d;
}
const idiomas = Object.keys(locales);
if (!idiomas.length) { console.error(`✗ no pude leer ningún locale de ${dir}\n  ${ilegibles.join('\n  ')}`); process.exit(2); }

// El idioma base es el que más claves tiene: es del que se traduce.
const BASE = process.env.IDIOMA_BASE || idiomas.reduce((a, b) => Object.keys(locales[a]).length >= Object.keys(locales[b]).length ? a : b);

// ── paridad ───────────────────────────────────────────────────────────────────
function paridad() {
  const clavesBase = new Set(Object.keys(locales[BASE]));
  const out = [];
  for (const idioma of idiomas) {
    if (idioma === BASE) continue;
    const suyas = new Set(Object.keys(locales[idioma]));
    const faltan = [...clavesBase].filter(k => !suyas.has(k));
    const sobran = [...suyas].filter(k => !clavesBase.has(k));
    // Una clave idéntica al idioma base PUEDE ser una traducción sin hacer — o puede ser
    // un nombre propio, una marca o una unidad, que se escriben igual en todos los idiomas.
    // Solo se señala si parece una FRASE: tres palabras o más y con minúsculas.
    // Sin este filtro, «Instagram», «Transfermarkt» y «kg» salen como falsos positivos y
    // el aviso deja de leerse.
    // Tres tokens o más, y al menos dos que EMPIECEN en minúscula: eso descarta
    // «Twitter / X (URL)» y «Soccerdonna (URL)», que son marcas y formatos, no frases.
    const pareceFrase = t => {
      const tk = t.trim().split(/\s+/);
      return tk.length >= 3 && tk.filter(w => /^[a-záéíóúñ]/.test(w)).length >= 2;
    };
    const sinTraducir = [...suyas].filter(k =>
      clavesBase.has(k) && locales[idioma][k] === locales[BASE][k] && pareceFrase(locales[BASE][k]));
    if (faltan.length || sobran.length || sinTraducir.length) out.push({ idioma, faltan, sobran, sinTraducir });
  }
  return out;
}

// ── variante regional ─────────────────────────────────────────────────────────
// Por defecto, voseo rioplatense → tuteo neutro. Ajustar VARIANTES al proyecto.
// OJO con los límites de palabra en JavaScript: `\w` es [A-Za-z0-9_], así que las
// vocales acentuadas NO son caracteres de palabra y `\bimportá\b` casa DENTRO del
// portugués «Importáveis». Por eso se cierra con `(?![\wáéíóúüñ])` y no con `\b`.
const FIN = '(?![\\wáéíóúüñ])';
const VARIANTES = {
  voseo: {
    idiomas: ['es'],          // el voseo es del español: no se busca en otros idiomas
    descripcion: 'voseo rioplatense (el producto habla español neutro, con tuteo)',
    formas: [
      [new RegExp(`\\b(seleccion|elegi|revis|defini|complet|ingres|guard|carg|envi|cre|agreg|edit|elimin|confirm|activ|verific|actualiz|busc|filtr|orden|descarg|import|export|asign|program|registr|configur|calcul|gener|public|cancel|rechaz|aprob|firm|adjunt|marc|desmarc|copi|peg|renombr|duplic|archiv|restaur|sincroniz|conect|desconect|reinici|deten|inici|pag|cobr|factur|anul|reserv|liber|bloque|desbloque|invit|promov|renov)á${FIN}`, 'gi'), 'usa la forma con tuteo: «selecciona», «elige», «revisa»…'],
      [new RegExp(`\\b(pod|ten|hac|quer|deb|sab|ven|dec|ver)és${FIN}`, 'gi'), 'usa «puedes», «tienes», «haces», «quieres», «debes»…'],
      [new RegExp(`\\bsos${FIN}`, 'gi'), 'usa «eres»'],
      [new RegExp(`\\bvos${FIN}`, 'gi'), 'usa «tú»'],
    ],
  },
};
function variante() {
  const cual = process.env.VARIANTE_PROHIBIDA || 'voseo';
  const def = VARIANTES[cual];
  if (!def) { console.error(`✗ variante desconocida: ${cual}`); process.exit(2); }
  const out = [];
  // Aplicar reglas del español a un locale portugués produce ruido: «Importáveis» no es
  // voseo. Se acota a los idiomas de la variante.
  const aplicables = idiomas.filter(i => !def.idiomas || def.idiomas.some(l => i.toLowerCase().startsWith(l)));
  for (const idioma of aplicables) {
    for (const [clave, texto] of Object.entries(locales[idioma])) {
      for (const [re, sugerencia] of def.formas) {
        re.lastIndex = 0;
        const m = re.exec(texto);
        if (m) { out.push({ idioma, clave, encontrado: m[0], sugerencia, texto: texto.slice(0, 70) }); break; }
      }
    }
  }
  return { cual, def, out };
}

// ── formato ───────────────────────────────────────────────────────────────────
const marcadores = t => [...t.matchAll(/\{\{?\s*([\w.]+)[^}]*\}\}?|%\{(\w+)\}|\$\{(\w+)\}/g)]
  .map(m => m[1] || m[2] || m[3]).sort();
function formato() {
  const out = [];
  for (const clave of Object.keys(locales[BASE])) {
    const esperados = marcadores(locales[BASE][clave]);
    for (const idioma of idiomas) {
      if (idioma === BASE || !(clave in locales[idioma])) continue;
      const suyos = marcadores(locales[idioma][clave]);
      if (JSON.stringify(esperados) !== JSON.stringify(suyos)) {
        out.push({ clave, idioma, base: esperados, suyo: suyos });
      }
    }
  }
  return out;
}

// ── salida ────────────────────────────────────────────────────────────────────
let fallo = 0;
const hacer = { paridad: accion === 'paridad' || accion === 'todo',
                variante: accion === 'variante' || accion === 'todo',
                formato: accion === 'formato' || accion === 'todo' };

if (json) {
  console.log(JSON.stringify({ base: BASE, idiomas,
    paridad: hacer.paridad ? paridad() : undefined,
    variante: hacer.variante ? variante().out : undefined,
    formato: hacer.formato ? formato() : undefined }, null, 2));
  process.exit(0);
}

console.log(`${idiomas.length} idioma(s) en ${dir} — base: ${BASE} (${Object.keys(locales[BASE]).length} claves)`);
if (ilegibles.length) console.log(`  ⚠ no pude leer: ${ilegibles.join(', ')}`);
console.log('');

if (hacer.paridad) {
  const p = paridad();
  if (!p.length) console.log('✓ paridad: todos los idiomas tienen las mismas claves');
  else {
    fallo = 1;
    console.log('✗ paridad de claves:\n');
    for (const x of p) {
      if (x.faltan.length) { console.log(`    ${x.idioma}: FALTAN ${x.faltan.length}`); x.faltan.slice(0,8).forEach(k => console.log(`        ${k}`)); if (x.faltan.length>8) console.log(`        … y ${x.faltan.length-8} más`); }
      if (x.sobran.length) { console.log(`    ${x.idioma}: SOBRAN ${x.sobran.length} (no existen en ${BASE})`); x.sobran.slice(0,5).forEach(k => console.log(`        ${k}`)); }
      if (x.sinTraducir.length) { console.log(`    ${x.idioma}: ${x.sinTraducir.length} idénticas a ${BASE} — ¿sin traducir?`); x.sinTraducir.slice(0,5).forEach(k => console.log(`        ${k}`)); }
    }
    console.log('\n  Una clave que falta sale en pantalla como su nombre crudo, o lanza una excepción.');
  }
}

if (hacer.variante) {
  const { cual, def, out } = variante();
  if (!out.length) console.log(`✓ variante: sin ${cual}`);
  else {
    fallo = 1;
    console.log(`\n✗ ${out.length} texto(s) con ${def.descripcion}:\n`);
    for (const x of out.slice(0, 20)) console.log(`    ${x.idioma} · ${x.clave}\n      «${x.encontrado}» → ${x.sugerencia}\n      ${x.texto}`);
    if (out.length > 20) console.log(`    … y ${out.length - 20} más`);
    console.log('\n  La variante regional es una decisión de marca, no un detalle de estilo:');
    console.log('  por eso se gatea aquí y no se corrige en la revisión, donde se cuela.');
  }
}

if (hacer.formato) {
  const f = formato();
  if (!f.length) console.log('✓ formato: las interpolaciones cuadran entre idiomas');
  else {
    fallo = 1;
    console.log(`\n✗ ${f.length} clave(s) con interpolaciones que no cuadran:\n`);
    for (const x of f.slice(0, 15)) console.log(`    ${x.clave}\n      ${BASE}: {${x.base.join('} {')}}\n      ${x.idioma}: {${x.suyo.join('} {')}}`);
    console.log('\n  Un marcador que existe en un idioma y no en otro sale crudo en pantalla,');
    console.log('  o deja el dato fuera del mensaje sin que nada avise.');
  }
}
process.exit(fallo);
