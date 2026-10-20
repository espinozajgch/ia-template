#!/usr/bin/env python3
"""Herramientas de color del estudio de marca.

  color.py info HEX [HEX ...]
      Tono, saturación, luminosidad, croma y luminancia relativa.
  color.py contraste TEXTO FONDO [TEXTO FONDO ...]
      Ratio WCAG y veredicto de cada par.
  color.py daltonismo HEX_A HEX_B
      ΔE entre dos colores con visión normal y con los tres tipos de daltonismo.
  color.py estados HEX [HEX ...] --estados exito=#047857,info=#0c4a6e,...
      Distancia de tono de cada color al estado semántico más cercano.
  color.py variante HEX --fondo HEX --min 4.5
      Mismo tono y saturación con la luminosidad mínima que cumple el contraste.
  color.py buscar --tono 256 --restriccion "#f7f6f3:4.5" --restriccion "#14181f:3" [--sat 30-90]
      Candidatos de un tono que cumplen todas las restricciones de contraste.
  color.py extraer RUTA [--max 40]
      Inventario de colores literales y variables CSS de un repositorio.
  color.py muestra-png FICHERO X,Y [X,Y ...]
      Color de píxeles concretos de un PNG (fondo de un icono, por ejemplo).
  color.py validar paleta.json
      Comprueba contraste, variantes, estados y daltonismo de cada opción.
      Sale con código 1 si hay errores.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import colorlib as cl  # noqa: E402
import paleta as pl  # noqa: E402


def cmd_info(a):
    print(f"{'color':9} {'tono':>5} {'sat':>4} {'lum':>4} {'L*':>4} {'croma':>5} {'Y':>6}")
    for h in a.colores:
        c = cl.normalizar(h)
        t, s, l = cl.hsl(c)
        print(f"{c:9} {t:5.0f} {s:4.0f} {l:4.0f} {cl.lab(c)[0]:4.0f} {cl.croma(c):5.0f} {cl.luminancia(c):6.3f}")


def cmd_contraste(a):
    if len(a.colores) % 2:
        sys.exit("Pasa los colores por pares: TEXTO FONDO")
    for i in range(0, len(a.colores), 2):
        t, f = cl.normalizar(a.colores[i]), cl.normalizar(a.colores[i + 1])
        r = cl.contraste(t, f)
        print(f"{t} sobre {f}: {cl.fmt_ratio(r)}:1  {cl.veredicto(r)}")


def cmd_daltonismo(a):
    x, y = cl.normalizar(a.a), cl.normalizar(a.b)
    res = cl.delta_e_daltonismo(x, y)
    for k, v in res.items():
        print(f"{k:13} ΔE {cl.fmt_num(v):>5}")
    m = min(v for k, v in res.items() if k != "normal")
    juicio = ("sirven como series de gráfico" if m >= cl.DE_MINIMO_SERIES
              else "distinguibles si llevan etiqueta" if m >= cl.DE_MINIMO_ETIQUETADO
              else "se confunden: separa luminosidad o tono")
    print(f"mínimo con daltonismo: {cl.fmt_num(m)} → {juicio}")


def _parse_estados(texto: str) -> dict[str, str]:
    res = {}
    for par in texto.split(","):
        nombre, valor = par.split("=")
        res[nombre.strip()] = cl.normalizar(valor)
    return res


def cmd_estados(a):
    estados = _parse_estados(a.estados)
    for h in a.colores:
        e = cl.estado_mas_cercano(h, estados)
        if e is None:
            print(f"{cl.normalizar(h)}: neutro, sin tono comparable")
        else:
            aviso = "  ← puede leerse como estado" if e[1] < cl.DISTANCIA_ESTADO_MIN else ""
            print(f"{cl.normalizar(h)}: '{e[0]}' a {e[1]:.0f}°{aviso}")


def cmd_variante(a):
    v = cl.variante(a.color, a.fondo, a.min)
    if not v:
        sys.exit("Ninguna luminosidad de ese tono cumple el mínimo")
    print(f"{v}  ({cl.fmt_ratio(cl.contraste(v, a.fondo))}:1 sobre {cl.normalizar(a.fondo)})")


def cmd_buscar(a):
    restr = []
    for r in a.restriccion:
        fondo, minimo = r.rsplit(":", 1)
        restr.append((cl.normalizar(fondo), float(minimo)))
    smin, smax = (float(x) for x in a.sat.split("-"))
    res = cl.buscar(a.tono, restr, smin, smax, a.limite)
    if not res:
        sys.exit("Ningún candidato cumple todas las restricciones. Relaja una o cambia de tono.")
    cab = "  ".join(f"vs {f}" for f, _ in restr)
    print(f"{'color':9} {'sat':>4} {'lum':>5}  {cab}")
    for d in res:
        ratios = "  ".join(f"{cl.fmt_ratio(r):>10}" for r in d["ratios"])
        print(f"{d['hex']:9} {d['saturacion']:4.0f} {d['luminosidad']:5.1f}  {ratios}")


def cmd_extraer(a):
    inv = cl.extraer(a.ruta)
    colores = sorted(inv["colores"].items(), key=lambda kv: -kv[1]["n"])
    print(f"{len(colores)} colores distintos. Los {min(a.max, len(colores))} más usados:")
    for c, e in colores[:a.max]:
        t, s, l = cl.hsl(c)
        top = sorted(e["ficheros"].items(), key=lambda kv: -kv[1])[:3]
        donde = ", ".join(f"{f} ({n})" for f, n in top)
        print(f"  {c}  ×{e['n']:<4} tono {t:3.0f} sat {s:3.0f} lum {l:3.0f}  {donde}")
    print(f"\n{len(inv['variables'])} variables CSS con color literal:")
    for nombre, valor, f, n in inv["variables"][:a.max_vars]:
        print(f"  {nombre}: {valor}  {f}:{n}")
    if len(inv["variables"]) > a.max_vars:
        print(f"  … y {len(inv['variables']) - a.max_vars} más (usa --max-vars)")


def cmd_muestra_png(a):
    ancho, alto, filas = cl.leer_png(a.fichero)
    print(f"{a.fichero}: {ancho}×{alto}")
    for p in a.puntos:
        x, y = (int(v) for v in p.split(","))
        print(f"  ({x},{y}) {cl.a_hex(*filas[y][x])}")


def cmd_validar(a):
    data = pl.cargar(a.fichero)
    errores = 0
    for op in data["opciones"]:
        print(f"\n== {op.get('etiqueta', op['id'])} · {op['nombre']}")
        for nivel, msg in pl.comprobaciones(op, data.get("estados", {})):
            if nivel == "ERROR":
                errores += 1
            print(f"  {nivel:5} {msg}")
    print(f"\n{errores} error(es).")
    sys.exit(1 if errores else 0)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("info"); s.add_argument("colores", nargs="+"); s.set_defaults(f=cmd_info)
    s = sub.add_parser("contraste"); s.add_argument("colores", nargs="+"); s.set_defaults(f=cmd_contraste)
    s = sub.add_parser("daltonismo"); s.add_argument("a"); s.add_argument("b"); s.set_defaults(f=cmd_daltonismo)
    s = sub.add_parser("estados"); s.add_argument("colores", nargs="+")
    s.add_argument("--estados", required=True, help="nombre=#hex,nombre=#hex"); s.set_defaults(f=cmd_estados)
    s = sub.add_parser("variante"); s.add_argument("color"); s.add_argument("--fondo", required=True)
    s.add_argument("--min", type=float, default=4.5); s.set_defaults(f=cmd_variante)
    s = sub.add_parser("buscar"); s.add_argument("--tono", type=float, required=True)
    s.add_argument("--restriccion", action="append", required=True, help="#fondo:ratio_mínimo")
    s.add_argument("--sat", default="30-90"); s.add_argument("--limite", type=int, default=10)
    s.set_defaults(f=cmd_buscar)
    s = sub.add_parser("extraer"); s.add_argument("ruta"); s.add_argument("--max", type=int, default=40)
    s.add_argument("--max-vars", type=int, default=80); s.set_defaults(f=cmd_extraer)
    s = sub.add_parser("muestra-png"); s.add_argument("fichero"); s.add_argument("puntos", nargs="+")
    s.set_defaults(f=cmd_muestra_png)
    s = sub.add_parser("validar"); s.add_argument("fichero"); s.set_defaults(f=cmd_validar)

    a = p.parse_args()
    try:
        a.f(a)
    except (ValueError, pl.PaletaError) as e:
        sys.exit(f"Error: {e}")


if __name__ == "__main__":
    main()
