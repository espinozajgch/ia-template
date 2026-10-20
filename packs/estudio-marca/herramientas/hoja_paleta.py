#!/usr/bin/env python3
"""Genera la hoja de paleta a partir de `paleta.json`.

  hoja_paleta.py proyectos/<slug>/paleta.json [-o proyectos/<slug>/hoja-paleta.html]

El HTML resultante es un único archivo: CSS y JS en línea, icono embebido en base64.
Solo carga tipografías de Google Fonts, con alternativas del sistema si no hay red.
Todas las cifras (contrastes, distancias a estados, ΔE con daltonismo) se calculan aquí:
la hoja nunca se edita a mano. Si algo está mal, se corrige `paleta.json` y se regenera.
"""
from __future__ import annotations

import argparse
import base64
import html
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import colorlib as cl  # noqa: E402
import paleta as pl  # noqa: E402

e = html.escape
NIVELES = {"Bajo", "Baja", "Medio", "Media", "Alto", "Alta"}


# ── Estilos ─────────────────────────────────────────────────────────────────

CSS = """
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--body);
  padding-inline: 20px; padding-block: 0 72px; margin: 0; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1120px; margin: 0 auto; display: grid; gap: 88px; }
h1, h2, h3, h4 { font-family: var(--display); text-wrap: balance; margin: 0; letter-spacing: -0.03em; }
p { margin: 0; }
a { color: var(--link); }
.eyebrow { font: 700 12px/1.2 var(--body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.hex { font-family: var(--mono); font-size: 14px; font-variant-numeric: tabular-nums; }
header.top { padding-top: 48px; display: grid; gap: 24px; }
.brandline { display: flex; align-items: center; gap: 12px; }
.brandline img, .brandline .mono { width: 40px; height: 40px; border-radius: 10px; }
.brandline .mono, .mark .mono { display: grid; place-items: center; background: var(--fg); color: var(--bg); font: 800 15px/1 var(--display); }
.brandline span.nm { font: 800 18px/1 var(--display); letter-spacing: -0.02em; }
header.top h1 { font-size: clamp(36px, 6vw, 62px); line-height: 1.02; font-weight: 800; max-width: 18ch; }
header.top .lead { font-size: 19px; color: var(--muted); max-width: 66ch; }
.jump { display: flex; flex-wrap: wrap; gap: 10px; }
.jump a { font: 700 14px/1 var(--body); text-decoration: none; color: var(--fg); padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.jump a:hover { border-color: var(--link); }
.jump a:focus-visible, .copy:focus-visible { outline: 3px solid var(--link); outline-offset: 2px; }
.section-head { display: grid; gap: 10px; margin-bottom: 28px; }
.section-head h2 { font-size: clamp(26px, 3.4vw, 36px); line-height: 1.1; }
.section-head p { color: var(--muted); max-width: 66ch; }
.overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 20px; }
.ov { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 22px; display: grid; gap: 16px; align-content: start; min-width: 0; }
.ov.featured { outline: 2px solid var(--link); outline-offset: -2px; }
.ov h3 { font-size: 24px; }
.ov .thesis { color: var(--muted); font-size: 15px; }
.ov .hexes { display: flex; flex-wrap: wrap; gap: 6px 14px; font: 500 12px/1.4 var(--mono); color: var(--muted); }
.ov .hexes span { display: inline-flex; align-items: center; gap: 6px; }
.ov .hexes i, .band-legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; outline: 1px solid var(--line); }
.ov a { font-weight: 700; font-size: 14px; }
.band-bar { display: flex; height: 48px; border-radius: 10px; overflow: hidden; outline: 1px solid var(--line); }
.band-bar div { min-width: 0; }
.band-legend { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 14px; color: var(--muted); margin-top: 10px; }
.band-legend span { display: inline-flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
.band-legend b { color: var(--fg); }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }
table { width: 100%; border-collapse: collapse; font-size: 15px; min-width: 640px; }
th, td { text-align: left; padding: 13px 16px; border-bottom: 1px solid var(--line); vertical-align: top; }
thead th { font: 700 12px/1.2 var(--body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
tbody th { font-weight: 700; font-size: 14px; color: var(--muted); width: 20%; }
tr:last-child td, tr:last-child th { border-bottom: 0; }
.lvl { font: 700 13px/1 var(--body); padding: 5px 9px; border-radius: 6px; background: var(--chip); display: inline-block; }
.reco { margin-top: 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; display: grid; gap: 6px; }
.reco strong { font: 800 18px/1.3 var(--display); }
.reco p { color: var(--muted); max-width: 74ch; }
.option { display: grid; gap: 36px; border-top: 1px solid var(--line); }
.opt-head { display: grid; gap: 14px; padding-top: 28px; }
.opt-head h2 { font-size: clamp(30px, 4.4vw, 46px); line-height: 1.05; font-weight: 800; }
.opt-head .lead { font-size: 18px; color: var(--muted); max-width: 68ch; }
.blocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 16px; }
.blk { border-left: 3px solid var(--line); padding: 2px 0 2px 16px; display: grid; gap: 6px; min-width: 0; }
.blk h3 { font: 700 13px/1.3 var(--body); text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.blk ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 15px; }
.blk.pro { border-left-color: var(--ok); } .blk.con { border-left-color: var(--no); } .blk.neutro { border-left-color: var(--mid); }
.note { color: var(--muted); font-size: 14px; margin-top: 10px; max-width: 80ch; }
.swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 18px; }
.swatch { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; display: grid; grid-template-rows: auto 1fr; min-width: 0; }
.chip-color { min-height: 156px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; }
.chip-color .role { font: 700 12px/1.2 var(--body); letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; }
.chip-color h3 { font-size: 28px; line-height: 1.05; font-weight: 800; }
.chip-color .row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.copy { font: 500 14px/1 var(--mono); padding: 9px 12px; border-radius: 9px; cursor: pointer; background: transparent; color: inherit; border: 1px solid currentColor; }
.copy:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
.rgb { font: 500 12px/1 var(--mono); opacity: 0.8; }
.c-principal { background: var(--p); color: var(--on-p); }
.c-acento1 { background: var(--a1); color: var(--on-a1); }
.c-acento2 { background: var(--a2); color: var(--on-a2); }
.c-oscuro { background: var(--dk); color: var(--lt); }
.c-claro { background: var(--lt); color: var(--dk); border-bottom: 1px solid var(--lt-line); }
.info { padding: 20px; display: grid; gap: 14px; align-content: start; }
.info dl { margin: 0; display: grid; gap: 12px; }
.info dt { font: 700 12px/1.2 var(--body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.info dd { margin: 0; font-size: 15px; line-height: 1.55; }
.inuse { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 18px; }
.stage { border-radius: 18px; padding: 24px; display: grid; gap: 16px; align-content: start; min-width: 0; }
.stage-lt { background: var(--lt); color: var(--dk); border: 1px solid var(--lt-line); }
.stage-dk { background: var(--dk); color: var(--lt); border: 1px solid var(--dk-line); }
.stage .label { font: 700 11px/1.2 var(--body); letter-spacing: 0.12em; text-transform: uppercase; }
.stage-lt .label, .stage-lt .meta { color: var(--lt-muted); }
.stage-dk .label, .stage-dk .meta { color: var(--dk-muted); }
.card { border-radius: 14px; padding: 18px; display: grid; gap: 12px; }
.stage-lt .card { background: #ffffff; border: 1px solid var(--lt-line); }
.stage-dk .card { background: var(--dk2); border: 1px solid var(--dk-line); }
.card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.card h4 { font-size: 18px; line-height: 1.2; letter-spacing: -0.02em; }
.meta { font-size: 14px; }
.tag { font: 700 12px/1 var(--body); padding: 6px 9px; border-radius: 999px; white-space: nowrap; }
.stage-lt .tag { background: var(--a2); color: var(--on-a2); }
.stage-dk .tag { color: var(--tag-dk); border: 1px solid var(--tag-dk); }
.sig { font: 700 12px/1.2 var(--body); letter-spacing: 0.1em; text-transform: uppercase; }
.stage-lt .sig { color: var(--sig-lt); } .stage-dk .sig { color: var(--sig-dk); }
.actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.btn { font: 700 14px/1 var(--body); padding: 12px 16px; border-radius: 12px; }
.stage-lt .btn { background: var(--p); color: var(--on-p); }
.stage-dk .btn { background: var(--btn-dk); color: var(--btn-dk-fg); }
.lnk { font-weight: 700; font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.stage-lt .lnk { color: var(--lnk-lt); } .stage-dk .lnk { color: var(--lnk-dk); }
.mark { display: flex; align-items: center; gap: 14px; }
.mark img, .mark .mono { width: 52px; height: 52px; border-radius: 13px; }
.mark strong { font: 800 22px/1 var(--display); letter-spacing: -0.03em; }
td.num { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
.contrast td { vertical-align: middle; }
.sample { display: inline-grid; place-items: center; width: 44px; height: 30px; border-radius: 7px; font: 800 14px/1 var(--display); margin-right: 10px; vertical-align: middle; box-shadow: inset 0 0 0 1px rgba(127,127,127,.25); }
.verdict { font: 700 12px/1 var(--body); padding: 5px 8px; border-radius: 6px; white-space: nowrap; background: var(--chip); }
.v-ok { color: var(--ok); } .v-mid { color: var(--mid); } .v-no { color: var(--no); }
.rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 16px; }
.rule { border-left: 3px solid var(--line); padding: 4px 0 4px 16px; display: grid; gap: 6px; }
.rule h3 { font-size: 17px; letter-spacing: -0.01em; }
.rule p { color: var(--muted); font-size: 15px; }
footer.foot { color: var(--muted); font-size: 14px; border-top: 1px solid var(--line); padding-top: 20px; }
@media (prefers-reduced-motion: no-preference) { .copy, .jump a { transition: background-color .15s ease, border-color .15s ease; } }
"""

