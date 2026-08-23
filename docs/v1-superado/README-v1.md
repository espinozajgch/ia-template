# 🧬 Kit B.L.A.S.T. — Framework de Trabajo con IA para Desarrollo de Software

> Un kit metodológico reutilizable que estructura cómo los modelos de IA trabajan en tus proyectos.
> Reduce el desperdicio de tokens, elimina la improvisación y construye conocimiento acumulativo.

---

## ¿Qué problema resuelve?

Cuando usas IA para desarrollar software sin estructura, ocurre lo siguiente:

- **Desperdicio de tokens**: la IA reescribe archivos completos, repite contexto, hace preguntas que podría responder leyendo el código
- **Inconsistencia**: cada sesión empieza desde cero, sin memoria de decisiones anteriores
- **Improvisación**: la IA adivina lógica de negocio, elige stack sin preguntar, genera código sin schema definido
- **Pérdida de conocimiento**: las lecciones aprendidas se pierden entre conversaciones

Este kit resuelve todo esto con:
1. **Un protocolo de trabajo** (B.L.A.S.T.) que la IA sigue paso a paso
2. **Archivos de contexto** que cada LLM/IDE lee automáticamente
3. **Reglas de comportamiento** que controlan cómo trabaja la IA
4. **Un sistema de conocimiento** que crece con cada sesión

---

## 📁 Estructura del Kit

```
Kit B.L.A.S.T./
│
│   ══════════════════════════════════════════════════════
│   ARCHIVOS DE CONTEXTO PARA LLMs/IDEs
│   Cada herramienta lee el suyo automáticamente
│   ══════════════════════════════════════════════════════
│
├── GEMINI.md                        ← Google Antigravity / Gemini
├── CLAUDE.md                        ← Claude Code (Anthropic)
├── .windsurfrules                   ← Windsurf IDE
├── .cursor/
│   └── rules/
│       ├── core.mdc                 ← Cursor IDE — contexto del proyecto
│       └── agent-behavior.mdc      ← Cursor IDE — reglas del agente
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot
├── .agents/
│   ├── rules/
│   │   └── project.md              ← Antigravity — regla de proyecto
│   └── skills/
│       ├── blast-new/SKILL.md      ← Skill: inicializar proyecto nuevo
│       ├── blast-audit/SKILL.md    ← Skill: auditar proyecto existente
│       └── staff-estimate/SKILL.md ← Skill: estimación presupuestaria profesional
│
│   ══════════════════════════════════════════════════════
│   PROTOCOLO B.L.A.S.T. — El cerebro del sistema
│   Define CÓMO trabaja la IA en cada fase
│   ══════════════════════════════════════════════════════
│
├── llm-wiki/
│   ├── 00_PROJECT_MAP.md            ← Mapa de carpetas del proyecto
│   ├── 01_LLM_STRATEGY.md          ← Qué modelo usar y por qué
│   ├── 02_DATA_SCHEMAS.md          ← Schemas JSON de Input/Output
│   ├── 03_RETRIEVAL.md             ← Estrategia RAG (si aplica)
│   ├── 04_TOOLS.md                 ← Catálogo de herramientas/funciones
│   ├── 05_RELIABILITY.md           ← Validación y manejo de errores
│   ├── 06_INTEGRATIONS.md          ← Servicios externos (APIs, DBs)
│   ├── 07_PROMPT_TEMPLATES.md      ← Templates de prompts del sistema
│   ├── 08_ARCHITECTURE.md          ← Arquitectura A.N.T. del proyecto
│   ├── 09_BLAST_PROTOCOL.md        ← Protocolo completo (las 5 fases)
│   ├── 10_AGENT_RULES.md           ← Reglas de comportamiento del agente
│   ├── MASTER_PROMPT.md            ← Prompt maestro para proyectos nuevos
│   ├── AUDIT_PROMPT.md             ← Prompt de auditoría
│   └── STAFF_PROMPT.md             ← Prompt de estimación presupuestaria
│
│   ══════════════════════════════════════════════════════
│   CONOCIMIENTO DEL PROYECTO
│   La IA construye y consulta esta base con el tiempo
│   ══════════════════════════════════════════════════════
│
├── knowledge/
│   └── wiki/                        ← Fuente de verdad del proyecto
│       ├── project.md               ← Blueprint (se llena en Fase B)
│       ├── features.md              ← Funcionalidad, módulos, pantallas y flujos
│       ├── product-design.md        ← Marca, UX/UI y design system si hay frontend
│       └── lessons.md               ← Lecciones aprendidas (se acumula)
│
│   ══════════════════════════════════════════════════════
│   DATOS Y CÓDIGO (se crean durante el desarrollo)
│   ══════════════════════════════════════════════════════
│
├── data/
│   └── raw/                         ← Datos crudos sin procesar
└── app/                             ← Código de ejecución (se crea en Fase T)
```

