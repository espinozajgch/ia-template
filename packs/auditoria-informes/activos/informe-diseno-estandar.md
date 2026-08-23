# Estándar de diseño de informes HTML — `knowledge/*.html`

> **Fuente de verdad del aspecto visual de TODO informe HTML del proyecto.**
> Aplica a informes técnicos, de infraestructura, de migración, presupuestos,
> guías **y a los informes forenses de auditoría** (`informe-auditoria-forense-*.html`).
> Las reglas de *contenido e interactividad* de los forenses siguen viviendo en
> `informe-auditoria-formato.md` (R1..R14); este documento manda sobre el **aspecto**.
>
> **Plantilla de referencia: `knowledge/informe-tecnico-arquitectonico.html`** (informe
> general con diagramas SVG, `page-wrapper` 1180px). Para informes con **fichas de hallazgo
> o PoC** (seguridad/forense), el modelo del `<style>` es `knowledge/informe-seguridad-2026-07-22.html`
> (tiene la ficha `.finding` y la caja `<pre>` en el CSS). Copiar el `<style>` de ahí — no
> inventar tokens, componentes ni paletas nuevas.
>
> **Corrección 2026-07-22:** la plantilla histórica `informe-infraestructura.html` (y
> `informe-infraestructura-aws.html`) **ya no existen en el repo**; las referencias se
> reapuntaron a los informes conformes vigentes. Si el sustituto también desapareciera,
> aplicar el fallback de §2 (informe superviviente más reciente con esta tabla de componentes).

**Regla dura:** un informe nuevo **no se escribe desde cero**. Se parte del bloque
`<style>` de la plantilla de referencia y se reutilizan sus componentes. Un informe que
no se parezca a los demás es un defecto, no una variante.

---

## 1 · Tokens (copiar tal cual, sin renombrar)

Rampas completas en `:root`: `--brand-900..50` (azul, color primario),
`--accent-600..50` (ámbar, acento y destacados), `--green-*` (éxito/propuesta),
`--purple-*`, `--red-*`, `--orange-*`, `--teal-*` y la neutra `--slate-900..50`.

```
--font-sans: 'Segoe UI', system-ui, -apple-system, sans-serif;
--radius-sm:6px · --radius-md:10px · --radius-lg:16px · --radius-xl:24px
--shadow-sm / --shadow-md / --shadow-lg / --shadow-xl
html { font-size:15px }   body { background:#eef2f7; line-height:1.7 }
.page-wrapper { max-width:1180px; margin:0 auto; padding:48px 24px 80px }
```

- **Monoespaciada:** `'Cascadia Code','Consolas',monospace`, sólo en `code`/`pre`.
- **Los informes son light-only.** No añadir modo oscuro ni `prefers-color-scheme`:
  ninguno de los informes del directorio lo tiene y romperlo desalinea el conjunto.

---

## 2 · Componentes obligatorios

| Componente | Clase | Para qué |
|---|---|---|
| Toolbar sticky | `.toolbar` + `.btn-print` | Barra `brand-900` con el título y el botón «Descargar PDF» |
| Portada | `.cover` + `.cover-badge` + `.cover-sub` + `.cover-meta` | Degradado `#0a1628 → brand-900 → brand-700`, dos círculos decorativos en `::before/::after`, badge con punto ámbar pulsante |
| Cabecera de sección | `.section` + `.section-header` + `.section-icon` | Icono en cuadro de color + `h2` + subtítulo, sobre `border-bottom:2px solid slate-200` |
| Indicadores | `.kpi-bar` + `.kpi-card` (`.kpi-val`, `.kpi-label`, `.kpi-sub`) | Modificadores de color: `.green` `.amber` `.purple` `.teal` `.red` |
| Tarjeta | `.card` (+ `.card-title`, `.card-2col`, `.card-3col`) | Contenedor blanco estándar |
| Tabla | `.tbl-wrap` envolviendo `<table>` | El wrapper aporta scroll horizontal y el borde redondeado |
| Etiqueta de estado | `.badge` + `.badge-{blue,green,amber,orange,purple,teal,red,slate}` | **Nunca** un `<span>` con estilos sueltos |
| Lista | `ul.doc-list` | Viñeta `▸` en `brand-500` |
| Aviso | `.info-box` (ámbar) · `.budget-note` (neutro) · `.alert-box` (rojo) | |
| Recomendación numerada | `.rec-box` + `.rec-number` + `.rec-text` | |
| Presupuesto | `.budget-highlight` + `.budget-summary-item` (+ `-propuesta`) + `.col-propuesta` | La opción propuesta va siempre en verde y destacada |
| Pie | `.footer` | Bloque `brand-900` centrado |
| **Bloque de código** | `<pre>` (+ `code` para el inline) | Caja `slate-50` con borde `slate-200`, radio `--radius-md` y `overflow-x:auto`. **Obligatorio en cualquier informe con PoC o fragmentos de código:** sin regla propia, `<pre>` hereda el default del navegador y el código sale pegado a la prosa, sin contenedor. Añadido 2026-07-21; modelo en `knowledge/informe-seguridad-2026-07-22.html` (informe de seguridad vigente que consolidó a los históricos de mayo y del 21, ambos retirados; la regla `pre` ya está en su `<style>`) |
| **Ficha de hallazgo** | `.finding` + `.finding-bar` + `.finding-in` + `.f-head`/`.f-id`/`.f-title` + `.f-meta` + `.f-lbl` + `.f-txt` | **Sólo informes de seguridad y auditoría.** Tarjeta con franja superior del color de la severidad, cabecera (id + título + badges), rejilla de metadatos (OWASP/CWE/CVSS/ubicación/confianza/prioridad) y secciones etiquetadas. modelo en `knowledge/informe-seguridad-2026-07-22.html`. **El CSS de estas clases (`.finding-bar/.finding-in/.f-head/.f-id/.f-title/.f-meta/.f-lbl/.f-txt`) debe estar en el `<style>`:** si se usan en el HTML sin regla, las fichas salen sin estilo (franja de severidad, rejilla de metadatos) — verificar siempre por CSS (§5) que no falte |

