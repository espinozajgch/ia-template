# lessons.md — Lo aprendido

> Cada vez que el usuario corrige al agente, la corrección se escribe aquí. En la sesión
> siguiente el agente lee este archivo **antes** de trabajar y no repite el error.
>
> Este es el mecanismo que hace que cada sesión deje el proyecto más inteligente que la
> anterior. Una lección es **una regla accionable**, no una anécdota.

---

## Formato

### L-nn · [la regla, en imperativo]

**Qué pasó.** El error concreto, una vez. Fecha.
**Por qué es un error aquí.** El contexto de este proyecto que lo hace incorrecto.
**Qué hacer en su lugar.** La alternativa, concreta.
**Cómo se detecta.** Si se puede automatizar, el comando; y entonces esta lección debería
convertirse en un `AP-*` con su ratchet.

---

### L-01 · [ejemplo] Usar el build completo, no solo el chequeo de tipos

**Qué pasó.** YYYY-MM-DD — se declaró un cambio listo con el chequeo de tipos en verde;
el build falló en CI por un import sin usar.
**Por qué es un error aquí.** El chequeo de tipos no aplica las reglas del bundler.
**Qué hacer en su lugar.** Correr siempre el comando de la puerta completa.
**Cómo se detecta.** Está en la puerta de calidad — no hace falta detector aparte.