JS = """
document.querySelectorAll('.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var hex = btn.getAttribute('data-hex');
    var done = function () { btn.textContent = 'Copiado'; setTimeout(function () { btn.textContent = hex; }, 1400); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(btn);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    };
    try { navigator.clipboard.writeText(hex).then(done, fallback); } catch (err) { fallback(); }
  });
});
"""


# ── Tokens ──────────────────────────────────────────────────────────────────

def tokens_chrome(op: dict) -> tuple[str, str]:
    d = pl.derivados(op)
    dk, lt = pl.hexr(op, "oscuro"), pl.hexr(op, "claro")
    chip_l, chip_d = cl.mezclar(lt, dk, 0.06), cl.mezclar(dk, lt, 0.08)
    claro = {
        "bg": lt, "surface": "#ffffff", "fg": dk, "muted": d["lt_muted"], "line": d["lt_line"],
        "link": pl.legible(op, op["enlace"], lt, 4.5, "variante_claro"), "chip": chip_l,
        "ok": cl.variante("#1d6b33", chip_l, 4.6), "mid": cl.variante("#7a5a00", chip_l, 4.6),
        "no": cl.variante("#b4233c", chip_l, 4.6),
    }
    oscuro = {
        "bg": dk, "surface": d["dk2"], "fg": lt, "muted": d["dk_muted"], "line": d["dk_line"],
        "link": pl.legible(op, op["enlace"], d["dk2"], 4.5, "variante_oscuro"), "chip": chip_d,
        "ok": cl.variante("#4cb86a", chip_d, 4.6), "mid": cl.variante("#d99a00", chip_d, 4.6),
        "no": cl.variante("#f08497", chip_d, 4.6),
    }
    fmt = lambda t: " ".join(f"--{k}: {v};" for k, v in t.items())  # noqa: E731
    return fmt(claro), fmt(oscuro)


