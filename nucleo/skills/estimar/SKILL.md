---
name: estimar
description: Produce un informe de estimación de esfuerzo, plazo, coste y riesgo del proyecto, con el tono y el rigor de una consultora senior. Analiza el repositorio sin modificarlo. Úsala para presupuestar, valorar un activo, justificar una inversión o dimensionar un equipo.
---

# Estimar

El entregable es para **dirección o cliente**, no para el equipo. Eso cambia el registro:
sin jerga innecesaria, con cifras, con supuestos declarados y con el rango honesto.

**No se modifica ningún archivo.**

**Antes de nada:** si existe `knowledge/wiki/skills/estimar.md`, léelo. Es lo propio de este
proyecto para esta skill y, donde sea más estricto que ella, manda él.

---

## 1 · Leer el proyecto, todo en paralelo

Documentación · manifiesto de dependencias · configuración y `.env.example` · estructura
completa de carpetas · definición de CI/CD · tests existentes y su cobertura real · tamaño
(archivos, líneas, módulos) · `knowledge/wiki/project.md`, `features.md`,
`architectural-debt.md`, `anti-patterns.md` y los informes de auditoría previos.

La deuda ya catalogada **es el mejor insumo de una estimación**: está medida, no supuesta.

---

## 2 · Estimar con método, no con intuición

Para cada módulo o épica:

| Campo | Cómo se rellena |
|---|---|
| Alcance | qué entra y **qué no** |
| Estado hoy | inexistente / esbozado / funcional con deuda / terminado |
| Esfuerzo | rango **optimista – probable – pesimista**, en días-persona |
| Perfil | quién lo hace: senior, semi, junior, especialista |
| Dependencias | qué lo bloquea |
| Riesgo | qué lo puede multiplicar por dos |

Reglas que mantienen la estimación defendible:

- **Un solo número es una mentira.** Siempre rango, y decir cuál se usa para el total.
- **Lo no funcional se estima aparte y explícito:** pruebas, accesibilidad, seguridad,
  despliegue, observabilidad, documentación, migración de datos. Es donde se pierden los
  proyectos que «solo faltaba conectarlo».
- **La deuda técnica se estima como trabajo**, no como nota al pie.
- Los **supuestos** se listan. Un supuesto que se rompe explica el desvío; uno tácito solo
  provoca una discusión.

---

## 3 · Secciones del informe

1. **Resumen ejecutivo** — qué es, en qué estado está, qué cuesta terminarlo, en cuánto tiempo.
2. **Alcance funcional detectado** — módulos y flujos reales, con evidencia.
3. **Stack y arquitectura** — y qué implica para el coste de mantenerlo.
4. **Evaluación técnica por dominio** — arquitectura, frontend, backend, datos, seguridad,
   despliegue, pruebas, mantenibilidad, documentación. Con puntuación y con el porqué.
5. **Riesgos** — probabilidad, impacto, mitigación, y **quién** los asume.
6. **Deuda técnica** — inventario con coste de arreglarla y coste de no arreglarla.
7. **Estimación** — la tabla por módulo, el total con rango, y el desglose por perfil.
8. **Plan por fases** — qué entrega valor primero, con hitos verificables.
9. **Equipo recomendado** — perfiles, dedicación, duración.
10. **Valoración de mercado** — qué costaría construirlo de cero hoy, y qué vale el activo
    tal como está. Con la referencia de tarifa usada, declarada.
11. **Supuestos y exclusiones** — la sección que protege a las dos partes.

---

## 4 · Entrega

En HTML autocontenido con [`informe`](../informe/SKILL.md), tipo `valoracion`.

En el chat: el total con su rango, el plazo, los tres riesgos principales y la primera
fase recomendada. Nada más — el detalle está en el informe.

---

## 5 · Lo que no se hace

- No dar un número sin haber leído el código. La estimación por analogía con «un proyecto
  parecido» es lo que produce los desvíos del 300 %.
- No estimar lo que no se pudo ver: se marca **NO EVALUADO** y se dice por qué.
- No prometer plazos que dependen de decisiones del cliente sin marcar esa dependencia.
- No modificar el repositorio.
