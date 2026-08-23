# Formato de los informes de seguridad (`knowledge/informe-seguridad-*.html`)

> Fuente de verdad del **contenido y la estructura** de los informes independientes de
> seguridad. Leer antes de generar o regenerar uno.
>
> **El aspecto visual NO se decide aquí:** lo manda `informe-diseno-estandar.md` (tokens,
> componentes, impresión, confidencialidad, nomenclatura), igual que para el resto de los
> informes de `knowledge/`. Este documento sólo añade lo que es propio de un informe de
> seguridad: qué secciones lleva, cómo se clasifica un hallazgo y qué no puede aparecer.

## Los tres formatos de informe — no confundirlos

| | Informe forense integral | **Informe de seguridad** | Informes técnicos |
|---|---|---|---|
| Prompt | `FORENSIC_AUDITOR_PROMPT.md` | **`APPSEC_PROMPT.md`** | — |
| Archivo | `informe-auditoria-forense-<fecha>.html` | **`informe-seguridad-<fecha>.html`** | `informe-<tema>.html` |
| Estructura | `informe-auditoria-formato.md` (R1..R14) | **este archivo (S1..S7)** | libre |
| Aspecto | `informe-diseno-estandar.md` | `informe-diseno-estandar.md` | `informe-diseno-estandar.md` |
| Organización | por **categoría técnica** (Frontend, Backend, BaseDatos, DevOps…) | por **severidad** + **OWASP/CWE** | por tema |
| Normalizador | `informe-auditoria-postprocess.py` (obligatorio) | **ninguno** | ninguno |
| Alcance | calidad, arquitectura, testing, UX, i18n, seguridad… | **sólo seguridad** | el del tema |

**Error real de la corrida 2026-07-21:** se generó el informe de seguridad con el formato
forense — taxonomía por capa técnica, filtros de dos ejes, «Camino a 100» y normalizador.
Un informe de seguridad clasificado en «Frontend / Backend / DevOps» no responde la pregunta
que se le hace («¿qué riesgo tengo y por dónde entran?»), sino otra distinta («¿qué parte del
código está peor?»).

---

## S1 — Nombre y ubicación

- `knowledge/informe-seguridad-YYYY-MM-DD.html`, **en minúsculas**, un archivo por corrida.
- **Con fecha**, por excepción a §7 del estándar de diseño: como en los forenses, la fecha
  forma parte de la identidad de la corrida y las corridas no se sobrescriben.
- **Nunca** `informe-auditoria-forense-*`: ese nombre es de la due diligence integral.
- **Nunca** bajo `client/public/`. Ver §6 del estándar de diseño: seis informes marcados
  «Confidencial» quedaron servidos sin autenticar por esa vía en julio de 2026, incluida una
  auditoría con pruebas de concepto. Un informe de seguridad es el peor candidato posible
  para ese error.

## S2 — Estructura: por SEVERIDAD, nunca por capa técnica

Las secciones van por severidad; la taxonomía de seguridad (OWASP + CWE + CVSS) vive en los
metadatos de cada hallazgo, no en el índice.

| § | Sección | Obligatoria |
|---|---|---|
| 1 | Resumen ejecutivo — `.alert-box` con el riesgo principal + `.card` de contexto + `.rec-box` de acciones prioritarias + `.info-box` con lo que salió limpio | sí |
| 2 | Hallazgos de severidad alta | sí |
| 3 | Hallazgos de severidad media | sí |
| 4 | Hallazgos de severidad baja | sí |
| 5 | Hallazgos mitigados (fuera del conteo) | si los hay |
| 6 | **Cadenas de ataque** | sí |
| 7 | **Controles correctamente implementados** | sí |
| 8 | **Plan de pruebas dinámicas (DAST)** | sí |
| 9 | Plan de acción por prioridad | sí |
| 10 | Alcance, método y limitaciones | sí |

Las secciones **6, 7 y 8 son las que hacen que el informe sea de seguridad** y no una lista
de defectos ordenada por gravedad. Ninguna es opcional:

- **§6 Cadenas de ataque** — entrada → explotación → escalada → impacto, cada eslabón anclado
  en `archivo:línea` real, y **declarando explícitamente qué eslabón no se pudo confirmar**.
  Es lo que convierte hallazgos sueltos en riesgo compuesto: dos medios encadenados pueden
  valer más que un alto aislado.
- **§7 Controles correctamente implementados** — lo verificado sano, con el detalle de cómo
  se verificó. Sin esta sección el lector infiere que todo lo no mencionado está roto, que es
  exactamente la lectura equivocada, y el informe se vuelve inutilizable para decidir.