def tokens_opcion(op: dict) -> str:
    d = pl.derivados(op)
    dk = pl.hexr(op, "oscuro")
    p = op["colores"]["principal"]
    btn_dk = p.get("variante_oscuro") or p["hex"]
    t = {
        "p": p["hex"], "on-p": pl.texto_sobre(op, "principal"),
        "a1": pl.hexr(op, "acento1"), "on-a1": pl.texto_sobre(op, "acento1"),
        "a2": pl.hexr(op, "acento2"), "on-a2": pl.texto_sobre(op, "acento2"),
        "dk": dk, "lt": pl.hexr(op, "claro"),
        "dk2": d["dk2"], "dk-line": d["dk_line"], "dk-muted": d["dk_muted"],
        "lt-line": d["lt_line"], "lt-muted": d["lt_muted"],
        "btn-dk": btn_dk, "btn-dk-fg": cl.mejor_texto(btn_dk, (dk, "#ffffff")),
        "lnk-lt": pl.legible(op, op["enlace"], "#ffffff", 4.5, "variante_claro"),
        "lnk-dk": pl.legible(op, op["enlace"], d["dk2"], 4.5, "variante_oscuro"),
        "sig-lt": pl.legible(op, op["firma"], "#ffffff", 4.5, "variante_claro"),
        "sig-dk": pl.legible(op, op["firma"], d["dk2"], 4.5, "variante_oscuro"),
        "tag-dk": pl.legible(op, "acento2", d["dk2"], 4.5, "variante_oscuro"),
    }
    cuerpo = " ".join(f"--{k}: {v};" for k, v in t.items())
    return f".opt-{op['id']} {{ {cuerpo} }}"