---

## 🚀 Cómo usar el kit

### Paso 1 — Copiar al proyecto nuevo

### Paso 2 — Iniciar el Blueprint

En **Antigravity**: invocar el skill `@blast-new`

En **cualquier otro LLM**: pegar el contenido de `llm-wiki/MASTER_PROMPT.md`

La IA te hará 5 preguntas base:

| # | Pregunta | Para qué sirve |
|---|---|---|
| 1 | **North Star** — ¿Qué resultado único debe lograr el sistema? | Define el objetivo — la IA no trabaja sin él |
| 2 | **Integraciones** — ¿Qué servicios externos necesita? | Evita que la IA asuma APIs o servicios |
| 3 | **Source of Truth** — ¿Dónde viven los datos? | Define de dónde lee la IA |
| 4 | **Delivery Payload** — ¿Cómo se entrega el resultado? | Define qué formato produce |
| 5 | **Reglas de Comportamiento** — ¿Qué NO debe hacer? | Restricciones que la IA nunca viola |

Si el proyecto tiene frontend o experiencia visual, la IA activa además el bloque **Product & Brand**:

| Área | Qué define | Dónde queda documentado |
|---|---|---|
| Identidad de marca | Nombre, personalidad, tono, referentes, restricciones visuales | `knowledge/wiki/product-design.md` |
| Diseño de interfaz | Colores, tipografía, layout, componentes, responsive, accesibilidad | `knowledge/wiki/product-design.md` |
| Funcionalidad de producto | Módulos, pantallas, flujos, acciones y estados | `knowledge/wiki/features.md` |

### Paso 3 — Completar los archivos de contexto

Con el Blueprint aprobado, editar los 6 archivos marcados `[EDITAR]` reemplazando los `[marcadores]` con las respuestas reales:

| Archivo | Herramienta |
|---|---|
| `GEMINI.md` | Antigravity / Gemini |
| `CLAUDE.md` | Claude Code |
| `.agents/rules/project.md` | Antigravity (regla de proyecto) |
| `.cursor/rules/core.mdc` | Cursor IDE |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.windsurfrules` | Windsurf |

### Paso 4 — Desarrollar con la IA

La IA ahora trabaja con contexto completo. En cualquier herramienta que uses, ya tiene:
- Qué hace el proyecto
- Qué stack usa
- Qué restricciones tiene
- Cómo debe comportarse

---

## 🧠 Cómo la IA construye su universo de conocimiento

El kit no es estático — está diseñado para que la IA **acumule conocimiento** con cada sesión.

### La carpeta `knowledge/wiki/` — Memoria del proyecto

```
knowledge/
└── wiki/
    ├── project.md      ← Se llena en Blueprint, se actualiza si el proyecto evoluciona
    ├── features.md     ← Funcionalidad actual: módulos, flujos, pantallas, acciones
    ├── product-design.md ← Marca, diseño UI, tokens, componentes y accesibilidad
    ├── lessons.md      ← Cada vez que corriges a la IA, ella registra el patrón aquí
    ├── decisions.md    ← Decisiones de arquitectura y su razón (ADRs)
    └── glossary.md     ← Términos del dominio que la IA debe entender
