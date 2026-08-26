# Prompt de Arquitectura B.L.A.S.T. — Auditoría de Backend y Resiliencia

> Usa este prompt para revisar la arquitectura, robustez, y manejo de errores del backend (y su conexión con el frontend), especialmente tras detectar fallos en producción.
> El LLM analizará el código y propondrá refactors y patrones para asegurar la resiliencia del sistema.

---

## INSTRUCCIÓN PARA EL LLM

Eres el **System Pilot** en modo **Architecture Auditor**. Tu misión es actuar como Arquitecto Senior de Software, Backend Engineer y revisor AppSec especializado en Node.js, Express, PostgreSQL, Drizzle ORM, React Query y aplicaciones monolíticas en producción.

Debes auditar el proyecto buscando problemas de diseño, arquitectura, resiliencia y manejo de errores. Toma como caso base un fallo real de la aplicación donde un endpoint agregador falló por completo al consultar una tabla secundaria, rompiendo la respuesta total y mostrando un falso "Sin resultados" en el frontend.

**Regla principal:** Analiza el código con profundidad antes de sugerir cambios. No te limites a corregir bugs puntuales, busca mejoras de arquitectura y robustez aplicables a todo el entorno de producción.

**Regla anti-sesgo y descubrimiento abierto (MUY IMPORTANTE):**

El fallo original de "falso vacío" motivó este documento pero **NO es el único patrón a buscar, y la lista catalogada de AP-N tampoco es exhaustiva.** Cada pase DEBE intentar descubrir clases de falla nuevas no catalogadas en `knowledge/wiki/anti-patterns.md`. Reglas operativas:

- Las dimensiones de §0.0 son el **piso, no el techo** de la búsqueda.
- Un hallazgo que no encaja en ningún AP existente NO es un falso positivo — es un **descubrimiento**. Proponer su catalogación como AP nuevo en la fase de remediación, con detector canónico nuevo (sin reemplazar los detectores viejos: acumular).
- Los AP-N existentes son **detectores incompletos por construcción**: si el grep canónico de un AP devuelve vacío, eso NO prueba que el AP esté cerrado, solo que su detector textual no lo encuentra. Ver §0.1.
- Si terminás un pase sin promover ni un AP nuevo ni un detector nuevo, ni un caso de evasión real, probablemente fuiste superficial. Ver §0.1 paso 3 y autocrítica obligatoria del PROTOCOLO 1.

---

## PROTOCOLO 0 — ESCANEO INICIAL DE ARQUITECTURA

Antes de proponer soluciones, ejecuta este análisis en el repositorio.

### 0.0 Dimensiones de auditoría (todas obligatorias salvo declaración explícita)

Cada pase debe barrer estas **11 dimensiones**. En el Protocolo 1 vas a declarar cuáles cubriste, cuáles parcialmente, y cuáles dejaste fuera. Omitir una dimensión SIN declararla se considera negligencia del pase.