# ── Tipografía ──────────────────────────────────────────────────────────────

# La hoja se compone con la tipografía de la marca si `paleta.json` la declara:
#   "tipografia": {"display": "Manrope", "texto": "Inter", "mono": null}
# `mono: null` significa que la marca no tiene monoespaciada. Sin el bloque, la hoja usa estas.
TIPOGRAFIA_POR_DEFECTO = {"display": "Manrope", "texto": "DM Sans", "mono": "JetBrains Mono"}
PESOS = {"display": "600;700;800", "texto": "400;500;700", "mono": "500"}


def tipografia(data: dict) -> dict:
    return {**TIPOGRAFIA_POR_DEFECTO, **data.get("tipografia", {})}


def url_fuentes(tipo: dict) -> str:
    familias = []
    for rol in ("display", "texto", "mono"):
        nombre = tipo[rol]
        if nombre and all(f.split(":")[0] != nombre.replace(" ", "+") for f in familias):
            familias.append(f'{nombre.replace(" ", "+")}:wght@{PESOS[rol]}')
    return "https://fonts.googleapis.com/css2?" + "&".join(f"family={f}" for f in familias) + "&display=swap"


# ── Piezas ──────────────────────────────────────────────────────────────────

def icono_html(data: dict, clase: str = "") -> str:
    ruta = data.get("icono")
    if ruta:
        path = ruta if os.path.isabs(ruta) else os.path.join(data["_dir"], ruta)
        if os.path.exists(path):
            ext = os.path.splitext(path)[1].lower().lstrip(".") or "png"
            mime = "image/svg+xml" if ext == "svg" else f"image/{'jpeg' if ext == 'jpg' else ext}"
            b64 = base64.b64encode(open(path, "rb").read()).decode()
            return f'<img src="data:{mime};base64,{b64}" alt="Icono de {e(data["marca"])}">'
    iniciales = "".join(w[0] for w in data["marca"].split()[:2]).upper() or "M"
    return f'<span class="mono" aria-hidden="true">{e(iniciales)}</span>'


def banda(op: dict, con_leyenda: bool = True) -> str:
    orden = list(op["proporcion"].keys())
    partes = "".join(f'<div style="flex:{op["proporcion"][r]};background:{pl.hexr(op, r)}"></div>' for r in orden)
    aria = ", ".join(f'{op["colores"][r]["nombre"]} {op["proporcion"][r]} %' for r in orden)
    html_ = f'<div class="band-bar" role="img" aria-label="{e(aria)}">{partes}</div>'
    if con_leyenda:
        ley = "".join(f'<span><i style="background:{pl.hexr(op, r)}"></i><b>{op["proporcion"][r]} %</b> '
                      f'{e(op["colores"][r]["nombre"])}</span>' for r in orden)
        html_ += f'<div class="band-legend">{ley}</div>'
    return html_


def nivel(valor: str) -> str:
    return f'<span class="lvl">{e(valor)}</span>' if valor in NIVELES else e(valor)


def fila_estado(op: dict, estados: dict) -> str:
    if not estados:
        return "—"
    r = cl.estado_mas_cercano(pl.hexr(op, "acento2"), estados)
    if not r:
        return "Neutro"
    txt = f"{op['colores']['acento2']['nombre']}: «{r[0]}» a {r[1]:.0f}°"
    return txt + (" (puede leerse como estado)" if r[1] < cl.DISTANCIA_ESTADO_MIN else "")


