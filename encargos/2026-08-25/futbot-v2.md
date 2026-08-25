# Encargo · futbot-v2

> Para un agente que trabaja **solo en `~/futbot/futbot-v2`** y no ha visto ninguna
> conversación previa.

## Qué es este repositorio

El bot de transmisión de Futbot: narra partidos en directo, publica en Discord y genera
informes PDF postpartido. Python 3.12. El panel que lo lanza vive en el repositorio hermano
`~/futbot/futbot-web-app` — son repos **independientes**. Contexto en `CLAUDE.md`.

Es el repositorio **más sano del grupo en verificación**: 2.118 pruebas que pasan enteras en
67 segundos, CI que las ejecuta y despliegue que depende de ellas.

## Estado medido el 2026-08-25

- Rama `release`. **4 ficheros sin commitear**, **37 commits sin publicar**.
- Suite: **2.118 verdes, 4 saltadas.**
- Ya tiene trinquetes propios, y buenos: `tests/test_analisis_estatico.py` lleva un
  **presupuesto por regla de ruff** (`PRESUPUESTO = {"F841": 82, "F811": 1}`) con las **dos
  mitades** — «no crece» y «si baja, actualiza el número». Esa segunda mitad la copió el kit
  de aquí esta semana, porque le faltaba.

## El encargo

**Un comando único de verificación local que espeje lo que corre CI.**

Hoy CI ejecuta la suite y el análisis estático en pasos separados, y en local hay que
acordarse de los dos. Eso es exactamente cómo divergen: se corre lo rápido, se declara
«hecho», y el paso que faltaba aparece en CI o —peor— en producción.

Qué se pide:

1. Un `tools/puerta.py` (o el nombre que encaje aquí) que encadene lo que CI ejecuta, **en
   el mismo orden y con los mismos comandos**. De lo barato a lo caro: quien rompe el
   análisis estático debe enterarse en segundos, no tras esperar 2.118 pruebas.
2. Que **CI llame a ese mismo comando** en vez de repetir la lista. Dos listas que hay que
   mantener a la vez acaban divergiendo y gana la de CI, dejando la local sin significado.
3. Documentarlo en `CLAUDE.md`, donde hoy los comandos aparecen sueltos.

Es corto: media hora. El valor no está en el código sino en que deje de haber dos formas de
verificar.

**Los 4 ficheros sin commitear** son lo segundo, y son minutos: míralos, agrúpalos por tema
y commitea verificando.

## Cómo se verifica aquí

```bash
.venv/bin/python -m pytest tests -q                        # la suite entera
.venv/bin/python -m pytest tests/test_analisis_estatico.py -q   # ruff: errores duros + presupuesto
```

Mira `.github/workflows/deploy.yml` antes de escribir nada: **ahí está la lista buena**, y
el encargo es reflejarla, no inventar otra.

## Reglas que no se negocian

- **Nunca se trabaja sobre `main`.**
- **No se hace `push` sin autorización explícita** del propietario. Commits locales sí.
- **El lago no se versiona.** Nada de `../futbot-lake/` entra aquí.

## Lo que NO debes hacer

- **No reescribas el trinquete que ya existe.** Es mejor que el que el kit ofrece: está
  parametrizado por regla y tiene las dos mitades. Si acaso, añádele reglas.
- **No saques `PRESUPUESTO` ni `SIN_MANIM` a un fichero de configuración.** Están dentro del
  test con su historia al lado —qué son, por qué, desde cuándo— y separar el número de su
  razón es lo que convierte una excepción declarada en un número que nadie entiende.
- No instales el kit de agentes entero. Este repositorio va por delante en varias cosas.
