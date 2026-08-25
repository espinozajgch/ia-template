# Encargo · ppsport

> Para un agente que trabaja **solo en `~/ppsportmanagementarg`** y no ha visto ninguna
> conversación previa.

## Qué es este repositorio

Plataforma de gestión deportiva. Dos paquetes con manifiesto propio, `server/` y `client/`,
y **sin manifiesto en la raíz**. Es el repositorio más grande del grupo: 311.000 líneas.

Y es el **más avanzado en verificación** de los cinco. Antes de proponer nada, mira lo que
ya tiene:

- **6.936 pruebas en verde** — 3.583 en el servidor, 3.353 en el cliente.
- Una batería de trinquetes de diseño en el cliente: `colors:validate`, `shadows:validate`,
  `native-inputs:validate`, `rounded:validate`, `segmented:validate`,
  `table-shell:validate`, `loc:validate`, `i18n:literals:baseline` — cada uno con su
  `:baseline` para re-fijar.
- `quality:check` en **los dos** paquetes, y CI lo ejecuta.
- CI corre además pruebas de integración y **pruebas de mutación**.

## Estado medido el 2026-08-25

- Rama `main`. Árbol **limpio**, nada sin publicar. Es el más ordenado del grupo.
- Cero ficheros de código por encima de 400 líneas: está muy bien troceado. Los mayores son
  un fichero de traducciones (3.775 líneas) y suites e2e, que no son módulos dios.

## El encargo

**Un comando único de raíz que verifique los dos paquetes.**

Hoy hay que entrar en `server/` y en `client/` y correr `quality:check` en cada uno. Eso no
es un problema de herramienta —las piezas están y son buenas— sino de que **no hay un solo
sitio donde «verificar» signifique algo**, y con dos paquetes eso se olvida a medias.

Qué se pide:

1. Un manifiesto o un `Makefile` en la raíz con un objetivo único que encadene
   `quality:check` de los dos, de lo barato a lo caro.
2. Que **CI llame a ese objetivo** en vez de repetir la lista por paquete.
3. Documentarlo donde el siguiente agente lo lea.

Es corto. El valor está en que deje de haber dos formas de verificar.

**Segundo, y sólo si el primero está hecho:** hay **881 usos de `any` explícito** en el
código. No es un encargo de arreglarlos —son muchos y no todos son deuda— sino de
**congelar el número**: un trinquete más, en el mismo estilo que los que ya existen, con la
línea base en lo medido hoy. No obliga a tocar ninguno; impide que mañana sean 900.

## Cómo se verifica aquí

```bash
cd server && npm run quality:check    # build · db:check · loc:validate · coverage
cd client && npm run quality:check    # colors · shadows · native-inputs · rounded · segmented · …
cd server && npx vitest run
cd client && npx vitest run
```

Mira `.github/workflows/` antes de escribir nada: **ahí está la lista buena**, y el encargo
es reflejarla, no inventar otra.

## Reglas que no se negocian

- **NUNCA hacer `push` sin autorización explícita.** Está escrito en el propio repositorio
  como regla crítica. Commits locales sí.
- Estás en `main`. Si vas a tocar código, **abre una rama primero**.
- **Deploy determinista (OPS-01):** el despliegue materializa el SHA exacto que se le pasa.
  No inventes pasos que lo hagan depender de otra cosa.

## Lo que NO debes hacer

- **No añadas trinquetes «que faltan» sin mirar antes.** Este repositorio ya tiene siete u
  ocho, cada uno con su línea base. Duplicar uno que ya existe con otro nombre es peor que
  no añadirlo.
- **No re-fijes ninguna línea base para que algo pase.** Si un `:validate` se pone rojo, es
  una decisión —corregir o aceptar declarándolo—, no un estorbo.
- **No instales el kit de agentes entero.** En verificación este repositorio va por delante
  del kit; lo que tiene sentido es lo contrario, mirar qué de aquí merece subir.
