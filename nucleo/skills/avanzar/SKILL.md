---
name: avanzar
description: Ejecuta el plan pendiente hasta agotarlo sin pedir permiso a cada paso. Toma la siguiente tarea, la lleva hasta hecha —código, tests, verificación, documentación y commit local—, y pasa a la siguiente. Solo se detiene por decisiones que no son técnicas, y ni siquiera entonces si queda trabajo que no dependa de ellas.
---

# Avanzar

**El usuario no debe ser el planificador.** Esta skill existe porque un agente puede
detenerse veinte veces en una sesión y que solo una parada fuera necesaria. Cada una cuesta
un cambio de contexto a quien la lee.

**Antes de nada:** si existe `knowledge/wiki/skills/avanzar.md`, léelo. Es lo propio de
este proyecto —dónde vive su plan, su orden acordado, lo que aquí nunca se toca— y, donde
sea más estricto que esta skill, manda él. Y si existe
`knowledge/wiki/definicion-de-hecho.md`, su listón sustituye al de abajo.

---

## Qué cuenta como hecho

Antes del ciclo, el listón. Una tarea está hecha cuando:

1. el criterio que se escribió **antes de empezar** se cumple, y se ha comprobado;
2. la puerta de calidad pasa **entera** —ver [`verificar`](../verificar/SKILL.md)—;
3. lo que el cambio no cubre está **dicho**, no supuesto;
4. la documentación que quedó desfasada está actualizada;
5. hay un commit local con el porqué en el cuerpo — si el proyecto los permite
   (`AGENTS.md` §5); si no, el cambio queda listo y se dice que falta el commit.

Nada de esto es opcional. «Hecho con una salvedad» no existe: o la salvedad se arregla, o
la tarea sigue abierta y se dice.

---

## El ciclo

Repetir hasta que no quede nada ejecutable.

### 1 · Elegir

De donde el proyecto guarde su plan —un fichero de plan, un panel, la conversación—, la
siguiente tarea. Criterio, en este orden:

1. la **seguridad o una regresión** que impide operar;
2. lo que **desbloquea** otras cosas;
3. lo que **ya tiene red**: si no hay test ni verificador que lo cubra, construir la
   cobertura es la tarea, y va primero;
4. lo más denso de lo que queda.

Anunciar en una línea qué se ha elegido y por qué. **No preguntar si se puede.**

### 2 · Acotar

Antes de tocar nada, con [`tarea`](../tarea/SKILL.md) si hace falta la ficha entera, o de
cabeza si es corta:

- **qué cambia** y qué **no** — el alcance limita en las dos direcciones;
- **cómo se sabrá que funciona** — el criterio, escrito antes;
- **qué no cubre la cobertura existente**, y con qué se cubre en su lugar.

Si al acotar resulta que la tarea son tres, se parte y se hacen en serie. Un commit por
unidad coherente.

### 3 · Hacer

**No lo haces vos.** Delegas a un subagente de rol fijo —`frontend` si el alcance es
visual, `backend` para lo demás— con la ficha completa como contrato: objetivo, alcance
(qué sí y qué explícitamente no), criterio de hecho, y las rutas que puede tocar. Vos
conservás el plan y el criterio; el subagente ejecuta dentro de su frontera.

Excepción: un cambio de una línea, trivial y de un solo fichero, se hace directamente — la
delegación existe para no ser vos quien decide cada paso de un cambio real, no para
burocratizar una errata. Y si la herramienta actual no admite subagentes (Cursor, Copilot,
Windsurf), se sigue el mismo orden pero en la misma sesión.

El subagente responde con lo que tocó, qué parte de la ficha no cubrió y por qué, y
cualquier decisión que no era suya. Vos integrás ese informe — no reescribís su trabajo,
lo revisás contra la ficha original.

Si el proyecto tiene el pack `orquestacion-agentes`, el contrato de delegación se compila
con `preparar-contexto` (bundle acotado, no el historial completo); si no, basta la ficha
de `tarea` más la frontera de rutas, dichas en la propia instrucción de delegación.