- **§8 Plan DAST** — qué se probaría, con qué comando, y **evidencia de vulnerabilidad Y
  evidencia de sanidad** por prueba. Separa lo verificado de lo verificable, y deja el
  siguiente paso listo para ejecutar en cuanto haya autorización.

## S3 — Anatomía de un hallazgo

Componente `.finding` del estándar de diseño. Metadatos fijos (`.f-meta`, seis celdas):
**OWASP · CWE · CVSS 3.1 · Ubicación · Confianza · Prioridad y esfuerzo**.

Secciones fijas, en este orden: **Impacto · Evidencia (`<pre>`) · Explicación técnica ·
Riesgo · Recomendación · Verificación y gate ausente**.

- La **evidencia** es código o salida real, nunca paráfrasis.
- La **recomendación** ataca la invariante, no el síntoma (regla R1 del protocolo de
  remediación). Si varios hallazgos comparten raíz, la recomendación es una y se referencia.
- **«Verificación y gate ausente» es obligatorio**: si ningún gate atrapa esa clase de fallo,
  decirlo y proponer cuál crear. Un hallazgo sin gate propuesto vuelve en la corrida siguiente.

## S4 — Estados y confianza

**Estado** (badge en la cabecera):

- `Nuevo` (`badge-purple`) — detectado en esta corrida.
- `Deuda · AD-x` (`badge-slate`) — ya catalogado en `architectural-debt.md`. **Sólo se lista
  si su radio de impacto cambió o si amplifica un hallazgo nuevo**; si no, se omite.
- `Mitigado` (`badge-green`) — vector principal cubierto, residual documentado y aceptado.
  **Se lista pero no cuenta** en los KPIs ni en la portada.
- **No existe «corregido»**: lo que se arregla desaparece del informe. Un hallazgo cerrado no
  es un riesgo, ni una fila del plan de acción, ni un número del dashboard.

**Confianza**, obligatoria y explícita en cada hallazgo:

- `Confirmado` — se reprodujo, o se leyó el código que lo prueba.
- `Probable` — la cadena se verificó por partes pero falta un eslabón no accesible.
- `Potencial` — hoy no es explotable, pero la clase de fallo está abierta.

**Un hallazgo sin evidencia no se emite.** Antes que inflar el conteo, se declara la
limitación en §10.

## S5 — Refutación adversarial antes de publicar

Todo hallazgo **Alto** pasa por una pasada independiente cuya instrucción es **refutarlo**,
asumiéndolo falso hasta prueba en contrario y con veredicto por defecto «refutado».

No es ceremonia: en la corrida 2026-07-21 **bajó dos hallazgos de Alto a Medio** —el
disparador que describían no existía porque otra ruta lo compensaba— y en el proceso destapó
un problema más grave que el original. Publicar la primera pasada habría dado dos Altos
inflados y habría ocultado el hallazgo real.

Registrar en el hallazgo el veredicto (`Confirmado` / `Parcial` / `Refutado`) y **qué eslabón
resultó falso**, no sólo la conclusión.

## S6 — Contenido sensible

- **Nunca transcribir un secreto completo.** Truncar a los primeros 4 caracteres + `…` y citar
  `archivo:línea`. Aplica a tokens, claves, contraseñas y cadenas de conexión.
- **Nunca volcar PII real** ni IPs de producción.
- El pie marca **«Confidencial — uso interno»** y advierte de que contiene rutas de explotación.
- Si el informe documenta un secreto expuesto, el hallazgo dice **dónde está y qué hacer**,
  no el valor.

## S7 — Dedupe, IDs y registro de la corrida

- Cruzar cada hallazgo contra `architectural-debt.md` (AD-*), `anti-patterns.md` (AP-*) y los
  `auditoria-*.md` / `remediacion-*.md` (H-*) **antes** de emitirlo.
- **Los IDs `H-xxx` son un espacio de nombres compartido con todas las auditorías.** Antes de
  numerar, buscar el máximo usado —incluidos los que sólo aparecen en prosa de informes
  previos o en mensajes de commit— y continuar desde ahí:

  ```bash
  git log --all --oneline | grep -oE 'H-[0-9]{3}' | sort -u | tail -3
  grep -rhoE 'H-[0-9]{3}' knowledge/wiki/*.md | sort -u | tail -3
  ```

  Un ID reutilizado rompe el dedupe de las corridas siguientes en ambas direcciones: se cierra
  como resuelto algo abierto, o se re-reporta como nuevo algo catalogado. Lección de H-217,
  que además cometió la propia corrida que lo reportó.
