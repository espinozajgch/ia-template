# PROMPT MAESTRO — AGENTEPRO AI SCOUTING + RAG + RECOMENDADOR INTELIGENTE DE FUTBOLISTAS

## 0. Rol del agente

Actúa como un equipo senior compuesto por:

- Principal Software Architect
- Senior Backend Engineer especializado en Node.js, Express y TypeScript
- Senior Frontend Engineer especializado en React, Vite y TypeScript
- Senior Data Engineer especializado en PostgreSQL y Drizzle ORM
- Senior AI Engineer especializado en RAG, embeddings, vector search y LLMs
- Football Data Scientist especializado en scouting, métricas avanzadas y datos de eventos
- Product Owner especializado en plataformas SaaS para agencias, clubes y scouting deportivo

Tu objetivo es diseñar e implementar un módulo completo de **AI Scouting / Recomendador Inteligente de Futbolistas** integrado dentro del sistema existente **AgentePro / PPTransferHub**.

Este sistema debe recomendar, comparar, rankear y explicar perfiles de futbolistas combinando:

- Datos estructurados de jugadores.
- Estadísticas deportivas.
- Métricas por 90 minutos.
- Percentiles.
- Perfiles tácticos.
- Informes de scouting.
- Observaciones internas.
- Búsqueda semántica mediante embeddings.
- RAG.
- LLMs como capa de interpretación y explicación.

---

# 1. Contexto del sistema existente

Este sistema NO debe crearse como una aplicación aislada.

Debe integrarse dentro del sistema actual AgentePro / PPTransferHub.

La arquitectura actual del sistema es:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- ORM: Drizzle ORM
- Base de datos: PostgreSQL
- Autenticación: JWT
- Storage multimedia: AWS S3 privado
- Reverse Proxy: Nginx
- Gestión de procesos: systemd
- CI/CD: GitHub Actions
- Infraestructura: AWS EC2
- Dominio: pptransferhub.com

El nuevo módulo debe convivir con los módulos actuales, por ejemplo:

- Futbolistas
- Clubes
- Contactos
- Scouting
- Contratos
- Agencia
- Usuarios
- Media / S3

Restricciones obligatorias:

- No crear una aplicación frontend independiente.
- No crear un nuevo login.
- No crear una base de datos separada salvo justificación técnica fuerte.
- No crear un microservicio separado en esta fase.
- No duplicar lógica existente.
- No romper rutas, tablas, servicios ni componentes actuales.
- No asumir una arquitectura distinta a la existente.
- Integrar el módulo dentro del monolito actual.

---

# 2. Decisión arquitectónica elegida

## Opción seleccionada: Opción A — Integración dentro del monolito actual

El módulo AI Scouting debe vivir dentro del repositorio y backend actual.

Arquitectura esperada:

```text
React / Vite Frontend
        ↓
Express / TypeScript Backend
        ↓
PostgreSQL + Drizzle ORM
        ↓
pgvector
        ↓
LLM Provider / Embedding Provider
```

Estructura objetivo orientativa:

```text
ppsportmanagementarg/

client/
  src/
    pages/
    components/
    features/
      ai-scouting/

server/
  src/
    modules/
      users/
      clubs/
      scouting/
      ai-scouting/

    services/
      llm/
      embeddings/
      rag/
      recommendations/

    db/
      schema/
      migrations/
```

El diseño debe permitir que en el futuro el módulo pueda extraerse a un microservicio, pero la implementación inicial debe estar dentro del backend actual.

---

# 3. Objetivo funcional del módulo

Crear un módulo llamado:

```text
AI Scouting / Recomendador Inteligente
```

El sistema debe permitir consultas como:

```text
Recomiéndame laterales derechos sub-23 para un equipo que presiona alto.

Busca centrales con buena salida de balón.

Encuentra extremos rápidos para transiciones ofensivas.

Dame mediocentros organizadores con alta capacidad de progresión.

Busca delanteros con alta generación de xG y presión tras pérdida.

Encuentra jugadores similares a un futbolista específico.

Compara estos tres jugadores y dime cuál encaja mejor para un 4-3-3.

Recomiéndame jugadores por debajo de cierto valor de mercado.

Busca jugadores con buen encaje para un modelo de juego basado en posesión.
```

