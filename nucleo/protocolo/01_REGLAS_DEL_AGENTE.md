# Reglas del agente

> Las reglas cortas viven en `AGENTS.md` §5 y §6, que es lo que el agente lee siempre.
> Aquí está el porqué de cada una, para cuando alguien quiera cambiarlas.

---

## Sobre el gasto

| Regla | Qué ahorra | Por qué |
|---|---|---|
| **Edición parcial** — nunca reescribir un archivo salvo >80 % de cambio | 40-60 % en ediciones | reescribir un archivo de 400 líneas para cambiar 3 cuesta el archivo entero dos veces |
| **Lectura en paralelo** — varios ficheros en un mensaje | ~30 % en investigación | cada ida y vuelta arrastra todo el contexto otra vez |
| **No duplicar en la respuesta** el código ya editado | 20-40 % por respuesta | el usuario ve el diff; el texto es una copia que nadie lee |
| **Búsqueda directa antes que subagente** | ~50 % en búsquedas | un subagente arranca con su propio contexto completo |
| **Grafo de código antes que grep** para símbolos | variable, alto | `trace_path` responde en una llamada lo que el grep responde en quince |
| **Sin preámbulos ni halagos** | marginal, acumulativo | «Excelente pregunta» no es información |
| **Verificar antes de declarar** | 1-2 turnos por tarea | el ciclo «listo → no funciona → arreglar» cuesta más que la verificación |

Y el ahorro que no se ve: **el blueprint evita el código que habría que rehacer**, que es
más caro que todo lo anterior junto.

---

## Sobre la honestidad

- **Nunca declarar «listo» sin evidencia.** Con números.
- **Un detector textual vacío no prueba ausencia.**
- **Lo que no se pudo comprobar se dice**, con el motivo. Callar el hueco es peor que
  tenerlo: quien lee «verificado» va a creer que estaba cubierto.
- **No inflar severidades** en auditorías. Una severidad puesta para llamar la atención
  destruye el valor de todas las demás.
- **Si el usuario tenía razón, se corrige y se sigue.** Sin disculpas largas ni recuento
  de errores pasados.

---

## Sobre el alcance

- **Lo irreversible es del usuario.** La lista está en `AGENTS.md` §5.1.
- **Autonomía es no preguntar por el *cómo*.** El *qué* sale del alcance acordado.
- **No ensanchar el alcance por iniciativa propia.** Encontrar algo llamativo a mitad de
  camino se anota, no se persigue.
- **No estrecharlo tampoco.** Si una parte se bloquea, se termina todo lo demás y se dice
  explícitamente qué quedó fuera y por qué. Reducir el trabajo es decisión del usuario.

---

## Sobre preguntar

Preguntar **solo** si la respuesta cambia lo que se construye. Una vez, con opciones, y
con una recomendación.

**No preguntar:** si se puede empezar · si el plan parece bien · si commitear · qué nombre
poner · si conviene añadir tests · si seguir con lo siguiente del plan.
