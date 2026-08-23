# Especificación técnica — Plataforma de análisis hípico venezolano

## 1. Objetivo del proyecto

Construir una plataforma independiente de **ingesta, normalización, almacenamiento, consulta y análisis de datos hípicos venezolanos**, centrada inicialmente en La Rinconada y Valencia.

La herramienta debe recopilar resultados históricos y datos previos a cada carrera desde fuentes públicas, transformarlos en un modelo de datos consistente y exponerlos mediante una API REST documentada.

El resultado final debe poder integrarse con otra herramienta en desarrollo mediante:

- API REST versionada.
- Webhooks o eventos internos, si posteriormente fueran necesarios.
- Exportaciones JSON y CSV.
- Identificadores estables para caballos, jinetes, entrenadores, hipódromos, reuniones y carreras.
- Módulo de estadísticas y métricas de rendimiento.
- Contrato OpenAPI para facilitar la integración.

La primera versión no debe centrarse en apuestas automáticas ni en prometer predicciones ganadoras. El objetivo inicial es crear una **base de datos fiable y trazable**, con estadísticas descriptivas y capacidad futura para modelos predictivos.

---

## 2. Resultado esperado

Al finalizar el proyecto debe existir:

1. Un sistema automático que descubra e importe jornadas hípicas.
2. Una base histórica normalizada.
3. Un sistema de conciliación de nombres e identidades.
4. Una API REST protegida y documentada.
5. Un panel de análisis de rendimiento.
6. Un proceso de actualización y corrección de resultados.
7. Trazabilidad completa de las fuentes.
8. Monitorización de fallos de scraping e ingestión.
9. Pruebas automáticas.
10. Documentación de despliegue e integración.
11. Un conector sencillo para unir esta plataforma con la herramienta externa.

---

## 3. Fuentes de datos candidatas

### 3.1. El Grandatero — fuente principal candidata

#### Resultados históricos

Patrón observado:

```text
https://elgrandatero.com.ve/resultados-hipicos/{YYYY-MM-DD}/{hipodromo}
```

Ejemplos:

```text
https://elgrandatero.com.ve/resultados-hipicos/2026-07-26/la-rinconada
https://elgrandatero.com.ve/resultados-hipicos/2026-07-19/la-rinconada
https://elgrandatero.com.ve/resultados-hipicos/2026-05-31/la-rinconada
https://elgrandatero.com.ve/resultados-hipicos/2026-02-15/la-rinconada
```

Datos potencialmente extraíbles:

- Fecha.
- Hipódromo.
- Número de carrera.
- Estado de la carrera.
- Ejemplar ganador.
- Número de programa.
- Orden de llegada del primero al quinto.
- Jinete.
- Dividendos.
- Retirados.
- Carreras válidas para el 5y6.
- Hora y última actualización.
- Mejor dividendo de la jornada.
- Navegación hacia jornada anterior y siguiente.

#### Retrospectos

```text
https://elgrandatero.com.ve/retrospectos-hipicos
```

Datos potencialmente extraíbles:

- Reunión o jornada.
- Número de carrera.
- Hora programada.
- Inscritos.
- Número de programa.
- Caballo.
- Jinete.
- Entrenador.
- Peso.
- Posibles datos de historial.
- Pronósticos o marcas editoriales, que deben almacenarse separadamente de los datos oficiales.

#### Estadísticas hípicas

```text
https://elgrandatero.com.ve/estadisticas-hipicas/hipodromo/la-rinconada
```

Datos potencialmente extraíbles:

- Ranking de entrenadores.
- Carreras disputadas.
- Victorias.
- Efectividad.
- Posibles rankings de jinetes, studs, haras o ejemplares.
- Periodo o meeting al que pertenecen los datos.

#### Datos y pronósticos

```text
https://elgrandatero.com.ve/datos-hipicos
```

Debe considerarse una fuente editorial, no oficial.

Datos potenciales:

- Pronósticos.
- Fijos.
- Superfijos.
- Batacazos.
- Marcas por carrera.
- Recomendaciones.
- Autor.
- Fecha de publicación.

Estos datos pueden ser útiles para construir posteriormente métricas como:

- Precisión histórica del pronosticador.
- Retorno teórico.
- Porcentaje de aciertos.
- Rendimiento de favoritos editoriales.

No deben mezclarse con resultados oficiales.

#### Endpoint JSON detectado

```text
https://elgrandatero.com.ve/api_deportes_en_vivo_v2.php
```

El endpoint observado devuelve JSON estructurado, pero actualmente corresponde a deportes como MLB, no a resultados hípicos.