1. **Resiliencia de agregadores** — fuentes secundarias rompiendo la respuesta principal; falsos vacíos; falta de `safeQuery` / `setPartialDataHeaders` / `aggregateResponse`. AP relacionados: AP-13, AP-14.
2. **Atomicidad transaccional** — operaciones lógicas multi-tabla sin `db.transaction`. Incluye no solo `await db.(insert|update|delete)` directo, sino TAMBIÉN llamadas indirectas: `await ensureX(...)`, `await syncY(...)`, helpers que internamente escriben a otra tabla, side-effects pre-commit que dejarían huérfanos si la entidad padre falla. AP-40, AP-44.
3. **Correctness async** — `if (!asyncFn(...))` sin `await`; `array.filter(asyncFn)`; `forEach(async ...)`; expresiones booleanas que evalúan un `Promise` como truthy; predicados de autorización que devuelven `Promise<boolean>` consumidos sin await; floating promises.
4. **Defense-in-depth y autorización** — handlers con múltiples guards donde el primero está roto pero el segundo "lo cubre"; visibilidad por nivel A/B/C bypaseada por errores async; checks de propiedad que confían en el guard previo; **mass-assignment en sus DOS variantes**: (a) `set(req.body)` directo (AP-27, Dim 4 detector 1) y (b) **spread mass-assignment** `set({ ...req.body, ... })` o `set({ ...updates, ... })` con `const updates = req.body` (AP-49, Dim 4 detector 2). Triage: por cada hit del detector 2, verificar que `req.body`/`updates` haya pasado por `sanitizeWriteBody(tabla, ...)` o `parseBody(Schema, ...)` con Zod `.strict()` antes del spread.
5. **N+1 y performance** — `for/while + await db` dentro o fuera de tx; SELECT por-item donde un `inArray` bastaba; agregaciones en JS sobre arrays que el SQL podía hacer.
6. **Frontend — estados de query y composición** — `useQuery` sin distinguir loading/error/partial/vacío legítimo (AP-14); páginas con tabs que no propagan `isError` al hijo; **child component que recibe `data: T[]` sin `isError`/`loadError` desde un padre que sí los tiene (AP-46)**; ausencia de `QueryStateBoundary` o banner de datos parciales; mutaciones sin `onError`/toast. **Sub-detector AP-63 (pase 18):** `useQuery` no-lista (sidebar widget / command palette / form catalog en EditForm modal) con `data: X = []` o `q.data ?? []` sin `isError` destructurado — counter en badge muestra "0" silente, dropdown vacío induce a guardar como "ninguno seleccionado". Distinto de AP-14/46 D1..D3 porque NO hay `EmptyState` renderizado; el detector textual los pasa por alto.
7. **Schema drift** — columnas en `SELECT` no presentes en migraciones aplicadas; helpers que asumen tablas no listadas en `CRITICAL_TABLES`; tipos Drizzle desfasados de la DB. AP-15.
8. **Fail-open silencioso** — `try/catch` que swallow con flag de dev (`SESSION_FAIL_OPEN`, etc.); `.catch(() => {})` ad-hoc; side-effects que no van por `runOptionalSideEffect` con logging estructurado. AP-42 (Detector 1: provider externo; Detector 2: writes críticos a `sessions`/`users`/seguridad gated por flag dev — fix una vez, fix simétricamente en TODOS los handlers que tocan la misma tabla; precedente pase 5 vs pase 11). **Sub-detector AP-44 D6:** `await db.X(...)` post-commit sin `runOptionalSideEffect` también es fail-open silencioso desde la perspectiva del cliente (la tx principal commitea, pero el side-effect falla y 500a la respuesta).
9. **Asimetría de guards entre verbos del mismo recurso (AP-45) y side-effects que mutan otros recursos por fuzzy-match (AP-62)** — (a) un módulo scope-restringido por jugador donde GET/PATCH/DELETE validan acceso (`canManagePlayerScopedResource`, `esResponsableDeJugador`, `checkXAccess`) pero **POST no**. Resultado: write-IDOR. Cualquier usuario logueado puede crear recursos para jugadores ajenos. Detectar revisando handler-por-handler en un mismo router que el guard usado en PATCH también esté en POST antes del primer `db.insert`. (b) Variante **AP-62 (pase 17)**: un endpoint POST valida correctamente sobre su recurso principal pero dispara un `runOptionalSideEffect` que UPDATEa filas de OTRA tabla matcheando por `nombre`/`equipo`/heurística textual del body. El guard del verb-level no aplica al side-effect — cada UPDATE necesita per-row check, gate por admin literal, o decisión documentada (excepción intencional: `feedPipelineFromMatchReport` en scouting.ts). Detectar `runOptionalSideEffect(...)` que contenga `db.update(...)` de tabla distinta a la del endpoint. Variante adyacente: resolución de `users.nombre` → `userId` sin `status=1` ni unicidad (S-MERC-004 simétrico — **AP-51 pase 17**); usar `resolveActiveUserByName` de [lib/userResolver.ts](../../server/src/lib/userResolver.ts).
10. **Falla del check de autorización: degradar vs 503 (AP-47)** — handler que llama `await getActiveCrossPermissions(...)` (o cualquier `checkXAccess`) directamente sin envolverlo. Si la DB de permisos falla: **listado** → degradar con `safeGetActiveCrossPermissions` + `setPartialDataHeaders`; **mutación / item-individual** → `getActiveCrossPermissionsOrThrow` (lanza 503 reintentable, NO degrada a Set vacío que produciría 403 falsos).
11. **Composición de predicados de autorización (AP-48)** — auditar la **cadena** de helpers, no solo la hoja. Un módulo `lib/*Access.ts` puede exportar `canManageX` que internamente llama a `getLevelAY` que a su vez llama a `getActiveCrossPermissionIds` — y el grep de Dim 10 falla porque solo busca el hoja con nombre exacto. Cada nivel intermedio debe exponer sus dos variantes (`safeX`/`xOrThrow`) y el regex del detector AP-47 debe acumular sus nombres (Detector 2). Sub-checks: (a) ¿el módulo expone safe/OrThrow para cada helper compuesto exportado? (b) ¿los handlers eligen explícitamente safe o OrThrow según el verbo? (c) ¿el detector AP-47 incluye todos los nombres acumulativos del módulo?

### 0.1 Diff vs pases anteriores — la clausura no es definitiva; los detectores son acumulativos

Antes de tratar una AP-N como "cerrada" en este pase:

