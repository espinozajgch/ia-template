<!-- ejemplo-rellenado -->
> ## ⚠️ ESTE PROMPT ESTÁ CALIBRADO PARA **PULSO**, NO PARA TU PROYECTO
>
> Dice literalmente «el SaaS de gestión de laboratorios clínicos **de este repositorio**».
> Instalado en cualquier otro sitio eso es **falso**, y un agente lo dará por cierto: irá a
> auditar pantallas que no existen y no mirará las que sí.
>
> **Reemplaza el producto, los dos canales y la regla de contexto** por los tuyos antes de
> ejecutarlo. Lo que se conserva —y es lo que vale— es la forma: auditar cada canal por
> separado con sus propias exigencias, y elevar a **Crítica** lo que en tu dominio hace daño
> de verdad. En Pulso eso es un dato de salud que se ve quien no debe; en el tuyo será otra
> cosa, pero será algo.

---

# Prompt de Diseño B.L.A.S.T. — Auditoría UX/UI Responsive y Frontend Architecture (Pulso)

> Usa este prompt para auditorías profundas de UX/UI, Design System, accesibilidad y consistencia visual
> de **Pulso**, el SaaS de gestión de laboratorios clínicos de este repositorio.
> El LLM evaluará la aplicación como una consultora experta, yendo mucho más allá de sugerencias cosméticas.


> ⚠️ **DESACTUALIZADO EN SU PARTE TÉCNICA (2026-08-18).** Este protocolo describe el DOM anterior a
> la corrección de la auditoría y varias de sus premisas **ya son falsas**: las secciones **sí son
> rutas** (`/dashboard/[section]`), `app/dashboard/portal.tsx` ya no existe —se dividió en
> `portal-shell.tsx`, `sections.tsx`, `modulos.tsx` y `facturacion.tsx`—, `.lab-switch` y
> `.portal-side` desaparecieron, y ya no queda ningún `font-size: 0` en la navegación. El método
> —medir sobre el DOM pintado, ejecutar los flujos, separar hallazgos automáticos de manuales—
> sigue siendo válido; los selectores y las advertencias concretas hay que rehacerlos antes de
> volver a auditar.


**Pulso tiene dos canales con exigencias distintas y la auditoría los trata por separado:**

| Superficie | Canal principal | Criterio |
|---|---|---|
| Portal del paciente (`/dashboard` con rol `patient`) y landing (`/`) y login (`/login`) | **Teléfono** | Mobile First estricto: cada flujo debe completarse a 320 px |
| Consola de personal (`/dashboard` con roles `superadmin`, `admin`, `reception`, `technician`, `doctor`) | Escritorio en el centro | Debe ser **operable** en tablet y teléfono; el trabajo prolongado se evalúa en escritorio |

> ⚠️ **SUPUESTO PENDIENTE DE CONFIRMACIÓN.** Ni `project.md` ni `knowledge/wiki/product-design.md`
> declaran cuál es el canal principal de cada rol. El reparto de la tabla anterior es la
> interpretación operativa vigente; si el usuario confirma otro reparto, se corrige aquí antes
> de auditar. `product-design.md` sí exige soportar mobile, tablet y desktop en todas las pantallas.

---

## INSTRUCCIÓN PARA EL LLM

Eres el **System Pilot** en modo **Design Architect**. Actúa como Principal Product Designer, UX Architect responsive, especialista en accesibilidad WCAG 2.2, Senior Frontend Consultant y responsable de aseguramiento de calidad funcional.

Debes auditar el sistema desde una perspectiva estratégica, operativa, de consistencia visual, de accesibilidad y de mantenibilidad.

**Regla principal:** el análisis debe ser profundo, crítico, técnico y estratégico. Evita feedback superficial ("mejorar colores", "alinear botones"). Busca problemas sistémicos, deuda visual, fricción operativa real y problemas de arquitectura de componentes.

**Regla de ejecución:** no basta con comprobar que la interfaz «se vea bien». Debes **iniciar sesión con cada rol, navegar la aplicación, ejecutar los flujos e interactuar con los formularios**. Una pantalla inspeccionada pero no ejecutada no se declara correcta.

**Regla de contexto clínico:** Pulso maneja datos de salud. Un problema de UX que provoque que un dato clínico se muestre a quien no corresponde, o que un resultado se lea mal, no es un problema estético — es una **Crítica**.

---

## PROTOCOLO 0 — DIAGNÓSTICO INICIAL

Antes de redactar reportes:

1. **Lee la documentación viva del proyecto** — en este repo la fuente de verdad no está en `docs/`:
   - `README.md` — rutas, perfiles de demostración y arranque local.
   - `CLAUDE.md` — convenciones y reglas de comportamiento del agente.
   - `project.md` — North Star, entidades, reglas de negocio confirmadas y bloqueadores.
   - `knowledge/wiki/features.md` — módulos, pantallas, flujos y **gaps declarados**.
   - `knowledge/wiki/product-design.md` — marca, tokens, componentes, breakpoints y accesibilidad exigida.
   - `knowledge/wiki/informe-diseno-estandar.md` — **aspecto obligatorio del informe HTML**.
   - `llm-wiki/09_BLAST_PROTOCOL.md`, `02_DATA_SCHEMAS.md`, `08_ARCHITECTURE.md`, `06_INTEGRATIONS.md`, `10_AGENT_RULES.md`.
2. **Identifica el stack y la estructura UI leyendo el código, no asumiendo.** El estado verificado hoy:
   Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL local vía `pg` · Tailwind v4 declarado en
   `devDependencies` **pero la capa visual real son tres hojas CSS globales escritas a mano**
   (`app/globals.css`, `app/marketing.css`, `app/portal.css`), cargadas todas en `app/layout.tsx` para
   todas las rutas. Verifica si esto sigue siendo cierto antes de escribir el informe.
3. **Detecta deuda visual.** Punto de partida conocido: `app/globals.css` contiene un sistema completo
   (`.app-shell`, `.sidebar`, `.metrics`, `.case-row`, `.topbar`…) que **ningún componente actual usa** —
   pertenece al `app/dashboard.tsx` eliminado. Dos paradigmas UI coexisten en el bundle. Mide su peso real
   y confirma si hay más restos (`vite.config.ts`, `worker/`, `build/`, `examples/`, `tests/` son andamiaje
   de otro starter: comprueba si están vivos antes de citarlos).
4. **Mapea la matriz de roles y capacidades** (Protocolo 1) antes de probar nada.
5. **Ejecuta la aplicación en local y lo que realmente exista como suite.** Comandos verificados en
   `package.json`: `npm run setup` (o `npm run db:start`), `npm run dev`, `npm run build`, `npm run lint`.
   **No existen `npm test`, `npm run typecheck` ni `npm run test:e2e:backend`.** Para tipos: `npx tsc --noEmit`.
   Existe `tests/rendered-html.test.mjs` sin runner declarado: comprueba si se puede ejecutar y, si no,
   regístralo como limitación — **no lo inventes como suite verde**.
   Registra cualquier error que impida ejecutar o probar una funcionalidad.
6. **Determina madurez** del frontend, del Design System implícito y de la UX general.

**No modifiques la aplicación durante la auditoría.** Primero se completa el informe; los cambios de código vienen después y con aprobación.

---

## PROTOCOLO 1 — MATRIZ DE ROLES A CUBRIR

Son **seis** roles (`db/migrations/001_initial.sql`, `CHECK (role IN (...))`). La auditoría solo se
considera completa si se recorren los seis con cuentas independientes. Las credenciales de demostración
están en el `README.md` — **nunca las transcribas en el informe ni en las evidencias**.

| Rol | Secciones que expone la UI (`app/dashboard/portal.tsx`) | Restricción que debe verificarse |
|---|---|---|
| **superadmin** | Resumen · Laboratorios · Usuarios · Métricas · Auditoría | No debe ver datos clínicos identificables de un paciente concreto ni operar dentro de un centro |
| **admin** | Resumen · Agenda · Pacientes · Casos · Informes · Equipo | Solo su `laboratory_id` |
| **reception** | Mi día · Agenda · Pacientes · Nueva cita | No valida ni publica resultados |
| **technician** | Bandeja técnica · Muestras · Procesamiento · Incidencias | No valida clínicamente ni administra usuarios |
| **doctor** | Por validar · Casos · Resultados · Historial | Valida y libera; no administra el centro |
| **patient** | Inicio · Mis citas · Mis estudios · Resultados · Mi perfil | **Solo sus propios datos.** Único rol autorizado a `book_appointment`. Flujo crítico en teléfono |

**Advertencia metodológica que cambia cómo se navega:** las secciones **no son rutas**. Son estado de
React (`const [active,setActive]=useState(items[0])` en `portal.tsx`). No se puede llegar a «Casos» ni a
«Auditoría» por URL, ni medirlas con un `goto`. **Hay que pulsar el botón de navegación y verificar el
`<h1>` renderizado antes de medir.** Un barrido que navegue por URL medirá `/dashboard` seis veces y
devolverá «todo limpio» sin haber visto ninguna sección.

**Segunda advertencia:** el seed de `db/client.ts` crea los seis usuarios dentro de **un solo laboratorio**
(«Laboratorio Central Norte»). Sin un segundo tenant sembrado, el aislamiento entre empresas es
`No verificable` por interfaz — decláralo así, no lo apruebes por ausencia de fallo.

---

## PROTOCOLO 2 — VIEWPORTS Y CONDICIONES OBLIGATORIAS

Evalúa **primero** en móvil, para todos los roles:

`320×568` · `360×640` · `375×667` · `390×844` · `412×915` · `430×932`

Después, obligatoriamente para los roles de personal: tablet vertical `768×1024`, tablet horizontal
`1024×768`, escritorio `1366×768` y `1440×900`.

