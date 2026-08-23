# Formato de los Informes de Auditoría Forense (HTML)

> Fuente de verdad del **formato y las reglas de interactividad** de los informes
> `knowledge/informe-auditoria-forense-YYYY-MM-DD.html`. Leer antes de generar,
> regenerar o re-auditar un informe. El contenido (hallazgos) cambia; **el formato
> y estas reglas NO se degradan entre versiones.**
>
> ⚠️ **Alcance: SOLO la due diligence integral.** Estas reglas (R1..R14), su normalizador
> y su taxonomía **por categoría técnica** (Frontend/Backend/BaseDatos/DevOps…) **NO
> aplican a los informes independientes de seguridad** (`knowledge/informe-seguridad-*.html`),
> que se organizan por **severidad + OWASP** con el diseño base de `knowledge/` y sin
> normalizador. Ésos los gobierna **`knowledge/wiki/informe-seguridad-formato.md` (S1..S11)** y su propio normalizador `informe-seguridad-postprocess.py`.
> Aplicar este formato a un informe de seguridad fue un error real de la corrida 2026-07-21.
>
> ### El ASPECTO VISUAL lo manda `informe-diseno-estandar.md`
>
> Este documento define **qué secciones existen, qué se deriva de qué y cómo se comporta
> la interactividad** (R1..R14). El **aspecto** — tokens, portada, tipografía, componentes,
> paleta, impresión — es el **mismo sistema de diseño que el resto de informes de
> `knowledge/`** y se especifica en **`knowledge/wiki/informe-diseno-estandar.md`**,
> con plantilla de referencia `knowledge/informe-tecnico-arquitectonico.html`.
>
> **Un informe forense NO lleva un diseño propio.** Se parte del bloque `<style>` de la
> plantilla y se reutilizan `.cover`, `.section-header`, `.kpi-card`, `.card`, `.tbl-wrap`,
> `.badge-*`, `.doc-list`, `.info-box` y `.footer`. Las severidades se mapean a la paleta
> base: Alto → `--red-600`, Medio → `--accent-600`, Bajo → `--brand-600`,
> Observación → `--slate-600`. Modelo: `knowledge/informe-auditoria-forense-2026-07-22.html` (Observación → `--slate-600`).

## Archivo y nomenclatura

- Un archivo HTML autocontenido por corrida: `knowledge/informe-auditoria-forense-YYYY-MM-DD.html`.
- Sin dependencias externas: todo el CSS y el JS van inline en el mismo `.html`.
- Cada re-auditoría crea un **archivo nuevo con la fecha de hoy**; no se sobrescribe el anterior.

## Estructura de secciones (orden fijo)

| § | Título | Naturaleza |
|---|---|---|
| Portada | Cover (fecha, metodología, alcance, score global) | Derivada (alcance/score) |
| §1 | Resumen Ejecutivo | Prosa + cifras derivadas |
| §2 | Dashboard (KPIs de severidad) | **Derivada** |
| §3 | Hallazgos por Categoría (matriz sev×categoría) | **Derivada** |
| §4 | Hallazgos por Archivo | **Derivada** |
| §5 | Top 20 Riesgos | **Derivada** |
| §6 | Quick Wins (NUEVOS de esfuerzo Bajo) | **Derivada** |
| §7 | Roadmap de Corrección (fases por severidad) | **Derivada** |
| §8 | Scorecard Final (scores por dominio + global) + **Camino a 100** (R14) | Juicio + derivada |
> **El listado de hallazgos NO es una sección propia: vive DENTRO de §3** (ver R15).
> Las corridas anteriores lo publicaban como §9/§10 al final del documento, a seis
> secciones de distancia de los filtros que lo gobiernan. El informe termina en §8.

Las tarjetas del listado de §3 (R15) son la **fuente machine-readable**: cada una lleva
`data-sev`, `data-est`, `data-cat`, `data-file`. **Toda sección "Derivada" se recalcula
desde esas tarjetas** — nunca se editan sus números a mano de forma independiente.

## REGLAS DE FORMATO (no degradar entre versiones)

### R1 — El filtro de severidad del Dashboard NO redirige
Hacer clic en un KPI de severidad de §2 (Críticos/Altos/Medios/Bajos/Observaciones)
**solo filtra in-place**; NO hace scroll/redirect. Desde R15 el listado vive dentro de
§3, inmediatamente bajo los filtros, así que **ningún eje hace `scrollIntoView`**: el
efecto del filtro ya es visible sin desplazamiento. (Antes, con el listado como §9,
categoría y archivo compensaban con auto-scroll; eso queda eliminado.)