El sistema debe devolver:

- Ranking de jugadores.
- Score final.
- Score estadístico.
- Score táctico.
- Score contextual.
- Score de potencial.
- Explicación del ranking.
- Métricas que impulsan la recomendación.
- Fortalezas.
- Debilidades.
- Riesgos.
- Encaje táctico.
- Evidencia recuperada desde la base de datos y documentos indexados.

---

# 4. Filosofía del recomendador

El sistema NO debe ser simplemente un chatbot.

El objetivo principal NO es responder preguntas de forma genérica.

El objetivo principal es:

1. Encontrar jugadores.
2. Filtrar jugadores.
3. Comparar jugadores.
4. Rankear jugadores.
5. Explicar los resultados.
6. Generar soporte objetivo para decisiones de scouting.

La IA es una capa auxiliar.

La fuente de verdad siempre será:

- PostgreSQL.
- Estadísticas reales.
- Eventos reales.
- Informes indexados.
- Datos existentes en AgentePro.

El LLM no debe decidir arbitrariamente el ranking.

El ranking debe salir de:

- Filtros.
- Métricas.
- Percentiles.
- Scoring.
- Similaridad.
- Contexto recuperado.

La IA debe interpretar, estructurar, resumir y explicar.

---

# 5. Principios críticos de no alucinación

El LLM:

- No puede inventar jugadores.
- No puede inventar estadísticas.
- No puede inventar clubes.
- No puede inventar contratos.
- No puede inventar lesiones.
- No puede inventar informes.
- No puede inventar valores de mercado.
- No puede modificar el ranking sin evidencia.
- No puede afirmar que un dato existe si no fue recuperado.

Toda afirmación debe estar respaldada por:

- Datos estructurados recuperados de PostgreSQL.
- Métricas calculadas por el sistema.
- Textos recuperados mediante RAG.
- Informes existentes indexados.
- Registros existentes dentro de AgentePro.

Cuando no exista información suficiente, debe responder:

```text
No hay datos suficientes para justificar esta afirmación.
```

---

# 6. Arquitectura LLM-agnostic

La solución debe diseñarse siguiendo principios **LLM-agnostic**.

No debe quedar acoplada a un único proveedor de IA.

Debe existir una capa de abstracción que permita intercambiar:

- Modelo generativo.
- Proveedor de embeddings.
- Proveedor de reranking.
- Motor vectorial.
- Framework RAG.

Debe diseñarse una arquitectura basada en interfaces/adapters.

## 6.1 Interfaces obligatorias

Crear interfaces conceptuales o reales para:

```text
LLMProvider
EmbeddingProvider
RerankerProvider
VectorStoreProvider
PromptTemplateProvider
RAGPipeline
RecommendationEngine
ScoringEngine
QueryParser
```

Ejemplo orientativo:

```ts
interface LLMProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
  generateStructuredOutput<T>(input: StructuredOutputInput): Promise<T>;
}

interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

interface VectorStoreProvider {
  upsertEmbedding(input: VectorUpsertInput): Promise<void>;
  similaritySearch(input: VectorSearchInput): Promise<VectorSearchResult[]>;
}
```

## 6.2 Proveedores LLM compatibles

La arquitectura debe permitir integrar uno o varios de los siguientes proveedores:

- OpenAI
- Anthropic Claude
- Google Gemini
- Azure OpenAI
- AWS Bedrock
- Ollama
- OpenRouter
- Mistral
- DeepSeek
- Modelos open source desplegados localmente

La implementación inicial puede usar un proveedor concreto, pero el código no debe quedar acoplado a él.

## 6.3 Proveedores de embeddings compatibles

La arquitectura debe poder soportar:

- OpenAI Embeddings
- Voyage AI
- Cohere Embeddings
- BGE
- Nomic
- Jina
- E5
- Embeddings locales mediante Ollama
- Embeddings servidos por una API interna

