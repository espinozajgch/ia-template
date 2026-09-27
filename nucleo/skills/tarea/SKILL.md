---
name: tarea
description: Convierte una petición en una tarea ejecutable, con alcance, criterio de verificación y hueco de cobertura declarados antes de escribir código. Úsala cuando llegue algo nuevo, o cuando una tarea en curso resulte ser más grande de lo que parecía.
---

# Tarea

Media hora de trabajo mal acotado cuesta más que cinco minutos acotándolo. Esta skill
produce **una ficha corta** — no un documento — antes de tocar nada.

El listón de qué cuenta como hecho está en `knowledge/wiki/definicion-de-hecho.md`, y si el
proyecto no lo tiene, en [`avanzar`](../avanzar/SKILL.md).

**Antes de nada:** si existe `knowledge/wiki/skills/tarea.md`, léelo. Es lo propio de este
proyecto —su frontera, sus ejemplos, dónde lleva el plan— y, donde sea más estricto que
esta skill, manda él.

---

## La ficha

Seis campos. Si alguno no se puede rellenar, **ahí está el problema de la tarea**.

```markdown
### T-<n> · <título en una línea>

**Objetivo.** Qué cambia para quien usa esto o para quien lo mantiene. Una frase.

**Alcance.** Qué se toca. Y explícitamente **qué NO** — el alcance limita en las dos
direcciones, y lo que sobra hace tanto daño como lo que falta.

**Hecho cuando.** El criterio, verificable, escrito ANTES de empezar. Con número y con
condiciones: «la segunda llamada baja de segundos a decenas de milisegundos contra la base
de producción, y el cuerpo es idéntico al de la primera».

**Cobertura.** Qué cubre la puerta de calidad y qué NO.
Lo que no cubra —un contrato entre procesos, una restricción que ningún test recorre, un
flujo que depende del entorno real— se dice, y se dice **con qué se cubre en su lugar**.

**Riesgo.** Qué es lo peor que puede salir de aquí, y qué lo detendría.

**Decisiones que no son mías.** Lo que no debe inferirse —una autoridad, una elección de
producto—. Va a `knowledge/wiki/decisiones-pendientes.md` en vez de detener el trabajo, y
se dice **qué trabajo independiente puede seguir** mientras tanto.
```

---

## Cómo se acota bien

**Una tarea = un resultado verificable, y un commit coherente** si el proyecto permite
commits locales (`AGENTS.md` §5). Si la ficha necesita dos «hecho cuando», son dos tareas.
Partir es barato; un commit que hace tres cosas no se puede revertir. Parejas que casi
siempre son dos tareas:

- el contrato o la API, y quien lo consume;
- la migración de datos, y habilitar la escritura sobre ellos;
- el refactor estructural, y el cambio de conducta;
- el diseño visual, y conectarlo a datos reales.

**Estructura y conducta, separadas.** Mover código y cambiar lo que hace **nunca** van en
la misma tarea. Si al mover aparece un fallo, se anota y se conserva; corregirlo es otra
ficha.

**Primero la red, luego el salto.** Si el criterio no se puede comprobar con lo que hay, la
primera tarea es construir la comprobación, y eso es una ficha en sí. Reescribir aritmética
que nadie va a revisar a ojo sin una referencia contra la que comparar es la forma de
cambiar un resultado sin que nadie se entere.

**Lo que no se puede medir, no se declara hecho.** «Mejorar el rendimiento» no es una
tarea; «que la pantalla de resumen responda por debajo de 500 ms con los datos de
producción» sí.

**El criterio se escribe antes.** Escrito después, es una descripción de lo que salió.

**Si toca interfaz, el criterio nombra los estados:** reposo, pendiente, éxito, error,
vacío y deshabilitado. Y que se reutilizan los componentes del sistema en vez de estilos
locales equivalentes. Si el proyecto tiene una skill de UX, se aplica aquí.

---

## Preguntas que sí valen la pena

Preguntar **solo** si la respuesta cambia lo que se construye —datos, permisos, un contrato
externo, producción, la identidad visual— y no hay un valor seguro por defecto. Y
preguntarlo **una vez, con opciones**. Si hay una opción razonable por defecto, se toma, se
dice cuál y se sigue.

No preguntar: si se puede empezar · si el plan parece bien · si commitear · qué nombre
poner · si conviene añadir tests.

---

## Después

La ficha va al informe. Solo va a un fichero aparte si es grande y va a durar varios días;
entonces, a donde el proyecto lleve su plan.

Y se ejecuta con [`avanzar`](../avanzar/SKILL.md), que no vuelve a pedir permiso.