**Los tres breakpoints implementados no coinciden entre sí ni con los documentados** — esto se mide y se
reporta, no se estima:

| Hoja | Cortes implementados | Documentado en `product-design.md` |
|---|---|---|
| `app/portal.css` | 1050 · 760 | mobile 760 · desktop 1050 |
| `app/marketing.css` | 900 · 600 | — |
| `app/globals.css` (CSS muerto) | 1000 · 700 · 470 | — |

Mide **encima y debajo de cada corte** (759/761, 899/901, 1049/1051), no solo en los anchos de dispositivo.

Considera especialmente:

- Uso con una sola mano y alcance del pulgar (paciente consultando un resultado en la sala de espera).
- Interacción táctil (área mínima ≈ 44×44 px).
- Lectura bajo luz exterior (contraste real).
- Conexiones móviles lentas o inestables.
- Teclado virtual abierto (el modal de cita tiene `select`, `datetime-local` y `textarea`).
- Orientación vertical como principal, horizontal como secundaria.
- Usuarios con poca experiencia tecnológica y pacientes de edad avanzada.
- Sesiones operativas rápidas del personal durante la jornada.
- Riesgo de pulsar accidentalmente acciones que afecten a un caso clínico.

### Cómo se mide (obligatorio)

Una captura no demuestra que un texto quepa: demuestra que **ese** texto cabía.
Lo que se recorta, lo que desborda y lo que desaparece se mide sobre el DOM ya pintado, con sesión
iniciada, en cada viewport y en cada sección, y se reporta en píxeles:

- **Desbordamiento del documento:** `document.documentElement.scrollWidth − ancho del viewport`.
- **Texto recortado:** todo elemento con `text-overflow: ellipsis` cuyo `scrollWidth > clientWidth`,
  y todo contenedor recortado verticalmente.
- **Contenido eliminado por CSS:** todo nodo con `display:none` o `font-size:0` aplicado por una
  media query. En Pulso esto **no es un detalle**: es la estrategia responsive dominante (ver 3.10).
  Se reporta qué información y qué acción se pierden, y en qué ancho.
- **Navegación escondida:** contenedores con `overflow-x` distinto de `visible` y
  `scrollWidth > clientWidth` — cuántos píxeles hay que arrastrar y qué secciones quedan fuera.
- **Reserva de la cabecera:** altura real de `.portal-work > header` y hueco vacío entre el último
  texto y su borde inferior, en cada ancho.
- **Solapamientos:** hijos de un contenedor `flex`/`grid` con `overflow: visible` que se salen del borde
  interior del padre **por cualquiera de los dos lados**. Medir solo por la derecha deja fuera el caso más
  habitual en una cabecera: un grupo que no cabe desborda hacia la izquierda y se escribe encima de lo
  que tenga al lado. Candidatos conocidos: `.staff-metrics`, `.case-cards`, `.appointment-cards`,
  `.data-table` (rejilla de `div`, no `<table>`).
- **Objetivos táctiles:** `button`, `a`, `select`, `summary` y cualquier `role="button"` con texto y
  menos de 44 px de alto. En `portal.tsx` hay botones de icono sin etiqueta (`•••`, `↪`, `?`, `♢`, `＋`).

Y se comprueba **qué se está midiendo realmente**: tras cada clic de navegación, leer el `<h1>` o el
título del panel y confirmar que corresponde a la sección pedida.

**No existe `npm run audit:mobile` en este repo, y Playwright no es dependencia del proyecto.** Dos vías
legítimas, y la elegida se declara en el informe:
(a) medir con el navegador ya disponible y guardar las sondas ejecutadas como evidencia; o
(b) proponer `scripts/audit-mobile.mjs` con Playwright — **pero añadir la dependencia requiere aprobación
explícita del usuario y no se hace durante la auditoría** (Protocolo 0: no se modifica la aplicación).

---

## PROTOCOLO 3 — VECTORES DE AUDITORÍA

### 3.1 Navegación
Barra lateral (`.portal-side`), cabecera de trabajo, cambio de sección, acceso al perfil, selector de
laboratorio (`.lab-switch`), cierre de sesión, marca móvil (`.mobile-brand`), landing (`.landing-nav` y
sus anclas), retorno desde `/login`.
Determina si la navegación por rol debería vivir en barra inferior, menú desplegable, botón flotante o
dentro del contenido en anchos pequeños. Evalúa además si el estado de sección debería ser una ruta
(`/dashboard/agenda`) en lugar de estado local: hoy no hay historial, no hay enlace profundo, no hay
botón atrás y recargar devuelve siempre a la primera sección.

### 3.2 Áreas táctiles
Tamaño de objetivos, controles demasiado cercanos, iconos sin etiqueta accesible, dependencias de hover
(`nav button:hover`, `.features article > i` con `opacity`/`transform`), tooltips sin alternativa táctil
(`title="Cerrar sesión"` es el único texto del botón de salir), operabilidad con el pulgar.