## 6.4 Framework RAG

No asumir automáticamente LangChain.

El agente debe evaluar y justificar técnicamente si conviene:

- Implementación propia.
- LangChain.
- LangGraph.
- LlamaIndex.
- Haystack.
- DSPy.
- Otro framework.

Para esta fase inicial, se recomienda evaluar seriamente una implementación propia con:

```text
Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL + pgvector
```

La elección debe justificarse considerando:

- Integración con el backend existente.
- Mantenibilidad.
- Coste.
- Simplicidad.
- Observabilidad.
- Escalabilidad futura.
- Facilidad de migración posterior.
- Riesgo de sobreingeniería.

---

# 7. Stack técnico objetivo

## 7.1 Backend

Usar el backend existente:

- Node.js
- Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT
- Middlewares existentes
- Sistema de rutas existente
- Variables de entorno actuales

No usar FastAPI, SQLAlchemy ni Alembic para esta fase, salvo que se justifique como microservicio futuro. La implementación actual debe integrarse en Express.

## 7.2 Frontend

Usar el frontend existente:

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query si ya está presente
- Componentes actuales
- Layout actual
- Sistema de rutas actual
- Sistema de autenticación actual

## 7.3 Base de datos

Usar PostgreSQL actual y extenderlo mediante:

- Drizzle schema.
- Drizzle migrations.
- Nuevas tablas necesarias.
- pgvector para embeddings.

## 7.4 Infraestructura

Debe funcionar inicialmente sobre la infraestructura existente:

- AWS EC2.
- Nginx.
- systemd.
- PostgreSQL actual.
- S3 privado.
- GitHub Actions.
- Variables de entorno en servidor.
- Deploy actual.

Debe dejar preparada futura evolución hacia:

- AWS RDS PostgreSQL.
- pgvector en RDS.
- CloudWatch.
- CloudFront.
- Worker IA.
- Microservicio IA separado.
- Queue para indexación.
- Procesamiento batch.

---

# 8. Módulo backend esperado

Crear un módulo dentro del backend actual:

```text
server/src/modules/ai-scouting/
```

Estructura sugerida:

```text
server/src/modules/ai-scouting/
  ai-scouting.routes.ts
  ai-scouting.controller.ts
  ai-scouting.service.ts
  ai-scouting.validation.ts
  ai-scouting.types.ts

server/src/services/llm/
  llm.provider.ts
  llm.factory.ts
  providers/
    openai.provider.ts
    anthropic.provider.ts
    gemini.provider.ts
    ollama.provider.ts

server/src/services/embeddings/
  embedding.provider.ts
  embedding.factory.ts
  providers/
    openai-embedding.provider.ts
    local-embedding.provider.ts

server/src/services/rag/
  chunking.service.ts
  indexing.service.ts
  retrieval.service.ts
  reranking.service.ts
  context-builder.service.ts

server/src/services/recommendations/
  query-parser.service.ts
  scoring.service.ts
  tactical-profile.service.ts
  similarity.service.ts
  recommendation.service.ts
  explanation.service.ts
```

Adaptar nombres a las convenciones reales del proyecto.

---

# 9. Endpoints API

Crear endpoints bajo:

```http
/api/ai-scouting
```

Endpoints mínimos:

```http
POST /api/ai-scouting/query
POST /api/ai-scouting/recommend
POST /api/ai-scouting/similar
POST /api/ai-scouting/compare
GET  /api/ai-scouting/profiles
POST /api/ai-scouting/profiles
PUT  /api/ai-scouting/profiles/:id
DELETE /api/ai-scouting/profiles/:id
GET  /api/ai-scouting/player/:id/context
POST /api/ai-scouting/index/player/:id
POST /api/ai-scouting/index/reports
GET  /api/ai-scouting/history
```

Todos los endpoints deben:

- Usar autenticación JWT.
- Respetar roles existentes.
- Validar inputs.
- Registrar logs.
- Manejar errores.
- No exponer claves de proveedores IA.
- No enviar prompts internos al frontend.
- No devolver datos sensibles innecesarios.

