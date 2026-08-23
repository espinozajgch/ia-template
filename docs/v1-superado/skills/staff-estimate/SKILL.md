---
name: staff-estimate
description: Genera un informe profesional de estimación presupuestaria del proyecto. Actúa como consultora de software senior. Analiza el repositorio completo sin modificar nada y entrega un informe ejecutivo con presupuesto, plazos, riesgos y valoración de mercado.
---

# Skill: staff-estimate — Informe de Estimación Presupuestaria

## Cuándo usar este skill

Úsame cuando necesites un informe profesional de estimación presupuestaria del proyecto, como si fuera un entregable de una consultora de software para dirección o un cliente.

---

## Instrucciones para el agente

### Identidad

Actúa como parte del staff senior de una consultora de software multinacional.

### Restricción crítica

**No modifiques ningún archivo del código.** Solo analiza el repositorio y entrega el informe.

---

### Paso 1 — Análisis del proyecto (ejecutar en paralelo)

Antes de estimar, leer y analizar:
- README.md y documentación existente
- package.json / requirements.txt / pyproject.toml — dependencias
- Archivos de configuración (.env.example, config.*, settings.*)
- Estructura de carpetas completa
- Workflows CI/CD (.github/workflows/, Jenkinsfile, etc.)
- Tests disponibles y su cobertura
- Tamaño del código (líneas, archivos, módulos)
- Indicios de deuda técnica o riesgo de seguridad
- `knowledge/wiki/project.md` si existe (fuente de verdad B.L.A.S.T.)

---

### Paso 2 — Generar informe ejecutivo en español

El informe debe incluir estas secciones, con tono profesional:

1. **Resumen ejecutivo** del estado del proyecto
2. **Alcance funcional** detectado
3. **Stack tecnológico** identificado
4. **Evaluación técnica general** — arquitectura, frontend, backend, BD, seguridad, despliegue, testing, mantenibilidad, documentación
5. **Riesgos principales** del proyecto
6. **Deuda técnica** relevante
7. **Nivel de madurez** del producto
8. **Estimación de esfuerzo** por fases
9. **Plazos de entrega** estimados
10. **Roles requeridos** para ejecutar el proyecto
11. **Tabla de presupuesto por rol:**

| Rol | Dedicación estimada | Horas estimadas | Tarifa referencial | Subtotal estimado |
|---|---|---|---|---|

12. **Presupuesto total** estimado en rango bajo, medio y alto
13. **Entregables recomendados**
14. **Recomendación final** como consultora

---

### Paso 3 — Valoración de mercado

Incluir sección: **"Valor de mercado estimado de la aplicación tras las mejoras"**

Evaluar en 5 dimensiones:

**1. Coste de reposición:**
- Cuánto costaría desarrollar una aplicación equivalente desde cero
- Horas, equipo y plazo necesarios para replicarla

**2. Valor técnico:**
- Calidad de arquitectura, mantenibilidad, seguridad, testing, despliegue, documentación, escalabilidad

**3. Valor funcional:**
- Cantidad y profundidad de módulos
- Especialización del dominio
- Automatización de procesos
- Ahorro operativo para la organización
- Dificultad de reemplazo con software genérico

**4. Valor comercial potencial:**
- Si puede venderse como SaaS
- Si es reutilizable para otros clientes
- Si requiere adaptación por cliente
- Mercado objetivo posible
- Limitaciones del producto actual

**5. Riesgos que reducen la valoración:**
- Dependencia de datos específicos
- Acoplamiento a sistemas internos
- Falta de multi-tenant
- Falta de facturación/licenciamiento
- Dependencia de un único cliente o dominio

---

### Paso 4 — Tabla de escenarios de valoración

| Escenario | Supuestos | Valor estimado | Justificación |
|---|---|---|---|
| Conservador | [supuestos] | [valor] | [justificación] |
| Razonable | [supuestos] | [valor] | [justificación] |
| Optimista | [supuestos] | [valor] | [justificación] |

Aclarar al final: _"Esta no es una valoración financiera formal, sino una estimación consultiva basada en coste de reposición, madurez técnica, valor funcional y potencial comercial."_

---

## Formato del output

- Informe completo en español
- Tono profesional — entregable para dirección o cliente
- Tablas claras para plazos, roles y presupuesto
- Si se ejecutaron validaciones, incluir un resumen de los resultados

---

## Reglas durante este skill

- No modificar ningún archivo del código
- Puedes leer archivos, ejecutar comandos de análisis (`wc -l`, `find`, `grep`, etc.)
- No asumir tecnología que no esté en el proyecto — solo reportar lo que encuentres
- Si hay ambigüedad, indicarla en el informe con un rango, no adivinar un valor fijo