def comparativa(data: dict) -> str:
    ops = data["opciones"]
    criterios = data.get("criterios") or list(ops[0].get("comparativa", {}).keys())
    cab = "".join(f'<th scope="col">{e(op.get("etiqueta", op["id"]))} · {e(op["nombre"])}</th>' for op in ops)
    filas = []

    def accion(op):
        txt = op["colores"]["principal"]["nombre"]
        if op["enlace"] != "principal":
            txt += f", con {op['colores'][op['enlace']]['nombre']} para enlaces y foco"
        return e(txt)

    filas.append(("Color de acción", [accion(op) for op in ops]))
    for c in criterios:
        filas.append((c, [nivel(op.get("comparativa", {}).get(c, "—")) for op in ops]))
    filas.append(("Acento 2 frente a los estados", [e(fila_estado(op, data.get("estados", {}))) for op in ops]))
    filas.append(("Acentos con daltonismo (ΔE mínimo)", [
        cl.fmt_num(min(v for k, v in pl.separacion_acentos(op).items() if k != "normal"))
        for op in ops]))
    cuerpo = "".join(f'<tr><th scope="row">{e(n)}</th>{"".join(f"<td>{v}</td>" for v in vals)}</tr>' for n, vals in filas)
    ancho = max(640, 180 * (len(ops) + 1))
    return (f'<div class="table-wrap" style="margin-top:20px"><table style="min-width:{ancho}px">'
            f'<thead><tr><th scope="col">Criterio</th>{cab}</tr></thead><tbody>{cuerpo}</tbody></table></div>')


def tarjeta_resumen(op: dict) -> str:
    hexes = "".join(f'<span><i style="background:{pl.hexr(op, r)}"></i>{pl.hexr(op, r).upper()}</span>'
                    for r in pl.ROLES)
    clase = "ov featured" if op.get("destacada") else "ov"
    return (f'<article class="{clase} opt-{op["id"]}"><p class="eyebrow">{e(op.get("etiqueta", ""))}</p>'
            f'<h3>{e(op["nombre"])}</h3>{banda(op, False)}<p class="thesis">{e(op.get("tesis", ""))}</p>'
            f'<div class="hexes">{hexes}</div><a href="#opcion-{op["id"]}">Ver {e(op.get("etiqueta", op["nombre"]).lower())}</a></article>')


def ficha(op: dict, rol: str) -> str:
    c = op["colores"][rol]
    dk, lt = pl.hexr(op, "oscuro"), pl.hexr(op, "claro")
    r, g, b = cl.rgb(c["hex"])
    filas = [("Valor", f'<strong>{e(c.get("valor", ""))}.</strong> {e(c.get("descripcion", ""))}'),
             ("Uso", e(c.get("uso", "")))]
    if c.get("variante_oscuro"):
        v = c["variante_oscuro"]
        filas.append(("Variante sobre oscuro", f'<span class="hex">{v.upper()}</span> ({cl.fmt_ratio(cl.contraste(v, dk))}:1)'))
    if c.get("variante_claro"):
        v = c["variante_claro"]
        filas.append(("Variante para texto en claro", f'<span class="hex">{v.upper()}</span> ({cl.fmt_ratio(cl.contraste(v, lt))}:1)'))
    if rol in ("oscuro", "claro"):
        otro = lt if rol == "oscuro" else dk
        filas.append((f"Contraste con {pl.nombre_de(op, otro)}", f"{cl.fmt_ratio(cl.contraste(dk, lt))}:1"))
    if c.get("nota"):
        filas.append((c["nota"].get("titulo", "Nota"), e(c["nota"].get("texto", ""))))
    dl = "".join(f"<div><dt>{e(t)}</dt><dd>{v}</dd></div>" for t, v in filas)
    return (f'<article class="swatch"><div class="chip-color c-{rol}"><div><p class="role">{pl.ROL_ETIQUETA[rol]}</p>'
            f'<h3>{e(c["nombre"])}</h3></div><div class="row"><button class="copy" type="button" '
            f'id="cp-{op["id"]}-{rol}" data-hex="{c["hex"].upper()}">{c["hex"].upper()}</button>'
            f'<span class="rgb">RGB {r} · {g} · {b}</span></div></div><div class="info"><dl>{dl}</dl></div></article>')


def escenario(op: dict, data: dict) -> str:
    ej = data.get("ejemplo", {})
    tag = op.get("etiqueta_acento2") or ej.get("etiqueta_acento2", op["colores"]["acento2"]["nombre"])
    card = (f'<div class="card"><div class="card-top"><span class="sig">{e(ej.get("etiqueta", "Firma"))}</span>'
            f'<span class="tag">{e(tag)}</span></div><h4>{e(ej.get("titulo", "Título de ejemplo"))}</h4>'
            f'<p class="meta">{e(ej.get("meta", ""))}</p><div class="actions"><span class="btn">{e(ej.get("boton", "Acción principal"))}</span>'
            f'<span class="lnk">{e(ej.get("enlace", "Enlace"))}</span></div></div>')
    marca = f'<div class="mark">{icono_html(data)}<strong>{e(data["marca"])}</strong></div>'
    nota = f'<p class="note">{e(ej["nota"])}</p>' if ej.get("nota") else ""
    return (f'<div class="inuse"><div class="stage stage-lt"><p class="label">Lienzo claro</p>{card}</div>'
            f'<div class="stage stage-dk"><p class="label">Lienzo oscuro</p>{marca}{card}</div></div>{nota}')


