---
name: blast-new
description: Inicializa un proyecto nuevo aplicando el protocolo B.L.A.S.T. completo. Hace 5 preguntas de Blueprint, crea la estructura de carpetas, genera todos los archivos de documentación y llena la fuente de verdad del proyecto.
---

# Skill: blast-new — Inicializar Proyecto Nuevo

## Cuándo usar este skill

Úsame cuando se va a empezar un proyecto desde cero y no hay ningún código existente aún.
Si el proyecto ya tiene código, usa el skill `blast-audit` en su lugar.

---

## Instrucciones para el agente

Sigue el protocolo B.L.A.S.T. en orden estricto. No avances de fase sin completar la anterior.

### Protocolo 0 — Antes de todo

1. Crea el archivo `knowledge/wiki/project.md` con este encabezado:

```
# Proyecto: [NOMBRE]
Estado: INICIALIZANDO
Fase actual: Blueprint
Fecha de inicio: [HOY]
```

2. Confirma al usuario: _"Proyecto inicializado. Comenzando Blueprint — necesito hacerte 5 preguntas antes de escribir cualquier código."_

3. **STOP** — No escribas ningún script, tool ni código hasta que Blueprint esté completo y aprobado.

---

### Fase 1 — B: Blueprint

Haz estas 5 preguntas, **una por una**, esperando respuesta antes de continuar:

**Pregunta 1 — North Star:**
> ¿Cuál es el único resultado que este sistema debe lograr? Descríbelo en una oración.

**Pregunta 2 — Integraciones:**
> ¿Qué servicios externos necesita el sistema? (APIs, bases de datos, Slack, etc.) ¿Ya tienes las credenciales listas?

**Pregunta 3 — Source of Truth:**
> ¿Dónde viven los datos que el sistema va a usar? (CSV, base de datos, API, documentos, etc.)

**Pregunta 4 — Delivery Payload:**
> ¿Cómo y dónde debe entregarse el resultado final? (respuesta en chat, JSON a API, mensaje Slack, fila en DB, etc.)

**Pregunta 5 — Reglas de Comportamiento:**
> ¿Qué cosas NO debe hacer el sistema? ¿Tiene reglas de tono, restricciones de datos, límites de acción?

**Después de las 5 respuestas**, genera estos archivos completando los placeholders con las respuestas reales:
- `knowledge/wiki/project.md` — fuente de verdad completa
- `llm-wiki/00_PROJECT_MAP.md` — mapa de carpetas real
- `llm-wiki/02_DATA_SCHEMAS.md` — schema JSON de Input/Output
- `llm-wiki/06_INTEGRATIONS.md` — servicios mencionados en Pregunta 2

Luego pregunta: _"¿Este Blueprint es correcto? ¿Apruebas para continuar a Fase L (Link)?"_

**STOP hasta recibir aprobación explícita.**

---

### Fase 2 — L: Link

Por cada integración del Blueprint:
1. Crea `tools/verify_[servicio].py` con un ping mínimo al servicio
2. Actualiza `llm-wiki/04_TOOLS.md` con estado: VERIFICADO / PENDIENTE / ROTO

Confirma: _"Link completado. ¿Todas las conexiones están activas?"_

---

### Fase 3 — A: Architect

1. Clasifica el intent: FACTUAL / TASK / CONVERSATIONAL / MIXED
2. Completa `llm-wiki/01_LLM_STRATEGY.md` con modelo y estrategia
3. Completa `llm-wiki/07_PROMPT_TEMPLATES.md` con los templates base
4. Completa `llm-wiki/03_RETRIEVAL.md` si el Source of Truth requiere RAG

---

### Fase 4 — S: Stylize

Completa `llm-wiki/05_RELIABILITY.md` con:
- Formato exacto del output
- Reglas de validación
- Manejo de errores
- Reglas de tono del Blueprint

---

### Fase 5 — T: Trigger

Completa `llm-wiki/08_ARCHITECTURE.md` con:
- Diagrama ASCII del flujo completo
- Mapa de capas A.N.T. para este proyecto
- Cómo se ejecuta el sistema (comando, trigger, schedule)

---

### Paso final — Generar configs LLM

Después de que el Blueprint esté aprobado, ejecutar:

```bash
python tools/generate_llm_configs.py --target .
```

Esto genera: `CLAUDE.md`, `.agents/rules/`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`.

---

## Reglas globales durante este skill

- Nunca adivinar lógica de negocio — preguntar o detenerse
- Nunca avanzar de fase sin confirmación explícita
- Nunca escribir código antes de que Blueprint esté aprobado
- Data-First: el schema se define antes de codificar
