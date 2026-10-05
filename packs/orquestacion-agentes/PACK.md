# Pack · orquestación de agentes

**Se activa si:** el proyecto usa agentes de programación y quiere imponer selección mínima de contexto, routing de modelos o delegación controlada.

---

## La frontera

El agente no empieza leyendo archivos libremente. La petición atraviesa este orden:

```text
estructura → relevancia → contexto mínimo → clasificación → modelo → ejecución
```

`codebase-memory` descubre la estructura. Las fuentes externas —documentación, memoria e
infraestructura— aportan candidatos. `contexto.mjs` decide qué entra dentro del presupuesto.
`routing.mjs` clasifica la tarea y elige un perfil de modelo. El LLM recibe el bundle ya
compilado y puede ampliarlo únicamente explicando qué incertidumbre resolverá.

Las herramientas funcionan sin servicios externos. Laya, Context7, Project Memory y un
Context Builder de infraestructura son adaptadores opcionales; su caída nunca convierte un
bundle vacío en un resultado aparentemente válido.

## Qué instala

- `politica-contexto.json`: presupuesto total y cupos por fuente.
- `modelos.json`: perfiles de modelo y reglas auditables de routing.
- `contrato-contexto.schema.json`: contrato del bundle que recibe el agente.
- `contrato-delegacion.schema.json`: frontera verificable de una subtarea multiagente.
- `tools/contexto.mjs`: deduplica, excluye secretos y compila el contexto mínimo.
- `tools/routing.mjs`: acepta una decisión de Laya o usa un fallback determinista.
- `tools/pipeline.mjs`: ejecuta compilación y routing en un solo comando.
- `tools/benchmark.mjs`: compara el routing con casos JSONL antes de automatizarlo.
- skill `preparar-contexto`: procedimiento descubierto por Claude y Codex.

## Uso

```bash
node agente/packs/orquestacion-agentes/tools/pipeline.mjs \
  --input candidatos.json \
  --output .contexto/bundle.json
```

El fichero de entrada contiene `request` y `candidates`. Cada candidato declara `kind`,
`source`, `text`, `score` y, si corresponde, `required` o `sensitive`.
Los bundles generados viven en `.contexto/` y el instalador los excluye de Git: son
artefactos efímeros de ejecución, no una segunda fuente de verdad.

Antes de activar routing automático, reemplaza los casos ilustrativos por tareas reales del
template y ejecuta:

```bash
node agente/packs/orquestacion-agentes/tools/benchmark.mjs \
  agente/packs/orquestacion-agentes/evaluacion/casos.ejemplo.jsonl
```

## Integraciones opcionales

### Codebase Memory

Es la primera fuente: arquitectura, símbolos, caminos y fragmentos. No vuelca archivos
completos salvo que el criterio de la tarea lo exija.

### Context7

El `mcp.json` del pack instala una versión fijada. Se consulta solo para preguntas sobre
una dependencia o API externa, y su respuesta entra como candidato `external_docs`.

### Project Memory

No sustituye `knowledge/wiki/`: lo indexa o lo expone. Una escritura de memoria es una
propuesta con fuente; nunca se acepta automáticamente por venir de un agente.

### Laya

Puede producir `intent`, `difficulty`, `risk`, necesidades de fuentes y `confidence`.
Por debajo del umbral configurado se ignora y se usa el fallback local. Seguridad,
producción, migraciones y contratos externos nunca bajan de riesgo alto por decisión de
un clasificador.

### Context Builder

Es una fuente de infraestructura, no el compilador universal. Solo se activa para
incidentes, observabilidad o despliegue, y sus documentos entran como `infrastructure`.

## Checklist

- [ ] Hay benchmark antes/después con tareas reales de al menos dos repositorios
- [ ] Cada fragmento lleva fuente y razón de inclusión
- [ ] El bundle declara lo excluido y los huecos de cobertura
- [ ] Ningún candidato sensible llega al bundle
- [ ] El presupuesto se cumple sin truncado silencioso
- [ ] La clasificación registra origen, confianza y fallback
- [ ] El routing registra regla, perfil y motivo
- [ ] La caché conserva un prefijo estable y mide aciertos, escrituras y coste
- [ ] Los subagentes reciben bundles, no el historial completo
- [ ] El pack demostró utilidad en dos proyectos antes de proponerse para el núcleo
