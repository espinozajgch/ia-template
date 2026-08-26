# Encargos del 2026-08-25

Un fichero por proyecto, para dárselo a un agente que **no ha visto esta conversación**.
Cada uno es autocontenido: dice en qué estado está el repositorio, qué se le pide, cómo se
verifica allí y qué no debe hacer.

Los datos son **medidos el 2026-08-25**, no recordados. Si al abrirlos ha pasado tiempo,
lo primero de cada encargo es volver a medir: en estos repositorios trabaja más de una
sesión y el árbol cambia bajo los pies.

> **Estado al 2026-08-26.** Cuatro de los cinco están cerrados, y tres los cerró otra
> sesión mientras estos ficheros existían. Se deja constancia en vez de borrarlos: saber
> qué se pidió y cómo se resolvió vale más que una lista limpia.

| Proyecto | Encargo | Estado |
|---|---|---|
| [pulso](pulso.md) | Poner a salvo 116 ficheros sin commitear | ✅ **caducado** — otra sesión lo limpió y la rama se fusionó a `main` |
| [futbot-web-app](futbot-web-app.md) | Resolver los 5 fallos de la puerta | ✅ **superado** — los cinco resueltos por otra sesión; lo rojo de hoy es trabajo en curso, no esto |
| [futbot-v2](futbot-v2.md) | Comando único de verificación local | ✅ **hecho** — `tools/puerta.py`, y CI llama a ese mismo comando |
| [hipismo](hipismo.md) | Comando único de verificación local | ✅ **hecho por otra sesión** — `npm run puerta` encadena nueve pasos y CI lo invoca |
| [ppsport](ppsport.md) | Comando único de raíz para los dos paquetes | ✅ **hecho por otra sesión** — `Makefile` con `verify` |

## Lo que NO se pide en ninguno

**Añadir trinquetes o puerta a los que «no los tienen».** Se midió y **los cinco los
tienen**, y en los cinco CI los ejecuta. ppsport es el más avanzado de todos —una batería
de trinquetes de diseño más pruebas de mutación—, no el que menos. Esa suposición era
errónea y se corrigió antes de escribir estos encargos.

**Instalar el kit entero.** Dos de estos repositorios inventaron sus trinquetes antes de
que el kit los ofreciera, y el de futbot-v2 resultó mejor que el del kit —subió al kit esta
semana—. Traer sólo lo que falta, nunca volcar los 104 ficheros.

**Hacer `push`.** En ninguno. Los commits locales son deseables; publicar es decisión del
propietario y varios de estos repositorios lo prohíben por escrito.
