# Product Design

> Fuente de verdad para identidad de marca, experiencia de usuario y sistema visual.
> Aplica solo a proyectos con frontend, interfaz visual, sitio publico o producto con experiencia de usuario.
> Si el proyecto es backend-only, marcar como `NO APLICA` y explicar por que.

---

## Estado

| Campo | Valor |
|---|---|
| Aplica frontend | [SI / NO] |
| Tipo de interfaz | [Web app / Mobile / Landing / Dashboard / CLI / Backend-only] |
| Fuente principal | [Blueprint / Codigo existente / Usuario / Design system externo] |
| Ultima actualizacion | [FECHA] |

---

## Identidad de Marca

| Elemento | Definicion |
|---|---|
| Nombre de marca/producto | [Nombre] |
| Personalidad | [Ej: sobria, tecnica, cercana, premium, ludica] |
| Tono de comunicacion | [Como habla la interfaz] |
| Audiencia principal | [Usuarios objetivo] |
| Referentes permitidos | [Productos, sitios o estilos de referencia] |
| Evitar | [Estilos, colores, patrones o mensajes prohibidos] |

---

## Principios de Experiencia

- [Principio UX 1]
- [Principio UX 2]
- [Principio UX 3]

---

## Sistema Visual

### Color

| Token | Uso | Valor |
|---|---|---|
| `color.background` | Fondo principal | [HEX/RGB/CSS var] |
| `color.surface` | Superficies | [Valor] |
| `color.text` | Texto principal | [Valor] |
| `color.primary` | Acciones principales | [Valor] |
| `color.danger` | Errores/destructivo | [Valor] |

### Tipografia

| Token | Uso | Valor |
|---|---|---|
| `font.base` | Texto general | [Familia] |
| `font.display` | Titulares | [Familia] |
| `text.body` | Cuerpo | [Tamano/line-height] |
| `text.heading` | Encabezados | [Tamano/line-height] |

### Espaciado y Layout

| Token | Uso | Valor |
|---|---|---|
| `space.1` | Espaciado minimo | [Valor] |
| `space.2` | Espaciado comun | [Valor] |
| `radius.default` | Radio comun | [Valor] |
| `layout.maxWidth` | Ancho maximo | [Valor] |
| `breakpoint.mobile` | Mobile | [Valor] |
| `breakpoint.desktop` | Desktop | [Valor] |

---

## Componentes

| Componente | Uso | Variantes | Estados requeridos |
|---|---|---|---|
| Button | Acciones | primary, secondary, danger | default, hover, disabled, loading |
| Input | Captura de texto | text, email, password | default, focus, error, disabled |
| Card | Agrupar informacion repetida | default, interactive | default, hover, selected |

---

## Pantallas y Navegacion

| Pantalla | Proposito | Ruta | Componentes clave | Estado |
|---|---|---|---|---|
| [Pantalla] | [Que permite hacer] | [Ruta] | [Componentes] | [Existente/Planificada] |

---

## Accesibilidad y Responsive

- Contraste minimo: [AA / AAA / pendiente]
- Navegacion por teclado: [Requerida / No aplica]
- Lectores de pantalla: [Requerido / No aplica]
- Breakpoints soportados: [Mobile / Tablet / Desktop]
- Estados obligatorios: loading, empty, error, success

---

## Reglas de Mantenimiento

- Consultar este archivo antes de crear o modificar componentes visuales.
- Actualizarlo cuando cambien marca, tokens, componentes, navegacion o reglas responsive.
- En proyectos existentes, citar archivos fuente cuando se infieran estilos desde CSS, componentes o assets.
- Si hay un design system externo, enlazarlo aqui y documentar solo las decisiones locales.
