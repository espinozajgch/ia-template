# ia-template — Kit de agentes

> Un kit reutilizable que define **cómo trabajan los agentes de IA** en cualquier proyecto:
> Claude Code, Gemini/Antigravity, Cursor, Copilot, Windsurf y Codex, con el mismo
> conocimiento y sin duplicarlo cinco veces.
>
> Destilado de trece proyectos reales. Lo que está aquí funcionó en al menos uno de ellos.

---

## Los tres problemas que resuelve

> Los tres salieron de comparar los proyectos que ya usaban este kit. Cada solución está
> escrita como la regla que la hace cumplirse sola, no como una recomendación.

**1 · El contexto duplicado se desincroniza.** El mismo texto vivía en `CLAUDE.md`,
`GEMINI.md`, `.windsurfrules`, `.cursor/rules/core.mdc` y `copilot-instructions.md`. Cinco
copias que había que editar a la vez, y nunca se editaban a la vez.

> **Ahora:** un solo `AGENTS.md`. Los cinco ficheros por herramienta son punteros de diez
> líneas que dicen «lee AGENTS.md» y solo añaden lo específico de su herramienta.
> **86 líneas de punteros en total**, frente a ~250 duplicadas cinco veces.

**2 · Copiar el kit entero llevaba 9.000 líneas irrelevantes.** Un proyecto de análisis
hípico acabó con el prompt de tácticas de fútbol; una app clínica, con el kit de AWS. Nadie
los leía, pero el agente sí — y cobraban su contexto.

> **Ahora:** núcleo ligero, siempre. Y **13 packs** que se instalan solo si aplican.

**3 · Las mejoras de cada proyecto no volvían al template.** El mismo archivo tenía 93, 106,
351, 360, 416 y 552 líneas en seis proyectos: seis linajes divergentes de la misma idea.

> **Ahora:** cada prompt tiene **una** versión canónica, elegida como la más evolucionada de
> los trece proyectos (trazabilidad completa en [`docs/DE-DONDE-SALIO.md`](docs/DE-DONDE-SALIO.md)).
> El instalador **nunca pisa** un fichero existente: la mejora vuelve al kit a mano y de
> forma consciente, no por accidente.

---

## Instalación

```bash
./instalar.sh --packs                          # ver qué packs hay y cuándo aplican
./instalar.sh ~/mi-proyecto frontend-web api-backend base-de-datos seguridad
```

Es idempotente y no sobrescribe nada sin `--force`. Lo que ya existía se reporta al final.

Después, en una sesión de agente dentro del proyecto:

```
skill blueprint      → lee el código, rellena AGENTS.md y knowledge/wiki/,
                       y solo pregunta lo que no puede deducir
```

---

## Qué instala

### Núcleo — siempre

```text
AGENTS.md                     fuente ÚNICA de contexto. Menos de 250 líneas, o sobra material
CLAUDE.md · GEMINI.md · .windsurfrules · .cursor/ · .github/ · .agents/
                              punteros de 10 líneas. NO se editan
.claude/skills/ · .agents/skills/
                              las 7 skills, mismo contenido para las dos herramientas
.claude/settings.json         hooks: el checklist de pre-commit y pre-push lo inyecta el
                              harness — el agente no puede olvidarse de un hook
.mcp.json                     grafo de código para descubrimiento
knowledge/wiki/               la fuente de verdad: 10 plantillas
agente/protocolo/             el ciclo, las reglas, la puerta de calidad, la memoria
agente/ci/                    4 plantillas de workflow, sin activar
agente/tools/                 8 verificadores ejecutables, probados contra repos reales:
                              ratchet · puerta · ciclos · tamano · secretos
                              esquema · cobertura · cosechar
```

### Las 7 skills

