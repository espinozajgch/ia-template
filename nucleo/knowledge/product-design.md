# product-design.md — Marca y sistema visual

> Se consulta **antes de crear cualquier componente visual.** Sin este archivo, cada
> pantalla nueva inventa sus propios colores, espaciados y bordes, y el producto acaba
> pareciendo cinco productos.
>
> Si el proyecto es backend, CLI, worker o librería sin interfaz: escribir **NO APLICA**
> aquí y no rellenar el resto.

---

## Marca

| | |
|---|---|
| Nombre | |
| Personalidad | tres adjetivos, no más |
| Tono de voz | cómo habla el producto, con un ejemplo real |
| Audiencia | |
| Referencias visuales | productos que sí |
| Anti-referencias | productos que no, y por qué |

---

## Tokens

**Regla:** en el código no hay colores, sombras ni radios crudos. Solo tokens. Lo que
entra crudo se queda para siempre.

### Color

| Token | Claro | Oscuro | Se usa para |
|---|---|---|---|
| `--fondo` | | | |
| `--texto` | | | |
| `--marca` | | | |
| `--peligro` | | | |
| `--aviso` | | | |
| `--exito` | | | |

Contraste mínimo: **4.5:1** en texto normal, **3:1** en texto grande y en los bordes de
controles interactivos. Se comprueba, no se estima.

### Tipografía, espaciado, radios, sombras

| Token | Valor | Se usa para |
|---|---|---|

---

## Componentes

| Componente | Dónde vive | Variantes | Estados |
|---|---|---|---|

**Estados obligatorios en todo control:** reposo · hover · **foco visible** · activo ·
deshabilitado · cargando · error. El foco visible es el que siempre falta.

---

## Responsive

| Breakpoint | Ancho | Qué cambia |
|---|---|---|

**Se prueba a 320 px.** Es donde se rompe todo lo que en un portátil parece correcto.

---

## Accesibilidad

- Objetivo: **WCAG 2.1 AA**, y `best-practice` de axe donde no cueste.
- Todo lo operable con ratón es operable con teclado, en orden lógico.
- Los errores se anuncian: `role="alert"` en el banner, `aria-describedby` en el campo.
- `alt` real en imágenes con información; `alt=""` en las decorativas.
- Nada depende **solo** del color para comunicar estado.
- Se verifica con axe en las páginas principales, en claro y en oscuro.
