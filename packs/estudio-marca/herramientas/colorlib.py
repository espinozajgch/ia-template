"""Biblioteca de color del estudio de marca.

Contraste WCAG, espacios de color, simulación de daltonismo, distancias de tono,
búsqueda de candidatos, inventario de colores de un repositorio y lectura de PNG.
Solo biblioteca estándar: se ejecuta en cualquier máquina con Python 3.9+.

Convenciones:
- El tono (hue) se mide en HSL, en grados 0-360.
- La diferencia de color es ΔE76 en CIELAB (D65).
- El daltonismo se simula con las matrices de Machado, Oliveira y Fernandes (2009),
  severidad 1.0, aplicadas en RGB lineal.
"""
from __future__ import annotations

import colorsys
import math
import os
import re
import struct
import zlib

# ── Conversión básica ───────────────────────────────────────────────────────

_HEX = re.compile(r"^[0-9a-fA-F]{6}$")


def normalizar(hexa: str) -> str:
    """Devuelve '#rrggbb' en minúsculas. Acepta 3, 4, 6 u 8 dígitos (descarta el alfa)."""
    h = hexa.strip().lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    elif len(h) == 8:
        h = h[:6]
    if not _HEX.match(h):
        raise ValueError(f"Color no válido: {hexa!r}")
    return "#" + h.lower()


def rgb(hexa: str) -> tuple[int, int, int]:
    h = normalizar(hexa)[1:]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def a_hex(r: float, g: float, b: float) -> str:
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in (r, g, b))


def _lineal(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gamma(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def rgb_lineal(hexa: str) -> tuple[float, float, float]:
    return tuple(_lineal(v / 255) for v in rgb(hexa))  # type: ignore[return-value]


# ── Contraste WCAG ──────────────────────────────────────────────────────────

def luminancia(hexa: str) -> float:
    r, g, b = rgb_lineal(hexa)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: str, b: str) -> float:
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


UMBRALES = {"AAA": 7.0, "AA": 4.5, "grande": 3.0}


def veredicto(ratio: float) -> str:
    if ratio >= UMBRALES["AAA"]:
        return "AAA"
    if ratio >= UMBRALES["AA"]:
        return "AA"
    if ratio >= UMBRALES["grande"]:
        return "Texto grande e interfaz"
    return "No apto para texto"


def fmt_ratio(ratio: float) -> str:
    """Formato español: 4,72."""
    return f"{ratio:.2f}".replace(".", ",")


def fmt_num(valor: float, decimales: int = 1) -> str:
    return f"{valor:.{decimales}f}".replace(".", ",")


# ── Espacios de color ───────────────────────────────────────────────────────

def hsl(hexa: str) -> tuple[float, float, float]:
    """(tono 0-360, saturación 0-100, luminosidad 0-100)."""
    r, g, b = (v / 255 for v in rgb(hexa))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s * 100, l * 100


def desde_hsl(h: float, s: float, l: float) -> str:
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(100, l)) / 100, max(0, min(100, s)) / 100)
    return a_hex(r * 255, g * 255, b * 255)


def _lab_desde_lineal(r: float, g: float, b: float) -> tuple[float, float, float]:
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def lab(hexa: str) -> tuple[float, float, float]:
    return _lab_desde_lineal(*rgb_lineal(hexa))


def croma(hexa: str) -> float:
    _, a, b = lab(hexa)
    return math.hypot(a, b)


def mezclar(a: str, b: str, t: float) -> str:
    """Interpola de a (t=0) a b (t=1) en sRGB."""
    ra, rb = rgb(a), rgb(b)
    return a_hex(*(x + (y - x) * t for x, y in zip(ra, rb)))


# ── Daltonismo ──────────────────────────────────────────────────────────────

MATRICES_CVD = {
    "deuteranopía": ((0.367322, 0.860646, -0.227968),
                     (0.280085, 0.672501, 0.047413),
                     (-0.011820, 0.042940, 0.968881)),
    "protanopía": ((0.152286, 1.052583, -0.204868),
                   (0.114503, 0.786281, 0.099216),
                   (-0.003882, -0.048116, 1.051998)),
    "tritanopía": ((1.255528, -0.076749, -0.178779),
                   (-0.078411, 0.930809, 0.147602),
                   (0.004733, 0.691367, 0.303900)),
}