| Skill | Cuándo | De dónde salió |
|---|---|---|
| `blueprint` | una vez por proyecto, y al cambiar de rumbo | fusión de `blast-new` + `blast-audit` |
| `tarea` | llega algo nuevo, o lo actual resulta más grande | hipismo |
| `avanzar` | ejecutar el plan sin pedir permiso a cada paso | hipismo |
| `verificar` | **antes de cada commit que toque código** | hipismo |
| `auditar` | diagnosticar sin corregir | `blast-audit` + los prompts forenses |
| `informe` | el entregable lo lee alguien de fuera | ppsport · futbot · cowork |
| `estimar` | presupuestar, valorar, dimensionar | `staff-estimate` |

`tarea`, `avanzar` y `verificar` vienen tal cual de hipismo: son las mejores del conjunto
porque no traen listas de comandos, traen **cómo encontrarlos** — y así no caducan el día
que alguien añade un paso a la CI.

### Los 14 packs

| Pack | Se activa si |
|---|---|
| `frontend-web` | hay interfaz en navegador |
| `api-backend` | hay API, servicio o worker que atiende peticiones |
| `base-de-datos` | hay esquema propio y migraciones |
| `seguridad` | hay usuarios, datos de terceros o exposición a internet |
| `i18n` | la interfaz se muestra en más de un idioma |
| `cloud-aws` | la infraestructura vive en AWS |
| `cloud-agnostico` | no debe atarse a un proveedor |
| `datos-rag` | recuperación, embeddings, búsqueda semántica |
| `app-ia` | **el producto es** una aplicación de IA |
| `pwa-movil` | instalable, service worker, uso móvil real |
| `saas-multitenant` | varios clientes en la misma instancia |
| `monorepo` | el repositorio tiene más de un proyecto con su manifiesto |
| `bot-automatizacion` | algo actúa sin que nadie mire |
| `auditoria-informes` | se producen informes para alguien de fuera |

Cada pack trae: reglas con su porqué · ratchets sugeridos · una regla de Cursor **por glob**
(que no gasta contexto cuando no toca) · un checklist de cierre · y los prompts que necesita.

---

## Las tres piezas que más cambian el resultado

Son las que estaban dispersas en un solo proyecto cada una, y ahora están en el núcleo.

### 1 · Los ratchets — convivir con la deuda sin que crezca

Un umbral que **solo puede mejorar**. Permite tener 340 colores crudos y garantizar que
mañana no haya 341, sin bloquear el trabajo prohibiéndolos de golpe.

```bash
agente/tools/ratchet.sh baseline colores "grep -rn 'bg-white\|text-gray-' src/"
agente/tools/ratchet.sh validate colores      # falla, y dice qué ocurrencia es nueva
```

El camino completo: **hallazgo → patrón con ID `AP-*` → detector → ratchet → regresión
imposible.** Ahí es donde una lección deja de necesitar que alguien la recuerde.

*(De ppsportmanagementarg, el proyecto más maduro del conjunto.)*

### 2 · No parar por decisiones ajenas

En una revisión real, de veinte paradas de un agente en una sesión **solo una era
necesaria**. Y la consecuencia de parar de más no es la lentitud: es que **el usuario acaba
siendo el planificador**.

La regla: al encontrar una decisión que no es del agente, se anota en
`decisiones-pendientes.md` y se sigue con todo lo que no dependa de ella. Parar solo si de
verdad no queda nada ejecutable.

*(De futbot-v2 y de las skills de hipismo.)*

### 3 · IDs estables para lo que se repite

`AP-*` anti-patrones · `AD-*` deuda aceptada · `ADR-*` decisiones · `L-*` lecciones ·
`D-*` pendientes.

Con la regla que hace útiles las auditorías: **un hallazgo que corresponde a un `AD-*`
vigente no se re-reporta.** Se cita el AD y se revisa su *trigger*. Sin eso, cada auditoría
redescubre lo mismo y el informe pierde credibilidad.

*(De cowork-app.)*

---

## Cómo crece el kit

```
Corriges al agente
     → lessons.md (L-*)
     → si se repite y tiene detector: anti-patterns.md (AP-*)
     → si el detector se automatiza: ratchet
     → la regresión se vuelve imposible
```

Y **de vuelta al kit**, que ya no es a mano:

```bash
node agente/tools/cosechar.mjs
```

Compara el proyecto con el kit en las dos direcciones y detecta los verificadores propios
que el proyecto inventó. **Propone, no sube nada solo**: una pieza entra en el núcleo
cuando ha sido útil en **dos** proyectos distintos; con uno, va a un pack.

Ese era el paso que faltaba — no había camino de vuelta, y por eso el kit se quedó atrás
mientras los proyectos avanzaban.

---

## Principios

1. **Una sola copia de cada cosa.** Lo duplicado se desincroniza — es cuestión de tiempo.
2. **Solo lo que aplica.** Un pack que no aplica es contexto que se lee y no sirve.
3. **Data-First.** El esquema, antes que el código.
4. **Nunca adivinar.** Sin contexto se pregunta; no se improvisa.
5. **Conocimiento acumulativo.** Cada sesión deja el proyecto más inteligente.
6. **Impacto mínimo.** Se toca lo necesario.
7. **Fallar con claridad.** Un error ruidoso es mejor que un resultado silenciosamente falso.
8. **Números, no adjetivos.**
9. **Lo irreversible es del usuario.** Autonomía es no preguntar por el *cómo*.

---

## Informes

Los entregables del kit son **ficheros HTML autocontenidos** en `knowledge/`, uno por
corrida y con la fecha: se abren sin conexión, se versionan con el código y se comparan
entre sí. Un archivo nuevo por corrida; el anterior no se sobrescribe.

| Informe | Qué contiene |
|---|---|
| [`informe-comparativo-repos-2026-08-22.html`](knowledge/informe-comparativo-repos-2026-08-22.html) | Auditoría de los 13 repositorios: quién resolvió mejor cada problema y las 15 piezas a cosechar |
| [`informe-capacidades-reutilizables-2026-08-22.html`](knowledge/informe-capacidades-reutilizables-2026-08-22.html) | Análisis funcional: qué sabe hacer cada repo — backend, frontend y diseño — y qué se puede compartir |
| [`informe-quien-gana-en-que-2026-08-23.html`](knowledge/informe-quien-gana-en-que-2026-08-23.html) | Comparativa por dimensión: front, back, informes PDF, seguridad y datos — quién gana cada una y por qué |
| [`informe-mejoras-kit-2026-08-22.html`](knowledge/informe-mejoras-kit-2026-08-22.html) | CI, verificadores estructurales y detectores de ratchet — con los hallazgos reales que encontraron |
| [`informe-mejoras-kit-2026-08-22-b.html`](knowledge/informe-mejoras-kit-2026-08-22-b.html) | Cobertura por capa, validadores de migración y pack monorepo |
| [`informe-mejoras-kit-2026-08-22-c.html`](knowledge/informe-mejoras-kit-2026-08-22-c.html) | Despliegue OIDC+SSM, aislamiento con prueba de fuga y la suite e2e — con lo que apareció al ejecutarlos |
| [`informe-mejoras-kit-2026-08-22-d.html`](knowledge/informe-mejoras-kit-2026-08-22-d.html) | Las seis últimas piezas y el camino de vuelta al kit — cosecha completa |

## Documentación

- [`docs/DE-DONDE-SALIO.md`](docs/DE-DONDE-SALIO.md) — qué proyecto aportó cada pieza y por qué se eligió esa versión
- [`docs/MIGRAR.md`](docs/MIGRAR.md) — cómo pasar los proyectos que ya tienen la versión anterior
- [`docs/v1-superado/`](docs/v1-superado/) — lo que el núcleo nuevo reemplaza, conservado tal cual

---

## Trabajar en el kit

Este repositorio **es** el kit; no se instala sobre sí mismo. Lo que hay que saber para
tocarlo está en [`AGENTS.md`](AGENTS.md).

Regla de oro al añadir algo: **una regla entra en el núcleo cuando ha sido útil en dos
proyectos distintos.** Si solo lo fue en uno, va a un pack. Si es de un dominio concreto,
va a `prompts/_dominio/` y no se instala por defecto.