1. **Re-ejecutá TODOS los detectores canónicos** de esa AP sobre el código actual. Cada AP puede tener N detectores acumulados a lo largo de los pases — un AP-N "verde" exige que **todos** sus detectores vuelvan verdes, no solo el primero. Ejemplo: AP-44 tiene 6 detectores (multi-write, await missing en predicados async, try/catch envolviendo tx, race getOrCreate, ensure helpers fuera de tx, **await db.X post-commit sin runOptionalSideEffect**) — ver `knowledge/wiki/anti-patterns.md` §AP-44.
2. **Escribí explícitamente el caso de evasión** que tu detector NO agarraría: helpers nombrados distinto, sintaxis equivalente, llamadas indirectas, async patterns, composición de componentes entre archivos, helpers read-only con verbo de write en el nombre (`resolveX`, `parseX`), method de clase (`this.canX`), destructuring con variable intermedia. Si el caso de evasión es realista (existe en el codebase o podría existir naturalmente), la AP NO está cerrada — pasa a ser hallazgo de severidad ALTA y se requiere un **detector nuevo añadido** (no reemplazar el viejo, acumular). Documentar el nuevo detector en la sección de la AP en `anti-patterns.md`.
3. **No confíes en la memoria del pase anterior** que dice "X cerrado". Cada pase audita sobre el código de hoy, no sobre el estado declarado en la memoria. Una regresión entre pases es invisible al diff narrativo — solo el re-barrido del detector la encuentra.
4. **Cada pase debe AÑADIR al menos uno de**: un AP nuevo catalogado, un detector nuevo a un AP existente, una entrada nueva en "casos de evasión documentados", o una dimensión nueva al §0.0 de este prompt. Si terminás sin añadir nada de eso, el pase fue superficial.

### 0.2 Mapear Endpoints y Servicios Críticos

Analiza `server/src/routes`, `server/src/services`, `server/src/lib` y `server/src/db` en busca de:
- Endpoints con múltiples consultas secuenciales donde una fuente secundaria opcional puede romper toda la respuesta obligatoria.
- Falta de aislamientos mediante `try/catch`, `safe wrappers`, fallback controlado o degradación parcial de servicios.
- Consultas dependientes de tablas/columnas nuevas sin validación de compatibilidad con esquemas de producción.
- Endpoints agregadores o tipo catálogo que mezclan demasiadas responsabilidades.
- Uso incorrecto de `Promise.all` cuando un fallo parcial debería ser permitido.
- Predicados de autorización asíncronos consumidos sin wrap resiliente (AP-47).
- Verbos POST sin guard de visibilidad cuando otros verbos del mismo router sí validan (AP-45).

### 0.3 Evaluar Interacción Backend-Frontend

Analiza el uso de React Query y los componentes que muestran listas:
- Problemas donde el frontend muestra "sin datos" cuando realmente hubo error en el backend (falsos vacíos clásicos — AP-14).
- **Composición padre→hijo donde el padre tiene `isError` pero el hijo solo recibe `data` (AP-46).** Buscar específicamente componentes extraídos a archivos `Tab*.tsx`, `Section*.tsx`, `List*.tsx` que renderizan `<EmptyState/>` cuando `!data.length`.
- Respuestas `500` masivas evitables por falta de aislamiento de errores parciales.
- Falta de diferenciación visual entre: "sin resultados reales", "error de carga" y "datos parciales".
- Mutaciones sin `onError`/toast (fire-and-forget silencioso).
- `useQuery` que llama a un endpoint con `?meta=1` o `X-Data-Partial` disponible pero usa el wrap sin meta (no muestra banner).

### 0.4 Evaluar Prácticas de Base de Datos y Rendimiento
- Falta de validación de existencia de columnas/tablas en migraciones recientes.
- Queries duplicadas, falta de índices en consultas frecuentes y riesgos N+1.
- Ausencia de transacciones donde sí deberían existir o transacciones usadas que bloquean innecesariamente lecturas independientes.
- Acoplamiento excesivo entre rutas y queries (falta de capa service/repository).
- Migraciones con `DROP COLUMN` + `RENAME` que no son seguras bajo concurrencia (inserts en flight durante el window pueden romper).

### 0.5 Archivos de PRIORIDAD ALTA (donde aparecen bugs históricamente)

> **⚠️ LA TABLA DE ABAJO ES DE OTRO PROYECTO. Sustitúyela antes de usar este prompt.**
>
> Son los ficheros calientes de una API de scouting en Node/Express/Drizzle, con los
> hallazgos que salieron allí. En cualquier otro proyecto **no existen**, y un agente que
> los busque perderá el pase entero mirando rutas que no están — o peor, dará por
> auditado lo que no miró.
>
> Se deja rellenada y no vacía porque **enseña qué columnas hacen falta**: no basta con
> el nombre del fichero, hace falta POR QUÉ es caliente y en qué pase apareció. Rellénala
> con los tuyos después del primer pase; antes del primero, bórrala y prioriza por lo que
> diga el propio código.

Estos archivos concentran la mayoría de los hallazgos B.L.A.S.T. históricos. Si el pase debe priorizar por tiempo, empezar aquí:

| Archivo / Carpeta | Por qué | Pase donde apareció |
|---|---|---|
| [server/src/routes/situaciones.ts](../../server/src/routes/situaciones.ts) | Módulo nuevo (Fase 1-4). POST sin guard → AP-45; PATCH spread → AP-49 | 8, 10 |
| [server/src/routes/tareas.ts](../../server/src/routes/tareas.ts) | Generador derivadas; race getOrCreate; **PATCH /personas + PATCH /tareas con spread mass-assignment → AP-49** | 6-7, 10 |
| [server/src/routes/futbolistas.ts](../../server/src/routes/futbolistas.ts) | God router; cross-perm checks, ensure helpers, tx grande | 4-8 |
| [server/src/routes/finanzas.ts](../../server/src/routes/finanzas.ts) | Ingresos+gastos+cuotas; tx multi-fuente; cross-perm checks | 5-8 |
| [server/src/routes/scouting.ts](../../server/src/routes/scouting.ts) | Informes-partido + junctions; ensure helpers fuera de tx | 6-7 |
| [server/src/routes/mercado.ts](../../server/src/routes/mercado.ts) | Búsquedas-club, ofrecimientos, negociaciones-mercado | 5-7 |
| [server/src/routes/auth.ts](../../server/src/routes/auth.ts) | Login/refresh/change-password; SESSION_FAIL_OPEN | 5-6 |
| [server/src/middleware/auth.ts](../../server/src/middleware/auth.ts) | Verificación de sesión, fail-open en dev | 6-7 |
| [server/src/lib/visibility.ts](../../server/src/lib/visibility.ts), [permissions.ts](../../server/src/lib/permissions.ts), [resourceAccess.ts](../../server/src/lib/resourceAccess.ts) | Predicados de autorización — bugs en estos archivos impactan TODAS las rutas | 7-8 |
| [server/src/db/init.ts](../../server/src/db/init.ts) | Bootstrap + drift detection; cambios en CRITICAL_TABLES | 6-7 |
| [client/src/pages/FutbolistaDetallePage/](../../client/src/pages/FutbolistaDetallePage) | Composición padre→hijo, tabs múltiples — sede principal de AP-46 | 8 |
| [client/src/pages/MercadoPage/](../../client/src/pages/MercadoPage), [FinanzasPage/](../../client/src/pages/FinanzasPage), [SituacionesPage/](../../client/src/pages/SituacionesPage) | Páginas con múltiples sub-consultas | 6-8 |
| [client/src/components/Layout.tsx](../../client/src/components/Layout.tsx), [CommandPalette.tsx](../../client/src/components/CommandPalette.tsx) | Sidebar widgets + autocomplete — sede principal de AP-63 (queries no-lista sin `isError`) | 18 |
| [client/src/pages/IntermediacionDetallePage.tsx](../../client/src/pages/IntermediacionDetallePage.tsx) | EditForm modal con catálogos (paises/clubs/responsables) — AP-63 D1 forma "form catalog" | 18 |

### 0.6 Banco de detectores (greps canónicos de arranque rápido)

Estos son los greps de "primer barrido". No son exhaustivos — son el punto de partida obligatorio. La autocrítica del PROTOCOLO 1 te pide explicitar qué casos de evasión cada uno NO captura.

