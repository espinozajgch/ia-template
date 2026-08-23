# Architecture — Arquitectura A.N.T. de futbot-web-app

> Fase T (Trigger), ejecutada el 2026-08-01.
> Cifras de estructura **medidas sobre el grafo de código** (`Users-espinozajge-futbot-futbot-web-app`),
> no estimadas. Ver [`knowledge/wiki/codebase-memory-mcp.md`](../knowledge/wiki/codebase-memory-mcp.md).

> **Reindexado el 2026-08-04:** 1.178 nodos y 2.818 relaciones en la web tras los primeros
> frontend React; 3.004 y 13.206 en el
> bot. La inteligencia cross-repo encontró **0 enlaces** HTTP/async/channel porque la frontera
> sigue siendo argv/ficheros. La arquitectura destino y la propiedad entre repositorios están en
> [`frontend-modernizacion.md`](../knowledge/wiki/frontend-modernizacion.md).

---

## Las 3 capas A.N.T.

```
┌──────────────────────────────────────────────────────────────┐
│  KNOWLEDGE — /knowledge/wiki                                 │
│  project · features · product-design · pwa · migration       │
│  entorno-local · codebase-memory-mcp · aws-agent-toolkit     │
├──────────────────────────────────────────────────────────────┤
│  SYSTEM — /llm-wiki                                          │
│  Protocolo B.L.A.S.T. · este archivo                         │
├──────────────────────────────────────────────────────────────┤
│  EXECUTION — app.py + /pages + /modules + /tools             │
│  47 ficheros Python · 9 pantallas · verificadores de Fase L  │
└──────────────────────────────────────────────────────────────┘
```

La ejecución no vive en `/app` como dice la plantilla genérica.

---

## Routing de ejecución (Fase T)

No hay clasificación de intent: es una aplicación web con navegación explícita. El routing es la
**sidebar construida según sesión** (`auth_ui.py:41-65`), con `showSidebarNavigation = false`.

```
Navegador
   │  cookie ──▶ componente remoto (iframe)  ← CAÍDO con la EC2 apagada
   ▼
app.py (Home) ──▶ bootstrap_auth_from_cookie ──▶ menu()
   │                                              │
   │                              ┌───────────────┼──────────────┐
   ▼                              ▼               ▼              ▼
Dashboard                      LogsLab         Discord        Users · Opta
   │                              │               │            Advertising · Custom
   │                              │               │            File Manager · Image Lab
   ├─ filtros ──▶ toCliArgs (inline, sin función propia)
   ├─ validación (match_code, fan)
   ├─ token ◀── BD
   └─ subprocess.Popen ──▶ futbot-v2/code/main.py
            │
            ├─ runtime/futbot_current.json   (estado)
            └─ logs/bot/*.txt ──▶ LogsLab (auto-refresco 5 s)
```

**El estado manda sobre la UI**, no al revés: lo que se pinta se deriva de
`runtime/futbot_current.json`, y un watchdog reconcilia cuando el proceso muere solo.

---

## Composición real, medida

| Nodo | n | | Relación | n |
|---|---|---|---|---|
| `Section` | 427 | | `DEFINES` | 1 378 |
| `Variable` | 238 | | `USAGE` | 436 |
| `Function` | 122 | | `CALLS` | 305 |
| `File` | 91 | | `WRITES` | 238 |
| `Module` | 86 | | `IMPORTS` | 87 |
| `Class` 8 · `Method` 5 | | | `HTTP_CALLS` | **1** |
| **`Route`** | **2** | | `HANDLES` · `CONFIGURES` | 1 c/u |

47 ficheros Python. **1 014 nodos, 2 598 relaciones.**

### Comparación con el bot

| | web-app | futbot-v2 |
|---|---|---|
| Ficheros Python | 47 | 79 |
| Nodos · relaciones | 1 014 · 2 598 | 1 482 · 6 153 |
| **Cohesión de clusters** | **0,57 – 0,77** | 0,28 – 0,36 |

**Este proyecto está mejor construido que el bot**, y no es una impresión: los clusters detectados
por Leiden mapean limpiamente sobre `modules/` (auth, db, process), mientras que en el bot todos
salen etiquetados como `code` y mezclados.

### Símbolos más acoplados

| Símbolo | callers (confianza ≥ 0,85) | Lectura |
|---|---|---|
| `db_client.query` | **10** | la puerta de lectura a Postgres |
| `db_client.execute` | **8** | la de escritura |
| `process_manager.load_state` | 5 | el estado manda sobre la UI |
| `app_config.init_config` | 10 (fan-in bruto) | arranque de cada pantalla |
| `get_bot_base_path` | **1** | fan-in bruto 7, pero **una sola llamada resuelta** |

> `get_bot_base_path` ilustra la regla del grafo: **fan-in bruto 7, callers reales 1.** Contar
> aristas `CALLS` sin filtrar por `confidence` sobrestima el acoplamiento. Ver
> `codebase-memory-mcp.md`.

### Capas detectadas

| Capa | Clasificación | Motivo |
|---|---|---|
| `db` | **internal** | 3 entradas, 11 salidas — es el hub |
| `auth_system`, `utils`, `logs`, `advertising` | entry | solo llamadas salientes |
| *(sin nombre)* | **api** | **tiene definiciones de ruta HTTP** ← ver abajo |

---

## El microservicio huérfano, detectado por el grafo

El índice encontró **2 nodos `Route`** y **1 arista `HTTP_CALLS`**:

```
POST /start
POST http://localhost:8000/start
```

Son `modules/utils/futbot_api.py` (FastAPI) y `modules/utils/st_futbot.py`, que le llama. **Nada
arranca ese servicio**, la ruta del script está fijada a un usuario inexistente, y duplica lo que
`dashboard.py` ya hace por `subprocess`.

Es la decisión abierta **D1** del Blueprint, confirmada aquí por una vía independiente de la
lectura de código: el grafo clasifica una capa como `api` en un proyecto que no expone ninguna API.

**No se porta en la migración** (`migration-nextjs.md` §15.5).

---

## Frontera con el bot

```
futbot-web-app ──subprocess.Popen + ~25 flags──▶ futbot-v2/code/main.py
```

**El grafo no ve esta frontera.** No es HTTP ni una llamada de función: es un `argv`. Los dos
índices son independientes y ninguna consulta cruza.

Consecuencia: **cambiar un argumento del `argparser` de `main.py` rompe este repositorio en
silencio**. Ni el grafo, ni los tests —que no existen—, ni `verify_bot_paths.py` lo detectan: este
último comprueba que los ficheros existan, no que la firma siga siendo compatible.

Es el riesgo estructural del sistema y hoy solo lo cubre la documentación.

---

## Estado del protocolo B.L.A.S.T.

| Fase | Estado |
|---|---|
| **B** — Blueprint | Confirmado 2026-07-31 |
| **L** — Link | **Ejecutada 2026-08-01. ROJO**: 2 de 3 |
| **A** — Architect | **NO APLICA** — sin LLM ([`01_LLM_STRATEGY.md`](01_LLM_STRATEGY.md)) |
| **S** — Stylize | Documentada |
| **T** — Trigger | Documentada |

> **S y T se han ejecutado como documentación, no como construcción.** El protocolo prohíbe
> construir lógica sobre un Link roto, y la decisión vigente es *solo documentar*. **A no aplica**:
> las tres fases del Architect son sobre prompts y contexto de un modelo, y este proyecto no tiene
> ninguno.
