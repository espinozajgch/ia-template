# architectural-debt.md — Deuda aceptada

> Deuda **decidida conscientemente**, no descubierta. Cada entrada representa una elección
> con su razón y su precio.
>
> **Un hallazgo de auditoría que corresponde a un `AD-*` vigente NO se re-reporta como
> nuevo.** Se cita el AD y se revisa su *trigger*. Sin esta regla, cada auditoría vuelve a
> descubrir lo mismo y el informe pierde credibilidad.

---

## Índice

| ID | Título | Aceptada el | Trigger de reapertura | Estado |
|---|---|---|---|---|
| AD-1 | [título] | YYYY-MM-DD | [condición] | VIGENTE |

Estados: VIGENTE · REABIERTA · PAGADA

---

## AD-1 — [título]

**Qué se aceptó.** La situación concreta, con `archivo:línea`.

**Por qué.** La razón real: plazo, coste, dependencia externa, riesgo de tocar algo vivo.
«No dio tiempo» es una razón válida si está escrita.

**Quién lo decidió y cuándo.** [nombre] · YYYY-MM-DD

**Precio que se paga.** Qué cuesta hoy tenerla: lentitud, riesgo, trabajo manual.

**Coste de pagarla.** Estimación de arreglarlo.

**Trigger de reapertura.** La condición que convierte esta deuda en un hallazgo:
*«si el número de usuarios pasa de N»*, *«si hay que tocar este módulo otra vez»*,
*«si la dependencia deja de tener soporte»*.

**Estado.** VIGENTE