Su existencia demuestra que el sitio utiliza endpoints PHP internos. El agente debe inspeccionar las páginas hípicas para localizar endpoints equivalentes.

No se debe asumir que este endpoint contiene carreras de caballos.

---

### 3.2. Instituto Nacional de Hipódromos — fuente oficial y de validación

#### Portal principal

```text
https://apuestas.inh.gob.ve/
```

#### Estadísticas oficiales

```text
https://apuestas.inh.gob.ve/estadisticas
```

Datos potenciales:

- Rankings oficiales por meeting.
- Jinetes.
- Entrenadores.
- Haras.
- Studs.
- Victorias.
- Periodos oficiales.

#### Hipismo nacional

```text
https://apuestas.inh.gob.ve/apuestas/nacional
```

Datos potenciales:

- Programación.
- Carreras nacionales.
- Tipos de apuestas.
- Información en vivo.
- La Rinconada.
- Valencia.
- Resultados o estados actuales, si se encuentran endpoints internos.

#### Reglamento y definiciones oficiales

```text
https://apuestas.inh.gob.ve/politicas/reglas-apuestas-hipicas-nacionales
```

Uso recomendado:

- Validar terminología.
- Validar significado de orden oficial.
- Identificar hipódromos reconocidos.
- Documentar reglas de dividendos y 5y6.

El INH debe utilizarse como fuente oficial de contraste, aunque su histórico visible puede ser menos accesible o consistente.

---

### 3.3. Meridiano — fuente secundaria de validación

Sección:

```text
https://meridiano.net/hipismo
```

Patrones de artículos:

```text
https://meridiano.net/hipismo/asi-quedaron-los-resultados-de-las-carreras-en-la-rinconada-{fecha-o-id}
```

Datos potencialmente disponibles:

- Posición.
- Ejemplar.
- Número.
- Peso.
- Jinete.
- Entrenador.
- Distancia.
- Tiempo final.
- Dividendos de ganador.
- Placé.
- Exacta.
- Trifecta.
- Superfecta.
- Doble perfecta.
- Resultados del 5y6.
- Comentarios de la jornada.

Esta fuente puede complementar campos que no estén presentes en El Grandatero, especialmente:

- Distancia.
- Tiempo final.
- Peso.
- Entrenador.
- Dividendos de combinaciones.

No debe ser la única fuente porque el formato editorial puede cambiar.

---

### 3.4. Líder en Deportes — respaldo adicional

Buscar y evaluar:

```text
https://www.liderendeportes.com/
```

Secciones y artículos relacionados con:

- Hipismo.
- Resultados de La Rinconada.
- Resultados de Valencia.
- Dividendos.
- Carreras clásicas.
- Jinetes y entrenadores.

Uso propuesto:

- Validación cruzada.
- Recuperación de campos ausentes.
- Confirmación manual de jornadas con discrepancias.

---

### 3.5. Hipismo.net — fuente histórica candidata

```text
https://hipismo.net/
```

Evaluar disponibilidad de:

- Noticias.
- Resultados.
- Información de Caracas.
- Información de Valencia.
- Archivos históricos.
- Pronósticos.
- Datos de cría.

Debe analizarse su estructura, profundidad histórica y condiciones de acceso antes de incorporarlo.

---

## 4. Investigación inicial obligatoria

Antes de programar scrapers definitivos, el agente debe realizar una fase de descubrimiento.

### 4.1. Inspección de red

Utilizar DevTools, Playwright o Puppeteer para registrar solicitudes `Fetch/XHR` al:

- Cambiar la fecha.
- Cambiar el hipódromo.
- Cambiar la carrera.
- Abrir resultados.
- Abrir retrospectos.
- Abrir estadísticas.
- Consultar retirados.
- Consultar 5y6.
- Navegar entre jornadas.

Registrar para cada endpoint:

- URL.
- Método HTTP.
- Parámetros.
- Headers necesarios.
- Cookies.
- Respuesta.
- Content-Type.
- Frecuencia de actualización.
- Código de estado.
- Necesidad de JavaScript.
- Existencia de paginación.
- Comportamiento ante fechas sin carreras.

### 4.2. Inventario de endpoints

Crear un documento:

```text
docs/source-endpoints.md
```

Con una tabla:

| Fuente | Endpoint | Método | Parámetros | Tipo | Autenticación | Uso |
|---|---|---:|---|---|---|---|
| El Grandatero | por descubrir | GET | fecha, hipódromo | JSON | ninguna/cookie | resultados |
| El Grandatero | por descubrir | GET | carrera | JSON/HTML | por validar | retrospectos |
| INH | por descubrir | GET | meeting | JSON/HTML | por validar | estadísticas |

### 4.3. Evaluación legal y operativa

