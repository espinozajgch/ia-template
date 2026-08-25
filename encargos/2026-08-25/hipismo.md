# Encargo · hipismo

> Para un agente que trabaja **solo en `~/hipismo`** y no ha visto ninguna conversación previa.

## Qué es este repositorio

Plataforma de hipismo: ingesta de datos de carreras, analítica y web. Monorepo con
`apps/api` (Express + Prisma) y `apps/web` (React). Es el origen de la integración con el
Banco Central de Venezuela que otros proyectos del grupo reutilizan.

## Estado medido el 2026-08-25

- Rama `main`. **1 fichero sin commitear** (una imagen suelta en `data/raw/`), **nada sin
  publicar**.
- Suite: **720 pruebas en verde**, 85 ficheros.
- CI ya ejecuta: tipos, `check:cycles`, `check:file-size`, deriva de esquema y compilación.
- Ayer recibió un arreglo del parser del BCV que ya está en `main`.

## El encargo

**Un comando único de verificación local que espeje lo que corre CI.**

Este repositorio tiene las piezas —`test`, `typecheck`, `check:cycles`, `check:file-size`—
pero **hay que acordarse de las cuatro**. Así es como divergen local y CI: se corre lo
rápido, se declara «hecho», y lo que faltaba aparece después.

Qué se pide:

1. Un script `puerta` en `package.json` que encadene lo que ejecuta
   `.github/workflows/` **en el mismo orden**, de lo barato a lo caro.
2. Que **CI llame a ese script** en vez de repetir la lista.
3. Documentarlo donde el siguiente agente lo lea.

Mira primero el workflow: ahí está la lista buena, y el encargo es reflejarla.

**El fichero sin commitear** es una imagen en `data/raw/`. Decide si debe estar versionada
—probablemente no— y actúa en consecuencia; si no debe, va a `.gitignore` y se dice por qué.

## Cómo se verifica aquí

```bash
npm test                 # vitest, excluyendo la e2e
npm run typecheck        # los dos paquetes
npm run check:cycles     # ciclos de importación
npm run check:file-size  # tamaño de fichero
```

La suite **e2e está excluida a propósito**: exige una base efímera —`hipica3x6_e2e`— y se
niega a correr contra la de desarrollo porque borra datos. Esa negativa es una guarda de
seguridad, no un fallo: no la desactives para «poder correrlo todo».

## Reglas que no se negocian

- **No se hace `push` sin autorización explícita** del propietario. Commits locales sí.
- Estás en `main`. Si vas a tocar código, **abre una rama primero**.

## Lo que NO debes hacer

- **No toques `apps/api/src/exchange-rates/` sin leer el módulo entero.** Ahí vive una
  integración con el BCV con dos piezas que costaron caro: el arreglo de una cadena TLS
  incompleta —que **nunca** se resuelve con `rejectUnauthorized: false`, eso abre el proceso
  a un intermediario— y un parser anclado al código de moneda y no a clases CSS.
- **No instales el kit de agentes entero.** Este repositorio ya tiene verificadores propios
  y CI que los ejecuta; volcarle 104 ficheros añade contexto que no necesita.
- No toques `llm-wiki/` ni intentes fusionarla con `knowledge/wiki/`: por decisión del
  propietario son independientes por proyecto.