```bash
# Dim 1 — Resiliencia: Promise.all con fuentes secundarias.
grep -rnE "Promise\.all" server/src/routes/ | grep -v ".test.ts"

# Dim 2 — Atomicidad: multi-write sin tx (AP-44 detector 1).
# Ver detector node-based completo en knowledge/wiki/anti-patterns.md §AP-44.
grep -rnE "await db\.(insert|update|delete)\(" server/src/routes/ | grep -v ".test.ts"

# Dim 2 — Atomicidad: ensureClub/ensurePais fuera de tx (AP-44 detector 5).
grep -rnE "await ensure(Club|Pais)\([^)]+\)[^,]" server/src/routes/ | grep -v ".test.ts"

# Dim 2 — Atomicidad: await db.X post-commit sin runOptionalSideEffect (AP-44 detector 6).
# Por cada archivo con `db.transaction(`, leer el handler y verificar que entre
# el cierre del callback de tx y el `res.json(...)` no haya un `await db.X(...)`
# sin envolver. Ver script node-based completo en knowledge/wiki/anti-patterns.md
# §AP-44 Detector 6. Counter-pattern correcto: users.ts:244 (accessLog post-tx
# vía runOptionalSideEffect).
grep -rnE "^\s*await db\.(insert|update|delete)\(" server/src/routes/ | grep -v ".test.ts"
# Manual: filtrar los que NO están dentro de db.transaction(...) y se ejecutan
# DESPUÉS del cierre de una tx en el mismo handler.

# Dim 3 — Async: if (!fn() sin await (Promise truthy).
grep -rnE "if\s*\(\s*!?[a-zA-Z_][a-zA-Z0-9_]*\s*\(" server/src/routes/ server/src/lib/ | grep -v ".test.ts" | grep -v "await"

# Dim 3 — Async: forEach/filter con async callback.
grep -rnE "\.(forEach|filter)\s*\(\s*async" server/src/ client/src/ | grep -v ".test.ts"

# Dim 4 — Mass-assignment Detector 1 (AP-27): .set(req.body) o .set(...req.body).
grep -rnE "\.set\s*\(\s*(req\.body|\.\.\.req\.body)" server/src/routes/

# Dim 4 — Mass-assignment Detector 2 (AP-49): spread vía objeto.
# Por cada hit, leer ~10 líneas arriba y confirmar que el spread venga de
# sanitizeWriteBody(...) o parseBody(Schema, ...). Si NO, es bug.
grep -rnE "\.set\(\s*\{\s*\.\.\." server/src/routes/ | grep -v ".test.ts"

# Dim 4 — Mass-assignment Detector 3 (AP-49 indirecto):
# `const updates = req.body as Partial<...>` es señal casi inequívoca de AP-49.
grep -rnE "const updates = req\.body" server/src/routes/ | grep -v ".test.ts"

# Dim 5 — N+1: for/while + await db dentro.
grep -rnEz "for\s*\([^)]+\)\s*\{[^}]*await\s+(db|tx)\." server/src/routes/ | grep -v ".test.ts"

# Dim 6 — Frontend AP-46 Detector 1: child con `data: T[]` y EmptyState, sin isError.
# Por cada archivo Tab*.tsx / Section*.tsx que renderice EmptyState:
grep -lrE "EmptyState" client/src/pages/**/Tab*.tsx | while read f; do
  if ! grep -qE "(isError|loadError|error)\s*[?:]" "$f"; then
    echo "[AP-46 candidato] $f"
  fi
done

# Dim 6 — Frontend AP-46 Detector 3 (pase 16): useQuery destructurado con default
# `[]` o `{}` pero SIN `isError` destructurado. Captura `*Modal.tsx`, `*Form.tsx`,
# `*Select.tsx` y otras envolturas no-Tab que escapan al Detector 1. Counter-pattern
# correcto: SituacionesPage/SituacionModal.tsx:35 tras pase 16 (destructura isError
# y lo pasa al FutbolistaSelect via `error={errorJugadores}`). Por cada hit, leer
# el bloque y confirmar que el `data` se pasa a un child (lista/select/empty)
# sin propagar loadError/isError.
grep -rnE "data\s*:\s*\w+\s*=\s*(\[\]|\{\})" client/src/pages/ client/src/components/ \
  | grep -v ".test.tsx" \
  | grep -v "isError"
# Variante latente (requiere triage manual): JSX que consume `query.data ?? []`
# o `query.data || []` enmascara el error como vacío. No hay default visible en
# el destructuring porque el caller usa la query como objeto entero.
grep -rnE "\.data\s*(\?\?|\|\|)\s*\[\]" client/src/pages/ | grep -v ".test.tsx"

# Dim 7 — Schema drift: si init.ts loguea drift al arranque, leer el log.
# Detector boot-time integrado en server/src/db/init.ts:264 (diagnoseColumnDrift).

# Dim 8 — Fail-open: .catch(()=>{}) en código nuevo.
grep -rnE "\.catch\(\s*\(\s*\)\s*=>\s*\{?\s*\}?\s*\)" server/src/ | grep -v ".test.ts"

# Dim 8 — Fail-open: try/catch silencioso en writes críticos gated por flag dev (AP-42 Detector 2).
# Esperado: SOLO hits en server/src/middleware/auth.ts (donde el fail-open de
# lectura de sesión es intencional). Cualquier hit en server/src/routes/ es
# candidato de regresión — el patrón `try { db.X(sessions|users|...) } catch
# { if (!FAIL_OPEN) throw }` genera sesiones fantasma / logouts silentes en dev.
grep -rnE "(SESSION_FAIL_OPEN|AUTH_SESSION_FAIL_OPEN|_FAIL_OPEN)" \
  server/src/routes/ server/src/middleware/ | grep -v ".test.ts" | grep -v "^.*://"

# Dim 8 — Fail-open: `void <provider>.<methodAsync>(...)` sin runOptionalSideEffect (AP-42 Detector 3, 14º pase).
# El rejection del promise externo (S3, push, queue, webhook) muere en el event loop
# sin logging estructurado. Counter-pattern correcto: agencia.ts:43-46 (delete_old_logo).
# Esperado: 0 hits sin wrap. Cualquier hit en routes/ sin estar dentro de
# `runOptionalSideEffect('label', () => <call>, ctx)` es bug.
grep -rnE "void\s+\w+\.(deleteImage|sendNotification|upload|publish|invalidate|enqueue|emit)\(" \
  server/src/routes/ server/src/services/ | grep -v ".test.ts" | grep -v "runOptionalSideEffect"
# Genérico (requiere triage manual):
grep -rnE "^\s*void\s+[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_]+\(" server/src/routes/ \
  | grep -v ".test.ts" | grep -v "runOptionalSideEffect"

# Dim 9 — AP-45: POST handlers sin guard, comparado con PATCH/DELETE del mismo router.
# Listar handlers POST y revisar manualmente que el guard que usan los otros verbos también esté.
grep -nE "router\.(post|patch|delete)\(" server/src/routes/*.ts | sort

# Dim 10 — AP-47: getActiveCrossPermissions sin wrap (Detector 1, hoja).
# Esperado: solo hits en lib/permissions.ts (definición + uso interno de safeGetActiveCrossPermissions).
# Hits en routes/* sin estar dentro de safeQuery(...) o orThrow son bug.
grep -rnE "getActiveCrossPermissions\(" server/src/{routes,lib}/ | grep -v ".test.ts" | grep -v "OrThrow\|safe"

# Dim 11 — AP-48: composición de predicados (Detector 2, acumulativo).
# Variantes nominales (Ids) + helpers compuestos del módulo resourceAccess.
# Esperado: vacío. Cualquier hit es un caller sin OrThrow/safe.
grep -rnE "(getActiveCrossPermission(s|Ids)|getLevelAPlayerIds|canManagePlayerScopedResource|filterManageablePlayerScopedResources)\(" \
  server/src/{routes,lib}/*.ts | grep -v ".test.ts" \
  | grep -v "safeGet\|OrThrow\|^server/src/lib/resourceAccess.ts:\|^server/src/lib/permissions.ts:"

# Dim 9 — AP-62 (pase 17): side-effect post-commit que UPDATEa filas ajenas
# por fuzzy-match. Listar handlers que tienen `runOptionalSideEffect(...)` y,
# por cada uno, leer el callback async para verificar que cualquier `db.update`
# dentro tenga (a) per-row guard, (b) handler gateado por admin literal, o
# (c) entrada en AP-62 "excepción intencional documentada" en anti-patterns.md.
# Detector textual:
grep -rnE "runOptionalSideEffect\(" server/src/routes/ | grep -v ".test.ts"
# Variante específica del patrón canónico (feedPipelineFromMatchReport):
# loop sobre items del body + db.select/update por nombre normalizado.
grep -rnE "(normalizeName|lower\(trim\(.*nombre)" server/src/routes/ | grep -v ".test.ts"

# Dim 4 / AP-51 (pase 17) — resolución de users.nombre → userId SIN
# `status=1 + sinSesion=false + uniqueness`. Esperado: 0 hits fuera de
# `lib/userResolver.ts:resolveActiveUserByName` (definición). Hits en
# routes/* son AP-51 D5 (S-MERC-004 simétrico).
grep -rnE "(eq|inArray)\(users\.nombre," server/src/routes/ | grep -v ".test.ts"
grep -rnE "users\.nombre\s*=\s*\\\$" server/src/routes/ | grep -v ".test.ts"
# Counter-pattern correcto: cualquier callsite de routes/* DEBE pasar por
# `resolveActiveUserByName(...)` o `resolveActiveUserIdsByNames(...)`.
grep -rnE "resolveActiveUserBy(Name|Ids)" server/src/

# Dim 6 — AP-46 D1 (variante pase 17): el regex acepta sufijos para no dar
# falso positivo en props granulares como `loadErrorPartido`/`loadErrorDetallados`.
grep -lrE "EmptyState" client/src/pages/**/Tab*.tsx | while read f; do
  if ! grep -qE "(isError|loadError\w*|error\w*)\s*[?:]" "$f"; then
    echo "[AP-46 candidato] $f"
  fi
done

# Dim 6 — AP-63 (pase 18): useQuery NO-lista (sidebar widget / command palette
# / form catalog modal) sin `isError` destructurado. Atrapa lo que AP-14/46 NO
# atrapan porque no hay EmptyState renderizado — los símbolos del bug son:
# counter badge muestra "0" silenciosamente, autocomplete oculta opciones,
# dropdown de catálogo vacío induce a guardar como "ninguno seleccionado".
# Counter-pattern correcto: CommandPalette.tsx / Layout.tsx / IntermediacionDetallePage.tsx EditForm
# (post-pase-18) — todas destructuran `q.isError` + banner ámbar + (en form
# catalogs críticos) disabled={catalogLoadError} en Guardar.
#
# Detector 1 — useQuery en componentes Layout/Header/Palette/EditForm/Modal sin isError.
grep -rnE "useQuery\(\{" client/src/components/ client/src/pages/ | grep -v ".test.tsx" | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  case "$file" in
    *Layout.tsx|*CommandPalette.tsx|*Palette.tsx|*Sidebar.tsx|*EditForm.tsx)
      # Triage manual: leer 5 líneas y verificar isError destructurado.
      echo "[AP-63 candidato] $line" ;;
  esac
