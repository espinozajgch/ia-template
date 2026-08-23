# Definición de hecho, y cuándo hay que parar

> La usan las skills `tarea`, `avanzar` y `verificar`.
> **Adaptar al proyecto en la primera semana**, con casos reales de este repositorio.
> Una definición de hecho copiada y no vivida no la respeta nadie.

---

## 1 · Por qué existe

Un agente puede detenerse veinte veces en una sesión y que solo una parada fuera necesaria.
La consecuencia de parar de más no es solo lentitud: **el usuario acaba siendo el
planificador**, que es justo lo que no debe pasar.

| Motivo real de la parada | ¿Hacía falta parar? |
|---|---|
| Terminó un commit coherente y lo contó | No. Eso es informar, no preguntar |
| Estaba esperando un proceso largo | No |
| Iba a empezar algo grande y quería confirmación | No, si el trabajo ya estaba acordado |
| Encontró algo llamativo a mitad de camino | No. Se anota y se sigue |
| Encontró una decisión de negocio, contenido o dinero | **Sí** |

**La regla que lo cambia todo:** al encontrar una decisión que no es del agente, no se
para — se aparca en [`decisiones-pendientes.md`](decisiones-pendientes.md) y se sigue con
todo lo que no dependa de ella. Parar solo si de verdad no queda nada más que hacer.

---

## 2 · Qué significa «hecho» aquí

Las seis, o no está hecho. No existe «hecho salvo los tests».

| | Criterio | Cómo se comprueba en este proyecto |
|---|---|---|
| 1 | El **criterio escrito antes de empezar** se cumple | [completar] |
| 2 | La **puerta de calidad** pasa entera | [comando único — ver `AGENTS.md` §4] |
| 3 | La **conducta observable no cambió**, salvo que ese fuera el objetivo | [completar: el caso de referencia] |
| 4 | Lo nuevo **nace con sus tests**, y prueban la decisión, no la sintaxis | los tests fallan si se revierte el cambio |
| 5 | **El hueco de cobertura está dicho**, no supuesto | [completar] |
| 6 | **Commit local** con el porqué en el cuerpo, y lo que se dejó fuera anotado | `git log` |

### La regla que no se negocia

**Estructura y conducta van en commits distintos.** Mover código y cambiar lo que hace
nunca van juntos. Si al mover aparece un fallo heredado —y aparecen—, **se anota y se
conserva**, salvo que corregirlo fuera el objetivo declarado.

---

## 3 · Cuándo hay que parar de verdad

Estas son del usuario. Aparcar y seguir; si bloquean todo, entonces sí preguntar, una vez,
con opciones.

- **Publicar:** `git push`, desplegar, abrir un PR, emitir a producción.
- **Contenido editorial o comercial:** qué se publica, qué precios, qué textos, qué campañas.
- **Dinero:** contratar, subir de plan, provisionar, procesos costosos más allá de lo acordado.
- **Credenciales:** rotarlas, revocarlas, moverlas, leerlas.
- **Cambiar lo que el sistema produce** cuando no era el objetivo — unificar dos textos que
  difieren, corregir un dato de salida, activar algo que nunca funcionó.
- **Cambiar un contrato con otro sistema** — un formato de fichero, un `argv`, un endpoint
  del que depende otro repositorio. Se rompe en silencio.
- **Subir una dependencia que cambia el runtime.**
- [añadir las de este proyecto]

---

## 4 · Cuándo NO hay que parar

Nada de esto requiere permiso. Se hace, se verifica, y se cuenta al final.

- Refactorizar dentro del alcance acordado, con la puerta del §2 pasada.
- Escribir tests, verificadores y herramientas.
- Documentar, y corregir documentación que ha quedado falsa.
- Commitear en local.
- Reproducir el caso de referencia las veces que haga falta.
- Arreglar un accesorio que falla, siempre que no cambie lo que el sistema produce.
- Eliminar código muerto **demostrado** muerto — con el grep o el AST que lo prueba.
- Elegir el siguiente elemento del plan cuando el actual termina.

---

## 5 · El orden acordado

1. [prioridad 1]
2. [prioridad 2]
3. [prioridad 3]

Saltarse un peldaño es una decisión del usuario, no del agente.