Revisar:

- Términos de uso.
- `robots.txt`.
- Restricciones de reproducción.
- Derechos sobre fotografías, logotipos y textos.
- Posibilidad de almacenar datos factuales.
- Frecuencia razonable de consulta.
- Contacto con el proveedor para autorización si el producto se comercializará.

No descargar ni republicar imágenes, artículos o textos completos salvo autorización.

---

## 5. Estrategia de ingesta

Usar el siguiente orden de preferencia:

1. Endpoint JSON interno estable.
2. HTML renderizado en servidor.
3. HTML procesado con navegador headless.
4. Fuente secundaria para completar campos.
5. Revisión manual para discrepancias.

### 5.1. Principios

- No consultar las fuentes en cada petición de usuario.
- Importar y almacenar los datos localmente.
- Respetar límites de frecuencia.
- Incorporar reintentos con backoff.
- Usar User-Agent identificable.
- Mantener caché.
- Detectar cambios de estructura.
- Guardar el payload original.
- Calcular hash del payload.
- Permitir reprocesamiento sin volver a descargar.
- Hacer la ingesta idempotente.

### 5.2. Estados de ingesta

```text
DISCOVERED
FETCHED
PARSED
NORMALIZED
VALIDATED
PUBLISHED
FAILED
QUARANTINED
```

### 5.3. Correcciones posteriores

Los resultados pueden actualizarse después de la carrera.

Implementar:

- Primera captura al terminar la jornada.
- Segunda verificación unas horas después.
- Verificación al día siguiente.
- Comparación de hashes.
- Historial de versiones.
- Registro de cambios en posiciones, dividendos o retirados.
- Estado `OFFICIAL`, `PROVISIONAL`, `CORRECTED` o `UNKNOWN`.

---

## 6. Arquitectura propuesta

```text
Fuentes externas
    |
    v
Source adapters / Scrapers
    |
    v
Raw ingestion storage
    |
    v
Parser + normalizador
    |
    v
Motor de conciliación de identidades
    |
    v
Validación cruzada
    |
    v
PostgreSQL
    |
    +-------------------+
    |                   |
    v                   v
API REST            Motor analítico
    |                   |
    +---------+---------+
              |
              v
       Herramienta externa
```

### Componentes

#### `source-discovery`

- Inspecciona páginas.
- Descubre fechas y jornadas.
- Detecta nuevos enlaces.
- Encuentra endpoints internos.

#### `source-adapters`

Un adaptador independiente por fuente:

```text
ElGrandateroAdapter
INHAdapter
MeridianoAdapter
LiderAdapter
HipismoNetAdapter
```

Interfaz sugerida:

```typescript
interface RacingSourceAdapter {
  discoverMeetings(range: DateRange): Promise<DiscoveredMeeting[]>;
  fetchMeeting(sourceRef: SourceReference): Promise<RawSourcePayload>;
  parseMeeting(payload: RawSourcePayload): Promise<ParsedMeeting>;
  fetchRaceDetails?(sourceRef: SourceReference): Promise<RawSourcePayload>;
}
```

#### `normalization-service`

- Normaliza nombres.
- Convierte números decimales con coma.
- Convierte fechas y horas.
- Estandariza unidades.
- Mapea hipódromos.
- Mapea tipos de dividendos.
- Elimina ruido editorial sin perder el payload original.

#### `identity-resolution`

Debe resolver variantes como:

```text
J. Aray
J ARAY
JOSÉ ARAY
ARAY J
```

y:

```text
SIZZLE
SIZZLE (USA)
Sizzle Usa
```

No fusionar automáticamente entidades dudosas. Usar puntuación de similitud y cola de revisión.

#### `validation-service`

Reglas mínimas:

- Una carrera no puede tener dos posiciones oficiales iguales.
- Un participante retirado no debe aparecer como ganador.
- El ganador debe estar inscrito.
- Distancia y tiempo deben tener formatos válidos.
- Los dividendos no pueden ser negativos.
- La fecha de la carrera debe pertenecer a la reunión.
- El número de programa debe ser único dentro de una carrera.
- Las discrepancias entre fuentes deben quedar registradas.

#### `analytics-service`

Calcula métricas derivadas y agregados.

#### `public-api`

Expone resultados y análisis a la herramienta externa.

#### `admin-console`

Permite:

- Ver errores.
- Revisar discrepancias.
- Fusionar identidades.
- Separar entidades fusionadas incorrectamente.
- Reprocesar payloads.
- Aprobar resultados.
- Revisar calidad de fuentes.

---

## 7. Modelo de datos

### Entidades principales