### 3.3 Tipografía y legibilidad
Tamaño mínimo real —`product-design.md` exige **≥14 px** de cuerpo, y hay reglas de `8px`, `9px` y `10px`
en `globals.css` y tamaños de `.portal-side` que conviene medir—, contraste, longitud de línea,
espaciado, jerarquía, mayúsculas excesivas (`.eyebrow`, `text-transform:uppercase`), truncados, nombres
de paciente largos, folios, fechas y horas (`Intl.DateTimeFormat("es-MX", …)`), etiquetas de estado.

### 3.4 Formularios (ejecutar, no solo mirar)
Los dos formularios reales son **login** (`app/login/login-form.tsx`) y **solicitud de cita**
(`BookingModal` en `portal.tsx`). Ejecuta ambos completos en cada viewport móvil:
etiquetas visibles, tipo de input y teclado correcto, autocompletado, validación en línea, mensajes de
error, campos obligatorios, `select` de estudio, `datetime-local` en iOS y Android, `textarea` de notas,
scroll con teclado abierto, botones tapados por el teclado, conservación de datos tras error, prevención
de doble envío, indicador de carga, confirmación de éxito, manejo de sesión expirada y **qué ocurre
cuando el POST falla** (hoy `if(r.ok)saved()` no tiene rama de error: verifica qué ve el usuario).
Comprueba también el flujo de «¿Olvidaste tu contraseña?», que hoy solo escribe un mensaje.

### 3.5 Tablas y listados
`DataTable` (Pacientes, Equipo/Usuarios), `.staff-agenda`, `.case-cards`, `.appointment-cards`,
`.results-list`, `.compact-results`.
Para cada una decide la estrategia móvil correcta: tarjetas, filas expandibles, scroll horizontal,
columnas prioritarias, vista resumida o menú contextual de acciones.
Registra además un problema estructural a verificar: `DataTable` renderiza `div`/`b`/`span` sin
semántica de tabla, sin cabecera asociada y sin estrategia declarada por debajo de 760 px.

### 3.6 Modales y superposiciones
`BookingModal` y `.portal-toast`. Altura disponible, scroll interno, cierre accesible por teclado
(hoy solo hay `×` y clic en el fondo — comprueba `Escape`), cierre accidental, teclado móvil, foco
inicial y su retorno, trampa de foco, orientación horizontal, y si conviene convertirlo en página
completa en móvil. El toast desaparece a los 2 500 ms: evalúa si es tiempo suficiente y si se anuncia
a tecnologías asistivas.

### 3.7 Gráficos y estadísticas
`.big-chart` (barras semanales), `.staff-metrics`, `.patient-stats`, barras de progreso de caso
(`.case-progress`, ocultas por CSS bajo 760 px) y el `.mini-shell` de la landing.
Legibilidad a 320 px, etiquetas, ejes, colores y contraste, alternativa tabular, lectura por
tecnologías asistivas, información al tocar un dato. Antes de proponer paleta, aplica el skill `dataviz`.

### 3.8 Estados de la interfaz
Vacío, carga (`.portal-loading`), error, sin conexión, sesión expirada (401 del `/api/portal`), sin
citas, sin casos, sin resultados, sin pacientes, sin equipo; y los estados de dato reales del esquema:
cita `pending` / `confirmed` / `checked_in`; resultado `processing` / `published`; caso por `stage`,
`progress` y `priority`.

**La aplicación no debe inventar información para llenar una pantalla.** Este es un vector prioritario en
Pulso, no una nota al pie: `product-design.md` prohíbe explícitamente «datos o dominios inventados», y
en `portal.tsx` hay métricas escritas a mano que no vienen de la base (`"Laboratorios activos 12"`,
`"Ingresos recurrentes $48.6k"`, `"Muestras recibidas 42"`, `"↗ 8.2%"`), un expediente fijo
`LAB-002841`, `"O+ · 39 años"`, `"Sucursal Central Norte"` y la serie `[46,68,58,82,74,51,30]`.
Cada dato mostrado debe rastrearse hasta `/api/portal`; el que no lo haga se registra como hallazgo con
su severidad —en una aplicación clínica, una cifra inventada junto a datos reales es indistinguible de
un dato real—.

### 3.9 UX operacional y arquitectura frontend
Velocidad operativa, fatiga cognitiva, exceso de clics, discoverability, pérdida de contexto al cambiar
de sección; y en la capa técnica: ausencia de tokens (los valores de `product-design.md` no existen como
variables CSS salvo cuatro en `:root` de `globals.css`), colores literales repetidos, CSS muerto servido
a todas las rutas, un único componente de 43 líneas minificadas que concentra seis experiencias de rol,
y ausencia de componentes reutilizables para Button, Input y Card pese a estar especificados.

### 3.10 Ocultar no es adaptar — reglas, no criterios

