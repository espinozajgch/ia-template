---
name: preparar-contexto
description: Compila un bundle mínimo y auditable antes de una tarea de programación no trivial. Úsala cuando el cambio cruza módulos, requiere documentación o memoria, puede delegarse, o el contexto disponible supera lo que conviene entregar al modelo.
---

# Preparar contexto

El orden no se negocia:

```text
estructura → relevancia → contexto mínimo → clasificación → modelo → ejecución
```

## 1 · Fijar la pregunta

Escribe en una frase qué incertidumbre debe resolver el contexto. Una petición vaga no se
arregla leyendo más. Declara el presupuesto inicial; si el proyecto no tiene uno, usa
12.000 tokens.

## 2 · Estructura, sin cuerpos completos

Con el grafo del código, obtiene arquitectura, entradas y límites. Después busca símbolos y
traza llamadas o flujo de datos. Solo entonces pide fragmentos concretos. Texto y `rg` son
para literales, configuración y documentos no indexados.

## 3 · Añadir fuentes bajo demanda

- Memoria: decisiones, deuda, anti-patrones y lecciones relacionados con los símbolos.
- Context7: únicamente si la tarea depende de una librería o API externa y de su versión.
- Context Builder: únicamente para infraestructura, observabilidad, despliegue o incidentes.

Cada candidato lleva `kind`, `source`, `text`, `score` y `reason`. Marca `required` solo si
la tarea no puede decidirse sin él. Marca `sensitive` ante cualquier duda: el compilador lo
excluirá.

## 4 · Compilar

```bash
node agente/packs/orquestacion-agentes/tools/pipeline.mjs \
  --input .contexto/candidatos.json \
  --output .contexto/bundle.json
```

Lee primero `coverageGaps` y `excludedContext`. No presentes un bundle parcial como
completo. Si hace falta ampliarlo, declara:

```text
incertidumbre · fuente esperada · presupuesto adicional · condición para detenerse
```

## 5 · Respetar el routing

El routing es una recomendación auditable, no permiso para debilitar seguridad. Riesgo alto
requiere el perfil de frontera y revisión independiente. Un clasificador ausente o incierto
activa el fallback local; nunca deja la decisión vacía.

## 6 · Delegar con contratos

Un subagente recibe objetivo, rutas permitidas, bundle, evidencia exigida y verificación.
No recibe el historial completo. El agente principal conserva el plan, integra los
resultados y verifica. Dos agentes no editan el mismo fichero.

## Entrega

Informa: fragmentos y tokens seleccionados, exclusiones, huecos, origen de clasificación,
regla de routing y ampliaciones. Mide antes/después; «menos contexto» sin números no cuenta.