### R2 — "Todo hacia abajo" se filtra con la severidad
Al elegir una severidad reaccionan **el listado de §3** (las tarjetas de hallazgo), la
matriz de §3 (recuento por celda + fila TOTAL, ocultando filas en 0) y la tabla de §4
(las filas se ocultan si ningún hallazgo superviviente matchea). Regla CSS de soporte:
`tr.hidden{display:none!important}` (las filas `<tr>` no son tarjetas).

### R3 — NO existe el estado REMEDIADO / CORREGIDO en el informe
Los hallazgos remediados **se eliminan por completo** del informe (no se muestran, ni
como tarjeta ni como badge ni como botón) — un estado "remediado/corregido" visible
genera confusión: un hallazgo ya arreglado no es un riesgo, ni un quick-win, ni una fila
del roadmap. Solo conviven dos estados: **NUEVO** (`data-est="NEW"` / `data-new="1"`) y
**CONOCIDO/deuda** (`data-est="KNOWN"` / `data-new="0"`, AD-x/AP-x). Quedan **prohibidos**
y no deben reintroducirse: el badge tri-estado de §2, el botón "Remediados"/"✓ Corregidos"
de filtros, los badges `✓ CORREGIDO` (`.rflag.rfix`) y el atributo `data-rem="CORREGIDO"`.
Si una corrida los emite (caso 2026-06-26), **eliminar las tarjetas corregidas y recomputar
TODAS las secciones derivadas (R6)** antes de publicar. Un hallazgo que se documenta como
deuda (no se arregla) NO es "corregido": va como CONOCIDO, sin badge verde.

### R4 — Los botones de estado viven solo en §3
La barra `Todos / Nuevos / Conocidos` (`.estbar`) está **únicamente** en el toolbar de
§3. No duplicar como badges en §2.

### R5 — §3 totaliza cada columna
La tabla de §3 termina en una fila `<tr class="cattot">` que suma **Total** y cada
columna de severidad (Crít./Alto/Medio/Bajo/Obs.). Se recalcula en `renderCat()` y
respeta los filtros activos (estado/severidad). No es clickeable (no lleva `data-cat`).

### R6 — Consistencia total al regenerar
En cada (re)generación, recomputar **desde las tarjetas supervivientes**: §2 KPIs,
§3 matriz+total, §4 por-archivo, §5 top riesgos, §6 quick wins, §7 roadmap, alcance de
portada, score global de §8 y las cifras del §1. Un número que no cuadre con el conteo
real de tarjetas es un bug, no una opción.

### R7 — Secciones e interactividad
- **Toda sección `<h2>` es colapsable** — clic en el título pliega/despliega todo su
  contenido hasta el próximo `<h2>` (chevron ▾/▸ vía `h2::before`, clase `.collapsed`).
  Esto aplica **independientemente del layout/tema** que use el informe (tarjetas
  `.fcard` con `h3.cath`, o tarjetas `.finding` con filtros `data-f`). Es una **regla
  que NO se degrada**: cada (re)generación debe incluir el CSS + JS de colapsado.
  El `<h3 id="listado">` de §3 no colapsa por separado: pertenece a §3 y se pliega con ella.
- Filtros combinables (severidad + estado + categoría + archivo) con barra inferior
  `#fbar` para limpiar chips individuales o todo.
- En `@media print`: se expande todo lo oculto (incluidas secciones colapsadas, vía
  `beforeprint`/`afterprint` o reglas CSS) y se esconde `#fbar`/`.filters`.

### R8 — Tema visual CLARO obligatorio (NO dark mode)
El informe usa **tema claro**, nunca dark mode. Fondo claro, texto oscuro. Paleta base:
`--bg:#f1f5f9` · `--panel:#ffffff` · `--panel2:#f8fafc` · `--ink:#0f172a` ·
`--mut:#64748b` · `--bd:#e2e8f0` · `--acc:#1d6fa5`. La portada/cover (`.head`/`.cover`)
es el **único** elemento con fondo oscuro: gradiente de marca
`linear-gradient(135deg,#0b3d5c,#1d6fa5)` con texto blanco. Los bloques de evidencia
`<pre>` pueden ir en navy oscuro (`#0f172a`) por contraste de código (igual que `pre.ev`
del estilo canónico). Cualquier generación que emita variables/colores oscuros de fondo
es un **bug de formato**: redefinir `:root` a la paleta clara y sobreescribir los
literales oscuros. Las paletas crudas de severidad/estado del "Mapa de estilos" son las
válidas.

