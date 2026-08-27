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

## Lo que se dejó fuera, a propósito

- **`09_BLAST_PROTOCOL.md` y `10_AGENT_RULES.md`** — reemplazados por
  `protocolo/00_CICLO.md` y `01_REGLAS_DEL_AGENTE.md`, que dicen lo mismo en la mitad de
  espacio y añaden la fase de puerta que faltaba. Conservados en `docs/v1-superado/`.
- **`00_PROJECT_MAP.md`** — lo cubre `AGENTS.md` §3.
- **`08_ARCHITECTURE.md`** — lo cubre `knowledge/wiki/decisions.md` con ADRs.
- **Los informes HTML generados** de cada proyecto — son salida, no plantilla. Lo que sí
  subió es el **formato** y el post-procesador.