Estas reglas se incumplen o se cumplen; su incumplimiento se registra como **hallazgo**, no como
sugerencia. Su origen es la estrategia responsive actual de `app/portal.css:2`, que en vez de reordenar
el contenido lo **elimina**. Verifica cada punto midiendo, y registra qué información y qué acción
pierde cada rol en cada ancho.

1. **La identidad no se recorta ni se oculta.** Nombre del centro, nombre y rol de quien entró,
   nombre del paciente, folio del caso y fecha/hora de la cita se parten en varias líneas
   (`break-words [overflow-wrap:anywhere]`, contenedor con `min-w-0`) antes que perder un carácter.
   A verificar: por debajo de 1050 px, `.lab-switch{display:none}` y `.portal-user div{display:none}`
   retiran el centro activo, el nombre y el rol; `nav button{font-size:0}` deja la navegación en
   iconos sin texto. Un profesional que atiende a dos laboratorios no puede saber en cuál está escribiendo.

2. **Ninguna navegación desaparece.** Por debajo de 760 px, `.portal-side{display:none}` retira la barra
   lateral **completa y no hay sustituto en el DOM**: no existe barra inferior, ni menú, ni botón de
   apertura. Si al medir se confirma, el usuario móvil queda encerrado en la primera sección de su rol y
   sin botón de cerrar sesión. Es **Crítica**: bloquea el flujo principal. La corrección canónica es una
   barra inferior que reparta el ancho entre todas las secciones (`grid auto-cols-fr grid-flow-col`) y
   parta el rótulo antes que dejar una fuera del viewport.

3. **Una función no se elimina en móvil: se reubica.** A 760 px también se ocultan el buscador
   (`header label`), las acciones de cabecera (`.round`), el expediente del paciente (`.health-id`) y el
   progreso del caso (`.case-progress`). Para cada uno decide: reubicar, colapsar tras un botón, o
   documentar por qué esa función no aplica en teléfono. «Se oculta» no es una decisión de diseño.

4. **Un dato clínico o un monto nunca desborda ni se recorta:** baja un escalón de tamaño en móvil y se
   parte. Aplica a valores de resultado, rangos de referencia, folios y porcentajes de progreso.

5. **La reserva contra el salto de diseño se mide, no se estima.** Un `min-height` mayor que el contenido
   real de ese ancho deja media pantalla en blanco y se registra igual que un desbordamiento.

6. **Nada se pinta encima de nada.** Un solapamiento no es un problema de `z-index`: es contenido que se
   sale de su contenedor. Se mide así: para cada contenedor `flex`/`grid` con `overflow: visible`, todo
   hijo no posicionado cuyo borde supere el borde interior del padre. Se reporta en píxeles fuera y con
   el texto del hijo, que es lo que se ve encima de lo de al lado.

---

## PROTOCOLO 4 — VALIDACIÓN DE REGLAS DE NEGOCIO DESDE LA INTERFAZ

Comprueba cada regla desde la UI y evalúa si el mensaje resultante es comprensible para un usuario no
técnico. Fuente: `project.md`, `knowledge/wiki/features.md`, `db/auth.ts`, `app/api/portal/route.ts`.

- El rol se obtiene de la cuenta: **el login no ofrece selector de rol** y cada cuenta aterriza en su
  experiencia (`product-design.md` lo prohíbe explícitamente).
- Ninguna consulta clínica se ejecuta sin `laboratory_id` autorizado.
- El paciente solo ve sus propias citas, casos, resultados y notificaciones (`WHERE patient_id=$1`).
- Solo el rol `patient` puede solicitar cita: cualquier otro rol recibe `403` en
  `POST /api/portal {action:"book_appointment"}`.
- La cita se crea siempre en estado `pending` y aparece después para recepción.
- Estudio y fecha son obligatorios (`400` si faltan). El formulario impone `min` = +24 h **solo en el
  cliente**: comprueba qué acepta el servidor con una fecha pasada y si el mensaje es comprensible.
- La sesión expirada devuelve `401` y la interfaz debe explicarlo, no quedarse vacía.
- Un laboratorio sin citas, casos o pacientes muestra un estado vacío explícito, nunca datos de ejemplo.
- Los resultados clínicos completos nunca viajan por WhatsApp; el aviso dirige al portal autenticado.
- El superadministrador no entra en la operación clínica interna de un centro.

**Gaps ya declarados en `features.md` — se clasifican como `No implementado`, nunca como defecto nuevo:**
RLS de PostgreSQL, integración de WhatsApp (bloqueada por credenciales), CRUD clínico completo y
auditoría. Si además la UI *insinúa* que existen (por ejemplo, una sección «Auditoría» que no muestra
nada real), eso sí es un hallazgo: la interfaz promete una capacidad ausente.

---

## PROTOCOLO 5 — SEGURIDAD Y PERMISOS DESDE LA EXPERIENCIA