### R9 — §1 sin subsección "Conclusiones clave"
El Resumen Ejecutivo (§1) es **solo prosa** (1–3 párrafos) + cifras derivadas. **No** se
añade una subsección `<h3>Conclusiones clave</h3>` con bullets: duplica el contenido del
párrafo y de §5/§7. Si una generación la incluye, eliminarla.

### R10 — Filtros en DOS EJES: Estado (superior) × Severidad
La barra de filtros tiene **dos grupos**, no una fila plana mono-select:
1. **Estado** (grupo superior, "controla lo de abajo"): `Todos` · `Solo nuevos` · `Deuda
   técnica`. Es un eje **binario**: un hallazgo es **NUEVO** (`data-new="1"`) **o** es
   **DEUDA TÉCNICA** (`data-new="0"`), nunca ambos.
2. **Severidad** (grupo inferior): `Todas` · `Críticos` · `Altos` · `Medios` · `Bajos` ·
   `Obs.`.

Los dos ejes se **combinan con AND** (p. ej. Deuda técnica + Medios). Al cambiar el
**Estado**, los **conteos del grupo Severidad se recalculan** sobre el subconjunto del
estado elegido (`recountSev()`) — por eso el Estado es "superior". Reglas de modelo:

- **NUEVO se respeta — NO se degrada a deuda técnica de oficio.** Un hallazgo detectado en
  la corrida actual es **NUEVO** (`data-new="1"`, badge azul `NUEVO · H-xxx`) y **permanece
  NUEVO** hasta que **manualmente** se lo mueva a deuda técnica. El normalizador
  (`strip_corrected_and_reclass`) **NO** convierte `data-new="1"` → `data-new="0"` salvo que
  el hallazgo esté explícitamente marcado `data-rem="DOCUMENTADO"`. Un informe puede y debe
  publicar `nuevos > 0`.
- **Mover NUEVO → Deuda técnica = marcarlo `data-rem="DOCUMENTADO"`** (típicamente al
  asignarle una entrada AD-x/AP-x del catálogo). Solo entonces pasa a `data-new="0"` y al
  badge ámbar `▣ Documentado · <ref>`. Es una acción deliberada de triage, no automática.
- **"Deuda técnica" = "Documentado" ∪ "Catalogado".** La deuda agrupa lo ya catalogado
  (AD-1..26, badge gris `Catalogado · AD-x`, `data-new="0"`) y lo documentado/triado
  (AD-27.., badge ámbar `▣ Documentado · AD-x`, `data-new="0"`). Ambos filtran bajo Deuda
  técnica. **No hay** botón/eje separado "Documentados".
- **Lo CATALOGADO (badge `Catalogado · AD-x`) no puede ser "nuevo".** Si una corrida marca
  un finding a la vez catalogado y `data-new="1"`, es un bug: o es nuevo (badge `NUEVO`,
  sin ref AD-x) o es deuda catalogada (`data-new="0"`). Lo que sí es válido y esperado es un
  hallazgo NUEVO **sin** ref de catálogo todavía.
- "Corregido" no existe como estado (R3): se elimina.
- En el layout `.fcard`/`.estbar` el discriminante equivalente es `data-est` (`NEW`/`KNOWN`,
  donde `KNOWN` = deuda técnica). El badge de tarjeta puede seguir distinguiendo "Catalogado
  AD-x" vs "Documentado AD-xx" como sub-info, pero **ambos filtran bajo Deuda técnica**.

### R15 — El LISTADO de hallazgos vive DENTRO de §3, inmediatamente bajo sus filtros

**Regla dura, no negociable.** Las tarjetas de hallazgo **no** son una sección aparte al
final del documento (`§9 Hallazgos Detallados` / `§10 Deuda Conocida`): van **dentro de
§3 «Hallazgos por Categoría»**, en este orden fijo:

```
§3  ├─ .filters      (Estado × Severidad — sticky)
    ├─ #cattab       (matriz sev × categoría + fila TOTAL)
    └─ #listado      (h3 + las tarjetas .finding)   ← el listado, AQUÍ
```