def _simular_lineal(hexa: str, tipo: str) -> tuple[float, float, float]:
    lin = rgb_lineal(hexa)
    m = MATRICES_CVD[tipo]
    return tuple(max(0.0, min(1.0, sum(m[i][j] * lin[j] for j in range(3)))) for i in range(3))  # type: ignore[return-value]


def simular(hexa: str, tipo: str) -> str:
    """Color tal como lo percibe alguien con ese tipo de daltonismo (para mostrarlo)."""
    return a_hex(*(_gamma(v) * 255 for v in _simular_lineal(hexa, tipo)))


def delta_e(a: str, b: str, tipo: str | None = None) -> float:
    """ΔE76. Con `tipo`, se mide sobre la simulación sin redondear a 8 bits."""
    if tipo:
        return math.dist(_lab_desde_lineal(*_simular_lineal(a, tipo)),
                         _lab_desde_lineal(*_simular_lineal(b, tipo)))
    return math.dist(lab(a), lab(b))


def delta_e_daltonismo(a: str, b: str) -> dict[str, float]:
    res = {"normal": delta_e(a, b)}
    res.update({t: delta_e(a, b, t) for t in MATRICES_CVD})
    return res


# Heurísticas de separación (ΔE76). Documentadas en metodo/color.md.
DE_MINIMO_ETIQUETADO = 15.0   # elementos que además llevan texto o forma
DE_MINIMO_SERIES = 20.0       # series de un gráfico distinguidas solo por color


# ── Tono y estados semánticos ───────────────────────────────────────────────

CROMA_MIN_TONO = 12.0  # croma CIELAB; por debajo el tono no se percibe: es un neutro.
# Se usa croma y no saturación HSL porque en colores muy oscuros o muy claros la
# saturación HSL es alta aunque el color se vea gris (p. ej. #14181f da 22 %).


def es_neutro(hexa: str) -> bool:
    return croma(hexa) < CROMA_MIN_TONO


def distancia_tono(h1: float, h2: float) -> float:
    d = abs(h1 - h2) % 360
    return min(d, 360 - d)


def estado_mas_cercano(hexa: str, estados: dict[str, str]) -> tuple[str, float] | None:
    """(nombre del estado, grados) o None si el color es un neutro."""
    if es_neutro(hexa):
        return None
    h = hsl(hexa)[0]
    mejor = None
    for nombre, valor in estados.items():
        if es_neutro(valor):
            continue
        he = hsl(valor)[0]
        d = distancia_tono(h, he)
        if mejor is None or d < mejor[1]:
            mejor = (nombre, d)
    return mejor


DISTANCIA_ESTADO_MIN = 30.0  # grados; por debajo, el acento puede leerse como estado


# ── Búsqueda de candidatos ──────────────────────────────────────────────────

def mejor_texto(fondo: str, candidatos: tuple[str, ...] = ("#ffffff", "#000000")) -> str:
    return max(candidatos, key=lambda c: contraste(c, fondo))


def variante(hexa: str, fondo: str, minimo: float) -> str | None:
    """Mismo tono y saturación; la luminosidad más cercana que cumpla el mínimo sobre el fondo."""
    h, s, l = hsl(hexa)
    if contraste(hexa, fondo) >= minimo:
        return normalizar(hexa)
    for paso in range(1, 1001):
        for signo in (1, -1):
            l2 = l + signo * paso * 0.1
            if 0 <= l2 <= 100:
                c = desde_hsl(h, s, l2)
                if contraste(c, fondo) >= minimo:
                    return c
    return None


def buscar(tono: float, restricciones: list[tuple[str, float]], sat_min: float = 30,
           sat_max: float = 90, limite: int = 10) -> list[dict]:
    """Candidatos de un tono que cumplen todas las restricciones (fondo, contraste mínimo).

    Ordena por saturación (energía) y después por el margen más estrecho.
    """
    vistos: set[str] = set()
    res = []
    s = sat_min
    while s <= sat_max + 1e-9:
        l = 5.0
        while l <= 95:
            c = desde_hsl(tono, s, l)
            if c not in vistos:
                vistos.add(c)
                ratios = [contraste(c, f) for f, _ in restricciones]
                if all(r >= m for r, (_, m) in zip(ratios, restricciones)):
                    margen = min(r - m for r, (_, m) in zip(ratios, restricciones))
                    res.append({"hex": c, "saturacion": s, "luminosidad": l,
                                "ratios": ratios, "margen": margen})
            l += 0.5
        s += 2
    res.sort(key=lambda d: (-d["saturacion"], -d["margen"]))
    # Una entrada por saturación: la de margen más equilibrado.
    unicos, sats = [], set()
    for d in res:
        if d["saturacion"] not in sats:
            sats.add(d["saturacion"])
            unicos.append(d)
    return unicos[:limite]