```text
sources
source_pages
source_payloads
ingestion_runs
parse_errors
hippodromes
seasons
meetings
races
horses
horse_aliases
jockeys
jockey_aliases
trainers
trainer_aliases
owners
studs
breeders
race_entries
race_results
race_dividends
withdrawals
predictions
prediction_authors
source_assertions
entity_merge_reviews
data_quality_issues
```

### `sources`

```text
id
code
name
base_url
priority
source_type
is_official
is_active
created_at
updated_at
```

### `source_payloads`

```text
id
source_id
source_url
http_status
content_type
payload_hash
raw_payload
retrieved_at
parser_version
processing_status
error_message
```

Para payloads grandes puede guardarse el contenido en S3 y conservar en PostgreSQL:

```text
storage_key
payload_hash
metadata
```

### `hippodromes`

```text
id
slug
name
city
country_code
timezone
active
```

### `meetings`

```text
id
hippodrome_id
meeting_date
season_id
meeting_number
status
source_confidence
created_at
updated_at
```

Restricción:

```text
UNIQUE (hippodrome_id, meeting_date)
```

### `races`

```text
id
meeting_id
race_number
name
scheduled_at
started_at
distance_meters
surface
track_condition
category
grade
sex_restriction
age_restriction
status
official_time_ms
source_confidence
```

Restricción:

```text
UNIQUE (meeting_id, race_number)
```

### `horses`

```text
id
canonical_name
normalized_name
country_code
sex
birth_date
birth_year
sire
dam
breeder_id
external_reference
identity_status
```

### `race_entries`

```text
id
race_id
horse_id
program_number
starting_gate
jockey_id
trainer_id
owner_id
stud_id
assigned_weight_kg
actual_weight_kg
odds
is_favorite
is_withdrawn
withdrawal_reason
```

Restricción:

```text
UNIQUE (race_id, program_number)
```

### `race_results`

```text
id
race_entry_id
finish_position
official_position
finish_time_ms
margin
status
is_disqualified
is_dead_heat
source_confidence
```

### `race_dividends`

```text
id
race_id
bet_type
combination
amount
currency
official
source_id
```

Tipos sugeridos:

```text
WIN
PLACE
SHOW
EXACTA
TRIFECTA
SUPERFECTA
DOBLE
DOBLE_PERFECTA
TRIPLE
POOL_4
FIVE_AND_SIX
LOTO_HIPICO
OTHER
```

### `source_assertions`

Permite registrar qué fuente afirmó cada dato:

```text
id
entity_type
entity_id
field_name
field_value
source_payload_id
confidence
observed_at
```

Esto facilita resolver discrepancias.

---

## 8. Métricas de rendimiento

### Caballos

- Carreras disputadas.
- Victorias.
- Segundos lugares.
- Terceros lugares.
- Podios.
- Porcentaje de victoria.
- Porcentaje de podio.
- Últimas 5 y 10 actuaciones.
- Posición media.
- Rendimiento por distancia.
- Rendimiento por hipódromo.
- Rendimiento por superficie.
- Rendimiento por condición de pista.
- Rendimiento con cada jinete.
- Rendimiento con cada entrenador.
- Tiempo normalizado por distancia.
- Días de descanso.
- Evolución de forma.
- Retorno teórico apostando una unidad.
- Rendimiento cuando es favorito.

### Jinetes

- Participaciones.
- Victorias.
- Podios.
- Efectividad.
- Rendimiento por distancia.
- Rendimiento por entrenador.
- Rendimiento por caballo.
- Rendimiento por hipódromo.
- Retorno teórico.
- Tendencia reciente.

### Entrenadores

- Participaciones.
- Victorias.
- Podios.
- Efectividad.
- Rendimiento por caballo.
- Rendimiento por jinete.
- Rendimiento por distancia.
- Rendimiento por meeting.
- Tendencia reciente.

### Combinaciones

- Jinete + entrenador.
- Caballo + jinete.
- Caballo + entrenador.
- Stud + entrenador.
- Haras + descendencia.
- Número de programa + distancia.
- Favorito + jinete.
- Cambios de jinete.

### Calidad de pronosticadores

Para fuentes editoriales:

- Selecciones realizadas.
- Ganadores acertados.
- Podios acertados.
- Precisión.
- Retorno teórico.
- Rendimiento por hipódromo.
- Rendimiento por tipo de recomendación.
- Comparación frente a baseline de favoritos.

---

## 9. API REST

Base:

```text
/api/v1
```

### Salud

```http
GET /health
GET /ready
```

### Hipódromos

```http
GET /api/v1/hippodromes
GET /api/v1/hippodromes/{id}
```

### Reuniones