def tabla_contraste(op: dict) -> str:
    filas = []
    for par in pl.pares_contraste(op):
        v = par["veredicto"]
        clase = "v-ok" if v in ("AAA", "AA") else "v-mid" if v == "Texto grande e interfaz" else "v-no"
        filas.append(f'<tr><td><span class="sample" style="background:{par["fondo"]};color:{par["texto"]}">Aa</span>'
                     f'{e(par["etiqueta"])}</td><td class="num">{cl.fmt_ratio(par["ratio"])}</td>'
                     f'<td><span class="verdict {clase}">{e(v)}</span></td></tr>')
    return ('<div class="table-wrap"><table class="contrast"><thead><tr><th scope="col">Combinación</th>'
            f'<th scope="col">Ratio</th><th scope="col">Resultado</th></tr></thead><tbody>{"".join(filas)}</tbody></table></div>')


def bloques(lista: list[dict]) -> str:
    if not lista:
        return ""
    partes = []
    for b in lista:
        items = "".join(f"<li>{e(i)}</li>" for i in b.get("items", []))
        partes.append(f'<div class="blk {e(b.get("tipo", "neutro"))}"><h3>{e(b.get("titulo", ""))}</h3><ul>{items}</ul></div>')
    return f'<div class="blocks">{"".join(partes)}</div>'


def resuelve(op: dict) -> str:
    filas = op.get("resuelve")
    if not filas:
        return ""
    cuerpo = "".join(f'<tr><td><strong>{e(f.get("punto", ""))}</strong></td><td>{e(f.get("donde", ""))}</td>'
                     f'<td>{e(f.get("solucion", ""))}</td><td class="num">{e(f.get("dato", ""))}</td></tr>' for f in filas)
    return ('<div><div class="section-head" style="margin-bottom:16px"><h3 style="font-size:22px">Cómo resuelve cada punto débil</h3></div>'
            '<div class="table-wrap"><table style="min-width:820px"><thead><tr><th scope="col">Punto débil</th>'
            '<th scope="col">Dónde</th><th scope="col">Cómo lo resuelve</th><th scope="col">Dato</th></tr></thead>'
            f'<tbody>{cuerpo}</tbody></table></div></div>')


def avisos(op: dict, estados: dict) -> str:
    items = [(n, m) for n, m in pl.comprobaciones(op, estados) if n != "OK"]
    if not items:
        return ""
    li = "".join(f"<li><strong>{n.capitalize()}:</strong> {e(m)}</li>" for n, m in items)
    return (f'<div class="blocks"><div class="blk con"><h3>Avisos de la validación automática</h3>'
            f'<ul>{li}</ul></div></div>')


def seccion(op: dict, data: dict) -> str:
    notas = "".join(f'<p class="note">{e(n)}</p>' for n in op.get("notas", []))
    return (f'<section class="option opt-{op["id"]}" id="opcion-{op["id"]}" aria-labelledby="t-{op["id"]}">'
            f'<div class="opt-head"><p class="eyebrow">{e(op.get("etiqueta", ""))} · {e(op["nombre"])}</p>'
            f'<h2 id="t-{op["id"]}">{e(op.get("titular", op["nombre"]))}</h2><p class="lead">{e(op.get("lead", ""))}</p>'
            f'{bloques(op.get("bloques", []))}</div>{resuelve(op)}{notas}<div>{banda(op)}</div>'
            f'<div class="swatches">{"".join(ficha(op, r) for r in pl.ROLES)}</div>{escenario(op, data)}'
            f'{tabla_contraste(op)}{avisos(op, data.get("estados", {}))}</section>')