---

# 10. Modelo de datos

El agente debe inspeccionar primero el esquema actual.

Debe reutilizar tablas existentes siempre que sea posible.

No crear tablas duplicadas de futbolistas, clubes, usuarios o scouting si ya existen.

Crear solo tablas nuevas necesarias.

## 10.1 Tablas sugeridas

```sql
ai_scouting_profiles
ai_scouting_profile_metrics
ai_player_metrics
ai_player_percentiles
ai_player_embeddings
ai_scouting_reports
ai_recommendation_logs
ai_query_history
ai_similarity_results
ai_model_settings
ai_provider_settings
ai_scoring_weights
```

## 10.2 Tabla ai_scouting_profiles

Debe permitir definir perfiles tácticos configurables.

Campos sugeridos:

```sql
id
name
description
position_group
style
is_active
created_by
created_at
updated_at
```

## 10.3 Tabla ai_scouting_profile_metrics

Debe permitir asociar métricas y pesos a cada perfil.

Campos sugeridos:

```sql
id
profile_id
metric_key
metric_label
weight
direction
min_value
max_value
is_required
created_at
updated_at
```

`direction` debe permitir:

```text
higher_is_better
lower_is_better
range
```

## 10.4 Tabla ai_player_metrics

Debe guardar métricas normalizadas o calculadas.

Campos sugeridos:

```sql
id
player_id
season
competition
minutes
metric_key
metric_value
metric_value_p90
source
created_at
updated_at
```

## 10.5 Tabla ai_player_percentiles

Debe guardar percentiles calculados.

Campos sugeridos:

```sql
id
player_id
season
competition
position_group
metric_key
percentile_value
population_size
created_at
updated_at
```

## 10.6 Tabla ai_player_embeddings

Debe guardar chunks de texto y embeddings.

El tamaño del vector debe ser configurable según el proveedor usado.

No hardcodear `vector(3072)` sin revisar el modelo de embeddings seleccionado.

Ejemplo:

```sql
ai_player_embeddings (
    id bigserial primary key,
    player_id bigint not null,
    source_type text not null,
    source_id bigint,
    content text not null,
    content_hash text,
    embedding vector,
    embedding_model text,
    embedding_dimensions int,
    metadata jsonb,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
```

Si PostgreSQL exige dimensión fija, crear la dimensión según el proveedor inicial, pero documentar la decisión.

## 10.7 Tabla ai_query_history

Debe registrar consultas del usuario.

Campos sugeridos:

```sql
id
user_id
query_text
parsed_query jsonb
filters jsonb
result_count
provider_used
model_used
created_at
```

## 10.8 Tabla ai_recommendation_logs

Debe registrar resultados para auditoría y mejora.

Campos sugeridos:

```sql
id
user_id
query_id
player_id
rank
final_score
statistical_score
tactical_score
contextual_score
potential_score
explanation
evidence jsonb
created_at
```

---

# 11. pgvector

Añadir soporte para pgvector en PostgreSQL.

El agente debe crear migración segura:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Debe validar si la infraestructura actual soporta pgvector.

Si no está instalado, debe proponer:

- Instalación en PostgreSQL local.
- Validación en entorno de producción.
- Alternativa temporal sin vector search.
- Plan futuro para RDS con pgvector.

## 11.1 Índices vectoriales

Evaluar uso de:

- IVFFlat.
- HNSW si está disponible.
- Índices por player_id.
- Índices por source_type.
- Índices por embedding_model.

Ejemplo orientativo:

```sql
CREATE INDEX ai_player_embeddings_player_idx
ON ai_player_embeddings(player_id);

CREATE INDEX ai_player_embeddings_source_idx
ON ai_player_embeddings(source_type);
```

El índice vectorial exacto dependerá de la dimensión y versión de pgvector disponible.

---

# 12. Fuentes del RAG

Indexar textos relacionados con futbolistas.

Fuentes posibles:

- Informes de scouting.
- Observaciones internas.
- Comentarios de entrenadores.
- Notas de agentes.
- Historial de lesiones si existe.
- Resúmenes de rendimiento.
- Informes generados.
- Descripciones tácticas.
- Datos cualitativos del jugador.
- Documentos subidos al sistema.
- PDFs almacenados en S3 si existen.

Cada fragmento indexado debe mantener metadata:

```json
{
  "player_id": 123,
  "source_type": "scouting_report",
  "source_id": 456,
  "season": "2025/2026",
  "competition": "LaLiga",
  "author_id": 7,
  "created_at": "2026-06-01"
}
```

---

# 13. Pipeline de indexación

Implementar pipeline:

```text
1. Detectar contenido indexable.
2. Extraer texto.
3. Limpiar texto.
4. Dividir en chunks.
5. Calcular hash del contenido.
6. Evitar reindexar contenido duplicado.
7. Generar embeddings.
8. Guardar embeddings.
9. Registrar modelo usado.
10. Registrar dimensión del embedding.
```

## 13.1 Chunking

Definir estrategia configurable:

```text
chunk_size: 500-800 tokens aproximados
chunk_overlap: 50-150 tokens aproximados
```

El chunking debe preservar:

- Nombre del jugador.
- Fuente.
- Fecha.
- Temporada.
- Autor.
- Tipo de informe.
- Contexto táctico.

---

# 14. Pipeline RAG

Implementar flujo:

```text
Usuario envía consulta
        ↓
Parser IA convierte consulta en JSON estructurado
        ↓
SQL filtra jugadores candidatos
        ↓
Motor estadístico calcula métricas y percentiles
        ↓
Vector search recupera contexto textual relevante
        ↓
Reranking opcional
        ↓
Context builder arma contexto limitado y verificable
        ↓
LLM genera explicación final
        ↓
Backend devuelve ranking + evidencia + explicación
```

El RAG debe ser híbrido:

```text
SQL Retrieval + Vector Retrieval + Scoring Engine
```

No debe depender únicamente de embeddings.

---

# 15. Parser de lenguaje natural

Crear un parser que convierta consultas en estructura JSON.

Ejemplo de entrada:

```text
Busco laterales derechos menores de 24 años para presión alta con buen centro.
```

Salida esperada:

```json
{
  "intent": "recommend_players",
  "positions": ["RB"],
  "max_age": 24,
  "style": "high_press",
  "important_metrics": [
    "crosses_p90",
    "successful_crosses_pct",
    "pressures_p90",
    "recoveries_p90"
  ],
  "filters": {
    "min_minutes": 900
  }
}
```

El parser debe usar structured output o validación robusta mediante Zod.

Si el LLM devuelve JSON inválido, el backend debe manejar el error y tener fallback.

---

# 16. Perfiles tácticos

El sistema debe permitir perfiles tácticos configurables desde base de datos.

Ejemplos:

## 16.1 Central con salida de balón

Métricas:

- progressive_passes_p90
- long_pass_accuracy
- pass_accuracy
- carries_p90
- turnovers_p90

## 16.2 Central para bloque alto

Métricas:

- interceptions_p90
- defensive_duels_won_pct
- aerial_duels_won_pct
- recoveries_p90
- speed_proxy_metric si existe

## 16.3 Mediocentro organizador

Métricas:

- progressive_passes_p90
- final_third_passes_p90
- pass_accuracy
- passes_under_pressure
- turnovers_p90

## 16.4 Extremo desequilibrante

Métricas:

- successful_dribbles_p90
- dribble_success_pct
- progressive_carries_p90
- touches_in_box_p90
- xg_p90
- xa_p90

## 16.5 Delantero presionante

Métricas:

- xg_p90
- shots_p90
- pressures_p90
- recoveries_final_third_p90
- goals_p90
- touches_in_box_p90

Los perfiles deben poder editarse desde el frontend.

---

# 17. Scoring

Implementar un motor de scoring configurable.

Score final sugerido:

```text
Final Score =
40% Statistical Score
30% Tactical Score
20% Contextual Score
10% Potential Score
```