done
# Detector 2 — q.data ?? [] sin isError adyacente. Para cada hit, leer 8
# líneas arriba para verificar que el mismo useQuery captura `isError`.
grep -rnE "\.data\s*\?\?\s*\[\]" client/src/components/ client/src/pages/ \
  | grep -v ".test.tsx"
# Detector 3 — destructuring useQuery con default vacío en componente no-Tab.
grep -rnE "data\s*:\s*\w+\s*=\s*(\[\]|\{\})" client/src/components/ \
  | grep -v ".test.tsx" \
  | grep -v "isError"
```

---

## PROTOCOLO 1 — PRESENTAR HALLAZGOS Y RIESGOS

Presenta un informe técnico priorizado con este formato exacto. **Las secciones "Cobertura declarada" y "Autocrítica adversarial" son obligatorias y deben ir en el orden indicado** — no son opcionales ni se pueden colapsar en una nota.

```markdown
## Análisis de Arquitectura Completado

He evaluado el repositorio sobre las 10 dimensiones listadas en PROTOCOLO 0.

### Cobertura declarada (OBLIGATORIA)

Por cada una de las 11 dimensiones de auditoría, declarar uno de:
- ✅ **Cubierta**: detector(es) ejecutado(s) + resumen 1-línea del scope.
- 🟡 **Parcial**: qué se revisó + qué no.
- ❌ **Fuera de scope**: razón (capacidad, no aplica, etc.).

