---
name: estudio-marca
description: Punto de entrada del estudio de marca. Convierte un encargo ("analiza este proyecto como experto en marketing", "dime los valores de marca", "créame una paleta", "dame más opciones", "mezcla lo mejor de ambas") en un proyecto en knowledge/estudios-marca/<slug>/, decide por qué etapa entrar y encadena las demás skills. Úsala ante cualquier encargo nuevo de marca o color.
---

# Estudio de marca

Un encargo de marca mal delimitado acaba en opiniones. Esta skill lo convierte en un
proyecto con fuentes, alcance y lector definidos antes de opinar.

**Antes de nada:** lee `agente/packs/estudio-marca/PACK.md` entero. Sus reglas no se
negocian; la más importante aquí: **el proyecto analizado es de solo lectura**.

---

## 1 · Identifica el proyecto analizado

- Una ruta local (repositorio), una URL pública o ambas.
- Si el usuario no la da y no se deduce del contexto, pregúntala. Es lo único que no se
  puede suponer.
- Elige un `slug` corto en minúsculas (`elevenoffice`, `tienda-sublimaciones`).

## 2 · Crea o retoma `knowledge/estudios-marca/<slug>/`

- Si existe, lee `brief.md`, `decisiones.md` y lo que haya de cada etapa. **Retoma**, no
  empieces de cero.
- Si no existe, créalo copiando `agente/packs/estudio-marca/plantillas/brief.md` y
  `agente/packs/estudio-marca/plantillas/decisiones.md`.

## 3 · Rellena el brief

Con lo que el usuario dijo y lo que veas en el proyecto: objetivo del encargo, quién leerá
el entregable, fuentes que vas a usar, alcance (qué etapas) y restricciones. Si el usuario
no dijo para quién es, el lector por defecto es el propio usuario.

## 4 · Decide la etapa

| El usuario pide… | Etapa | Skill |
|---|---|---|
| Valores, posicionamiento, análisis de marca | 1 | `valores-marca` |
| Los colores que tiene ahora, inconsistencias | 2 | `auditoria-color` |
| Una paleta nueva | 3 | `paleta-marca` |
| Más opciones, otra combinación, una variante | 4 | `rutas-paleta` |
| Lo mejor de varias, una opción sin contras | 5 | `sintesis-paleta` |
| Verla, compartirla, una página | 6 | `hoja-paleta` |

Si una etapa necesita otra anterior que no existe (una paleta necesita los valores y la
auditoría), hazla primero, en versión breve, sin preguntar. Dilo en una línea.

## 5 · Ejecuta y cierra

- Sigue la skill de la etapa al pie de la letra.
- Anota en `decisiones.md` qué pidió el usuario, qué se entregó y cualquier corrección.
- Responde en el chat con lo esencial: la tabla, la recomendación y la ruta o el enlace
  del entregable. No repitas el documento entero.
