---
name: auditar
description: Audita el proyecto sin modificarlo y entrega hallazgos con evidencia, ID estable y severidad. Sirve para auditoría forense integral, de seguridad, de arquitectura, de accesibilidad o de rendimiento — el eje se elige al invocarla. No corrige: separar el diagnóstico de la cura es lo que evita que la auditoría se convierta en una refactorización sin control.
---

# Auditar

Una auditoría que corrige a la vez no es una auditoría: es una refactorización con la
excusa de un informe. **En modo AUDIT no se modifica nada.**

**Antes de nada:** si existe `knowledge/wiki/skills/auditar.md`, léelo. Es lo propio de este
proyecto para esta skill y, donde sea más estricto que ella, manda él.

---

## 1 · Fijar el eje y el alcance

Al invocar, quedan fijados:

```
EJE     = forense | seguridad | arquitectura | accesibilidad | rendimiento | datos | coste
ALCANCE = todo el repositorio | un módulo | un flujo | el diff contra <rama>
MODO    = AUDIT (por defecto) | PLAN | APPLY | VERIFY
```

Cada eje tiene su prompt maestro en `agente/prompts/`. **Cargar el del eje, no todos.**

| Eje | Prompt |
|---|---|
| forense | `FORENSIC_AUDITOR_PROMPT.md` · `AUDITOR_FORENSE.md` |
| seguridad | `APPSEC_PROMPT.md` · `SECURITY_PROMPT.md` |
| arquitectura | `ARCHITECTURE_PROMPT.md` |
| accesibilidad / UI | `DESIGN_PROMPT.md` |
| infraestructura | `DEVSECOPS_PROMPT.md` · `CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` |
| datos | `DATABASE_PROMPT.md` |

---

## 2 · Leer lo ya sabido, antes de mirar el código

Este paso es el que separa una auditoría útil de una que repite lo de la anterior:

```bash
cat knowledge/wiki/architectural-debt.md   # AD-* : deuda ACEPTADA, no se re-reporta
cat knowledge/wiki/anti-patterns.md        # AP-* : patrones ya catalogados, con su ID
cat knowledge/wiki/decisions.md            # ADRs : por qué se hizo así
ls knowledge/informe-*                     # corridas anteriores
```

**Un hallazgo que corresponde a un `AD-*` vigente no es un hallazgo.** Se cita el AD y se
revisa su *trigger*: la condición que, si se cumple, reabre la deuda. Si el trigger se
cumplió, entonces sí es hallazgo, y se dice que reabre el `AD-n`.

---

## 3 · Descubrir antes de juzgar

No presuponer arquitectura, lenguaje, framework, ORM, nube ni patrón. Primero:
propósito y usuarios · módulos, procesos y almacenes · entrypoints e interfaces ·
flujos críticos y fronteras de confianza · qué cambia con qué frecuencia ·
**arquitectura declarada frente a estado efectivo** — la brecha entre las dos suele ser
el hallazgo más caro del informe.

---

## 4 · Cada hallazgo, con su ficha

```markdown
### <ID> · <título en una línea>

**Severidad.** crítica | alta | media | baja | observación
**Categoría.** frontend | backend | datos | infra | seguridad | accesibilidad | proceso
**Dónde.** `archivo:línea` — más de uno si aplica
**Evidencia.** El fragmento real. Sin fragmento no hay hallazgo.
**Por qué ocurre.** El mecanismo, no el adjetivo. Casi siempre es «la ausencia de algo no
salta a la vista porque no hay nada que mirar».
**Consecuencia.** Qué pasa en producción, con qué entrada concreta.
**Esfuerzo.** bajo | medio | alto
**Corrección.** El cambio propuesto. En AUDIT se describe, no se aplica.
```

### Reglas de honestidad

- **Sin evidencia no hay hallazgo.** Un `grep` vacío no prueba ausencia; prueba que ese
  `grep` no encontró nada.
- **No inflar severidad.** Una severidad puesta para llamar la atención destruye el valor
  de todas las demás.
- **No declarar incorrecto un patrón sin contexto y consecuencia.** «Esto es un
  antipatrón» sin decir qué rompe es una opinión.
- **LOC no es una medida arquitectónica** por sí sola.
- Lo que no se pudo revisar —sin credenciales, sin entorno, sin datos— **se dice**.

---

## 5 · IDs estables

Los hallazgos que se repiten entre corridas se catalogan en
`knowledge/wiki/anti-patterns.md` con ID `AP-nn`, severidad y estado ABIERTO/CERRADO. Un
`AP-*` cerrado **no se borra**: queda como memoria de por qué existe la regla.

Un hallazgo que se decide **no** corregir pasa a `architectural-debt.md` como `AD-nn`, con
la razón, el coste de arreglarlo y su **trigger** de reapertura.

---

## 6 · Entregar

- El informe, en el formato de [`informe`](../informe/SKILL.md).
- Un resumen en el chat: cuántos hallazgos por severidad, los tres peores, qué NO se pudo
  revisar, y qué *quick win* de esfuerzo bajo se recomienda primero.
- **Nada del código modificado.**

Para pasar a corregir: `MODO=PLAN` (plan de remediación por fases, sin tocar), luego
`MODO=APPLY` con [`avanzar`](../avanzar/SKILL.md), y `MODO=VERIFY` para comprobar que la
corrección hizo lo que decía — releyendo el hallazgo original, no el commit.
