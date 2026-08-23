# Project Map — Mapa del Proyecto

> Generado por el System Pilot en Fase B (Blueprint).
> Este archivo describe la estructura real del proyecto.

---

## Estructura de Carpetas

```
[PROYECTO]/
├── knowledge/
│   └── wiki/
│       ├── project.md          ← Fuente de verdad del proyecto
│       ├── features.md         ← Funcionalidad: módulos, pantallas, flujos, acciones
│       └── product-design.md   ← Marca, UX, UI y design system si hay frontend
├── llm-wiki/
│   ├── MASTER_PROMPT.md        ← Prompt maestro reutilizable
│   ├── 00_PROJECT_MAP.md       ← Este archivo
│   ├── 01_LLM_STRATEGY.md      ← Modelo y estrategia
│   ├── 02_DATA_SCHEMAS.md      ← Schemas JSON
│   ├── 03_RETRIEVAL.md         ← Configuración RAG
│   ├── 04_TOOLS.md             ← Catálogo de tools
│   ├── 05_RELIABILITY.md       ← Validación y errores
│   ├── 06_INTEGRATIONS.md      ← Servicios externos
│   ├── 07_PROMPT_TEMPLATES.md  ← Templates de prompts
│   ├── 08_ARCHITECTURE.md      ← Arquitectura A.N.T.
│   └── 09_BLAST_PROTOCOL.md    ← Protocolo completo
├── data/
│   └── raw/                    ← Datos sin procesar
├── tools/
│   └── verify_[servicio].py    ← Scripts de verificación (Fase L)
├── app/                        ← Código de ejecución
└── .env                        ← Credenciales (nunca en Git)
```

---

## Estado del Proyecto

| Campo | Valor |
|---|---|
| Nombre | [PENDIENTE — completar en Blueprint] |
| North Star | [PENDIENTE] |
| Tipo de interfaz | [PENDIENTE — backend-only / frontend / mixto] |
| Fase actual | [PENDIENTE] |
| Última actualización | [FECHA] |

---

## Capa A.N.T.

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Knowledge | `/knowledge/wiki` | Datos procesados, funcionalidad, marca/diseño, wiki y fuente de verdad |
| System | `/llm-wiki` | Reglas, prompts, protocolo B.L.A.S.T |
| Execution | `/app`, `/tools` | Código que ejecuta el sistema |

---

## Funcionalidad y Producto

| Archivo | Cuándo aplica | Responsabilidad |
|---|---|---|
| `knowledge/wiki/features.md` | Siempre | Centraliza módulos, pantallas/endpoints, flujos, acciones, estados y gaps funcionales |
| `knowledge/wiki/product-design.md` | Solo si hay frontend/interfaz visual | Define identidad de marca, UX, UI, tokens, componentes, responsive y accesibilidad |

---

## Decisiones de Arquitectura

| Decisión | Razón | Fecha |
|---|---|---|
| [PENDIENTE] | [PENDIENTE] | [FECHA] |
