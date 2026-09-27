"""Mismas pruebas que ``contrasenas.test.ts``, con el vector de interoperabilidad al revés:
el hash fijo de abajo lo escribió ``@node-rs/argon2`` (Node)."""

import time

import pytest
from argon2 import PasswordHasher

from contrasenas import (
    LONGITUD_MAXIMA,
    Comprobacion,
    Legado,
    hash_contrasena,
    por_debajo,
    verificar_contrasena,
    verificar_en_vacio,
)

CLAVE = "correcto caballo pila grapa"
#: ``hash("correcto caballo pila grapa", {memoryCost: 65536, timeCost: 3, parallelism: 4})``,
#: @node-rs/argon2 2.2.1.
DE_NODE = "$argon2id$v=19$m=65536,t=3,p=4$5OC235mMoLkFf3PDknqsmQ$AHO1G3jklsloP16tkeDqDUV4u7nq2fs1PGnc9ni/DPM"


def test_hash_nuevo_es_argon2id_phc_con_el_estandar():
    h = hash_contrasena(CLAVE)
    assert h.startswith("$argon2id$v=19$m=65536,t=3,p=4$")
    assert verificar_contrasena(CLAVE, h) == Comprobacion(True, False)
    assert not verificar_contrasena("otra", h).valida
    assert hash_contrasena(CLAVE) != h


def test_longitud_maxima():
    larga = "x" * (LONGITUD_MAXIMA + 1)
    with pytest.raises(ValueError, match="demasiado larga"):
        hash_contrasena(larga)
    assert verificar_contrasena(larga, PasswordHasher().hash(larga)) == Comprobacion(False, False)
    justa = "x" * LONGITUD_MAXIMA
    assert verificar_contrasena(justa, hash_contrasena(justa)) == Comprobacion(True, False)


def test_verifica_el_hash_que_escribio_node():
    assert verificar_contrasena(CLAVE, DE_NODE) == Comprobacion(True, False)


def test_rehash_solo_hacia_arriba():
    # Cada condición por separado: si sólo se probaran juntas, quitar una no se notaría.
    assert por_debajo("$argon2id$v=19$m=19456,t=3,p=4$c2Fs$aGFzaA")
    assert por_debajo("$argon2id$v=19$m=65536,t=2,p=4$c2Fs$aGFzaA")
    assert por_debajo("$argon2id$v=16$m=65536,t=3,p=4$c2Fs$aGFzaA")
    assert por_debajo("$argon2i$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")
    assert por_debajo("$argon2id$sin-parametros")
    assert por_debajo("x$argon2id$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")
    assert not por_debajo("$argon2id$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")
    assert not por_debajo("$argon2id$v=19$m=131072,t=10,p=16$c2Fs$aGFzaA")
    debil = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1).hash(CLAVE)
    assert verificar_contrasena(CLAVE, debil) == Comprobacion(True, True)
    assert verificar_contrasena("otra", debil) == Comprobacion(False, False)


def test_legados():
    texto = Legado("prueba", lambda a: a.startswith("legado$"), lambda p, a: a == f"legado${p}")
    assert verificar_contrasena(CLAVE, f"legado${CLAVE}") == Comprobacion(False, False)
    assert verificar_contrasena(CLAVE, f"legado${CLAVE}", [texto]) == Comprobacion(True, True)
    assert verificar_contrasena("otra", f"legado${CLAVE}", [texto]) == Comprobacion(False, False)
    assert not verificar_contrasena(CLAVE, "texto-cualquiera", [texto]).valida
    assert not verificar_contrasena(CLAVE, "$argon2id$roto").valida
    assert not verificar_contrasena(CLAVE, "").valida


def _medir(trabajo):
    t = time.perf_counter()
    trabajo()
    return time.perf_counter() - t


def test_cuenta_inexistente_cuesta_lo_mismo():
    h = hash_contrasena(CLAVE)
    verificar_en_vacio(CLAVE)
    # El mínimo de varias medidas: una sola la estropea cualquier otro proceso a la vez.
    def minimo(trabajo):
        return min(_medir(trabajo) for _ in range(5))
    real = minimo(lambda: verificar_contrasena("otra", h))
    vacio = minimo(lambda: verificar_en_vacio("otra"))
    assert vacio > real * 0.5