```http
GET /api/v1/meetings
GET /api/v1/meetings?date=2026-07-26
GET /api/v1/meetings?from=2026-01-01&to=2026-07-26
GET /api/v1/meetings?hippodrome=la-rinconada
GET /api/v1/meetings/{meetingId}
GET /api/v1/meetings/{meetingId}/races
```

### Carreras

```http
GET /api/v1/races/{raceId}
GET /api/v1/races/{raceId}/entries
GET /api/v1/races/{raceId}/results
GET /api/v1/races/{raceId}/dividends
GET /api/v1/races/{raceId}/sources
```

### Caballos

```http
GET /api/v1/horses
GET /api/v1/horses/search?q=sizzle
GET /api/v1/horses/{horseId}
GET /api/v1/horses/{horseId}/performances
GET /api/v1/horses/{horseId}/statistics
```

### Jinetes

```http
GET /api/v1/jockeys
GET /api/v1/jockeys/{jockeyId}
GET /api/v1/jockeys/{jockeyId}/performances
GET /api/v1/jockeys/{jockeyId}/statistics
```

### Entrenadores

```http
GET /api/v1/trainers
GET /api/v1/trainers/{trainerId}
GET /api/v1/trainers/{trainerId}/performances
GET /api/v1/trainers/{trainerId}/statistics
```

### Rankings

```http
GET /api/v1/rankings/horses
GET /api/v1/rankings/jockeys
GET /api/v1/rankings/trainers
GET /api/v1/rankings/combinations
```

### Analítica

```http
GET /api/v1/analytics/form/{horseId}
GET /api/v1/analytics/jockey-trainer
GET /api/v1/analytics/distance-performance
GET /api/v1/analytics/source-quality
```

### Administración

```http
POST /api/v1/admin/ingestion-runs
POST /api/v1/admin/ingestion-runs/{id}/retry
GET  /api/v1/admin/data-quality/issues
PATCH /api/v1/admin/data-quality/issues/{id}
POST /api/v1/admin/entities/merge
POST /api/v1/admin/entities/split
```

### Requisitos de API

- OpenAPI 3.1.
- Swagger UI.
- Versionado.
- Paginación.
- Ordenación.
- Filtros.
- Rate limiting.
- API keys u OAuth2 client credentials.
- Correlation ID.
- Errores consistentes.
- Fechas ISO 8601.
- UTC internamente.
- Zona horaria del hipódromo en la respuesta.
- ETag o `Last-Modified` para endpoints históricos.
- Campos de procedencia y confianza.

Ejemplo:

```json
{
  "raceId": "uuid",
  "meetingDate": "2026-07-26",
  "hippodrome": {
    "slug": "la-rinconada",
    "name": "Hipódromo Internacional La Rinconada"
  },
  "raceNumber": 1,
  "distanceMeters": 1200,
  "officialTimeMs": 74300,
  "status": "OFFICIAL",
  "results": [],
  "provenance": {
    "primarySource": "el-grandatero",
    "validatedBy": ["meridiano"],
    "confidence": 0.96,
    "lastVerifiedAt": "2026-07-27T05:00:00Z"
  }
}
```

---

## 10. Integración con la otra herramienta

Crear un módulo cliente independiente:

```text
packages/racing-api-client
```

Debe incluir:

- Cliente TypeScript.
- DTOs generados desde OpenAPI.
- Manejo de autenticación.
- Reintentos.
- Timeouts.
- Circuit breaker opcional.
- Caché local opcional.
- Mocks para desarrollo.
- Ejemplos de integración.

La integración no debe consultar tablas directamente. Debe utilizar la API o eventos definidos.

### Opciones de integración

#### Opción A — API REST

Recomendada para la primera versión.

#### Opción B — Eventos

Para actualizaciones:

```text
meeting.discovered
meeting.ingested
race.result.provisional
race.result.official
race.result.corrected
analytics.updated
```

Puede utilizarse posteriormente:

- Amazon EventBridge.
- SNS/SQS.
- Kafka.
- RabbitMQ.

#### Opción C — Exportación programada

```text
s3://bucket/exports/YYYY-MM-DD/
```

Archivos:

```text
meetings.json
races.json
results.json
statistics.json
```

---

## 11. Stack técnico recomendado

### Backend

Una de estas alternativas:

#### Alternativa TypeScript

- Node.js.
- TypeScript.
- NestJS o Fastify.
- Playwright.
- Cheerio.
- Zod.
- Prisma o Drizzle ORM.
- PostgreSQL.
- BullMQ si se utiliza Redis.

#### Alternativa Python

- Python 3.12+.
- FastAPI.
- Pydantic.
- SQLAlchemy.
- Alembic.
- Playwright.
- BeautifulSoup/lxml.
- Celery o Dramatiq.