def documento(data: dict) -> str:
    ops = data["opciones"]
    base = next((op for op in ops if op.get("destacada")), ops[0])
    claro, oscuro = tokens_chrome(base)
    tokens_ops = "\n".join(tokens_opcion(op) for op in ops)
    tipo = tipografia(data)
    texto = f'"{tipo["texto"]}", "Helvetica Neue", "Segoe UI", system-ui, sans-serif'
    # Sin monoespaciada propia, los hex usan la letra de texto con cifras tabulares.
    mono = f'"{tipo["mono"]}", ui-monospace, "SF Mono", Menlo, monospace' if tipo["mono"] else texto
    fuentes = (f'--display: "{tipo["display"]}", "Avenir Next", "Segoe UI", system-ui, sans-serif; '
               f'--body: {texto}; --mono: {mono};')
    estilos = (f":root {{ {claro} {fuentes} }}\n"
               f"@media (prefers-color-scheme: dark) {{ :root:not([data-theme=\"light\"]) {{ {oscuro} color-scheme: dark; }} }}\n"
               f":root[data-theme=\"dark\"] {{ {oscuro} color-scheme: dark; }}\n{tokens_ops}\n{CSS}")
    nav = "".join(f'<a href="#opcion-{op["id"]}">{e(op.get("etiqueta", ""))} · {e(op["nombre"])}</a>' for op in ops)
    reco = data.get("recomendacion")
    reco_html = (f'<div class="reco"><strong>{e(reco.get("titulo", ""))}</strong><p>{e(reco.get("texto", ""))}</p></div>'
                 if reco else "")
    reglas = "".join(f'<div class="rule"><h3>{e(r["titulo"])}</h3><p>{e(r["texto"])}</p></div>' for r in data.get("reglas", []))
    reglas_html = (f'<section aria-labelledby="t-reglas" style="border-top:1px solid var(--line);padding-top:36px">'
                   f'<div class="section-head"><p class="eyebrow">Reglas comunes</p><h2 id="t-reglas">Cómo se combinan</h2></div>'
                   f'<div class="rules">{reglas}</div></section>') if reglas else ""
    fecha = data.get("fecha") or date.today().isoformat()
    pie = data.get("pie", "Propuesta para revisión.")
    titulo = data.get("titulo", f"Paleta de marca {data['marca']}")
    return f"""<!doctype html>
<html lang="{e(data.get('idioma', 'es'))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{e(url_fuentes(tipo))}">
<style>
{estilos}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <div class="brandline">{icono_html(data)}<span class="nm">{e(data['marca'])}</span></div>
  <div style="display:grid;gap:16px">
    <p class="eyebrow">{e(data.get('eyebrow', 'Propuesta de paleta'))} · {e(fecha)}</p>
    <h1>{e(data.get('h1', titulo))}</h1>
    <p class="lead">{e(data.get('intro', ''))}</p>
  </div>
  <nav class="jump" aria-label="Opciones">{nav}</nav>
</header>
<section aria-labelledby="t-comparativa">
  <div class="section-head"><p class="eyebrow">Comparativa</p><h2 id="t-comparativa">Qué valor lleva el peso en cada opción</h2>
  <p>La franja muestra la proporción de uso recomendada. Las dos últimas filas se calculan a partir de los colores.</p></div>
  <div class="overview">{''.join(tarjeta_resumen(op) for op in ops)}</div>
  {comparativa(data)}
  {reco_html}
</section>
{''.join(seccion(op, data) for op in ops)}
{reglas_html}
<footer class="foot">{e(pie)} Contrastes WCAG 2.x, distancias de tono y ΔE con daltonismo (Machado 2009) calculados por herramientas/colorlib.py. Generado el {e(fecha)}.</footer>
</div>
<script>{JS}</script>
</body>
</html>
"""


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("paleta")
    p.add_argument("-o", "--salida")
    a = p.parse_args()
    try:
        data = pl.cargar(a.paleta)
    except (ValueError, pl.PaletaError) as err:
        sys.exit(f"Error: {err}")
    salida = a.salida or os.path.join(data["_dir"], "hoja-paleta.html")
    with open(salida, "w", encoding="utf-8") as fh:
        fh.write(documento(data))
    errores = sum(1 for op in data["opciones"] for n, _ in pl.comprobaciones(op, data.get("estados", {})) if n == "ERROR")
    print(f"Hoja generada: {salida} ({len(data['opciones'])} opciones, {errores} error(es) de validación)")
    if errores:
        print("Ejecuta `color.py validar` para ver el detalle antes de entregar.")


if __name__ == "__main__":
    main()