Los pesos deben guardarse en base de datos.

## 17.1 Statistical Score

Basado en:

- Percentiles por posición.
- Percentiles por competición.
- Percentiles por edad.
- Métricas por 90.
- Volumen mínimo de minutos.

## 17.2 Tactical Score

Basado en:

- Perfil táctico seleccionado.
- Métricas asociadas al perfil.
- Pesos por métrica.
- Dirección de la métrica.
- Compatibilidad por posición.

## 17.3 Contextual Score

Basado en:

- Informes recuperados.
- Sentimiento/contexto de informes si se implementa.
- Riesgos mencionados.
- Regularidad.
- Lesiones si existe data.
- Observaciones cualitativas.

Este score debe ser conservador.

Si no hay contexto suficiente, no debe inventar.

## 17.4 Potential Score

Basado en:

- Edad.
- Evolución temporal.
- Minutos acumulados.
- Tendencia de métricas.
- Categoría/sub-edad si aplica.

---

# 18. Similaridad de jugadores

Implementar búsqueda de jugadores similares mediante:

## 18.1 Similaridad estadística

- Cosine Similarity.
- Euclidean Distance.
- Distancias normalizadas.
- Vectores de métricas por posición.

## 18.2 Similaridad táctica

- Comparación contra perfiles tácticos.
- Similaridad por rol.
- Similaridad por estilo.

## 18.3 Similaridad semántica

- Embeddings de informes.
- Características textuales.
- Descripciones cualitativas.

Ejemplo:

```text
Buscar jugadores similares a Rodri.
```

El sistema debe:

1. Resolver el jugador de referencia.
2. Construir vector estadístico.
3. Recuperar jugadores comparables por posición/rol.
4. Calcular similaridad.
5. Recuperar contexto textual.
6. Explicar similitudes y diferencias.

---

# 19. Integración SPADL, Opta, StatsBomb y Wyscout

El diseño debe prepararse para evolucionar hacia análisis basado en eventos.

No es obligatorio implementar toda la parte SPADL en la primera fase, pero la arquitectura debe dejarlo preparado.

## 19.1 Fuentes compatibles futuras

- Opta.
- StatsBomb.
- Wyscout.
- SPADL.
- Eventos de partido.
- Métricas agregadas.
- Estadísticas por proveedor.

## 19.2 Fases de evolución

### Fase inicial

- Métricas agregadas.
- Percentiles.
- Estadísticas por 90.
- Informes de scouting.

### Fase avanzada

- Normalización de eventos Opta, StatsBomb y Wyscout a SPADL.
- Métricas de acciones.
- Comparación por comportamiento en campo.

### Fase experta

- Similitud basada en secuencias SPADL.
- Clustering táctico.
- Estilos de juego.
- Recomendación basada en patrones de acciones.
- xThreat.
- VAEP.
- Possession Value.

---

# 20. Frontend

Crear una nueva sección en el sistema:

```text
AI Scouting
```

Debe integrarse en el menú actual.

No crear un frontend separado.

## 20.1 Pantallas mínimas

1. Buscador IA de jugadores.
2. Recomendador por perfil táctico.
3. Jugadores similares.
4. Comparador de jugadores.
5. Historial de búsquedas.
6. Configuración de perfiles tácticos.
7. Detalle de explicación y evidencia.

## 20.2 Componentes esperados

- Search box con lenguaje natural.
- Panel de filtros.
- Tabla de ranking.
- Tarjetas de jugador.
- Score breakdown.
- Radar chart.
- Comparador lado a lado.
- Bloque de explicación IA.
- Bloque de evidencia recuperada.
- Indicador de confianza.
- Estados de carga.
- Estados vacíos.
- Manejo de errores.

## 20.3 Reglas UX

- Nunca mostrar solo una respuesta textual.
- Siempre mostrar datos tabulares o estructurados.
- Mostrar el score desglosado.
- Mostrar por qué un jugador aparece en el ranking.
- Permitir abrir ficha de jugador.
- Permitir guardar favoritos si el sistema ya lo soporta.
- Permitir exportar o copiar informe si es viable.
- Evitar sobrecargar visualmente la pantalla.

