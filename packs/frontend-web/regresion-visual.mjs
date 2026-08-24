/*
 * Red de seguridad para cambios de estilo: toma una HUELLA de cada pantalla y
 * la compara con la corrida anterior.
 *
 * ── POR QUÉ NO SE COMPARAN CAPTURAS ────────────────────────────────────────
 * La primera versión de este fichero comparaba el hash del PNG y afirmaba que
 * «en Chromium sin cabeza el render es determinista». No lo es: tres capturas
 * de la misma página, sin tocar nada, dieron tres hashes distintos y hasta
 * tamaños distintos. Con eso, 120 de 123 pantallas salían «cambiadas» y la red
 * no servía para nada.
 *
 * Lo que sí es exacto es lo que el navegador calcula: para cada elemento
 * visible, su caja y las declaraciones que deciden cómo se ve. Eso no tiene
 * ruido, y además dice QUÉ propiedad cambió y en qué elemento — que es lo que
 * hace falta al migrar una hoja de estilos, no un porcentaje de píxeles.
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   node regresion-visual.mjs capturar antes
 *   …se migra…
 *   node regresion-visual.mjs capturar despues
 *   node regresion-visual.mjs comparar antes despues
 *
 * ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
 * Las pantallas que recorre salen de `regresion-visual.json`, al lado de este
 * fichero. Sin él sólo mira las rutas públicas, que es mejor que nada pero deja
 * fuera todo lo que hay detrás de una sesión.
 *
 *   {
 *     "base": "http://localhost:3000",
 *     "publicas": { "portada": "/", "acceso": "/login" },
 *     "prefijoRuta": "/dashboard/",
 *     "acceso": { "url": "/login", "esperaTras": "/dashboard", "boton": "Iniciar sesión" },
 *     "perfiles": {
 *       "admin": { "email": "admin@example.com", "rutas": ["resumen", "usuarios"] }
 *     }
 *   }
 *
 * La contraseña NO va en el fichero: se pasa por `SEED_PASSWORD`.
 * ───────────────────────────────────────────────────────────────────────────
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const CFG = existsSync(new URL("regresion-visual.json", import.meta.url))
  ? JSON.parse(readFileSync(new URL("regresion-visual.json", import.meta.url), "utf8"))
  : {};
const base = process.env.AUDIT_URL ?? CFG.base ?? "http://localhost:3000";
const clave = process.env.SEED_PASSWORD ?? "";
const RAIZ = process.env.HUELLAS ?? ".regresion-visual";
const ACCESO = CFG.acceso ?? { url: "/login", esperaTras: "/dashboard", boton: "Iniciar sesión" };
const PREFIJO = CFG.prefijoRuta ?? "/";
const PUBLICAS = CFG.publicas ?? { portada: "/" };

const perfiles = CFG.perfiles ?? {};
/* Sin animación. La portada anima con `animation-timeline` y `.hero-product` va
   rotado 1,5°: la caja de un elemento rotado depende del fotograma, así que sin
   esto tres barras del panel de muestra salían «cambiadas» en cada corrida sin
   que nada hubiera cambiado. `reducedMotion` dispara la regla global de
   `globals.css`, que apaga toda animación — la misma que ve quien lo pide. */
const SIN_MOVIMIENTO = { reducedMotion: "reduce" };

const vistas = [
  { nombre: "escritorio", width: 1440, height: 1000, tema: "light" },
  { nombre: "oscuro", width: 1440, height: 1000, tema: "dark" },
  { nombre: "movil", width: 390, height: 844, tema: "light" },
];

/** Lo que decide cómo se ve algo. Ni contenido ni datos: sólo forma y color. */
const PROPS = ["display", "position", "backgroundColor", "color", "borderTopWidth", "borderTopStyle",
  "borderTopColor", "borderTopLeftRadius", "paddingTop", "paddingLeft", "marginTop", "marginLeft",
  "fontSize", "fontWeight", "lineHeight", "textAlign", "flexDirection", "justifyContent",
  "alignItems", "gap", "gridTemplateColumns", "boxShadow", "opacity", "textTransform"];