**Motivación.** El control y lo controlado tienen que estar juntos. Con el listado como
§9, elegir «Críticos» o clicar una categoría filtraba algo que el lector no veía sin
recorrer seis secciones, y obligaba a un `scrollIntoView` compensatorio que peleaba con
R1 (el filtro de severidad no debe redirigir). Con el listado bajo los filtros, el efecto
es **inmediato y visible**: no hace falta scroll automático de ningún eje.

Reglas derivadas:

- **Un solo listado**, no dos. NUEVO y DEUDA TÉCNICA se distinguen por el eje Estado de
  R10 y el badge de la tarjeta, **no** separando las tarjetas en dos secciones. Queda
  prohibido reintroducir «§10 Deuda Técnica Conocida» como sección hermana.
- El `<h3 id="listado">` lleva un **contador vivo** del número de hallazgos visibles, que
  se recalcula con cada cambio de filtro (`Estado × Severidad × Categoría`).
- **Ningún filtro hace `scrollIntoView`.** R11 decía que categoría y archivo conservaban
  auto-scroll a §9; con el listado dentro de §3 eso deja de aplicar y se elimina.
- El informe **termina en §8 Scorecard** + footer. No hay §9, §10 ni §11.
- Sigue valiendo que las tarjetas son la fuente machine-readable (`data-sev`, `data-est`,
  `data-new`, `data-cat`, `data-file`) y que §2/§3-matriz/§4/§5/§6/§7 se derivan de ellas (R6).

> ### ⚠️ El normalizador NO gobierna el contrato actual — comprobado el 2026-08-07
>
> Desde la corrida del 2026-08-06 los informes se emiten con **`<article class="finding">`**
> (R15). `informe-auditoria-postprocess.py` solo sabe reescribir el contrato viejo,
> `<div class="finding">` dentro de `<div id="findings">`. Y hasta hoy su puerta de entrada
> contaba **solo la forma vieja**, así que un informe entero de 31 hallazgos salía por
> `SKIP (sin tarjetas .finding)` **con código 0** — y «SKIP» se lee como «normalizado»,
> que es exactamente lo contrario de lo que había pasado.
>
> Corregido: ahora distingue *sin tarjetas* (SKIP, código 0) de *tarjetas que no encajan en
> el contrato* (**ABORT, código 2**, sin escribir nada). Las dos corridas emitidas con
> `<article>` abortan limpiamente y dejan el fichero intacto.
>
> **Consecuencia práctica:** mientras el normalizador no se adapte al contrato nuevo,
> **R1..R17 se verifican a mano** y hay que decirlo en el informe. La corrida del
> 2026-08-07 se validó con 18 comprobaciones automáticas —HTML parseable, KPIs contra el
> conteo real de tarjetas, `Σ §4 == total`, fila TOTAL de §3, ocho secciones sin §9+,
> listado y filtros dentro de §3, tema claro, sin estado «corregido», contadores, «Camino a
> 100», toolbar y portada, colapsables, sin recursos externos, sin secretos, fecha y commit
> explícitos, limitaciones visibles—.

> **Aviso sobre el normalizador (2026-07-21).** `informe-auditoria-postprocess.py` está
> escrito contra el contrato DOM antiguo (`<div id="findings">`, `class="ftitle"`,
> `<div><b>Archivo</b><code>`, `<h2 id="sN">` sin atributos) y recompone secciones cortando
> por offsets de string. Sobre un HTML que no cumple ese contrato **no falla: corrompe** —
> en la corrida del 2026-07-21 reportó `total=0` y aun así duplicó las 60 tarjetas a 120
> (168 KB → 317 KB). Además su `remove_section9` borra desde `<h2 id="s9">` hasta el footer,
> lo que con esta estructura se llevaría el listado entero si alguien volviera a numerarlo
> como §9. **Antes de volver a correrlo hay que arreglarlo para que aborte cuando
> `parse_findings` devuelve `None`**, en vez de seguir transformando a ciegas. Mientras
> tanto, verificar R1..R15 a mano y no dar por bueno un «normalizado» sin comprobar el
> conteo de tarjetas contra los KPIs.

### R11 — Los filtros viven en §3 y mandan sobre TODO lo de abajo
El **componente de filtros se ubica dentro de §3** ("Hallazgos por Categoría"), justo bajo
su `<h2>` (sticky). No va en una sección separada de "listado". Además:

- **Las filas de la matriz de categorías son clicables y de selección MÚLTIPLE**
  (`<tr class="catrow" data-catrow="X">`): cada clic agrega/quita esa categoría del filtro
  (`fCats` es un array; vacío = todas). Las filas seleccionadas quedan resaltadas (`.on`) y
  aparece en la barra una píldora por cada categoría activa (`.catpill`, con ✕ propio) más
  un "limpiar". El filtro de categoría es **OR** (muestra hallazgos de cualquiera de las
  seleccionadas).
- El filtro combinado **Estado × Severidad × Categoría(OR)** afecta el **listado que vive
  bajo ellos dentro de §3** (R15) **y reconstruye en vivo la tabla §4 "Hallazgos por
  Archivo"** (`#filetab`) desde los hallazgos visibles.
- **La matriz de §3 se re-filtra por Estado × Severidad** (`recountMatrix()` recomputa
  celdas + TOTAL y **oculta filas en 0**), invocada desde `setEstado` y `setSev`. La
  **categoría NO oculta filas de la matriz** — debe seguir siendo seleccionable para poder
  marcar varias; por eso la categoría sólo resalta filas y filtra el contenido de abajo.
- Al cambiar el **Estado** se recalculan también los conteos del grupo Severidad.
- Cada `.finding` lleva `data-file` (para el rebuild de §4); §4 usa `<table ... id="filetab">`.