Para un sistema intensivo en scraping y análisis, Python ofrece un ecosistema muy conveniente. Para integrarse con una plataforma TypeScript existente, NestJS/Fastify puede reducir fricción. La decisión debe basarse en el stack de la herramienta con la que se integrará.

### Base de datos

- PostgreSQL.
- Índices `btree`.
- Índices trigram para búsqueda de nombres.
- `pg_trgm`.
- Vistas materializadas para rankings.
- Particionado por año solo cuando el volumen lo justifique.

### Caché y colas

MVP:

- PostgreSQL como cola simple con `FOR UPDATE SKIP LOCKED`.

Escala posterior:

- Redis.
- SQS.
- BullMQ/Celery.

### Scraping

- `fetch`/HTTP client para endpoints JSON.
- Cheerio o BeautifulSoup para HTML.
- Playwright solo cuando el contenido dependa de JavaScript.
- Fixtures HTML/JSON para pruebas de regresión.

---

## 12. Infraestructura AWS sugerida

### MVP de bajo coste

```text
Route 53
   |
CloudFront opcional
   |
Application Load Balancer opcional
   |
ECS Fargate o EC2
   |
PostgreSQL RDS
   |
S3 para payloads y exportaciones
```

Para reducir costes iniciales:

- Una instancia EC2 pequeña o ECS Fargate con tareas programadas.
- RDS PostgreSQL de tamaño pequeño.
- S3 para payloads crudos.
- EventBridge Scheduler para ejecutar ingestas.
- CloudWatch Logs y alarmas.
- Secrets Manager o SSM Parameter Store.
- ECR para imágenes Docker.

### Servicios

#### Compute

- ECS Fargate o EC2.
- Contenedores separados:
  - API.
  - Worker de ingesta.
  - Worker analítico.
  - Panel administrativo opcional.

#### Programación

- EventBridge Scheduler.
- Ejecución:
  - Descubrimiento diario.
  - Captura previa a la jornada.
  - Actualización durante jornadas.
  - Verificación posterior.
  - Reconciliación nocturna.

#### Base de datos

- Amazon RDS PostgreSQL.
- Cifrado KMS.
- Backups.
- Subred privada.
- Security Group restringido.
- No exponer 5432 públicamente.

#### Almacenamiento

S3:

```text
raw/
parsed/
exports/
dead-letter/
fixtures/
```

Activar:

- Versionado.
- Cifrado.
- Lifecycle.
- Bloqueo de acceso público.

#### Secretos

- AWS Systems Manager Parameter Store SecureString o Secrets Manager.
- Nunca guardar secretos en repositorio.

#### Observabilidad

- CloudWatch Logs.
- Métricas personalizadas.
- Alarmas SNS.
- AWS X-Ray u OpenTelemetry opcional.

Alarmas mínimas:

- Fallo de ingesta.
- Cero reuniones descubiertas en un día esperado.
- Cambio de estructura del scraper.
- Aumento de errores HTTP.
- Fuente bloqueando solicitudes.
- Cola acumulada.
- API con errores 5xx.
- Latencia elevada.
- Base de datos sin espacio.
- Backup fallido.

---

## 13. Seguridad

- API privada o protegida por API key/OAuth2.
- TLS obligatorio.
- Rate limiting.
- WAF opcional.
- Validación estricta de entradas.
- SSRF protection en scrapers.
- Lista permitida de dominios.
- Timeouts.
- Límite de tamaño de respuesta.
- No ejecutar JavaScript externo fuera del navegador aislado.
- Contenedores sin privilegios.
- Dependencias escaneadas.
- SAST.
- Secret scanning.
- Auditoría de acciones administrativas.
- Backups cifrados.
- Principio de mínimo privilegio IAM.

---

## 14. Calidad y pruebas

### Unitarias

- Parsers.
- Normalizadores.
- Conversión de dividendos.
- Conversión de tiempos.
- Conciliación de nombres.
- Reglas de validación.

### Fixtures

Guardar ejemplos reales, sin contenido innecesario:

```text
test/fixtures/elgrandatero/
test/fixtures/inh/
test/fixtures/meridiano/
```

### Contract tests

Verificar que:

- Los selectores siguen existiendo.
- El endpoint mantiene los campos esperados.
- Las estructuras JSON no han cambiado.

### Integración

- Ingesta completa.
- Persistencia.
- Reprocesamiento.
- Idempotencia.
- Corrección de una jornada.
- Validación entre fuentes.

### End-to-end

- Descubrir jornada.
- Importar resultados.
- Consultar API.
- Ver estadísticas.
- Consumir desde el cliente de integración.

