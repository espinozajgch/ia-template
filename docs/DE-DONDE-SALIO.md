# De dónde salió cada pieza

> Trazabilidad del destilado. Trece proyectos revisados el **2026-08-22**.
> Cuando el mismo archivo existía en varios, se eligió la versión **más evolucionada**
> —normalmente la más extensa, porque en estos repositorios crecer significó incorporar
> casos reales— y se anota el origen para poder volver a él.

---

## Los proyectos revisados

| Proyecto | Qué tenía de particular | Qué aportó al kit |
|---|---|---|
| **ppsportmanagementarg** | el más maduro: `CLAUDE.md` de 677 líneas, hooks, MCP, ratchets, wiki enorme | **ratchets**, **hooks de pre-commit/pre-push**, `AGENTS.md` en inglés para Codex, reglas de AWS de solo lectura y secretos, exigir E2E en local |
| **cowork-app** | catálogo de hallazgos con IDs | **`anti-patterns.md` (`AP-*`)**, **`architectural-debt.md` (`AD-*`) con trigger**, protocolo de verificación de remediación, `testing-strategy`, `security-controls` |
| **futbot / futbot-v2** | trabajo de agente muy largo y autónomo | **`definicion-de-hecho.md`** (cuándo parar y cuándo no), **`decisiones-pendientes.md`**, modo validación de bots, pipeline de informes (`gen` + `postprocess` + `css` + `runtime`) |
| **hipismo** | skills nativas de Claude Code | **`tarea`, `avanzar`, `verificar` tal cual** — las mejores del conjunto |
| **laboratorio** | auditoría de UX con evidencia | `DESIGN_PROMPT` más evolucionado, Lighthouse + capturas a 320 px, la sección **«trampas del repositorio»** de `AGENTS.md` §7 |
| **sublimaciones** | linaje separado de los prompts | versiones más completas de `ARCHITECTURE`, `DATABASE`, `AUDIT`, `SECURITY`, `RAG`, `MASTER`, y `11_REQUIREMENTS` |
| **worldcup2026 / -main / wc2026 / wc2026_swat** | `CLAUDE.md` muy concreto de estructura Python | el estilo de «mapa del repositorio con una línea por módulo» |
| **APP_DUX · APP_Osasuna** | sin kit instalado | el caso que justifica que instalar sea **un comando** |
| **ia-template (v1)** | la base | el protocolo B.L.A.S.T., las plantillas en blanco, el catálogo de prompts |

---

## Prompts: versión canónica elegida

| Prompt | Origen elegido | Tamaño |
|---|---|---|
| `ARCHITECTURE_PROMPT.md` | sublimaciones | 34 KB |
| `DESIGN_PROMPT.md` | laboratorio | 36 KB |
| `CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` | cowork-app | 35 KB |
| `RAG_PROMPT.md` | sublimaciones | 29 KB |
| `DEVSECOPS_PROMPT.md` | cowork-app | 27 KB |
| `INFRA_ACCESS_PROMPT.md` | ppsportmanagementarg | 20 KB |
| `DATABASE_PROMPT.md` | sublimaciones | 17 KB |
| `PWA_PROMPT.md` | futbot-v2 | 13 KB |
| `AUDITOR_FORENSE.md` | sublimaciones | 11 KB |
| `SECURITY_PROMPT.md` | sublimaciones | 10 KB |
| `FORENSIC_AUDITOR_PROMPT.md` | cowork-app | 10 KB |
| `LEARNING_ASSISTANT_PROMPT.md` | cowork-app | 10 KB |
| `AUDIT_PROMPT.md` | sublimaciones | 9,6 KB |
| `APPSEC_PROMPT.md` | cowork-app | 8,9 KB |
| `MASTER_PROMPT.md` | sublimaciones | 7,6 KB |
| `CODEBASE_MEMORY_MCP_PROMPT.md` | cowork-app | 7,1 KB |
| `SAAS_PRODUCT_PROMPT.md` | laboratorio | 6,5 KB |
| `AWS_AGENT_TOOLKIT_PROMPT.md` | cowork-app | 6,3 KB |
| `I18N_PROMPT.md` | sublimaciones | 6,2 KB |
| `CLOUD_AGNOSTIC_PROMPT.md` | futbot-v2 | 5,0 KB |
| `STAFF_PROMPT.md` | futbot-v2 | 3,3 KB |