Ocultación de secciones frente a protección real, acceso por URL directa (`/dashboard` sin cookie
`pulso_session`), botón atrás tras cerrar sesión, sesión expirada, datos en caché del navegador,
fugas entre roles en la respuesta de `/api/portal` (¿recibe recepción más campos de los que muestra?),
acciones visibles sin permiso, respuestas `401` y `403` legibles, y acceso cruzado entre centros.

**No consideres suficiente que una sección esté oculta en el menú.** Ejecuta las llamadas: `GET /api/portal`
sin sesión, con sesión de cada rol, y `POST /api/portal` con `action:"book_appointment"` desde un rol de
personal. Compara lo que devuelve el servidor con lo que pinta la interfaz.
Nunca realices pruebas destructivas ni desactives controles para completar una prueba. Trabaja siempre
contra la base local; nunca contra datos de pacientes reales.

---

## PROTOCOLO 6 — ACCESIBILIDAD (WCAG 2.2 AA)

`product-design.md` exige contraste AA, navegación por teclado y lectores de pantalla como requisitos,
no como aspiración. Audita: contraste, navegación y foco visible y su orden, etiquetas, roles ARIA,
nombres accesibles, formularios, mensajes de error, modal, tablas, gráficos, indicadores que dependen
solo del color (`.status-*`), zoom al 200 %, reflow, tamaño de objetivos, orientación, reducción de
movimiento (`@keyframes slide`, `transform` en hover), mensajes dinámicos (el toast) y estados de carga.

Puntos de partida verificados que exigen comprobación manual: los iconos de navegación y de acción son
glifos de texto (`⌂ □ ♙ ◇ ≡ ○ ⌕ ↪ ••• ＋ ♢`) dentro de `<i>`, `<em>` y `<b>` sin `aria-label` ni texto
alternativo; `DataTable` no usa semántica de tabla; el estado del caso se comunica por color y forma;
el modal no declara `role="dialog"` ni `aria-modal`.

Ejecuta cuando sea posible Lighthouse, axe-core y la auditoría de accesibilidad del navegador.
**Diferencia siempre hallazgos automáticos de hallazgos manuales.**

---

## PROTOCOLO 7 — RENDIMIENTO

FCP, LCP, INP, CLS, TBT; peso inicial, JavaScript descargado, imágenes, fuentes, CSS, carga diferida,
peticiones duplicadas, caché, refetch innecesario, skeletons, percepción de velocidad.

Elementos concretos a medir en Pulso, cada uno atado a su flujo:

- `app/layout.tsx` carga `globals.css` + `marketing.css` + `portal.css` en **todas** las rutas, incluida
  la landing pública. Cuantifica el CSS servido y sin usar por ruta.
- `/dashboard` es `force-dynamic`; `/api/portal` dispara cuatro consultas en paralelo por carga y el
  portal vuelve a pedirlas tras cada cita creada. Mide el coste real y si hace falta.
- Fuentes `Geist` y `Geist_Mono` vía `next/font/google`.
- La landing es un único componente con el marcado completo en línea.

Prueba al menos: 4G, 3G simulada, CPU ralentizada, primera visita sin caché y visita repetida con caché.

**No presentes solo métricas de Lighthouse: relaciona cada problema con el flujo funcional afectado.**

---

## PROTOCOLO 8 — REGISTRO DE HALLAZGOS

Para cada funcionalidad probada registra: superficie y sección, rol, capacidad requerida, acción probada,
resultado esperado, resultado obtenido, problema encontrado, evidencia, severidad y recomendación.
Como las secciones no son rutas, la ubicación se escribe como `ruta › sección › componente`
(ej. `/dashboard › Agenda › .staff-agenda`) más el archivo y la línea.

### Severidades

| Nivel | Criterio |
|---|---|
| **Crítica** | Impide completar un flujo principal, expone datos clínicos o de otro tenant, permite acceso no autorizado o provoca pérdida/corrupción de información |
| **Alta** | Dificulta seriamente una operación principal o genera riesgo importante de error clínico u operativo |
| **Media** | Afecta usabilidad, comprensión, accesibilidad o eficiencia, pero hay alternativa razonable |
| **Baja** | Problema visual, inconsistencia menor o mejora de calidad que no bloquea |
| **Mejora** | Optimización recomendada que no representa un defecto actual |

Añade además: impacto, frecuencia, esfuerzo estimado y prioridad recomendada.

### Evidencias

Captura, ubicación completa, viewport, rol, pasos de reproducción, resultado esperado y real, fragmento
de DOM o componente cuando sea útil, medición en píxeles cuando aplique, métrica de rendimiento cuando
aplique, regla WCAG cuando aplique.
Guárdalas en `knowledge/assets/informe-diseno-responsive/`.
**Nunca incluyas contraseñas —incluidas las de demostración—, tokens, cookies, datos personales reales
ni secretos.** Los nombres del seed son ficticios y pueden aparecer; cualquier dato de un paciente real
se anonimiza.