# ── Inventario de colores de un repositorio ─────────────────────────────────

EXT_DEFECTO = ("css", "scss", "sass", "less", "html", "htm", "js", "jsx", "ts", "tsx",
               "vue", "svelte", "json", "xml")
DIRS_EXCLUIDOS = {"node_modules", ".git", "dist", "build", "coverage", ".next", "out",
                  "vendor", ".venv", "venv", "__pycache__", ".turbo", ".cache"}
_RE_HEX = re.compile(r"(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])")
_RE_VAR = re.compile(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b")


def extraer(ruta: str, extensiones: tuple[str, ...] = EXT_DEFECTO,
            excluidos: set[str] | None = None) -> dict:
    """Recorre un repositorio y devuelve colores literales y variables CSS con color."""
    excluidos = DIRS_EXCLUIDOS | (excluidos or set())
    colores: dict[str, dict] = {}
    variables: list[tuple[str, str, str, int]] = []
    for raiz, dirs, ficheros in os.walk(ruta):
        dirs[:] = [d for d in dirs if d not in excluidos]
        for nombre in ficheros:
            if nombre.rsplit(".", 1)[-1].lower() not in extensiones:
                continue
            path = os.path.join(raiz, nombre)
            rel = os.path.relpath(path, ruta)
            try:
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    for n, linea in enumerate(fh, 1):
                        for m in _RE_HEX.finditer(linea):
                            try:
                                c = normalizar(m.group(0))
                            except ValueError:
                                continue
                            e = colores.setdefault(c, {"n": 0, "ficheros": {}})
                            e["n"] += 1
                            e["ficheros"][rel] = e["ficheros"].get(rel, 0) + 1
                        for m in _RE_VAR.finditer(linea):
                            try:
                                variables.append((m.group(1), normalizar(m.group(2)), rel, n))
                            except ValueError:
                                continue
            except OSError:
                continue
    return {"colores": colores, "variables": variables}


# ── Lectura de PNG (muestreo de píxeles de un logotipo o icono) ─────────────

def leer_png(path: str) -> tuple[int, int, list[list[tuple[int, int, int]]]]:
    """Decodifica un PNG de 8 bits no entrelazado. Devuelve (ancho, alto, filas RGB)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("No es un PNG")
    pos, idat, paleta = 8, b"", None
    ancho = alto = prof = tipo = entrelazado = 0
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            ancho, alto, prof, tipo, _, _, entrelazado = struct.unpack(">IIBBBBB", chunk[:13])
        elif typ == b"PLTE":
            paleta = [tuple(chunk[i:i + 3]) for i in range(0, len(chunk), 3)]
        elif typ == b"IDAT":
            idat += chunk
        pos += 12 + ln
    if prof != 8 or entrelazado:
        raise ValueError("Solo PNG de 8 bits por canal y no entrelazados")
    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[tipo]
    raw = zlib.decompress(idat)
    stride = ancho * bpp
    prev = bytearray(stride)
    filas, i = [], 0
    for _ in range(alto):
        f = raw[i]
        i += 1
        linea = bytearray(raw[i:i + stride])
        i += stride
        for x in range(stride):
            a = linea[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                linea[x] = (linea[x] + a) & 255
            elif f == 2:
                linea[x] = (linea[x] + b) & 255
            elif f == 3:
                linea[x] = (linea[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                linea[x] = (linea[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = linea
        fila = []
        for x in range(ancho):
            px = linea[x * bpp:(x + 1) * bpp]
            if tipo in (0, 4):
                fila.append((px[0], px[0], px[0]))
            elif tipo == 3:
                fila.append(paleta[px[0]] if paleta else (0, 0, 0))
            else:
                fila.append((px[0], px[1], px[2]))
        filas.append(fila)
    return ancho, alto, filas