**Divergencia que motivó esto:** `DESIGN_PROMPT.md` tenía 93, 106, 351, 360, 416 y 552
líneas en seis proyectos. Seis linajes de la misma idea, y ninguno sabía de los otros.

`prompts/_dominio/` guarda los que son de un dominio concreto —análisis hípico, OCR de
programas de carreras, modelo táctico de fútbol—. **No se instalan nunca por defecto**; son
el ejemplo de cómo se escribe un prompt de dominio, no material reutilizable.

---

## Piezas nuevas, escritas para esta versión

Lo que ningún proyecto tenía todavía:

| Pieza | Por qué no existía |
|---|---|
| `AGENTS.md` como fuente única + punteros | la versión anterior asumía que había que duplicar por herramienta |
| `instalar.sh` | se copiaba a mano, y por eso derivaba |
| Los packs | los prompts existían sueltos, sin decir **cuándo** aplican |
| `agente/tools/ratchet.sh` genérico | los ratchets de ppsport estaban atados a npm y a Tailwind |
| `agente/tools/puerta.sh` | descubrir la puerta era conocimiento tácito |
| Skills `blueprint`, `auditar`, `informe`, `estimar` | existían como prompts sueltos o como skills de Antigravity, sin paridad con Claude Code |
| `protocolo/02_PUERTA_DE_CALIDAD.md` y `03_MEMORIA.md` | el mecanismo estaba en la cabeza de quien lo montó en ppsport |

---

## Lo que entró después del destilado

El corte de arriba es del **2026-08-22**. Esto se añadió trabajando en los proyectos, y se
anota aquí porque la regla del kit es que **una pieza entra cuando fue útil en dos sitios**.

| Pieza | Fecha | De dónde salió |
|---|---|---|
| `packs/tasas-de-cambio` | 2026-08-24 | **hipismo**, que ya leía el BCV. Se generalizó al portarlo a **pulso**: dos usuarios, luego va al núcleo del catálogo y no a un proyecto |
| · el arreglo de la cadena TLS | 2026-08-24 | hipismo. El BCV sirve una cadena incompleta; se suministra el intermedio de su propia extensión AIA. **Nunca** `rejectUnauthorized: false` |
| · el canario en Actions | 2026-08-24 | pulso. Un raspador no se rompe por la red: se rompe el día que rediseñan la página, y sin nadie mirando eso se descubre facturando |
| · **las incidencias** | 2026-08-26 | pulso, y era la mitad que faltaba: la tabla de tasas no distingue «no publicaron» de «no pudimos leerlo» |
| el fallo de `cheerio.text()` | 2026-08-24 | pulso. Concatena sin separador, así que en HTML minificado el euro heredaba la tasa del dólar. Corregido en los tres repositorios |
| la segunda mitad de `ratchet.sh` | 2026-08-23 | **futbot-v2**. Su trinquete no sólo impedía crecer: obligaba a bajar el número al mejorar. El del kit sólo hacía la mitad |
| `tools/plantillas.mjs` | 2026-08-26 | **el propio kit**, al descubrir que instalaba las hojas rellenadas de tres proyectos sin advertirlo |
| `verificar.sh` + su workflow | 2026-08-27 | **el propio kit**. Predicaba «un solo comando, y CI llama a ese mismo» —el encargo que se le dio a futbot-v2— y no se lo aplicaba |

---

## Cosecha del 2026-10-17 — cinco repos en foco

Corrida de `agente/tools/cosechar.mjs subir` contra hipismo, medical/pulso,
soccer-analyst/analisis, logrono-united y tasas-bcv-api — ver
`knowledge/informe-mejoras-kit-2026-10-17.html`. Cada hallazgo se revisó a mano antes de
integrarse: la herramienta compara rutas y tamaños, no intención, y marcó como «nuevo» un
fichero de **pulso** que resultó ser idéntico al del kit, sólo que en otra ruta.

