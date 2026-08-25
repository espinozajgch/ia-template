# Encargo · futbot-web-app

> Para un agente que trabaja **solo en `~/futbot/futbot-web-app`** y no ha visto ninguna
> conversación previa.

## Qué es este repositorio

El panel de operación de Futbot: API FastAPI + frontend React/Vite, con PWA instalable.
Lanza el bot que vive en el repositorio hermano `~/futbot/futbot-v2` — son repos
**independientes**, no un monorepo. El contexto está en `CLAUDE.md` y `AGENTS.md`.

## Estado medido el 2026-08-25

- Rama `release`. Árbol **limpio**, pero **82 commits sin publicar**.
- La puerta existe desde ayer: `python3 tools/puerta.py`, y CI la ejecuta antes de
  desplegar. Antes el flujo se llamaba «CI + CD» y sólo hacía `checkout` y `ssh`.
- **La puerta está en rojo: 5 fallos de 460 pruebas.**

## El encargo

**Resolver los cinco fallos.** Cuatro de ellos son la primera vez que el proyecto puede
verlos, así que léelos como información y no como una lista de bugs.

**Tres son trinquetes, y piden una decisión, no un arreglo:**

| Trinquete | Estado |
|---|---|
| color escrito a mano | cruzó su línea base |
| tipografía fuera de escala | cruzó su línea base |
| tamaño de fichero (`backend/tests/test_trinquetes.py`) | varios ficheros crecieron |

Para cada uno hay **dos salidas honradas y sólo dos**: corregir las ocurrencias nuevas, o
**re-fijar la línea base diciendo por qué en el commit**. Bajar el umbral para que pase no
es una de ellas. Si el crecimiento fue deliberado —una función nueva de verdad—, re-fijar es
la respuesta correcta y no una derrota.

**Dos son defectos reales:**

- `backend/tests/test_consumption.py` — `test_las_transmisiones_ya_no_son_telemetria_ausente`
- frontend — «no pinta un panel vacío debajo del loader inicial del centro»

## Cómo se verifica aquí

```bash
python3 tools/puerta.py              # lint · tipos · suite del frontend · suite del backend
python3 tools/puerta.py --frontend
python3 tools/puerta.py --backend
```

Es el mismo comando que corre CI, y por eso se corre igual aquí: dos listas de pasos que hay
que mantener a la vez acaban divergiendo, y gana la de CI.

Aparte, y **es otra pregunta**: `python3 tools/verify_all.py` comprueba el *enlace* con los
servicios de fuera —base, rutas al bot, tokens de Discord—. La puerta dice si el código está
bien; aquélla, si el entorno responde. Correr la segunda cuando la primera falla es perder
el tiempo dos veces.

El intérprete es el del entorno virtual: `.venv/bin/python`, versión en `.python-version`.

## Reglas que no se negocian

- **Nunca se trabaja sobre `main`.** Siempre sobre `develop` o una rama que salga de ella.
- **No se hace `push` sin autorización explícita** del propietario. Ni a `main`, ni a
  `develop`, ni a ninguna rama. Commits locales sí.
- **El lago (`../futbot-lake/`) no se versiona ni entra en este repositorio.** Ni el
  catálogo, ni los escudos, ni los registros. Es regla del propietario, no un pendiente.
- **El bot se lanza con SU intérprete**, nunca con el de este proceso: son dos entornos
  separados a propósito.

## Lo que NO debes hacer

- No desactives ningún trinquete ni bajes un umbral para que la puerta pase.
- No metas la ingesta de datos en una Action de GitHub que escriba en la base: aquí eso ya
  se decidió en contra y el motivo está escrito en `.github/workflows/`.
- No toques `llm-wiki/` ni intentes fusionarla con `knowledge/wiki/`: por decisión del
  propietario son independientes por proyecto.