```

### Cómo funciona el ciclo

```
1. Tú corriges a la IA       →  "No uses Redux, usamos Zustand"
                                      │
2. La IA registra la regla    →  knowledge/wiki/lessons.md
                                      │
3. En la próxima sesión       →  La IA lee lessons.md antes de trabajar
                                      │
4. No repite el error         →  Ahorro de tokens + menos frustración
```

### Los archivos `llm-wiki/` — Conocimiento del sistema

Los archivos numerados (`00` a `10`) no son documentación pasiva — son **instrucciones activas** que la IA consulta durante el trabajo:

| Archivo | Cuándo lo consulta la IA |
|---|---|
| `02_DATA_SCHEMAS.md` | Antes de crear cualquier tipo o modelo de datos |
| `06_INTEGRATIONS.md` | Antes de conectarse a un servicio externo |
| `05_RELIABILITY.md` | Antes de entregar un resultado — valida contra el schema |
| `07_PROMPT_TEMPLATES.md` | Cuando necesita construir un prompt para el sistema |
| `04_TOOLS.md` | Cuando necesita usar una herramienta del proyecto |

### Cómo hacer crecer la base de conocimiento

| Acción | Resultado |
|---|---|
| Corriges a la IA | Ella añade la regla a `knowledge/wiki/lessons.md` |
| Tomas una decisión de arquitectura | La IA la documenta en `knowledge/wiki/decisions.md` |
| Defines un término del dominio | Se añade a `knowledge/wiki/glossary.md` |
| Añades o cambias una funcionalidad | Se actualiza `knowledge/wiki/features.md` |
| Cambias la marca o UI | Se actualiza `knowledge/wiki/product-design.md` |
| Cambias de proveedor o API | Se actualiza `llm-wiki/06_INTEGRATIONS.md` |
| Agregas un módulo nuevo | Se actualiza `llm-wiki/00_PROJECT_MAP.md` |

> **Principio clave:** cada sesión con la IA deja el proyecto **más inteligente** que la anterior.

---

## ⚡ Cómo el kit ahorra tokens

### Reglas activas (`llm-wiki/10_AGENT_RULES.md`)

| Regla | Tokens que ahorra |
|---|---|
| **Edición parcial** — solo cambia las líneas necesarias, no reescribe archivos completos | ~40-60% en ediciones |
| **Lectura en paralelo** — lee múltiples archivos en un solo mensaje, no uno por uno | ~30% en investigación |
| **No duplicar en respuesta** — si editó un archivo, no lo copia en texto | ~20-40% por respuesta |
| **Grep antes que subagente** — para búsquedas simples, no crea un subproceso completo | ~50% en búsquedas |
| **Sin charla aduladora** — elimina "Excelente pregunta", "Gran idea", etc. | Marginal pero acumulativo |
| **Validar antes de declarar listo** — evita ciclos de "listo → no funciona → arreglar" | ~1-2 turnos por tarea |

### Ahorro por arquitectura

| Mecanismo | Cómo ahorra |
|---|---|
| **Blueprint antes de código** | La IA no genera código que luego hay que rehacer |
| **Schema definido (Data-First)** | La IA no inventa estructuras de datos |
| **Reglas de comportamiento** | La IA no adivina lógica de negocio |
| **Lessons.md** | La IA no repite errores ya corregidos |
| **Archivos por herramienta** | Cada IDE carga solo lo que necesita, no todo |

---

## 🎨 Producto, marca y frontend

Cuando el proyecto tiene frontend, B.L.A.S.T. añade una subfase **B.1 — Product & Brand** después de las 5 preguntas base. Esta subfase evita que la IA invente estilos, pantallas o experiencia de usuario.

La IA debe definir o inferir:

| Elemento | Proyecto nuevo | Proyecto existente |
|---|---|---|
| Identidad de marca | Preguntar al usuario | Inferir de UI, CSS, assets, copy y docs |
| Sistema visual | Preguntar colores, tipografía, componentes, responsive | Auditar CSS, componentes, design tokens, framework UI |
| Funcionalidad actual | Definir módulos previstos | Documentar módulos, rutas, pantallas, acciones y flujos existentes |
| Flujos de usuario | Definir flujos esperados | Inferir desde rutas, navegación, handlers y componentes |

Los archivos de referencia son:

```
knowledge/wiki/
├── features.md          ← Funcionalidad actual o prevista del producto
└── product-design.md    ← Marca, UX, UI, tokens, componentes y accesibilidad
```

Si el proyecto es backend-only, CLI, worker o librería sin interfaz visual, `product-design.md` puede marcarse como `NO APLICA`.

---

## Próximos pasos: Especialización por dominio

El kit actual es **agnóstico de tecnología** — funciona con cualquier stack. Para maximizar el valor, el siguiente paso es añadir reglas específicas por dominio.

### Skills de especialización (por crear)

Estos serían nuevos skills en `.agents/skills/` que la IA invoca cuando el proyecto lo necesita:

| Skill | Propósito | Ejemplo de contenido |
|---|---|---|
| `@design-frontend` | Convenciones de diseño UI/UX | Design system, tokens de color, tipografía, componentes, accesibilidad, responsive |
| `@api-backend` | Patrones de API y backend | REST/GraphQL, manejo de errores HTTP, auth, validación, middlewares |
| `@db-patterns` | Base de datos y modelos | Naming, migraciones, índices, relaciones, seeds |
| `@testing-strategy` | Estrategia de testing | Qué testear, frameworks, mocks, cobertura mínima |
| `@devops-deploy` | Despliegue y CI/CD | Dockerfile, pipelines, ambientes, monitoreo |

### Reglas de Cursor por glob (por crear)

Reglas que solo se activan cuando la IA trabaja en ciertos archivos:

```yaml
# .cursor/rules/frontend.mdc
---
description: Convenciones de frontend
globs: ["src/**/*.tsx", "src/**/*.css", "src/**/*.scss"]
alwaysApply: false
---
# Se inyecta solo cuando Cursor edita archivos frontend
```

```yaml
# .cursor/rules/api.mdc
---
description: Convenciones de API
globs: ["src/api/**", "src/routes/**", "src/controllers/**"]
alwaysApply: false
---
# Se inyecta solo cuando Cursor edita archivos de API
```

> **Ventaja**: las reglas por glob no consumen tokens cuando no son relevantes.

### Archivos de design system

Para proyectos con frontend, estos archivos ya forman parte de la fuente de verdad:

```
knowledge/wiki/
├── product-design.md     ← Marca, tokens, UI, componentes, accesibilidad, responsive
└── features.md           ← Módulos, pantallas, flujos y estados del producto
```

La IA consultaría estos archivos antes de crear cualquier componente, asegurando consistencia visual sin necesidad de repetir instrucciones en cada prompt.

---

## 📋 Compatibilidad de herramientas

| Herramienta | Archivo que lee | Formato | Límite recomendado |
|---|---|---|---|
| Antigravity (Gemini) | `GEMINI.md` + `.agents/rules/` + `.agents/skills/` | Markdown | ~200 líneas por archivo |
| Claude Code | `CLAUDE.md` | Markdown | ~200 líneas |
| Cursor IDE | `.cursor/rules/*.mdc` | Markdown + YAML frontmatter | ~12,000 chars por archivo |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown | Sin límite documentado |
| Windsurf | `.windsurfrules` | Markdown | Sin límite documentado |

---

## 🔑 Principios del kit

1. **Data-First** — El schema se define antes de codificar. Nunca al revés.
2. **Nunca adivinar** — Si la IA no tiene contexto, pregunta. No improvisa.
3. **Conocimiento acumulativo** — Cada sesión deja el proyecto más inteligente.
4. **Impacto mínimo** — La IA toca solo lo necesario. Sin cambios colaterales.
5. **Falla con claridad** — Un error ruidoso es mejor que un resultado silenciosamente incorrecto.
6. **Un kit, todas las herramientas** — El mismo conocimiento alimenta a Gemini, Claude, Cursor, Copilot y Windsurf.

---

## 📄 Licencia

Uso interno. Adaptar según necesidad.