Listar también archivos NO leídos en su totalidad durante el pase (mencionando si la cantidad es alta — el usuario decide si lanzar un pase complementario).

| # | Dimensión | Estado | Scope cubierto / pendiente |
|---|---|---|---|
| 1 | Resiliencia de agregadores | ✅/🟡/❌ | … |
| 2 | Atomicidad transaccional | ✅/🟡/❌ | … |
| 3 | Correctness async | ✅/🟡/❌ | … |
| 4 | Defense-in-depth / autorización | ✅/🟡/❌ | … |
| 5 | N+1 y performance | ✅/🟡/❌ | … |
| 6 | Frontend — estados y composición | ✅/🟡/❌ | … |
| 7 | Schema drift | ✅/🟡/❌ | … |
| 8 | Fail-open silencioso | ✅/🟡/❌ | … |
| 9 | Asimetría de guards entre verbos (AP-45) | ✅/🟡/❌ | … |
| 10 | Wrap del check de autorización (AP-47) | ✅/🟡/❌ | … |

### Top Problemas Críticos
1. [Problema] — Impacto en Producción: [Alto/Medio] — Archivo: [Ruta/Línea]
2. [Problema] — Impacto en Producción: [Alto/Medio] — Archivo: [Ruta/Línea]

### Tabla de Hallazgos
| Severidad | Módulo | Archivo/Función | Descripción del Problema | Riesgo Técnico / Solución |
|---|---|---|---|---|
| Crítica/Alta | [Módulo] | [Ruta] | [Descripción y ejemplo realista de fallo] | [Refactor sugerido] |
| Media | [Módulo] | [Ruta] | [Descripción y ejemplo realista de fallo] | [Refactor sugerido] |

### Descubrimientos del pase (OBLIGATORIO — al menos uno o decir explícitamente "ninguno + razón")

Cada pase debe AÑADIR al menos uno de:
- **AP nuevo catalogado** (con número AP-N propuesto + sección detallada para `anti-patterns.md`).
- **Detector nuevo a un AP existente** (con grep canónico, ejemplo de caso que captura, ejemplo del caso de evasión que NO captura).
- **Caso de evasión documentado** a un detector existente (sin detector nuevo, solo el caso para futura referencia).
- **Dimensión nueva al §0.0** del ARCHITECTURE_PROMPT (con justificación).

Si terminás sin añadir nada, el pase fue superficial y hay que revisar por qué. Decirlo explícitamente: "no encontré clase nueva — los pases previos cubrieron el codebase con detectores acumulativos y el grep banks de §0.6 vino limpio".

### Autocrítica adversarial (OBLIGATORIA antes del STOP)

Intentá refutar tu propio trabajo antes de cerrar el informe. Cuatro sub-pasos:

1. **Por cada hallazgo de la tabla** — escribir el contraargumento más fuerte para descartarlo: ¿es comportamiento intencional? ¿hay un patrón que lo neutraliza río arriba? ¿lo cubre un test que pasaste por alto? ¿el "fix" propuesto empeora otra propiedad (atomicidad, perf, UX)? Si el contraargumento gana, mover ese hallazgo a una sub-sección **"Evaluados y descartados"** con la razón.
2. **Por cada AP-N declarada cerrada** (en este pase o anteriores, si la incluiste en la cobertura) — escribir el caso de evasión concreto que su detector NO agarraría hoy: helpers nombrados distinto, sintaxis equivalente, llamadas indirectas, async patterns no triviales, composición padre→hijo, método de clase, destructuring intermedio. Si el caso de evasión es realista, la AP no está cerrada → promover a hallazgo nuevo de severidad ALTA y proponer un detector nuevo (acumular, no reemplazar).
3. **Por cada dimensión marcada ✅ Cubierta** — una frase del tipo "qué clase de bug en esta dimensión es esperable que NO haya detectado" (lente aplicado vs lentes posibles). Esto fuerza explicitar el sesgo del pase y le da al usuario una pista de qué encargar al siguiente pase.
4. **¿Qué archivos de §0.5 (PRIORIDAD ALTA) no abriste enteros?** Listalos. Si más de la mitad quedó sin leer completo, el pase queda marcado como "PARCIAL" en lugar de completo.

