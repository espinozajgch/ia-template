---
name: blast-audit
description: Audita un proyecto existente analizando su código, infiere el Blueprint del proyecto (North Star, integraciones, datos, delivery, reglas de comportamiento) y genera automáticamente todos los archivos de documentación B.L.A.S.T. Solo pregunta lo que no puede determinar del código.
---

# Skill: blast-audit — Auditar Proyecto Existente

## Cuándo usar este skill

Úsame cuando el proyecto ya tiene código y quieres:
- Documentarlo usando el protocolo B.L.A.S.T.
- Entender su arquitectura actual
- Detectar gaps y deuda técnica
- Preparar el proyecto para escalar o mejorar

Si el proyecto es nuevo sin código, usa el skill `blast-new`.

---

## Instrucciones para el agente

**Regla principal:** Analiza antes de preguntar. Solo haz preguntas sobre lo que es genuinamente imposible determinar del código.

### Protocolo 0 — Escaneo inicial (ejecutar todo en paralelo)

Lee estos archivos simultáneamente:
1. README.md, DOCS/ — propósito del proyecto
2. package.json / requirements.txt / pyproject.toml — dependencias = integraciones
3. .env.example — servicios externos con credenciales
4. Punto de entrada principal (main.py, index.js, app.py, etc.)
5. Archivos de configuración relevantes
6. Carpetas: /routes, /api, /handlers, /workers
7. Carpetas: /models, /schemas, /types

Lista todos los archivos del proyecto para tener el mapa completo.

---

### Protocolo 1 — Presentar hallazgos

Con lo que encontraste, completa esta tabla de Blueprint inferido:

| Pregunta Blueprint | Respuesta inferida | Confianza | Fuente |
|---|---|---|---|
| North Star | [qué hace el sistema] | ALTA / MEDIA / BAJA | [archivo] |
| Integraciones | [servicios en .env / deps] | ALTA / MEDIA / BAJA | [archivo] |
| Source of Truth | [origen de los datos] | ALTA / MEDIA / BAJA | [archivo] |
| Delivery Payload | [cómo entrega el resultado] | ALTA / MEDIA / BAJA | [archivo] |
| Reglas de Comportamiento | [restricciones detectadas] | ALTA / MEDIA / BAJA | [archivo] |

Presenta los hallazgos al usuario con este formato:

```
## Análisis completado — Blueprint inferido

He analizado el proyecto. Esto es lo que encontré:

**North Star:** [descripción en una oración]
- Fuente: [archivo y línea]

**Integraciones detectadas:**
- [Servicio 1] — via [dependencia o variable]
- [Servicio 2] — via [dependencia o variable]

**Source of Truth:** [origen de los datos]
**Delivery Payload:** [cómo entrega el resultado]
**Reglas detectadas:** [restricciones encontradas]

**Lo que NO pude determinar:**
- [ ] [Item — razón por la que no pude inferirlo]

¿Es correcto este análisis? Corrige lo que esté mal.
```

**STOP — espera respuesta del usuario.**

---

### Protocolo 2 — Incorporar correcciones

1. Actualiza el Blueprint con las correcciones del usuario
2. Marca: CONFIRMADO / CORREGIDO / AGREGADO POR USUARIO
3. Presenta Blueprint final: _"¿Apruebas este Blueprint para generar los archivos?"_

**STOP — espera aprobación explícita.**

---

### Protocolo 3 — Generación de archivos

Con Blueprint aprobado, genera en orden:

**Archivos de Blueprint:**
- `knowledge/wiki/project.md` — nombre, North Star, stack, estado: AUDITADO
- `llm-wiki/00_PROJECT_MAP.md` — estructura real del proyecto
- `llm-wiki/02_DATA_SCHEMAS.md` — schemas inferidos del código
- `llm-wiki/06_INTEGRATIONS.md` — servicios detectados

**Archivos de Link:**
- `llm-wiki/04_TOOLS.md` — catálogo de funciones/tools principales
- Scripts `tools/verify_[servicio].py` para cada integración

**Archivos de Architect:**
- `llm-wiki/01_LLM_STRATEGY.md` — intent y modelo
- `llm-wiki/07_PROMPT_TEMPLATES.md` — prompts extraídos del código
- `llm-wiki/03_RETRIEVAL.md` — estrategia RAG si aplica

**Archivos de Stylize y Trigger:**
- `llm-wiki/05_RELIABILITY.md` — manejo de errores existente + gaps
- `llm-wiki/08_ARCHITECTURE.md` — diagrama ASCII del flujo real

---

### Protocolo 4 — Reporte de gaps

Entrega un reporte de cobertura B.L.A.S.T.:

| Fase | Estado | Detalle |
|---|---|---|
| B — Blueprint | COMPLETO / PARCIAL / AUSENTE | [qué falta] |
| L — Link | COMPLETO / PARCIAL / AUSENTE | [qué falta] |
| A — Architect | COMPLETO / PARCIAL / AUSENTE | [qué falta] |
| S — Stylize | COMPLETO / PARCIAL / AUSENTE | [qué falta] |
| T — Trigger | COMPLETO / PARCIAL / AUSENTE | [qué falta] |

Incluye: prioridad de mejoras y deuda técnica detectada.

---

### Paso final — Generar configs LLM

```bash
python tools/generate_llm_configs.py --target .
```

Genera: `CLAUDE.md`, `.agents/rules/`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`.

---

## Reglas durante este skill

- Analiza primero, pregunta después — no hagas preguntas que puedas responder leyendo el código
- Cita tus fuentes — indica en qué archivo y línea encontraste cada conclusión
- Distingue: CONFIRMADO / INFERIDO / DESCONOCIDO en cada hallazgo
- No reescribas el código — solo documenta y audita
- El Blueprint del usuario tiene prioridad sobre tu inferencia
