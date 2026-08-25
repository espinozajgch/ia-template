# Encargo · pulso

> Para un agente que trabaja **solo en `~/pulso`** y no ha visto ninguna conversación previa.

## Qué es este repositorio

SaaS clínico multiempresa: laboratorio, consultas, imagenología, facturación y nómina.
Next.js + PostgreSQL con aislamiento por fila (RLS). El contexto vive en `AGENTS.md` —
léelo entero antes de tocar nada; `CLAUDE.md` es un puntero a él.

Es el único de los cinco repositorios del grupo con el kit de agentes nuevo: tiene siete
skills en `.claude/skills/`, trinquetes en `.ratchets/` y puerta de un solo comando.

## Estado medido el 2026-08-25

- Rama `fortalecer/tailwind-kit-auditoria`, **sin remoto configurado**.
- **116 ficheros sin commitear.**
- Suite: **1.114 pruebas en verde** la última vez que se ejecutó entera.
- CI verifica lint, tipos y pruebas antes de desplegar.

> **Vuelve a medirlo antes de empezar.** En este repositorio trabaja más de una sesión y el
> árbol cambia mientras trabajas. Ayer un `git add -A` capturó un tipo a medio escribir y
> dejó HEAD sin compilar.

## El encargo

**Poner a salvo los 116 ficheros sin commitear.** No es tuyo el trabajo que contienen
—medicamentos, monedas, calendario, sedes— pero no tiene red: no hay diff que revisar, no
hay a dónde volver y no existe para nadie más.

Cómo:

1. **Clasifica por tema**, no por carpeta. Mira el contenido de los diffs: varias funciones
   distintas llegaron mezcladas al árbol. Agrupa por firma de contenido —un símbolo, una
   tabla, un módulo nuevo— y no por ruta.
2. **Commitea tanda a tanda, nombrando ficheros.** Nunca `git add -A`: con otra sesión
   escribiendo, eso captura un instante y no un estado.
3. **Verifica antes de cada commit** con `npm run puerta`.
4. Si una tanda no se puede separar sin reescribir trabajo ajeno, **dilo en el mensaje** en
   vez de fingir que es coherente. Un commit honesto que dice «esto son tres cosas que
   llegaron juntas» vale más que uno que aparenta orden.

## Cómo se verifica aquí

```bash
npm run puerta          # lint · tipos · pruebas con cobertura · trinquetes · compilación
npm run trinquetes      # sólo los trinquetes
npm test                # sólo las pruebas
```

La base local se levanta con `npm run db:start` y las migraciones con
`DATABASE_URL=postgresql://localhost:54329/labora node scripts/migrate.mjs`.

**No sustituyas la puerta por lint y typecheck sueltos.** Correr lo rápido y declarar
«hecho» es el mecanismo exacto por el que algo se da por terminado sin estarlo.

## Reglas que no se negocian

- **No hagas `push`.** La rama ni siquiera tiene remoto. Commits locales sí, publicar no.
- **No edites una migración ya aplicada.** El ejecutor lo impide y tiene razón: se escribe
  otra que corrija.
- **Verifica sobre una copia limpia de HEAD**, no sobre tu directorio de trabajo, cuando
  quieras saber si lo que commiteaste está bien:
  ```bash
  git worktree add -q --detach /tmp/limpio HEAD
  cd /tmp/limpio && ln -s "$OLDPWD/node_modules" node_modules && npm run puerta
  ```
  El directorio de trabajo mezcla lo tuyo con lo de la otra sesión. (Salvedad: `next build`
  rechaza ese enlace simbólico, así que la compilación se comprueba en el repositorio real
  y sólo vale con el árbol limpio.)

## Lo que NO debes hacer

- No reformatees ficheros ajenos «de paso».
- No re-fijes ninguna línea base de `.ratchets/` sin decir por qué en el commit. Si un
  trinquete se pone rojo, es una decisión —corregir o aceptar—, no un estorbo.
- No toques `llm-wiki/` ni fusiones wikis: por decisión del propietario, la documentación
  de cada proyecto es independiente.
