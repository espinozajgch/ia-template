# Tools — Catálogo de Endpoints, Tools del Agente y Operaciones

> Regenerado por auditoría B.L.A.S.T.: 2026-07-19
> Añade el catálogo de **tools del agente LLM** y los endpoints del Smart Searcher / Recomendador.

---

## API Base

- Base frontend: `/api` (rutas relativas; en prod tras Nginx :443 HTTPS)
- Healthcheck: `GET /api/health` — devuelve `{ ok, version, commit, uptime, time }` (OBS-03)
- Auth: `Authorization: Bearer <token>` (JWT); refresh vía cookie
- Cliente frontend: `client/src/api/client.ts`
- Routers backend: `server/src/routes/*`

---

## Tools del Agente LLM (Smart Searcher)

Definidas en [`server/src/lib/recommender/agentTools.ts`](../server/src/lib/recommender/agentTools.ts).
El LLM decide **cuándo** llamarlas; el ejecutor (`makeAgentRunTool`) las corre con la
**visibilidad del usuario** (permisos + género + cross-permissions) y reusa el pipeline
determinista (features + ranking). Todas son **solo-lectura**. Loop agéntico acotado a
`MAX_TOOL_ITERS = 4`.

| Tool | Propósito | Input (schema JSON) | Output (string JSON) |
|---|---|---|---|
| `buscar_jugadores` | Buscar/recomendar/comparar jugadores por criterios | `posicion, genero, edadMin/Max/Target, pie, alturaTarget, ratingMin, soloDisponibles, limite` | `{ total, evaluados, jugadores[] }` |
| `buscar_similares_a_jugador` | Similares a un jugador de referencia (modo plantilla) | `nombreJugador*, excluirNacionalidad, soloDisponibles, limite` | `{ base, total, evaluados, jugadores[] }` |
| `buscar_para_necesidad` | Jugadores que encajan con una necesidad abierta de un club | `club, pais, posicion` | `{ necesidad, jugadores[] }` ó `{ necesidades[] }` (desambiguación) |

- Límite de resultados al LLM: `AGENT_SEARCH_LIMIT = 8`, tope duro `AGENT_SEARCH_HARD = 15`.
- Contrato con el LLM: `runTool` **siempre** devuelve un string JSON; un fallo se serializa
  como `{ error }` para que el agente lo comunique en vez de romperse.
- El ranking lo calcula `rankCandidates` (determinista); el LLM solo redacta.

---

## Funciones del cliente LLM

`server/src/lib/llm/client.ts`:

| Función | Uso |
|---|---|
| `getLlmConfig()` / `isLlmEnabled()` | Config y gate de la feature de chat |
| `getEmbedConfig()` / `isEmbedEnabled()` | Config y gate de embeddings |
| `llmExtractJson(system, user)` | NL → JSON (1 turno), validado con Zod por el caller |
| `llmChat(system, messages)` | Chat multi-turno → texto |
| `llmAgentChat(system, messages, tools, runTool)` | Chat con tool-use → `{ text, invocations }` |
| `llmEmbed(texts)` | Vectoriza textos (embeddings) |

---

## Endpoints Smart Searcher (Mercado)

`server/src/routes/mercado/smartSearcher.ts` — todos `requireAuth`, owner-scoped:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/mercado/smart-searcher/conversaciones` | Listar conversaciones del usuario |
| POST | `/api/mercado/smart-searcher/conversaciones` | Crear conversación |
| GET | `/api/mercado/smart-searcher/conversaciones/:id` | Mensajes (retomar charla) |
| PATCH | `/api/mercado/smart-searcher/conversaciones/:id` | Renombrar |
| DELETE | `/api/mercado/smart-searcher/conversaciones/:id` | Borrar |
| POST | `/api/mercado/smart-searcher/conversaciones/:id/mensajes` | **Turno de chat** (rate-limited: 20/min/usuario) |
| PATCH | `/api/mercado/smart-searcher/mensajes/:id` | Editar texto de un mensaje (re-embebe) |

Endpoints del recomendador determinista: `server/src/routes/mercado/recomendaciones.ts`
(perfil manual, por jugador plantilla, por necesidad, y parse NL → perfil).

---

## Auth

| Método | Ruta | Auth | Uso |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login username/password (rate-limited) |
| GET | `/api/auth/me` | Sí | Usuario actual desde JWT |
| POST | `/api/auth/change-password` | Sí | Cambiar contraseña propia |

Legacy compat en `compat.ts`: `/api/login`, `/api/me`, `/api/change-password`.

---

## Módulos CRUD

| Módulo | Rutas |
|---|---|
| Usuarios | `/api/users` (admin), `/api/users/public` |
| Futbolistas | `/api/futbolistas`, `/api/futbolistas/:id` |
| Contratos | `/api/contratos`, `/api/contratos/:id` |
| Contactos / Agenda | `/api/contactos`, `/api/eventos`, `/api/eventos/:id/comentarios` |
| Finanzas | `/api/ingresos`, `/api/gastos`, `/api/pagos` |
| Mercado | `/api/busquedas-club`, `/api/ofrecimientos`, `/api/ofertas-entrantes`, `/api/negociaciones-mercado`, `/api/colaboradores-mercado`, `/api/perfiles-dossier`, `/api/intermediaciones` |
| Scouting | `/api/scouts`, `/api/scouting/jugadores`, `/api/scouting/informes-partido`, `/api/scouting/informes-detallados`, `/api/scouting/clubes` |
| Agencia | `/api/agencia` |

Patrón habitual: `GET`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`.
Todo endpoint de lista termina en `.limit(LIST_HARD_CAP)` (AP-67/PERF-02).

---

## Archivos (media)

| Método | Ruta | Resultado |
|---|---|---|
| POST | `/api/upload-image` | Guarda vía `storageService` → `/uploads/...` (local) o `/api/media/...` (S3) |
| POST | `/api/upload-pdf` | Guarda PDF → ruta |

En prod `STORAGE_DRIVER=s3` (bucket `ppsport-media-prod-*`, SSE-S3). El validador
`isSafeUrl` acepta las URLs internas del storage vía `isStorageUrl` (AP-61).

---

## Integraciones externas

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/tasas` | Tasas USD → EUR/BRL (API pública primaria + fallback frankfurter) |

---

## Operaciones de Deploy

| Operación | Comando |
|---|---|
| Build frontend | `cd client && npm run build` |
| Build backend | `cd server && npm run build` |
| Migraciones | `cd server && npm run db:migrate` |
| Reiniciar API | `sudo systemctl restart pptransferhub-api` |
| Validar API | `curl -sf http://127.0.0.1:3001/api/health` |
| Validar Nginx | `sudo nginx -t` |

---

## Reglas de Uso

1. Todo endpoint de datos pasa por `requireAuth`; gestión de usuarios por `requireAdmin`.
2. Las tools del agente corren con la visibilidad del usuario — nunca exponen datos fuera de su scope.
3. El frontend usa rutas relativas para API (`/api`, `/uploads`, `/informes-pdf`).
4. Media fuera de PostgreSQL (S3 en prod, filesystem en dev).