### Datos de prueba

Incluir al menos:

- Jornada normal.
- Carrera con retirados.
- Empate.
- Descalificación.
- Campo faltante.
- Dividendo no disponible.
- Resultado corregido.
- Diferencia entre fuentes.
- Fecha sin jornada.
- Nombre ambiguo.

---

## 15. Observabilidad y trazabilidad

Cada proceso debe registrar:

```text
correlation_id
source
source_url
meeting_date
hippodrome
race_number
ingestion_run_id
parser_version
payload_hash
duration_ms
status
error_code
```

Métricas:

- Reuniones descubiertas.
- Carreras importadas.
- Participantes importados.
- Errores por fuente.
- Cambios detectados.
- Entidades pendientes de conciliación.
- Campos ausentes.
- Discrepancias.
- Tiempo medio de ingestión.
- Frescura de los datos.

---

## 16. Plan de ejecución

### Fase 0 — Descubrimiento

- Inspeccionar fuentes.
- Documentar endpoints.
- Revisar legalidad.
- Obtener ejemplos.
- Determinar profundidad histórica.
- Preparar matriz de campos por fuente.

Entrega:

```text
docs/source-assessment.md
docs/source-endpoints.md
docs/legal-and-usage-notes.md
```

### Fase 1 — MVP de ingesta

- El Grandatero como fuente principal.
- La Rinconada.
- Resultados históricos.
- Persistencia de payloads.
- Parser.
- Modelo mínimo.
- Proceso idempotente.

### Fase 2 — Validación

- Integrar Meridiano.
- Comparar resultados.
- Registrar discrepancias.
- Añadir INH para rankings oficiales.

### Fase 3 — Identidades

- Caballos.
- Jinetes.
- Entrenadores.
- Alias.
- Revisión manual.
- Merge y split.

### Fase 4 — API

- Endpoints principales.
- OpenAPI.
- Autenticación.
- Paginación.
- Cliente TypeScript/Python.

### Fase 5 — Analítica

- Métricas de rendimiento.
- Rankings.
- Tendencia reciente.
- Combinaciones.
- Vistas materializadas.

### Fase 6 — Panel

- Estado de ingestas.
- Búsqueda.
- Perfiles.
- Comparaciones.
- Revisión de discrepancias.

### Fase 7 — Integración externa

- SDK.
- Autenticación.
- Ejemplos.
- Pruebas end-to-end.
- Contrato de integración.

### Fase 8 — Modelos predictivos opcionales

Solo después de evaluar:

- Cobertura histórica.
- Calidad.
- Sesgos.
- Campos disponibles.
- Baselines.
- Backtesting temporal.

---

## 17. Criterios de aceptación

El proyecto se considerará listo cuando:

- Importe automáticamente jornadas históricas y recientes.
- No duplique datos al reprocesar.
- Mantenga payloads originales.
- Registre la fuente de cada campo relevante.
- Detecte cambios de estructura.
- Exponga resultados por fecha, hipódromo y carrera.
- Exponga perfiles de caballos, jinetes y entrenadores.
- Calcule métricas verificables.
- Permita revisar discrepancias.
- Tenga OpenAPI.
- Tenga autenticación.
- Tenga pruebas automáticas.
- Tenga despliegue reproducible.
- Tenga logs, métricas y alarmas.
- Incluya un SDK o cliente para la herramienta externa.
- Incluya documentación de operación y recuperación.

---

## 18. Restricciones importantes

- No asumir que un endpoint público es una API oficial.
- No depender de una única fuente.
- No mezclar pronósticos editoriales con resultados oficiales.
- No identificar entidades solamente por el nombre visible.
- No descartar payloads originales.
- No publicar imágenes o textos protegidos sin autorización.
- No consultar las fuentes por cada petición del usuario.
- No iniciar modelos predictivos antes de medir calidad y cobertura.
- No presentar probabilidades como certezas.
- No automatizar apuestas dentro del alcance inicial.

---

## 19. Entregables solicitados al agente

1. Repositorio organizado.
2. Arquitectura documentada.
3. Inventario de fuentes y endpoints.
4. Docker Compose para desarrollo.
5. Migraciones de base de datos.
6. Scrapers/adaptadores.
7. Workers de ingesta.
8. Normalización.
9. Conciliación de identidades.
10. Validación cruzada.
11. API REST.
12. OpenAPI.
13. Panel administrativo mínimo.
14. Métricas de rendimiento.
15. Pruebas.
16. CI/CD.
17. Terraform o IaC equivalente.
18. Monitorización.
19. Manual de despliegue.
20. Manual de integración.
21. SDK o cliente de consumo.
22. Informe de campos disponibles y ausentes.
23. Lista de riesgos y deuda técnica.
24. Backlog para la fase predictiva.