**Añadir un componente nuevo** sólo si ninguno de los anteriores sirve, y entonces
construirlo con los tokens existentes y documentarlo en esta tabla.

> **La plantilla de referencia se sigue por CSS, no de memoria.** La forma robusta de
> garantizar paridad es **reutilizar el bloque `<style>` de la plantilla literal**, y añadir
> como mucho un `<style>` extra con los componentes nuevos:
>
> ```python
> CSS = re.search(r'<style>.*?</style>', open(PLANTILLA).read(), re.S).group(0)
> ```
>
> Y verificar antes de publicar que **ninguna clase usada falta en el CSS**:
>
> ```python
> usadas = {c for g in set(re.findall(r'class="([\w \-]+)"', doc)) for c in g.split()}
> assert not (usadas - set(re.findall(r'\.([a-zA-Z][\w-]*)', css)))
> ```
>
> Si la plantilla de referencia desaparece del directorio, la sustituta es el informe
> superviviente más reciente que use esta misma tabla de componentes — **nunca** uno de los
> informes antiguos con vocabulario propio (`.doc`, `.section-num`, `.callout`, `.top3`…),
> que son anteriores a este estándar y no deben usarse como base.

---

## 3 · Diagramas y gráficos

- **SVG inline**, nunca imágenes ni librerías externas (los informes se abren
  con `file://` y se imprimen a PDF: cualquier recurso remoto se pierde).
- Clases de diagrama estándar: `.d-t` (título), `.d-s` (secundario), `.d-h`
  (encabezado de zona), `.d-box`, `.d-zone`, `.d-flow` (tráfico de datos, sólido
  `brand-600`), `.d-flow-2` (plano de control, discontinuo `slate-300`), `.d-badge`
  + `.d-num` (pasos numerados). Ejemplo completo: `informe-tecnico-arquitectonico.html`.
- Todo SVG lleva `role="img"` y un `<title>` descriptivo referenciado por `aria-labelledby`.
- Envolver cada diagrama en `<figure class="fig">` con `<figcaption>` que **interprete**
  la figura, no que la repita.
- **Barras:** `.bars`/`.bar-row` con relleno de la rampa `brand` según magnitud.
  **Barra apilada:** `.stack` + `.legend`, con el conteo escrito dentro de cada segmento.
- **Antes de elegir colores de un gráfico, aplicar el skill `dataviz`** y validar la
  paleta con su `validate_palette.js` contra la superficie real (`#ffffff`).
  Serie única → una sola rampa; nunca más de 8 categorías.

---

## 4 · Impresión (obligatorio)

Todo informe se exporta a PDF, así que el bloque `@media print` es parte del entregable:

```css
@media print{
  body{ background:#fff; font-size:11pt }
  .toolbar, .filters, .rate-picker{ display:none !important }
  .page-wrapper{ padding:0; max-width:100% }
  .cover{ border-radius:0 }
  .section{ page-break-inside:avoid }
  .card,.kpi-card,figure.fig{ box-shadow:none }
  thead{ print-color-adjust:exact }
}
```