---

## PROTOCOLO 9 — ENTREGABLES

```text
knowledge/informe-diseno-responsive.html          ← informe principal
knowledge/assets/informe-diseno-responsive/       ← capturas y evidencias
knowledge/informe-diseno-responsive-findings.json ← hallazgos machine-readable
knowledge/informe-diseno-responsive-resumen.md    ← resumen ejecutivo
```

Rutas alineadas con `knowledge/wiki/informe-diseno-estandar.md` §6 (los informes viven en `knowledge/`,
fuera de cualquier directorio servido públicamente) y §7 (nombre en español, sin fecha en el archivo;
la fecha vive en el `<title>` y en la portada).

> ⚠️ **Desviación conocida del estándar.** `informe-diseno-estandar.md` exige partir del bloque `<style>`
> de `knowledge/informe-tecnico-arquitectonico.html`, y **esa plantilla no existe en este repositorio**
> (tampoco ningún otro `informe-*.html`). Aplica el fallback: construir el `<style>` desde los tokens y
> la tabla de componentes de §1–§4 del estándar —rampas `--brand-*`/`--accent-*`/`--slate-*`, `.toolbar`,
> `.cover`, `.section-header`, `.kpi-card`, `.card`, `.tbl-wrap`, `.badge-*`, `.doc-list`, `.info-box`,
> `.finding`, `pre`, `.footer`, tema claro, `@media print`— y **declarar la desviación en la portada**.
> Ese informe queda como plantilla de referencia para los siguientes.

### Estructura obligatoria del informe HTML

1. **Portada:** proyecto, nombre de la auditoría, fecha, commit, entorno, viewports, roles cubiertos.
2. **Resumen ejecutivo:** estado general por superficie (landing · login · portal paciente · consola de
   personal), fortalezas, riesgos, hallazgos por severidad, roles y flujos más afectados, recomendación.
3. **Alcance y metodología:** documentos revisados, herramientas, viewports, navegadores, condiciones de
   red, roles probados, **limitaciones declaradas** (sin suite de tests, sin segundo tenant, sin barrido
   automatizado si no se creó).
4. **Matriz de cobertura:** rol · superficie · sección · flujo probado · estado · hallazgos · evidencia.
   Estados permitidos: `Correcto`, `Correcto con observaciones`, `Defectuoso`, `Bloqueado`,
   `No implementado`, `No verificable`.
5. **Hallazgos:** identificador (`UX-001`), título, severidad, rol, superficie, ubicación, viewport,
   descripción, pasos, resultado esperado y obtenido, impacto, evidencia, recomendación, esfuerzo,
   prioridad, referencia WCAG. Cada tarjeta lleva `data-sev`, `data-rol`, `data-sup`, `data-est`.
6. **Análisis por rol:** una sección por cada uno de los seis roles.
7. **Análisis por componente:** navegación, cabecera, formularios, `DataTable`, tarjetas, modal, toast,
   gráficos, buscador, estados vacíos, mensajes, autenticación, landing.
8. **Accesibilidad:** resultados automáticos y manuales separados, incumplimientos WCAG, impacto.
9. **Rendimiento:** métricas por pantalla y por viewport, primera carga frente a repetida, recursos más
   pesados, problemas de interacción.
10. **Design System:** estado de los tokens documentados frente a los implementados, inventario de
    colores y tamaños literales, CSS muerto, propuesta de tokens y componentes.
11. **Roadmap:** Fase 1 (crítico y alto), Fase 2 (usabilidad y accesibilidad), Fase 3 (optimización y
    Design System). Cada actividad con identificador, descripción, beneficio, dependencias, esfuerzo,
    prioridad y componentes afectados.
12. **Checklist final verificable:** sin scroll horizontal accidental · sin contenido pintado sobre
    contenido · ningún dato de identidad —laboratorio, persona, rol, paciente, folio, fecha, valores—
    recortado u oculto en ningún ancho · navegación completa alcanzable en todos los anchos · ninguna
    función eliminada sin sustituto · cabeceras sin hueco muerto · tamaño táctil adecuado · formularios
    operables con teclado virtual · listados adaptados · gráficos legibles · modal dentro del viewport ·
    estados vacíos explícitos · **cero datos inventados** · errores comprensibles · permisos protegidos
    en frontend y backend · rutas y API directas protegidas · zoom soportado · contraste AA · foco
    visible · flujo completo de solicitud de cita a 320 px · login a 320 px · cierre de sesión
    alcanzable en todos los anchos.

### Requisitos técnicos del HTML

Autocontenido y abrible con `file://` · CSS y JS embebidos, **sin CDNs** · responsive · índice navegable ·
filtros combinables por severidad, rol, superficie y estado · gráficos en SVG inline · `@media print` que
expanda todo lo colapsado · capturas visibles · sin datos sensibles · tema claro, sin modo oscuro
(§1 del estándar) · legible en móvil y escritorio.

