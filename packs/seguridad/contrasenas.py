"""Contraseñas: un solo algoritmo, un solo formato, en todos los proyectos.

Gemelo de ``contrasenas.ts``: mismos parámetros, misma interfaz, mismo formato PHC. Un hash
escrito por uno lo verifica el otro, y ``test_contrasenas.py`` lo comprueba con un hash
fijo escrito por Node. El porqué de cada decisión está en ``contrasenas.ts`` y en
``PACK.md`` § Contraseñas; aquí sólo se repite lo que cambia por ser Python.

Dependencia: ``argon2-cffi``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, NamedTuple, Sequence

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

#: 64 MiB, 3 pasadas, 4 carriles. Son los valores por defecto de argon2-cffi, pero se
#: fijan aquí: si la biblioteca cambia sus valores por defecto, este estándar no cambia.
MEMORIA_KIB = 65536
PASADAS = 3
CARRILES = 4
LONGITUD_MAXIMA = 1024

_hasher = PasswordHasher(time_cost=PASADAS, memory_cost=MEMORIA_KIB, parallelism=CARRILES)
_PHC = re.compile(r"^\$(argon2(?:id|i|d))\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$")


class Comprobacion(NamedTuple):
    valida: bool
    necesita_rehash: bool


@dataclass(frozen=True)
class Legado:
    """Un formato anterior que el proyecto aún sabe leer, sólo para verificar."""

    nombre: str
    reconoce: Callable[[str], bool]
    verificar: Callable[[str, str], bool]


def hash_contrasena(password: str) -> str:
    if len(password) > LONGITUD_MAXIMA:
        raise ValueError("Contraseña demasiado larga.")
    return _hasher.hash(password)


def verificar_contrasena(
    password: str, almacenado: str, legados: Sequence[Legado] = ()
) -> Comprobacion:
    no = Comprobacion(False, False)
    if len(password) > LONGITUD_MAXIMA or not almacenado:
        return no

    if almacenado.startswith("$argon2"):
        try:
            _hasher.verify(almacenado, password)
        except VerifyMismatchError:
            return no
        except (VerificationError, InvalidHashError):
            return no  # malformado: no autentica a nadie, ni tumba la petición
        return Comprobacion(True, por_debajo(almacenado))

    legado = next((l for l in legados if l.reconoce(almacenado)), None)
    if legado is None:
        return no
    valida = legado.verificar(password, almacenado)
    return Comprobacion(valida, valida)


def por_debajo(almacenado: str) -> bool:
    """¿Más débil que el estándar? Nunca «distinto»: un hash más fuerte no se rebaja.

    Por eso no se usa ``PasswordHasher.check_needs_rehash``, que compara por igualdad.
    """
    m = _PHC.match(almacenado)
    if not m:
        return True
    variante, version, memoria, pasadas, _ = m.groups()
    return (
        variante != "argon2id"
        or int(version) < 19
        or int(memoria) < MEMORIA_KIB
        or int(pasadas) < PASADAS
    )


_relleno: str | None = None


def verificar_en_vacio(password: str) -> None:
    """Gasta lo mismo que una verificación real. Para cuando la cuenta no existe."""
    global _relleno
    if _relleno is None:
        _relleno = hash_contrasena("relleno-sin-cuenta")
    # Sin recortar: por encima del máximo sale enseguida con cuenta o sin ella.
    verificar_contrasena(password, _relleno)