**Todo lo que esté colapsado, filtrado u oculto en pantalla debe expandirse al
imprimir** (`.sec.closed .secbody`, `.finding .fbody`, columnas `.hidecol`). Un PDF
al que le faltan hallazgos porque el acordeón estaba cerrado es un entregable roto.

---

## 5 · Verificación antes de dar por cerrado un informe

1. Abrirlo con Playwright/navegador y **mirarlo**: el validador de color no detecta
   colisiones de etiquetas, desbordes ni geometría rota.
2. `document.documentElement.scrollWidth === clientWidth` → sin overflow horizontal.
3. Cero errores de consola.
4. Si tiene filtros, acordeones o selectores: **ejercitarlos** tras cualquier cambio
   de CSS y comprobar que siguen respondiendo.
5. Revisar la vista de impresión.

---

## 6 · Confidencialidad — dónde vive un informe

Los informes viven en **`knowledge/`**, que está fuera del bundle del frontend.

**Nunca** colocarlos en `client/public/informes/`: Vite lo compila a `client/dist/` y
Nginx lo sirve desde el web root **público**, sin pasar por Express — el gate de sesión
de `server/src/index.ts` sólo cubre `/uploads` y `/informes-pdf`. En julio de 2026 seis
informes marcados «Confidencial · Uso Interno» quedaron accesibles sin autenticar por esa
vía, incluida una auditoría OWASP con PoCs de explotación. Si un informe debe servirse
desde la app con control de acceso, va por la ruta autenticada `/api/informes-pdf/:filename`.

---

## 7 · Nomenclatura y ciclo de vida

- **Sin fecha en el nombre de archivo:** `informe-<tema>.html`. La fecha vive en el
  `<title>` y en la portada. (Los forenses `informe-auditoria-forense-*` son la excepción: su
  fecha forma parte de la identidad de la corrida.)
- En español: `informe-transformacion-ia.html`, no `-ai-`.
- **Al renombrar, arreglar las referencias entrantes** — otros informes enlazan entre sí
  y hay comentarios de código que los citan (`grep -rn "<nombre-viejo>" --include=*.{md,html,ts,tsx}`).
- **Cuando un informe queda obsoleto no se borra: se marca.** Banner autocontenido
  (estilos inline, porque cada informe trae su propio CSS) justo después de `<body>`,
  rojo para `SUPERADO` y ámbar para `HISTÓRICO`, indicando qué dejó de ser cierto y a qué
  documento vigente ir. Modelo: los seis informes marcados el 2026-07-21.
- **Cuando dos informes se solapan, se unifican en uno** — no se mantienen dos fuentes de
  verdad de la misma cifra. El absorbido sigue una de dos vías: **(a) marcarlo** (conserva su
  archivo con el banner apuntando al vigente) o **(b) eliminarlo** una vez consolidado, y
  entonces **es obligatorio limpiar TODAS las referencias entrantes** (`grep` el repo) para no
  dejar punteros a un archivo inexistente. El vigente declara en la portada (`cover-meta` →
  `Origen`) qué informe unifica. Al unificar presupuestos, consolidarlos en **tramos
  etiquetados** (no re-sumar horas ya ejecutadas: remitir a
  `informe-tecnico-arquitectonico.html` §10 como única fuente de lo trabajado).

### Bitácora de nomenclatura y unificaciones — 2026-07-22

| Informe vigente | Absorbe / renombra | Estado del absorbido |
|---|---|---|
| `informe-valoracion-comercial.html` | renombra `informe-comercializacion.html` **y absorbe la mitad comercial** (valor de mercado, ROI, mix de planes) de `informe-ejecutivo.html` | `informe-ejecutivo.html` **ELIMINADO** (consolidado); refs repuntadas aquí y a `informe-tecnico-arquitectonico.html` (infra/presupuesto) |
| `informe-migracion.html` | absorbe `informe-multitenant-saas.html` (la transformación SaaS multi-empresa ya está implementada); presupuesto consolidado en tres tramos de trabajo entregado (migración + asistente inteligente + SaaS) | `informe-multitenant-saas.html` **ELIMINADO** (consolidado); refs → `informe-migracion.html` |
| `informe-seguridad-2026-07-22.html` | consolida `informe-seguridad-2026-07-21.html` y el histórico de mayo `informe-seguridad.html` | ambos **ELIMINADOS**; refs repuntadas al informe del 22 |
| `informe-auditoria-forense-2026-07-22.html` | renombrado a **minúsculas con fecha** (antes `AUDITORIA_FORENSE_INTEGRAL_*` / `auditoria-appsec-*`) | — |