Antes de cerrarlo, aplica la verificación de §5 del estándar: abrirlo y mirarlo, comprobar
`scrollWidth === clientWidth`, cero errores de consola, ejercitar los filtros y revisar la vista de
impresión.

---

## PROTOCOLO 10 — SCORECARD Y REPORTE EJECUTIVO EN CONSOLA

Además del HTML, presenta en la respuesta:

```markdown
## Auditoría UX/UI Responsive Completada — Pulso

### 1. Resumen Ejecutivo
[Madurez UX/UI, consistencia y mayores riesgos operativos y clínicos]

### 2. Scorecard
| Categoría | Score (1-10) | Observaciones |
|---|---|---|
| Navegación y arquitectura de información | [X/10] | [...] |
| Portal del paciente en móvil | [X/10] | [...] |
| Consola de personal (tablet y móvil) | [X/10] | [...] |
| Formularios y flujos operativos | [X/10] | [...] |
| Listados, gráficos y densidad de datos | [X/10] | [...] |
| Veracidad del dato mostrado (sin datos inventados) | [X/10] | [...] |
| Accesibilidad WCAG 2.2 AA | [X/10] | [...] |
| Rendimiento percibido | [X/10] | [...] |
| Consistencia visual y Design System | [X/10] | [...] |
| Coherencia permisos frontend/backend | [X/10] | [...] |

### 3. Hallazgos Críticos y Altos
### 4. Quick Wins (próximo sprint)
```

Y al finalizar muestra: ruta del informe, cantidad de secciones revisadas por rol, hallazgos por
severidad, roles completamente auditados, flujos que no pudieron probarse y por qué, y recomendación
final sobre la preparación de Pulso para el piloto privado en cada canal.

---

## PROTOCOLO 11 — ESTÁNDARES Y ROADMAP (solo con aprobación)

Tras la aprobación del usuario:

1. **Roadmap estratégico UX/UI:** corto (quick wins), medio (refactors) y largo plazo (evolución del
   Design System).
2. **Estándares del Design System:** llevar los tokens de `knowledge/wiki/product-design.md` a variables
   CSS reales; spacing y typography scale; tokens semánticos de color, radius y sombras; convenciones de
   interacción, listados densos y formularios; **un único juego de breakpoints canónicos** que sustituya
   a los tres actuales; extracción de `Button`, `Input`, `Card`, `Status` y `DataTable` como componentes.
3. **Refactorización frontend:** ejemplos reales antes/después, retirada del CSS muerto de `globals.css`,
   y decisión sobre convertir las secciones del portal en rutas.
4. **Actualizar `knowledge/wiki/product-design.md`** con lo que se decida — el estándar cambia ahí, no
   solo en el código.

---

## CONDICIONES DE ACEPTACIÓN

La auditoría está completa solo cuando: se revisaron los **seis** roles con cuentas independientes · se
recorrieron todas las secciones de cada rol pulsando su navegación y verificando el título renderizado ·
se **ejecutaron** los flujos de login y solicitud de cita, no solo se inspeccionaron pantallas · se
usaron todos los viewports móviles y los cortes de breakpoint · se revisaron permisos y acceso directo a
rutas y API · se auditaron formularios, listados y gráficos · se revisaron accesibilidad y rendimiento ·
cada hallazgo tiene evidencia, ubicación y pasos · el HTML abre con `file://` y pasa la verificación de
§5 del estándar de diseño · el informe distingue defectos reales, funcionalidades no implementadas y
elementos no verificables · existe un roadmap priorizado.

---

## REGLAS GLOBALES EN MODO DISEÑO

- **Sé brutalmente honesto y consultivo:** evalúa como se evalúa un producto maduro que va a tocar datos
  clínicos de pacientes reales.
- **Foco en operabilidad:** las mejoras UX no son para «verse bonitas», sino para que se trabaje más
  rápido y sin errores.
- **Sistemas sobre parches:** si un botón está mal, propón el sistema completo de variantes.
- **Gobernanza de estilos:** claridad arquitectónica sobre utilidades y literales esparcidos.
- **No inventes funcionalidades** que no estén documentadas o implementadas — y señala las que la
  interfaz insinúa sin tener.
- **No declares correcta una funcionalidad sin probarla.**
- **No declares que un texto cabe sin medirlo:** a ojo, un nombre recortado con elipsis se lee como una
  decisión de diseño y no como el defecto que es.
- **Ocultar con `display:none` no es adaptar:** cada elemento retirado por una media query es una
  decisión que hay que justificar o corregir.
- **No ocultes errores de ejecución** ni modifiques reglas de negocio.
- **No confundas ausencia de datos con error funcional** — pero tampoco presencia de datos con dato real:
  comprueba que cada cifra venga de la base.
- Una funcionalidad documentada pero no implementada se clasifica como `No implementado`, nunca como
  defecto.
- **No cambies código antes de terminar y guardar el informe.**