### R12 — Sin banner de remediación ni §9 Anexos
- **No va el banner verde de remediación** (`.rembanner`, "N/N hallazgos remediados · X
  corregidos · Y documentados…"). Es ruido de proceso, no parte del informe.
- **No va la §9 "Anexos / Inventarios"** (inventarios de módulos/tablas/endpoints). El
  informe termina en §8 Scorecard + footer. Quitar también su link `#s9` del índice.
- Ambas las impone el normalizador (`remove_rembanner` / `remove_section9`).

### R13 — Los hallazgos MITIGADOS se listan pero NO cuentan en el conteo general
Un hallazgo **mitigado** (`data-rem="MITIGADO"`, badge neutro `◑ Mitigado · <ref>`) es aquel
cuyo **vector principal ya está cubierto**, aunque un residual documentado siga existiendo — p.
ej. `xlsx` pineado a un tarball CDN (H-059): el hash **SRI** del lockfile cubre el *tampering*, y
mover al registry npm sería **peor** (versión congelada con CVEs); el único residual es la falta de
alerting automático de CVEs, un tradeoff aceptado. No es "corregido" (el residual existe) ni "deuda
abierta" (no hay acción segura pendiente).

Es un **tercer estado de remediación**, entre el CONOCIDO/abierto y el CORREGIDO de R3:

- **Se LISTA** como tarjeta informativa (a diferencia de R3, que ELIMINA lo corregido), con el
  badge neutro slate `◑ Mitigado` — distinto del ámbar `▣ Documentado` y del verde prohibido
  `✓ Corregido`. Lleva `data-new="0"`.
- **Es un cuarto botón del eje Estado**: `Todos` · `Solo nuevos` · `Deuda técnica` · **`Mitigados`**.
  Los mitigados están **OCULTOS por defecto** — no aparecen con `Todos`/`Nuevos`/`Deuda`, solo al
  elegir el estado **`Mitigados`** (así no ensucian el listado). Entran a `ALLF` (para poder
  filtrarlos), pero `matchEst` los excluye salvo cuando `fEst==='mitigado'`. Al cargar la página, un
  init (`recountSev();recountMatrix();rebuildFile();applyF()`) aplica el estado por defecto → los
  mitigados quedan ocultos de arranque y la matriz se renderiza desde el set filtrado (no del valor
  server-rendered).
- **NO suma al conteo general (portada/§2/§3-TOTAL/§4/§5/§6/§7)**: con cualquier estado ≠ `Mitigados`
  quedan fuera de los agregados, para que el número refleje solo deuda/riesgo abierto. Al elegir
  `Mitigados`, la matriz y los conteos de severidad se recomputan sobre ESE subconjunto (informativo).
- **Cuándo marcar MITIGADO** (acción deliberada de triage, no automática): solo cuando el vector
  principal esté cubierto por un control verificable y el residual sea un tradeoff aceptado/inevitable.
  Si hay una acción pendiente segura, es deuda **abierta** (Catalogado/Documentado), no mitigado.
- Lo impone el normalizador: `clean_badge` (badge slate + `data-new=0`), `recompute_derived`
  (excluye `rem=="MITIGADO"` del conteo general y expone su cuenta para el botón), el botón
  `Mitigados` de `FILTERBAR`, y el `matchEst` + init del runtime.

### R14 — §8 SIEMPRE incluye la tabla "Camino a 100" (por qué cada dominio no está en 100)

**Obligatorio en todo informe.** Debajo del gauge de scores, §8 lleva una tabla **"Camino a 100 — qué falta por categoría"** con **una fila por cada dominio del scorecard** (Arquitectura, Backend, Frontend, Seguridad, Base de Datos, DevOps, Cloud, UX/UI, Testing, Escalabilidad, Mantenibilidad).

Motivación: un dominio con **cero hallazgos abiertos** igual puntúa <100, y sin esta tabla el lector no entiende por qué (confusión real y recurrente del stakeholder). El puntaje **no es** `100 − hallazgos_abiertos`: es un juicio holístico que descuenta (a) **deuda catalogada AD-\* que sigue abierta** en ese dominio y (b) **verificación que ningún gate de código alcanza** (lectura con NVDA/VoiceOver real, DR restore-drill en prod, prueba de carga, pentest externo). Esta tabla hace ese descuento **explícito y auditable**.

Cada fila DEBE tener estas columnas:

| Columna | Contenido |
|---|---|
| **Categoría** | nombre del dominio |
| **Hoy** | su score actual del gauge |
| **Qué la topa (deuda AD-\* abierta)** | lista de `AD-XX` **solo abiertos** (respetar `[RESUELTO]` — un AD resuelto NO se lista) + gaps de verificación no-código |
| **Para 100** | acción concreta que cerraría la brecha (retirar la deuda / correr la verificación manual) |

Reglas de la tabla:

- **Solo deuda ABIERTA.** Un `AD-*` marcado `[RESUELTO ...]` en `architectural-debt.md` **no aparece**. Es responsabilidad del generador cross-checkear el estado real, no arrastrar de una corrida anterior.
- **Marcar las DECISIONES intencionales.** Los `AD-*` que son tradeoffs deliberados (p. ej. AD-13 Zod compartido, AD-34 validación de dominio, AD-36 alta 2-pasos, AD-39 bypass super-admin) se anotan como *«decisión»* — retirarlos para forzar 100 no necesariamente conviene.
- **Cerrar con el matiz del techo:** una frase final aclara que **100 = "cero deuda aceptada + todas las verificaciones manuales hechas"**, un ideal, no una meta realista para un sistema vivo; 90-92 con 0 hallazgos abiertos y deuda conocida bajo control es un estado sano.
- Es **autoral** (juicio, como los scores del gauge) — el postprocesador no la genera ni la borra, pero **no debe eliminarse** entre regeneraciones. Va dentro del `<div class="panel">` de §8, después del `<div class="gauge">`.

## Enforcement — normalizador idempotente (NO depender del agente generador)

El formato **no se confía** a que el agente que genera el informe siga estas reglas (varias
corridas produjeron dark mode, "Conclusiones clave", badges "Corregido" y filtros fuera de
§3). La fuente de verdad ejecutable es:

```bash
python3 knowledge/wiki/informe-auditoria-postprocess.py knowledge/informe-auditoria-forense-<fecha>.html
```

`informe-auditoria-postprocess.py` es **idempotente** y fuerza R3/R6/R7/R8/R9/R10/R11/R12/R13
sobre cualquier HTML del formato dark `.finding`/`data-*`: tema claro, sin "Conclusiones
clave", sin banner de remediación ni §9 Anexos, elimina CORREGIDO + recomputa derivadas
(dashboard, §3, §4, §5, §6, §7), reclasifica **solo lo marcado `DOCUMENTADO`** →deuda técnica
(**respeta NUEVO**: no degrada `data-new="1"` salvo `data-rem="DOCUMENTADO"` — ver R10),
**excluye los `MITIGADO` de todos los agregados dejándolos listados** (R13),
reubica/reestructura los filtros en §3 con filas clicables (categoría multi-select), y
**normaliza el badge de estado de cada hallazgo** (`clean_badge`): una sola etiqueta coherente
—`NUEVO · <ref>` (azul, hallazgo nuevo), `Catalogado · <ref>`, `▣ Documentado · <ref>`,
`◑ Mitigado · <ref>` (slate, R13) u `Observación de control`—. Un hallazgo NUEVO conserva su
badge azul; **solo** los catalogados y los documentados llevan, respectivamente, el badge gris
y el ámbar; el mitigado, el slate neutro.
**Correrlo es el último paso de toda (re)generación** (ver `llm-wiki/FORENSIC_AUDITOR_PROMPT.md`).
La ejecución está integrada en el procedimiento de generación; no existe un hook
implícito que modifique archivos al escribirlos.

## Procedimiento de re-auditoría / regeneración

Cuando "otro agente arregló issues" o cambia el código, **regenerar** así:

1. **Extraer** las tarjetas NUEVAS (§9) del informe previo con sus `data-*` + título +
   `Esfuerzo` + `archivo:línea`.
2. **Verificar cada hallazgo contra el código ACTUAL** (fan-out de sub-agentes
   read-only, un lote por dominio/área). Veredicto por hallazgo: `FIXED` / `PRESENT` /
   `PARTIAL`, con evidencia `archivo:línea` de lo que el código hace ahora. Los paths
   del informe pueden venir en minúsculas — resolver al `camelCase` real.
3. **Eliminar los `FIXED`** del dataset (R3). `PARTIAL` se mantiene como `PRESENT`.
4. La **deuda CONOCIDA (§10) no se re-verifica hallazgo por hallazgo**: está gobernada
   por ratchets (AD-8..AD-24 / AP-x) y solo se *marca*. Se arrastra salvo evidencia
   directa de que una entrada concreta dejó de aplicar.
5. **Recomputar** todas las secciones derivadas (R6) desde las tarjetas supervivientes.
6. Reescribir la prosa del §1 y la portada: fecha de hoy, qué se remedió (con foco en
   las severidades altas), nuevo total y nuevo foco accionable.
7. **Ajustar §8**: subir los scores de los dominios cuyos hallazgos altos se remediaron
   y recomputar el GLOBAL como promedio de dominios. **Actualizar la tabla "Camino a 100"
   (R14)**: quitar de cada fila los `AD-*` que pasaron a `[RESUELTO]` desde la corrida
   previa y reflejar la deuda abierta real — nunca arrastrarla sin re-verificar el estado.
8. **Verificar la salida**: balance de `<div>`/`<tr>`, `Σ §4 == total`, `Σ §3 fila
   Total == total`, KPIs == conteo real de tarjetas, cero referencias a hallazgos
   eliminados en §5/§6/§7, y **las 11 secciones conservan su `<h2 id="sN">`** (un
   reemplazo por slicing entre secciones que use `find('id="sN"')` como borde corta
   DESPUÉS del `<h2 ` y debe reponerlo, o §N renderiza como texto plano).

Patrón de generación: las secciones derivadas se construyen por script desde los
`data-*` de las `.fcard`; las tarjetas detalladas y la prosa se conservan/editan a mano
(el análisis por hallazgo no es sintetizable desde los atributos). El último generador
usado quedó como referencia del cómputo (ver historial de la corrida).

## Sistema visual — FUENTE ÚNICA: `knowledge/informe-valoracion-comercial.html`

> **Regla dura (2026-07-22).** TODOS los informes HTML del proyecto comparten UN solo
> sistema visual, y su referencia es `knowledge/informe-valoracion-comercial.html`. Antes de
> generar o regenerar cualquier informe, extraer de ahí la paleta y los primitivos; no
> inventar una propia. Las dos primeras corridas del informe forense 2026-07-22 se
> emitieron con un CSS ad-hoc (badges sólidos, tipografía y sombras distintas) y hubo que
> rehacerlas dos veces.

Primitivos que se copian tal cual (no se reinterpretan):

| Pieza | Definición canónica |
|---|---|
| Tipografía | `--font-sans: 'Segoe UI', system-ui, -apple-system, sans-serif` · `line-height:1.7` |
| Fondo de página | `#eef2f7` (NO `#f1f5f9`) |
| Escalas | `--brand-900..50`, `--slate-900..50`, `--accent-*`, `--green-*`, `--purple-*`, `--red-*` |
| Radios | `--radius-sm:6px` `md:10px` `lg:16px` `xl:24px` |
| Sombras | `--shadow-sm/md/lg/xl` (ver el archivo; no aproximar) |
| Portada | `linear-gradient(135deg,#0a1628 0%,var(--brand-900) 40%,var(--brand-700) 75%,#1e3a8a 100%)`, `radius-xl`, `shadow-xl` |
| Sección | `.card`: fondo blanco, `radius-lg`, `padding:26px 28px`, `shadow-sm`, borde `--slate-200` |
| KPI | `.kpi-val` `2.1rem/800` en `--brand-700`; `.kpi-label` `.72rem` uppercase `letter-spacing:.06em` |
| Tabla | `font-size:.85rem`; `th` `.72rem` uppercase `--slate-500`; `td` `--slate-700` |
| Badge | `inline-flex`, `.7rem`, `700`, `padding:3px 10px`, `border-radius:100px`, uppercase |
| Pie | `.footer` sobre `--brand-900`, `radius-xl`, texto `rgba(255,255,255,.55)` |

**Badges por severidad** (fondo tenue + texto saturado, nunca sólido con texto blanco):
CRÍTICO `red-100/red-700` · ALTO `red-100/red-600` · MEDIO `accent-100/accent-600` ·
BAJO `brand-100/brand-700` · OBSERVACIÓN `slate-100/slate-600`.
**Estado:** NUEVO `brand-100/brand-700` · DEUDA/CONOCIDO `purple-100/purple-700`.

### R17 — Barra superior y portada, calcadas del canónico

La cabecera NO se reinventa: se copia la de `informe-valoracion-comercial.html`.

1. **`.toolbar` sticky** (`top:0`, `z-index:100`) sobre `--brand-900`, con el rótulo
   `PP Sport Management — PPTransferHub · <título>` a la izquierda y el botón
   `.btn-print` (icono SVG de impresora + «Descargar PDF», `onclick="window.print()"`)
   a la derecha. Se oculta en `@media print`.
2. **`.page-wrapper`** (`max-width:1180px; padding:48px 24px 80px`) envuelve todo el
   documento. No usar un `.wrap` propio.
3. **Portada** dentro del wrapper, en este orden exacto:
   - `.cover-badge` — pill translúcido con **punto ámbar** (`::before`, 8px,
     `--accent-400`) y texto en mayúsculas con `letter-spacing:.1em`.
   - `<h1>` a `2.8rem/800`, partido en dos líneas con `<br>`, y la **segunda línea
     dentro de un `<span>`** que va en `--accent-400`. Ese contraste blanco/ámbar es
     la firma visual de la portada; sin él no se parece al resto.
   - `.cover-sub` a `1.1rem` sobre `rgba(255,255,255,.65)`, `max-width:640px`.
   - `.cover-meta` — fila de `.cover-meta-item`, cada uno con `.label` (`.68rem`,
     mayúsculas, `letter-spacing:.1em`, `rgba(255,255,255,.45)`) sobre `.value`
     (`.92rem`, `rgba(255,255,255,.9)`), separada por `border-top` de 1px.
   - Dos **círculos decorativos** con `.cover::before` / `.cover::after`
     (500px y 600px, `rgba(255,255,255,.04)` y `.03`, desbordando la tarjeta). El
     contenido va con `position:relative;z-index:1` para quedar por encima.

Una portada sin toolbar, sin punto ámbar en el pill, sin la segunda línea del título en
`--accent-400` o sin los círculos **no cumple** — son las cuatro piezas que hacen que se
reconozca como el mismo documento.

### R16 — Los botones de filtro llevan CONTADOR

Cada botón de los ejes Estado y Severidad muestra su recuento en un pill (`.fbtn .n`).
El número se calcula **respetando los OTROS filtros activos** (el contador de «Altos» dice
cuántos altos quedarían dado el estado y la categoría ya elegidos), de modo que responde
«cuánto suma este click» y no un total ciego. Se recomputa en cada `render()` junto con el
resto de secciones derivadas (R6). Una corrida sin contadores es un bug de formato.

## Mapa de estilos (para regenerar tablas/badges)

- `sevb` (badge de severidad): CRÍTICO `#7f1d1d/#fef2f2/#fecaca` · ALTO
  `#b91c1c/#fff1f2/#fecdd3` · MEDIO `#b45309/#fffbeb/#fde68a` · BAJO
  `#1d4ed8/#eff6ff/#bfdbfe` · OBSERVACIÓN `#475569/#f8fafc/#e2e8f0` (color/bg/border).
- `estb` (badge de estado): NUEVO `#1d4ed8/#eff6ff` · CONOCIDO `#6d28d9/#f5f3ff`.
- Orden de severidad: `CRÍTICO < ALTO < MEDIO < BAJO < OBSERVACIÓN`.
- Score por dominio: verde `#15803d` (≥85), ámbar `#b45309` (70–84), rojo `#b91c1c` (<70).

> Estas paletas crudas son válidas **solo** dentro de estos informes HTML standalone
> (no son la app React) — no aplica el sistema de tokens del Design System.
