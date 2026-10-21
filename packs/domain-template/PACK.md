# Pack · Domain Pack

**Se activa si:** el proyecto necesita conectar el runtime de inteligencia con un dominio de negocio concreto.

## Frontera

Este pack es una plantilla para describir un dominio sin acoplarlo al runtime. No contiene
reglas de ElevenOffice ni de ningún producto concreto.

## Estructura recomendada

```text
domain/
├── manifest.json       identidad y versión del dominio
├── entities.schema.json
├── relations.json
├── events.json
├── policies.json       permisos y clasificación de datos
├── tools.json          contratos de herramientas autorizadas
├── retrieval.json      fuentes, índices y ranking
├── workflows/          acciones y estados del trabajo
└── evaluations/        casos, baselines y métricas
```

## Reglas

- El pack declara contratos; no modifica el núcleo ni copia el runtime.
- Cada herramienta declara permisos, sensibilidad, efectos y evidencia que devuelve.
- Las reglas deterministas se ejecutan antes del LLM.
- Toda recomendación debe conservar fuentes, versión y datos ausentes.
- Ningún resultado se promueve sin baseline, evaluación y fallback.

## Checklist

- [ ] Entidades y relaciones tienen identificadores estables.
- [ ] Eventos y estados tienen una fuente de verdad.
- [ ] Herramientas tienen permisos y caminos de error.
- [ ] Recuperación conserva procedencia y respeta visibilidad.
- [ ] Hay casos de evaluación y un baseline determinista.
- [ ] El pack puede instalarse sin importar módulos de otro dominio.