---

## 20. Instrucción maestra para el agente

Implementa una plataforma de datos hípicos venezolanos siguiendo esta especificación.

Comienza por una fase de descubrimiento técnico de las fuentes. No programes selectores definitivos hasta identificar si las páginas consumen endpoints JSON internos. Prioriza endpoints estructurados; utiliza scraping HTML como respaldo y navegador headless únicamente cuando sea imprescindible.

Construye el sistema con arquitectura modular por adaptadores de fuente, ingesta idempotente, almacenamiento de payloads originales, normalización, conciliación de identidades, validación cruzada y trazabilidad por campo.

La primera cobertura debe incluir La Rinconada y, cuando las fuentes lo permitan, Valencia. Implementa resultados, retrospectos, participantes, jinetes, entrenadores, retirados, distancias, tiempos y dividendos.

Expón los datos mediante una API REST versionada con OpenAPI, autenticación, filtros, paginación y campos de procedencia. Añade métricas descriptivas para caballos, jinetes, entrenadores y combinaciones.

Prepara un cliente reutilizable para conectar esta plataforma con otra herramienta. No acoples ambas aplicaciones mediante acceso directo a la base de datos.

Incluye Docker, migraciones, pruebas, CI/CD, infraestructura como código, logs estructurados, métricas, alarmas, backups y documentación operativa.

Antes de finalizar cada fase:

1. Ejecuta pruebas.
2. Revisa seguridad.
3. Revisa idempotencia.
4. Revisa calidad de datos.
5. Documenta decisiones.
6. Registra limitaciones.
7. Actualiza el backlog.
8. Realiza commits pequeños y descriptivos.

No implementes apuestas automáticas. No presentes modelos predictivos hasta disponer de suficiente profundidad histórica, campos explicativos y un backtesting temporal válido.


---

## Actualización de arquitectura — Estadísticas oficiales del INH

Tras revisar con mayor detalle el portal de estadísticas del INH, se incorpora como **fuente oficial de datos maestros**, diferenciando claramente entre resultados de carreras y estadísticas acumuladas.

### Portal de estadísticas

```text
https://apuestas.inh.gob.ve/estadisticas
```

### Rol dentro de la arquitectura

El sistema deberá separar las fuentes en dos categorías:

### A. Datos transaccionales (cada carrera)

Fuentes principales:

- El Grandatero
- Meridiano
- Líder en Deportes

Información obtenida:

- Resultados oficiales
- Participantes
- Orden de llegada
- Dividendos
- Retirados
- Tiempos
- Distancias
- Retrospectos
- Pronósticos editoriales (almacenados por separado)

### B. Datos maestros oficiales

Fuente principal:

- Portal de Estadísticas del INH

Información objetivo:

- Rankings oficiales de jinetes
- Rankings oficiales de entrenadores
- Rankings oficiales de studs
- Rankings oficiales de haras
- Estadísticas por meeting
- Estadísticas por hipódromo
- Evolución durante la temporada

Estas estadísticas deben considerarse la referencia oficial para métricas acumuladas, mientras que los resultados individuales seguirán obteniéndose principalmente de las fuentes históricas.

### Nuevo módulo

Implementar un servicio independiente:

```text
OfficialRankingsService
```

Responsabilidades:

- Descubrir rankings disponibles.
- Importar estadísticas oficiales.
- Detectar cambios entre meetings.
- Mantener histórico completo.
- Registrar procedencia y fecha de captura.
- Comparar evolución de cada entidad.

### Nuevas entidades

Agregar al modelo:

```text
meetings
meeting_statistics
meeting_jockey_statistics
meeting_trainer_statistics
meeting_stud_statistics
meeting_haras_statistics
```

Cada tabla deberá almacenar la evolución histórica por meeting y temporada.

### Nuevas métricas

El motor analítico deberá poder responder consultas como:

- Evolución de un jinete por meeting.
- Evolución de un entrenador.
- Evolución de un stud.
- Evolución de un haras.
- Comparación entre temporadas.
- Tendencias de crecimiento o descenso.
- Ranking histórico.
- Mejor y peor meeting.

### Rating compuesto

Diseñar el modelo de datos para permitir un sistema de rating futuro basado en:

- Historial del caballo.
- Rendimiento del jinete.
- Rendimiento del entrenador.
- Rendimiento del stud.
- Rendimiento del haras.
- Distancia.
- Hipódromo.
- Forma reciente.
- Variables adicionales disponibles.

No implementar el algoritmo en esta fase, pero dejar preparada la arquitectura para incorporarlo posteriormente.

