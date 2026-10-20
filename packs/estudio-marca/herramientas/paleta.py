"""Modelo de `paleta.json`: carga, derivados y comprobaciones.

El formato está documentado en `plantillas/paleta.ejemplo.json` y en `metodo/color.md`.
Toda cifra que aparezca en un entregable sale de aquí, nunca se escribe a mano.
"""
from __future__ import annotations

import json
import os

import colorlib as cl

ROLES = ("principal", "acento1", "acento2", "oscuro", "claro")
ROL_ETIQUETA = {
    "principal": "Color principal",
    "acento1": "Acento 1",
    "acento2": "Acento 2",
    "oscuro": "Neutro oscuro",
    "claro": "Neutro claro",
}
CROMATICOS = ("principal", "acento1", "acento2")
BLANCO = "#ffffff"


class PaletaError(ValueError):
    pass


# ── Carga ───────────────────────────────────────────────────────────────────

def cargar(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    data["_dir"] = os.path.dirname(os.path.abspath(path))
    if not data.get("opciones"):
        raise PaletaError("paleta.json no tiene 'opciones'")
    data["estados"] = {k: cl.normalizar(v) for k, v in data.get("estados", {}).items()}
    ids = set()
    for op in data["opciones"]:
        if op.get("id") in ids or not op.get("id"):
            raise PaletaError(f"Cada opción necesita un 'id' único (revisa {op.get('nombre')!r})")
        ids.add(op["id"])
        colores = op.get("colores", {})
        for rol in ROLES:
            if rol not in colores:
                raise PaletaError(f"Opción {op['id']}: falta el color '{rol}'")
            c = colores[rol]
            c["hex"] = cl.normalizar(c["hex"])
            for k in ("texto", "variante_oscuro", "variante_claro"):
                if c.get(k):
                    c[k] = cl.normalizar(c[k])
        op.setdefault("enlace", "principal")
        op.setdefault("firma", "principal")
        op.setdefault("proporcion", {"claro": 60, "oscuro": 25, "principal": 10, "acento1": 3, "acento2": 2})
    return data


# ── Derivados ───────────────────────────────────────────────────────────────

def hexr(op: dict, rol: str) -> str:
    return op["colores"][rol]["hex"]


def texto_sobre(op: dict, rol: str) -> str:
    c = op["colores"][rol]
    return c.get("texto") or cl.mejor_texto(c["hex"], (BLANCO, hexr(op, "oscuro")))


def nombre_de(op: dict, hexa: str) -> str:
    hexa = cl.normalizar(hexa)
    if hexa == BLANCO:
        return "Blanco"
    for rol in ROLES:
        if hexr(op, rol) == hexa:
            return op["colores"][rol]["nombre"]
    return hexa.upper()


def legible(op: dict, rol: str, fondo: str, minimo: float, clave: str) -> str:
    """El color del rol si cumple sobre el fondo; si no, su variante declarada; si no, una calculada."""
    c = op["colores"][rol]
    if cl.contraste(c["hex"], fondo) >= minimo:
        return c["hex"]
    if c.get(clave) and cl.contraste(c[clave], fondo) >= minimo:
        return c[clave]
    return cl.variante(c["hex"], fondo, minimo) or c["hex"]


def derivados(op: dict) -> dict:
    """Superficies, líneas y textos secundarios coherentes con los neutros de la opción."""
    dk, lt = hexr(op, "oscuro"), hexr(op, "claro")
    dk2 = cl.mezclar(dk, lt, 0.05)
    lt_muted = next((cl.mezclar(dk, lt, t / 100) for t in range(45, -1, -1)
                     if cl.contraste(cl.mezclar(dk, lt, t / 100), BLANCO) >= 4.6
                     and cl.contraste(cl.mezclar(dk, lt, t / 100), lt) >= 4.5), dk)
    dk_muted = next((cl.mezclar(lt, dk, t / 100) for t in range(45, -1, -1)
                     if cl.contraste(cl.mezclar(lt, dk, t / 100), dk2) >= 4.6), lt)
    return {
        "dk2": dk2,
        "dk_line": cl.mezclar(dk, lt, 0.13),
        "dk_muted": dk_muted,
        "lt_line": cl.mezclar(lt, dk, 0.10),
        "lt_muted": lt_muted,
    }


# ── Pares de contraste ──────────────────────────────────────────────────────

def pares_contraste(op: dict) -> list[dict]:
    """Todas las combinaciones relevantes de la opción, ordenadas de mayor a menor ratio."""
    dk, lt = hexr(op, "oscuro"), hexr(op, "claro")
    n = lambda h: nombre_de(op, h)  # noqa: E731
    pares: list[tuple[str, str, str, bool]] = [(lt, dk, f"{n(lt)} sobre {n(dk)}", False)]
    for rol in CROMATICOS:
        c = op["colores"][rol]
        h = c["hex"]
        t = texto_sobre(op, rol)
        pares.append((t, h, f"{n(t)} sobre {c['nombre']}", False))
        pares.append((h, lt, f"{c['nombre']} sobre {n(lt)}", bool(c.get("variante_claro"))))
        if c.get("variante_claro"):
            v = c["variante_claro"]
            pares.append((v, lt, f"{c['nombre']} (texto {v.upper()}) sobre {n(lt)}", False))
        pares.append((h, dk, f"{c['nombre']} sobre {n(dk)}", bool(c.get("variante_oscuro"))))
        if c.get("variante_oscuro"):
            v = c["variante_oscuro"]
            pares.append((v, dk, f"{c['nombre']} (claro {v.upper()}) sobre {n(dk)}", False))
    vistos, res = set(), []
    for texto, fondo, etiqueta, tiene_var in pares:
        if (texto, fondo) in vistos or texto == fondo:
            continue
        vistos.add((texto, fondo))
        r = cl.contraste(texto, fondo)
        v = cl.veredicto(r)
        if r < cl.UMBRALES["grande"] and tiene_var:
            v = "Usa la variante"
        res.append({"texto": texto, "fondo": fondo, "etiqueta": etiqueta, "ratio": r, "veredicto": v})
    res.sort(key=lambda d: -d["ratio"])
    return res


def separacion_acentos(op: dict) -> dict[str, float]:
    return cl.delta_e_daltonismo(hexr(op, "acento1"), hexr(op, "acento2"))


# ── Comprobaciones ──────────────────────────────────────────────────────────

def comprobaciones(op: dict, estados: dict[str, str]) -> list[tuple[str, str]]:
    """Lista de (nivel, mensaje). Nivel: ERROR, AVISO u OK."""
    res: list[tuple[str, str]] = []
    dk, lt = hexr(op, "oscuro"), hexr(op, "claro")

    r = cl.contraste(lt, dk)
    res.append(("OK" if r >= 7 else "AVISO" if r >= 4.5 else "ERROR",
                f"Neutros: {cl.fmt_ratio(r)}:1 entre claro y oscuro"))

    t = texto_sobre(op, "principal")
    r = cl.contraste(t, hexr(op, "principal"))
    res.append(("OK" if r >= 4.5 else "ERROR",
                f"Texto de botón ({nombre_de(op, t)}) sobre principal: {cl.fmt_ratio(r)}:1"))

    for rol in CROMATICOS:
        c = op["colores"][rol]
        nombre = c["nombre"]
        usado_como_texto_claro = rol in (op["enlace"], op["firma"])
        r_lt = cl.contraste(c["hex"], lt)
        if r_lt < 4.5 and usado_como_texto_claro:
            v = c.get("variante_claro")
            if v and cl.contraste(v, lt) >= 4.5:
                res.append(("OK", f"{nombre}: texto en claro con variante {v.upper()} ({cl.fmt_ratio(cl.contraste(v, lt))}:1)"))
            else:
                prop = cl.variante(c["hex"], BLANCO, 4.6)
                res.append(("ERROR", f"{nombre} se usa como texto en claro y da {cl.fmt_ratio(r_lt)}:1. "
                                     f"Declara 'variante_claro' (propuesta: {prop.upper() if prop else 'ninguna'})"))
        r_dk = cl.contraste(c["hex"], dk)
        if r_dk < 4.5:
            v = c.get("variante_oscuro")
            if v and cl.contraste(v, dk) >= 4.5:
                res.append(("OK", f"{nombre}: variante sobre oscuro {v.upper()} ({cl.fmt_ratio(cl.contraste(v, dk))}:1)"))
            elif v:
                res.append(("ERROR", f"{nombre}: la variante {v.upper()} solo da {cl.fmt_ratio(cl.contraste(v, dk))}:1 sobre el oscuro"))
            else:
                prop = cl.variante(c["hex"], dk, 7)
                res.append(("AVISO", f"{nombre} da {cl.fmt_ratio(r_dk)}:1 sobre el oscuro y no tiene 'variante_oscuro' "
                                     f"(propuesta: {prop.upper() if prop else 'ninguna'})"))
        # El color de enlace se excluye: enlaces e "información" comparten azul por convención
        # y el aviso sería ruido. El resto de cromáticos, incluido el principal, se comprueba.
        if rol != op["enlace"] and estados:
            e = cl.estado_mas_cercano(c["hex"], estados)
            if e:
                nivel = "AVISO" if e[1] < cl.DISTANCIA_ESTADO_MIN else "OK"
                res.append((nivel, f"{nombre}: estado más cercano '{e[0]}' a {e[1]:.0f}°"))

    sep = separacion_acentos(op)
    minimo = min(v for k, v in sep.items() if k != "normal")
    nivel = "OK" if minimo >= cl.DE_MINIMO_SERIES else "AVISO" if minimo >= cl.DE_MINIMO_ETIQUETADO else "ERROR"
    res.append((nivel, f"Acento 1 vs acento 2 con daltonismo: ΔE mínimo {cl.fmt_num(minimo)} "
                       f"({'sirven como series de gráfico' if nivel == 'OK' else 'acompáñalos de etiquetas'})"))

    total = sum(op["proporcion"].values())
    if total != 100:
        res.append(("AVISO", f"La proporción suma {total} %, no 100 %"))
    return res