| Pieza | De dónde salió | Qué cambió al integrarla |
|---|---|---|
| `packs/fiabilidad-pruebas` (nuevo) | **pulso**: `entorno-pruebas.mjs` nació de 146 commits que nunca pasaron por integración continua | la regla de la conexión local se generalizó (era `pulso_app@` + `APP_DATABASE_URL`, hoy cualquier conexión local sin `process.env` alrededor, con `--patron` para añadir la regla propia del proyecto) |
| · `suelo-cobertura.mjs` | **pulso** | prácticamente verbatim: ya era genérico — lee cualquier `lcov.info` |
| `colores-por-fichero.mjs` en `packs/frontend-web/detectores` | **hipismo**: `check-tokens.mjs`, nacido de 99 hex en 14 archivos | de un mapa `HEREDADOS` hardcodeado a un trinquete `baseline`/`validate` al estilo de `tamano.mjs`, con rutas y extensiones por `--ext` |
| `packs/frontend-web/e2e/robustez-visual.spec.ts` | **hipismo**: la función `probe()` de `mobile-audit.mjs` (818 líneas) | se extrajeron solo las sondas que `wcag.spec.ts` (axe) y `mobile-smoke.spec.ts` no cubrían ya — texto derramado, hojas de estilo muertas, acción bajo el pliegue, tablas con scroll lateral, CLS por ruta — y se migraron de Puppeteer a Playwright, el stack que el kit ya usa en este pack. Contraste, nombre accesible y salto de encabezado **no se copiaron**: ya los mide axe, y duplicarlos daría dos sitios que sincronizar |
| `packs/pwa-movil/audit-lighthouse.mjs` | **hipismo**: `audit-web.mjs` | `apps/web/dist` y el puerto pasaron de fijos a `--dist`/`--puerto`, con detección automática de la carpeta de build habitual |

**No se integró** `sports-provider-adapters` (analisis) ni `PULSO_AUDITORIA_FUNCIONAL_ARQUITECTONICA.md`
(pulso): el primero es dominio futbolístico puro, el segundo es el prompt de auditoría propio
de un solo proyecto. Ninguno de los dos generaliza.

> **Corrección (2026-10-18):** esta entrada decía que `preparar-contexto` (analisis) quedaba
> «pendiente de un segundo proyecto» antes de subir a núcleo. Eso era un error: la skill
> **ya estaba** en el kit, en `packs/orquestacion-agentes/skills/preparar-contexto/` —
> `cosechar.mjs` no la veía porque solo comparaba contra `nucleo/skills/`, nunca contra
> `packs/*/skills/`. analisis y futbot-web-app la tienen porque instalaron ese pack, no al
> revés. Corregido el propio `cosechar.mjs` el mismo día — ver más abajo.

---

## Cosecha del 2026-10-18 — elevenoffice y futbot-web-app (fuera de foco, revisión puntual)

Ver `knowledge/informe-mejoras-kit-2026-10-18.html`. elevenoffice es ppsportmanagementarg
—la referencia original del kit en backend y puerta de calidad (ver el destilado del
2026-08-22, arriba)— así que buena parte de lo suyo ya estaba dentro antes de empezar esta
pasada; lo interesante fue encontrar lo que **todavía** faltaba.