- Además del HTML, dejar `knowledge/wiki/informe-seguridad-YYYY-MM-DD.md` con la lista de
  hallazgos, su rango de IDs, el **siguiente ID libre**, las reglas durables aprendidas y las
  limitaciones — marcado **«NO re-reportar como nuevo»**.

## Verificación antes de dar por cerrado el informe

Además de la checklist §5 del estándar de diseño (abrirlo y mirarlo, sin overflow horizontal,
sin errores de consola, revisar la vista de impresión):

1. Cero clases usadas sin definir en el CSS (script del estándar de diseño §2).
2. Balance de etiquetas: `<div>` y `<tr>` abiertos == cerrados.
3. Los KPIs y la portada coinciden con el número real de fichas por severidad, y **los
   mitigados no suman**.
4. Cero apariciones de «corregido» como estado.
5. Cero secretos completos, cero PII, cero IPs de producción.
6. Toda ficha tiene las seis celdas de metadatos y las seis secciones de S3.
7. Las secciones 6, 7 y 8 existen y no están vacías.
8. El archivo **no** está bajo `client/public/`.

---

## S9 — Secciones COLAPSABLES (obligatorio)

Regla heredada del formato forense (`informe-auditoria-formato.md` R7) que la primera versión
de este formato **perdió**. Un informe de 25 fichas sin plegado obliga a scrollear metros para
llegar a la sección 9.

- Cada `.section` tiene su cabecera como **`<button type="button" class="section-header"
  aria-expanded="true">`** (no un `<div>`), y su contenido envuelto en `.section-body`.
- Estado por defecto: **abierta**. Al plegar: `aria-expanded="false"` + `hidden` en el cuerpo.
- Chevron `▾` a la derecha, rotado −90° cuando está plegada.
- `:focus-visible` visible — la cabecera es un control real, navegable por teclado.
- **En impresión**, todo se despliega (`@media print` fuerza `display:block`).

## S10 — ÍNDICE DE HALLAZGOS filtrable (obligatorio)

Regla heredada de R10/R11. Sin esto no hay forma de responder «¿qué hay de severidad alta en
A01?» sin leer el informe entero.

- Sección **«Índice de hallazgos»** insertada **antes** de la primera sección de fichas.
- Dos ejes de filtro por chips: **severidad** (Alta · Media · Baja · Mitigado · Observación) y
  **categoría OWASP** (A01..A10), cada chip con su conteo. Chip «Todas» por eje, activo por defecto.
- Tabla: **ID · Severidad · OWASP · Hallazgo**, con el ID enlazando a la ficha (`#H-xxx`).
- El filtro actúa **a la vez sobre el índice y sobre las tarjetas de hallazgo**. Una sección que
  se queda sin fichas visibles se pliega sola.
- Cada `.finding` lleva `id="H-xxx"` + `data-sev` + `data-state` + `data-cat`.
- Estado vacío explícito: «Ningún hallazgo coincide con el filtro».
- Saltar a una ficha desde el índice **abre su sección** si estaba plegada.

## S2b — Aprovechar el ancho de pantalla

`.page-wrapper { max-width: 1440px; }` — no 1180px. El informe tiene tablas de metadatos de
seis celdas, bloques `<pre>` con evidencia y una tabla de índice de cuatro columnas: a 1180px
todo eso se estrangula y desperdicia el ancho disponible.

---

## Último paso obligatorio — normalizador idempotente

```bash
python3 knowledge/wiki/informe-seguridad-postprocess.py knowledge/informe-seguridad-<fecha>.html
```

**Correrlo es el último paso de toda (re)generación**, aunque el HTML ya parezca cumplir.
Impone S9, S10 y S2b, y es idempotente (correrlo N veces deja el mismo archivo — verificado
por hash).

> **Este normalizador NO es el forense.** `informe-auditoria-postprocess.py` pertenece a la due
> diligence integral e impone un aparato distinto (filtros de dos ejes Estado×Severidad, matriz
> de categorías, «Camino a 100»). Aplicar el equivocado deforma el informe. Ver
> `knowledge/wiki/prompts-auditoria.md` §2.

## S11 — Verificación tras el normalizador

9. `<button type="button" class="section-header">` == `.section-body` == nº de secciones.
10. Toda `.finding` tiene `id`, `data-sev` y `data-cat`.
11. Filas del índice == número de fichas.
12. Balance de etiquetas tras la transformación: `div`, `button`, `table`, `tbody`, `tr`.
13. Idempotencia: dos corridas seguidas producen el mismo hash.
