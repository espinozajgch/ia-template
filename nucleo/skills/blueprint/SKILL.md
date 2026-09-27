---
name: blueprint
description: Establece el contexto de un proyecto antes de escribir código. Funciona en los dos casos — proyecto nuevo (pregunta) y proyecto con código ya escrito (infiere del repositorio y solo pregunta lo que no puede deducir). Produce la fuente de verdad en knowledge/wiki/ y rellena AGENTS.md. Úsala una vez por proyecto, y de nuevo cuando el proyecto cambie de rumbo.
---

# Blueprint

Un agente sin contexto adivina. Adivinar sale caro dos veces: en los tokens del código que
hay que rehacer y en la confianza de quien lo lee.

Esta skill produce **el contexto mínimo suficiente** — no un documento corporativo.
Si al terminar `AGENTS.md` pasa de 250 líneas, sobra material.

**Antes de nada:** si existe `knowledge/wiki/skills/blueprint.md`, léelo. Es lo propio de este
proyecto para esta skill y, donde sea más estricto que ella, manda él.

---

## Antes de nada: ¿hay código?

```bash
ls -d src app lib server client cmd pkg 2>/dev/null; ls *.json *.toml *.mod 2>/dev/null
```

- **No hay código** → camino A (preguntar).
- **Hay código** → camino B (inferir). **Analizar antes de preguntar** es la regla
  principal: preguntar lo que está escrito en el repositorio gasta el turno del usuario
  en algo que el agente podía leer.

---

## Camino A · Proyecto nuevo

Cinco preguntas, **una a una**, esperando respuesta. No escribir ni una línea de código
hasta tenerlas.

| # | Pregunta | Sin ella, el agente… |
|---|---|---|
| 1 | **North Star** — ¿cuál es el único resultado que este sistema debe lograr? | construye lo que le parece |
| 2 | **Integraciones** — ¿qué servicios externos hacen falta y hay credenciales? | inventa APIs |
| 3 | **Fuente de datos** — ¿dónde viven los datos primarios? | inventa esquemas |
| 4 | **Entrega** — ¿cómo y dónde se entrega el resultado? | elige formato al azar |
| 5 | **Restricciones** — ¿qué NO debe hacer nunca? | cruza límites que nadie le dijo |

**Regla Data-First.** El esquema de entrada y salida se define **antes** que el código.
Un tipo inventado se propaga a todo el repositorio antes de que nadie lo revise.

### Subfase · Producto y marca (solo si hay interfaz)

Si hay frontend, panel, sitio público o app móvil, tres preguntas más:

| Pregunta | Dónde queda |
|---|---|
| Identidad: personalidad, tono, audiencia, referencias visuales | `knowledge/wiki/product-design.md` |
| Sistema visual: color, tipografía, layout, componentes, responsive, accesibilidad | `knowledge/wiki/product-design.md` |
| Producto: módulos, pantallas, acciones, estados, flujos | `knowledge/wiki/features.md` |

Si es backend, CLI, worker o librería: `product-design.md` se marca **NO APLICA** y se sigue.

---

## Camino B · Proyecto con código

### 1 · Escanear, todo en paralelo

README y documentación · manifiesto de dependencias (`package.json`, `pyproject.toml`,
`go.mod`, `Gemfile`…) · `.env.example` · punto de entrada · rutas/handlers/endpoints ·
modelos y esquemas · migraciones · definición de CI · si hay frontend: páginas,
componentes, tokens de diseño, configuración del framework de UI.

Con el grafo de código disponible, empezar por él; el texto es para literales y
configuración.

### 2 · Rellenar la tabla, con confianza y fuente

| Concepto | Inferido | Confianza | Fuente |
|---|---|---|---|
| North Star | … | ALTA/MEDIA/BAJA | `[archivo:línea]` |
| Integraciones | … | … | … |
| Fuente de datos | … | … | … |
| Entrega | … | … | … |
| Restricciones | … | … | … |
| Funcionalidad actual | … | … | … |
| Marca y diseño | NO APLICA / … | … | … |

**Sin fuente, no hay inferencia.** Una casilla sin `archivo:línea` es una suposición
disfrazada, y se marca como pregunta.

### 3 · Preguntar solo lo BAJO

Presentar la tabla y preguntar **únicamente** las filas de confianza BAJA, en un solo
mensaje y con la opción por defecto propuesta. Las de confianza ALTA se dan por buenas.

### 4 · Levantar las trampas

Mientras se lee el repositorio aparecen cosas que ningún documento cuenta: dos bases de
datos donde debería haber una, un script de migración que apunta a la que la aplicación no
usa, un comando de tipos que pasa mientras el build falla. **Eso va a `AGENTS.md` §7.**
Es la sección que más tiempo ahorra en las sesiones siguientes.

---

## Qué se produce

```text
AGENTS.md                                 secciones 1-9 rellenas, sin marcadores [ ]
knowledge/wiki/project.md                 blueprint + registro de decisiones
knowledge/wiki/features.md                módulos, pantallas, flujos
knowledge/wiki/product-design.md          marca y sistema visual, o NO APLICA
knowledge/wiki/definicion-de-hecho.md     adaptada a este proyecto
knowledge/wiki/glossary.md                términos del dominio que el agente debe entender
```

Y los punteros por herramienta —`CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.windsurfrules`,
`.github/`— que **no se editan**: apuntan a `AGENTS.md` y ya está. Duplicar contexto en
cinco ficheros es garantizar que cuatro queden desfasados.

---

## Elegir packs

Con el blueprint hecho, mirar `agente/packs/` y activar **solo los que aplican**. Un pack
que no aplica es contexto que se lee y no sirve. Anotarlos en `AGENTS.md` §8.

---

## Al terminar

Un mensaje, corto: qué se dedujo, qué se preguntó, qué packs se activaron, y **cuál es la
primera tarea**. Si no existe un comando único que corra la puerta de calidad entera, esa
es la primera tarea — ver [`verificar`](../verificar/SKILL.md).