const huella = () => (props) => {
  const salida = [];
  for (const e of document.querySelectorAll("body *")) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const s = getComputedStyle(e);
    /* La caja se redondea: un píxel de diferencia por el ancho de un texto que
       cambió de dato no es una regresión de estilo. */
    const caja = `${Math.round(r.width / 4)}×${Math.round(r.height / 4)}`;
    salida.push([e.tagName, e.className?.baseVal ?? e.className ?? "", caja,
      props.map((p) => s[p]).join("|")].join(";"));
  }
  return salida;
};

async function capturar(etiqueta) {
  const dir = `${RAIZ}/${etiqueta}`;
  mkdirSync(dir, { recursive: true });
  const nav = await chromium.launch();
  const todo = {};
  for (const vista of vistas) {
    const ctx = await nav.newContext({ viewport: vista, colorScheme: vista.tema, ...SIN_MOVIMIENTO });
    const p = await ctx.newPage();
    for (const [nombre, url] of Object.entries(PUBLICAS).map(([n, u]) => [`_${n}`, u])) {
      await p.goto(base + url, { waitUntil: "networkidle" }).catch(() => {});
      await p.waitForTimeout(400);
      todo[`${nombre}__${vista.nombre}`] = await p.evaluate(huella(), PROPS);
    }
    await ctx.close();
  }
  for (const [rol, perfil] of Object.entries(perfiles)) {
    for (const vista of vistas) {
      const ctx = await nav.newContext({ viewport: vista, colorScheme: vista.tema, ...SIN_MOVIMIENTO });
      const p = await ctx.newPage();
      await p.goto(base + ACCESO.url, { waitUntil: "networkidle" });
      await p.locator("input").nth(0).fill(perfil.email);
      await p.locator("input").nth(1).fill(clave);
      await p.getByRole("button", { name: ACCESO.boton }).click();
      try { await p.waitForURL(new RegExp(ACCESO.esperaTras), { timeout: 15000 }); }
      catch { console.error(`  ✖ ${rol}: no entró`); await ctx.close(); continue; }
      for (const ruta of perfil.rutas) {
        await p.goto(base + PREFIJO + ruta, { waitUntil: "networkidle" }).catch(() => {});
        await p.waitForTimeout(500);
        todo[`${rol}_${ruta}__${vista.nombre}`] = await p.evaluate(huella(), PROPS);
      }
      await ctx.close();
    }
  }
  await nav.close();
  writeFileSync(`${dir}/huellas.json`, JSON.stringify(todo));
  const n = Object.values(todo).reduce((a, v) => a + v.length, 0);
  console.log(`  ${Object.keys(todo).length} pantallas · ${n} elementos · ${dir}/huellas.json`);
}

function comparar(a, b) {
  const leer = (d) => { const f = `${RAIZ}/${d}/huellas.json`; if (!existsSync(f)) { console.error(`falta ${f}`); process.exit(1); } return JSON.parse(readFileSync(f, "utf8")); };
  const A = leer(a), B = leer(b);
  let iguales = 0; const cambios = [];
  for (const k of Object.keys(A)) {
    if (!(k in B)) { cambios.push([k, "desapareció"]); continue; }
    const sa = A[k], sb = B[k];
    if (sa.length !== sb.length) { cambios.push([k, `${sa.length} → ${sb.length} elementos`]); continue; }
    const dif = sa.filter((x, i) => x !== sb[i]);
    if (dif.length === 0) { iguales++; continue; }
    const ej = dif[0].split(";");
    cambios.push([k, `${dif.length} elementos · p.ej. <${ej[0].toLowerCase()} class="${ej[1].slice(0, 40)}">`]);
  }
  console.log(`  pantallas idénticas: ${iguales}`);
  console.log(`  con cambios:         ${cambios.length}`);
  for (const [k, d] of cambios) console.log(`    ${k}: ${d}`);
}

const [modo, x, y] = process.argv.slice(2);
if (modo === "capturar") await capturar(x);
else if (modo === "comparar") comparar(x, y);
else console.error("uso: capturar <etiqueta> | comparar <a> <b>");
