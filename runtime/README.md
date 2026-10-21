# Intelligence Runtime

El runtime es la capa reutilizable que convierte datos, herramientas y modelos en
inteligencia operativa. No conoce ningún dominio concreto y no sustituye al núcleo de
`ia-template`: el núcleo define cómo trabaja el agente de programación; el runtime define
los contratos que pueden usar un agente, una aplicación o un proceso automático.

## Flujo

```text
datos → entidades y calidad → eventos y reglas → recuperación
      → scoring/predicción → siguiente acción → LLM → validación humana
```

El LLM es una interfaz para interpretar, explicar, resumir o redactar. No es la fuente de
verdad ni puede saltarse permisos, cálculos o validaciones.

## Módulos previstos

```text
runtime/
├── orchestrator/       clasificación, routing y selección de herramientas
├── model-router/       modelo por dificultad, coste, latencia y riesgo
├── context-builder/    contexto mínimo con presupuesto y procedencia
├── memory/             decisiones, resultados, evidencias y caducidad
├── retrieval/          búsqueda léxica, semántica y estructural
├── knowledge-graph/    entidades, relaciones y eventos
├── semantic-cache/     reutilización segura e invalidación
├── tool-registry/      contratos MCP/Skills, permisos y coste
├── policy-engine/      clasificación, egreso y fallback
├── evaluator/          casos, baselines, métricas y promoción
└── observability/      latencia, tokens, errores y coste
```

En esta primera iteración los contratos son documentación y esquemas; los ejecutores se
extraen gradualmente de `packs/orquestacion-agentes` cuando exista un segundo consumidor.