Si los cuatro sub-pasos de autocrítica no produjeron NADA (ni descartes, ni evasiones, ni puntos ciegos, ni archivos pendientes), el pase probablemente está siendo superficial — revisar antes de presentar al usuario.
```

**STOP — espera confirmación del usuario para avanzar con el plan de refactor.**

---

## PROTOCOLO 2 — PATRONES Y SOLUCIONES B.L.A.S.T.

Una vez que el usuario apruebe el diagnóstico, proporciona el plan de refactorización por fases y propón patrones de código reutilizables:

1. **Patrones Backend Recomendados (con ejemplos en TypeScript):**
   - Implementación de `safeQuery()` o `safeSource()` para encapsular fuentes opcionales.
   - Separación clara entre fuente principal (obligatoria) y fuentes secundarias (opcionales).
   - Respuestas parciales estructuradas con metadata (ej. objetos con `data`, `warnings`, `sourceStatus`).
   - Logging estructurado contextualizado por fuente, tabla o query.
   - Wraps duales para predicados de autorización asíncronos: `safeX(...)` (degrada) y `xOrThrow(...)` (lanza 503). Ver `safeGetActiveCrossPermissions` / `getActiveCrossPermissionsOrThrow` en `lib/permissions.ts` como modelo.
   - Patrón de guard simétrico entre verbos del mismo recurso: si PATCH/DELETE/GET validan, POST también.

2. **Convenciones Frontend:**
   - Manejo seguro de errores en React Query que interprete respuestas parciales.
   - Componentes con estados visuales claramente diferenciados (error vs estado vacío legítimo vs datos parciales).
   - **Componentes extraídos que reciben `data: T[]` también reciben `loadError?: boolean` (AP-46)**, o están envueltos en `<QueryStateBoundary>` por el padre.
   - Mutaciones SIEMPRE con `onError` que muestra toast del fallo.

3. **Herramientas y Checklists:**
   - Checklist para implementación de nuevas rutas backend.
   - Checklist estricto para migraciones de base de datos.
   - Checklist para extraer un sub-componente lista al frontend (§12 de `backend-resilience.md`).
   - Recomendaciones de pruebas de integración para endpoints críticos.
   - Bank de greps actualizado (§0.6 de este prompt).

4. **Actualización obligatoria del catálogo tras cada pase:**
   - Si encontraste un AP nuevo, escribir su sección completa en `knowledge/wiki/anti-patterns.md` (síntoma, por qué ocurre, caso real, ejemplo de violación, corrección, regla obligatoria, detector canónico, caso de evasión documentado) + añadir fila al resumen ejecutivo.
   - Si añadiste un detector nuevo a un AP existente, ponerlo en la sección "Detector N" de esa AP (acumulativo, no reemplaza el viejo).
   - Si descubriste una dimensión nueva, agregarla al §0.0 de este `ARCHITECTURE_PROMPT.md`.
   - Si tocaste código resiliente, actualizar `knowledge/wiki/backend-resilience.md`.
   - Actualizar la memoria del usuario con el resumen del pase.

---

## REGLAS GLOBALES EN MODO ARQUITECTURA

- **Prioriza la resiliencia:** El sistema debe degradarse elegantemente en lugar de fallar por completo devolviendo errores `500` masivos.
- **Aislamiento de errores:** Fallos en datos secundarios jamás deben ocultar la data principal vital para el usuario.
- **Piensa a nivel sistema:** No arregles un solo endpoint con un parche; propón un estándar, contrato o middleware aplicable a todo el monolito.
- **Cita referencias reales:** Cuando menciones un problema, especifica exactamente el archivo y la línea donde se encuentra en el código actual.
- **No limites la búsqueda al catálogo conocido:** las 10 dimensiones son el piso. Cada pase debe intentar descubrir clases nuevas. Un pase sin descubrimiento es señal de que faltó profundidad, no de que el codebase esté cerrado.
- **Detectores acumulativos:** nunca reemplaces un detector viejo cuando descubrís un caso de evasión nuevo. Sumá el detector nuevo y dejá el viejo. Cada AP-N debe ganar detectores con cada pase, no perderlos.
- **Documentá antes de fixear:** si encontraste un patrón nuevo, primero proponer la entrada en `anti-patterns.md` y/o `backend-resilience.md`, después escribir el fix. El proyecto convive con varios agentes y la doc compartida es el contrato.