| Pieza | De dónde salió | Qué cambió al integrarla |
|---|---|---|
| `validar-i18n.mjs` — 5 patrones nuevos de voseo | **elevenoffice**: `validate-voseo.mjs` (cliente+servidor) | el validador YA existía en el kit (`packs/i18n/validar-i18n.mjs`) con un enfoque por raíz+sufijo; cubría el imperativo en **-AR** y el presente en **-ÉS**, pero no el imperativo en **-ER**/**-Ꭵ** (hacé, poné, vení…) ni las formas enclíticas (guardalo, fijate…). Se sumaron como reglas nuevas al array existente — nada se creó de cero |
| `validar-i18n.mjs uso --codigo` (nuevo) | **elevenoffice**: el chequeo AP-72 de `validate-i18n.mjs` | claves `t('a.b')` usadas en código y ausentes del locale — la paridad entre locales no lo ve porque la clave no existe en ningún lado para comparar |
| `esquema.mjs idempotencia` — regla `CREATE POLICY` | **elevenoffice**: `validate-migrations-idempotency.mjs` | una regla más en el array de `idempotencia`: una política sin su `DROP POLICY IF EXISTS` previo en el mismo archivo |
| `esquema.mjs manifiesto` (nuevo subcomando) | **elevenoffice**: `validate-schema-baseline.mjs` | `deriva` sin Postgres: compara la instantánea contra un manifiesto propio (sha256 + nº de migraciones + última), no contra la base viva — corre en cualquier CI |
| `supresiones-por-fichero.mjs` en `packs/frontend-web/detectores` | **elevenoffice**: `validate-any.mjs` | de rutas fijas (`server/src`) a raíces y extensiones por CLI, mismo trato que `colores-por-fichero.mjs` |
| `neutralidad.mjs` en `packs/saas-multitenant` (nuevo) | **elevenoffice**: `validate-tenant-neutrality.mjs` | la lista de nombres/códigos prohibidos, hardcodeada a P&P/SDG, pasó a un fichero de configuración que cada proyecto rellena (`neutralidad.prohibidos.ejemplo.json`) — no hay lista por defecto posible, el nombre del primer cliente de uno no significa nada para otro |
| `packs/instagram-marketing` (nuevo) | **terceros**: *The Instagram agent skill* de Jake Schincariol, MIT, <https://github.com/Jakeschincariol/instagram-agent-skill> | vendorizado completo, sin reescribir — trece skills. No es cosecha de la cantera: es contenido y marketing, no ingeniería de software, por eso vive en un pack de instalación explícita y no en núcleo. Sin actualización automática: si el repositorio original cambia, este pack queda atrás hasta que alguien lo vuelva a copiar |

**No se integró** `validate-journal.mjs` (ya cubierto por `esquema.mjs orden`, que de hecho
vino de este mismo proyecto) ni `check-tracked-secrets.mjs` (ya cubierto por `secretos.mjs`,
con más patrones). El `cloud-aws/PACK.md` de elevenoffice resultó ser una autorización
puntual del usuario para desplegar por el pipeline existente, no una mejora genérica — se
descartó explícitamente por contradecir `nucleo/AGENTS.md` §5.1.

De futbot-web-app, solo `preparar-contexto` (ya en el kit — ver la corrección arriba). El
resto de sus skills (`analisis`, `dataset`, `datos-opta`, `metricas`, `visualizacion`,
`ux-ui`) son de dominio futbolístico o específicas de ese proyecto.

**Dos puntos ciegos reales de `cosechar.mjs`, corregidos el mismo día:**

1. Solo comparaba `.claude/skills/`, nunca `.agents/skills/`. En elevenoffice había cinco
   skills que viven solo en `.agents/skills/` —`impeccable`, `design-taste-frontend`
   (ambas de terceros, no se integraron: licencia no verificada la primera, ninguna de las
   dos sale de la cantera), y `blast-new`/`blast-audit`/`staff-estimate` (versión v1 del
   protocolo B.L.A.S.T., ya superseded, ver `docs/v1-superado/`)— invisibles hasta ahora.
2. El lado del kit solo comparaba contra `nucleo/skills/`, nunca contra `packs/*/skills/`,
   lo que producía el falso positivo de `preparar-contexto` de la corrección de arriba.

`cosechar.mjs` ahora compara la unión de `.claude/skills` + `.agents/skills` contra la
unión de `nucleo/skills` + `packs/*/skills`, y reporta aparte cuándo las dos carpetas
locales del proyecto se desincronizaron entre sí.

También se amplió `instalar.sh`: las skills (de núcleo y de pack) se instalan como
**carpeta entera**, no solo `SKILL.md` — necesario para `instagram-marketing`, cuyas
skills traen scripts Python propios que antes se habrían quedado sin copiar.

---

## 2026-10-19 — el resto de los detectores de UI de elevenoffice, y subagentes para `avanzar`

Cuatro detectores que el informe del 2026-10-18 dejó «sin revisar a fondo» se integraron:

| Pieza | De dónde salió | Qué cambió al integrarla |
|---|---|---|
| `contrato-componente.mjs` (nuevo) | **elevenoffice**: `validate-dropdown-portals.mjs` (regex) y `validate-tooltips.mjs` (AST) | se consolidaron en una sola herramienta configurable: un rol ARIA o un `data-slot` solo puede vivir en su componente canónico, leído con el compilador de TypeScript en vez de `grep` |
| `reimplementacion-por-fichero.mjs` (nuevo) | **elevenoffice**: `validate-segmented.mjs` | de una firma de clases hardcodeada (`bg-surface-elevated`+`p-1`+`rounded-xl`) a reglas configurables, con el mismo trinquete por fichero que `colores-por-fichero.mjs` |
| `encabezados-de-menu.mjs` (nuevo) | **elevenoffice**: `validate-menu-headings.mjs` | de una lista de 28 rutas hardcodeadas al propio código fuente de ElevenOffice, a un fichero de configuración que cada proyecto declara |

Explícitamente **no** se integraron las tres notas de "patrón, no fichero" que el informe
del 2026-10-18 había sugerido para `cloud-aws`, `componentes-esquivados` (la mención de la
técnica AST) y `pwa-movil` (manifest de Vite) — decisión del usuario: sin nota, solo
herramienta cuando hay una.

`impeccable` y `design-taste-frontend` (las dos skills de terceros de elevenoffice) siguen
fuera: se confirmó que se descargaron de internet, sin más detalle de origen o licencia, y
sin eso no hay forma de saber si vendorizarlas está permitido.

Aparte: cuatro **subagentes** nuevos en `nucleo/agentes/` —`frontend` · `backend` ·
`verificador` · `documentador`— y la skill `avanzar` reescrita para delegar en ellos en vez
de hacer el trabajo en la misma sesión. Nace de que el usuario quería dejar de ser quien
reparte cada paso entre skills a mano; usa el contrato de delegación que ya existía, sin
usar, en `packs/orquestacion-agentes/contrato-delegacion.schema.json`. Solo Claude Code los
descubre — Antigravity, Codex y el resto siguen el mismo orden de roles en la misma sesión.

Y, el mismo día, `instalar.sh` aprendió a instalar subagentes **por pack**, no solo los de
núcleo (`packs/$p/agentes/*.md` → `.claude/agents/`) — necesario para el pack
`packs/marketing-contenido` (nuevo): cuatro roles —`marketing` · `editor-contenido` ·
`disenador` · `publicador-rrss`— que extienden la misma mecánica de delegación a contenido
y redes sociales. `publicador-rrss` nunca publica de verdad: entrega una cola para que una
persona apruebe, la misma frontera de `nucleo/AGENTS.md` §5.1 aplicada a redes sociales.
Si el proyecto también tiene `instagram-marketing`, estos subagentes usan sus trece skills
como herramientas; si no, trabajan con criterio general.

---

## 2026-10-20 — el sistema propio de `estudio-marca`, completo

`estudio-marca` no es uno de los once proyectos en juego: es otro espacio de trabajo del
usuario, con su propia arquitectura (`AGENTS.md` + punteros + `.claude/skills` y
`.agents/skills` en espejo) ya inspirada en la del kit, pero sin nada instalado de él. A
diferencia de `instagram-marketing` (de terceros, vendorizado con atribución), este es
trabajo **propio** del usuario — cosecha en el sentido estricto del término.

Nuevo pack `packs/estudio-marca`, con las siete skills tal cual (`estudio-marca` ·
`valores-marca` · `auditoria-color` · `paleta-marca` · `rutas-paleta` · `sintesis-paleta` ·
`hoja-paleta`), su `metodo/` (criterios de experto en valores de marca y color: roles,
umbrales WCAG, croma CIELAB para detectar neutros, simulación de daltonismo Machado 2009,
catálogo `AP-M*`), `plantillas/` y `herramientas/` — `color.py`/`colorlib.py`/`paleta.py`
(cálculo, sin dependencias) y `hoja_paleta.py` (genera el entregable HTML, con un decodificador
de PNG propio para muestrear el color de un icono sin PIL).

Lo único que cambió al integrarlo: las rutas. El original escribía en `proyectos/<slug>/`
dentro de su propio repositorio aparte; el pack escribe en
`knowledge/estudios-marca/<slug>/` del proyecto que lo instala, y cada referencia a
`herramientas/`, `metodo/` y `plantillas/` se prefijó con `agente/packs/estudio-marca/`. Las
reglas de la `AGENTS.md` original (solo lectura sobre el proyecto analizado, ninguna cifra
a mano, honestidad sobre los contras) se consolidaron en el `PACK.md`, en vez de traer una
segunda `AGENTS.md`. El caso de referencia real (`proyectos/elevenoffice/` del repositorio
original) es salida, no plantilla, y no se copió — mismo criterio que con los informes HTML
del propio kit.

---

## Lo que se dejó fuera, a propósito

- **`09_BLAST_PROTOCOL.md` y `10_AGENT_RULES.md`** — reemplazados por
  `protocolo/00_CICLO.md` y `01_REGLAS_DEL_AGENTE.md`, que dicen lo mismo en la mitad de
  espacio y añaden la fase de puerta que faltaba. Conservados en `docs/v1-superado/`.
- **`00_PROJECT_MAP.md`** — lo cubre `AGENTS.md` §3.
- **`08_ARCHITECTURE.md`** — lo cubre `knowledge/wiki/decisions.md` con ADRs.
- **Los informes HTML generados** de cada proyecto — son salida, no plantilla. Lo que sí
  subió es el **formato** y el post-procesador.