Reglas que el subagente debe cumplir y que seguís siendo responsable de haber transmitido:

- **Estructura y conducta, en commits distintos.** Mover código y cambiar lo que hace no
  van juntos: si al mover aparece un fallo, se anota y se conserva.
- Lo nuevo nace con tests que prueban la **decisión**, no la sintaxis.
- Lo nuevo no importa infraestructura: recibe sus dependencias y se prueba con dobles.
- Los fallos heredados que aparezcan se anotan; corregirlos es otra ficha, salvo que fuera
  el objetivo.
- **Se preservan los cambios ajenos.** Si el árbol de trabajo trae modificaciones de otra
  persona o de otra sesión, no se mezclan con las propias: se commitea por rutas, o se
  trabaja en otro worktree.
- Un test nuevo tiene que **fallar al revertir** la conducta que protege; si pasa igual,
  no protege nada.
- No se habilita una escritura real detrás de un control que aún es de sólo lectura, ni se
  inventan datos para llenar una pantalla: una capacidad que falta se declara.

### 4 · Verificar

Delegás a `verificador`, que corre la skill [`verificar`](../verificar/SKILL.md) entera y
devuelve un veredicto verde o rojo con números. No la corrés vos mismo: `verificador` no
tiene permiso de editar, así que su veredicto no está sesgado por quien hizo el cambio.

Si el veredicto es rojo: el fallo vuelve al subagente (`frontend`/`backend`) que hizo el
cambio, con el detalle exacto. Se corrige y se **repite la verificación entera**, no solo
el paso que falló.

### 5 · Cerrar

- Delegás a `documentador` la parte de `knowledge/wiki/` y `AGENTS.md`: **qué cambia para
  quien usa esto**, no adjetivos.
- El commit lo hacés vos, integrando el resultado de los tres subagentes: local, con el
  porqué en el cuerpo, si el proyecto los permite. Publicar solo si el usuario lo pidió.

### 6 · Volver al 1

Sin preguntar. El informe se da **al final del bloque**, no entre tareas.

---

## Al encontrar una decisión que no es tuya

**No detenerse.** Es la regla que más cambia el resultado.

1. anotarla en `knowledge/wiki/decisiones-pendientes.md`, con identificador: qué hay que
   decidir, qué bloquea, y cómo se comprobaría cada opción. Sólo las decisiones duraderas
   del proyecto; una duda pasajera del encargo va al informe final, no a esa memoria;
2. hacer **todo lo que no dependa de esa respuesta** — que casi siempre es casi todo;
3. mencionarla al final, no en un mensaje aparte.

Detenerse solo si de verdad no queda nada que hacer sin esa respuesta. Entonces sí:
preguntar, concreto y con opciones, **una vez**.

El patrón a evitar: descubrir algo llamativo a mitad de camino —una función muerta, un
aviso que nadie lee, tres mensajes escritos que no se envían— y parar a contarlo. Eso se
anota y se sigue.

---

## Cuándo termina de verdad

- No queda nada ejecutable sin una decisión aparcada, o
- lo siguiente exige el visto bueno del usuario por su coste o su alcance, o
- la puerta falla por algo que no se puede arreglar dentro del alcance.

Entonces se informa **una vez**:

- qué se ha hecho, con los números de la verificación;
- qué decisiones esperan respuesta y qué desbloquea cada una;
- cuántos commits locales hay sin publicar;
- qué viene después.

---

## Lo que esta skill no autoriza

Nunca, sin petición explícita del usuario en esta conversación:

- **publicar**: `push`, desplegar, enviar a un servicio externo, abrir un PR;
- **escribir en producción**: base de datos, almacenamiento, colas;
- **gastar dinero**: contratar, subir de plan, provisionar;
- **borrar** lo que no se creó en esta sesión;
- **tocar credenciales**: rotarlas, revocarlas, moverlas de sitio;
- **cambiar un contrato con otro repositorio o proceso**: un `argv`, una API que alguien más
  consume, un formato de fichero compartido.

Autonomía es no preguntar por el *cómo*. El *qué* sale del alcance acordado, y lo
irreversible sigue siendo del usuario.