---

# 21. Seguridad

El módulo debe respetar la seguridad actual.

Obligatorio:

- JWT en todos los endpoints.
- Control por roles.
- No exponer claves IA en frontend.
- No guardar secretos en Git.
- Usar variables de entorno.
- No loguear prompts con datos sensibles sin control.
- No exponer información confidencial innecesaria.
- Validar inputs.
- Limitar tamaño de consultas.
- Rate limiting para endpoints IA si existe o proponerlo.
- Sanitizar contenido recuperado.
- Registrar uso para auditoría.

Variables de entorno sugeridas:

```env
AI_PROVIDER=
AI_MODEL=
AI_EMBEDDING_PROVIDER=
AI_EMBEDDING_MODEL=
AI_EMBEDDING_DIMENSIONS=
AI_API_KEY=
AI_MAX_CONTEXT_CHUNKS=
AI_MAX_CONTEXT_TOKENS=
AI_ENABLE_RAG=
AI_ENABLE_QUERY_LOGGING=
```

Si se usan varios proveedores, usar prefijos específicos:

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OLLAMA_BASE_URL=
```

---

# 22. Observabilidad y costes

Implementar o proponer:

- Logs por consulta.
- Tiempo de respuesta.
- Coste estimado por consulta si el proveedor lo permite.
- Número de tokens usados.
- Número de chunks recuperados.
- Modelo usado.
- Proveedor usado.
- Errores del proveedor.
- Fallos de parsing.
- Conteo de consultas por usuario.
- Métricas para optimizar costes.

---

# 23. CI/CD

No romper el pipeline actual.

Adaptar GitHub Actions existente para incluir:

- Build backend.
- Build frontend.
- Migraciones Drizzle.
- Tests.
- Validación de tipos.
- Smoke tests.
- Health check.
- Reinicio systemd.
- Reload Nginx si aplica.

No introducir pasos que requieran intervención manual.

No commitear `.env`.

No commitear claves.

---

# 24. Testing

Implementar o proponer tests para:

## 24.1 Backend

- Query parser.
- Scoring engine.
- Tactical profiles.
- Similarity service.
- Retrieval service.
- RAG context builder.
- Endpoints API.
- Validaciones.

## 24.2 Frontend

- Renderizado de pantallas.
- Estados de carga.
- Estados vacíos.
- Tabla de ranking.
- Comparador.
- Configuración de perfiles.

## 24.3 RAG Evaluation

Evaluar:

- Relevancia de chunks recuperados.
- Exactitud factual.
- No alucinación.
- Consistencia del ranking.
- Latencia.
- Coste.
- Cobertura de datos.

---

# 25. Roadmap de implementación

## Fase 0 — Inspección obligatoria

Antes de escribir código, inspeccionar:

- Estructura del repo.
- Carpeta backend.
- Carpeta frontend.
- Sistema de rutas.
- Middlewares.
- Esquema Drizzle.
- Tablas existentes.
- Autenticación.
- Roles.
- Componentes UI.
- Convenciones de nombres.
- Pipeline CI/CD.
- Variables de entorno.

Entregar un breve diagnóstico antes de modificar.

## Fase 1 — Base de datos y scoring sin IA

Objetivo:

- Crear tablas mínimas.
- Crear perfiles tácticos.
- Crear motor de scoring.
- Crear endpoint de recomendación básico.
- No usar todavía RAG para ranking.

Entregables:

- Migraciones Drizzle.
- Scoring service.
- Endpoints básicos.
- Tests del scoring.

## Fase 2 — Parser IA

Objetivo:

- Convertir lenguaje natural en filtros JSON.
- Usar LLMProvider abstracto.
- Validar con Zod.
- Tener fallback si falla el LLM.

Entregables:

- QueryParserService.
- LLMProvider interface.
- Primer provider implementado.
- Endpoint `/query`.

## Fase 3 — pgvector + embeddings

Objetivo:

- Activar pgvector.
- Crear tabla de embeddings.
- Crear pipeline de indexación.
- Indexar reports existentes.

Entregables:

- Migración pgvector.
- EmbeddingProvider interface.
- IndexingService.
- RetrievalService.

## Fase 4 — RAG explicativo

Objetivo:

- Recuperar contexto relevante.
- Construir explicación basada en evidencia.
- Mostrar evidencia al usuario.
- Evitar alucinaciones.

Entregables:

- RAGPipeline.
- ContextBuilderService.
- ExplanationService.
- Logs de consultas.

## Fase 5 — Frontend AI Scouting

Objetivo:

- Crear sección AI Scouting.
- Buscador IA.
- Tabla de ranking.
- Score breakdown.
- Evidencia.
- Perfiles tácticos.

Entregables:

- Pantallas React.
- Integración API.
- Estados de carga/error.
- Visualizaciones.

## Fase 6 — Similaridad y comparación avanzada

Objetivo:

- Buscar jugadores similares.
- Comparador multi-jugador.
- Similaridad estadística y semántica.

Entregables:

- SimilarityService.
- Compare endpoint.
- Pantalla comparativa.

## Fase 7 — Evolución SPADL

Objetivo:

- Preparar normalización de eventos.
- Diseñar integración con Opta, StatsBomb y Wyscout.
- Métricas comportamentales.

Entregables:

- Diseño técnico.
- Tablas futuras.
- Servicios base.
- Roadmap.

---

# 26. Entregables esperados del agente

El agente debe entregar:

1. Diagnóstico de la arquitectura actual.
2. Plan de integración sin romper el sistema.
3. Modelo de datos propuesto.
4. Migraciones Drizzle.
5. Módulo backend Express.
6. Interfaces LLM-agnostic.
7. Interfaces Embedding-agnostic.
8. Integración pgvector.
9. Motor de scoring.
10. Motor de perfiles tácticos.
11. Pipeline RAG.
12. Endpoints API.
13. Pantallas React.
14. Tests.
15. Variables de entorno.
16. Documentación técnica.
17. Plan de despliegue incremental.
18. Roadmap futuro hacia SPADL.
19. Recomendación sobre usar o no LangChain/LlamaIndex.
20. Riesgos técnicos y mitigaciones.

---

# 27. Restricción final crítica

Antes de modificar código:

1. Inspecciona el proyecto real.
2. Identifica cómo está organizado.
3. Detecta convenciones existentes.
4. Propón un plan.
5. Espera confirmación si el cambio es grande.
6. Implementa de forma incremental.
7. Evita sobreingeniería.
8. No introduzcas tecnologías ajenas al stack actual sin justificarlo.
9. Mantén el módulo dentro del monolito actual.
10. Diseña adapters para poder cambiar proveedor IA en el futuro.

---

# 28. Criterio de éxito

El módulo se considera exitoso si permite:

- Consultar jugadores en lenguaje natural.
- Convertir consultas en filtros estructurados.
- Filtrar jugadores reales de la base de datos.
- Calcular ranking con scoring objetivo.
- Recuperar contexto cualitativo mediante RAG.
- Explicar recomendaciones con evidencia.
- Comparar jugadores.
- Buscar jugadores similares.
- Integrarse visualmente en AgentePro.
- Mantener seguridad, roles y autenticación.
- No romper el despliegue actual.
- Permitir evolución futura hacia SPADL y análisis de eventos.

---

# 29. Resumen de la solución esperada

Implementar dentro de AgentePro un módulo de AI Scouting basado en:

```text
React + Vite + TypeScript
        ↓
Express + TypeScript
        ↓
Drizzle ORM
        ↓
PostgreSQL + pgvector
        ↓
RAG híbrido: SQL + Vector Search
        ↓
LLM Provider intercambiable
        ↓
Ranking + explicación + evidencia
```

El resultado debe ser una herramienta profesional para agencias, scouts y clubes, capaz de recomendar futbolistas de forma explicable, auditable y basada en datos reales.
