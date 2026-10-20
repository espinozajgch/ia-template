# Valores de marca: cómo se extraen, se prueban y se diagnostican

## Vocabulario

No se mezclan estas cuatro cosas. Es el error más común de un análisis de marca.

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Valor** | Un compromiso de conducta que el producto cumple y se puede probar | Confidencialidad: cada agencia ve solo sus datos |
| **Atributo de percepción** | Cómo quiere la marca que la vean | "Confianza", "precisión", "premium" |
| **Personalidad** | Cómo suena y se ve | Sobria, directa, futbolera |
| **Promesa** | Lo que el cliente obtiene, en una frase | "Dirige toda tu agencia en una sola jugada" |

Una lista de adjetivos de percepción **no** es una lista de valores (AP-M10).

## Fuentes, por orden de fiabilidad

1. **El producto**: funcionalidades, permisos, decisiones de arquitectura que encarnan un
   valor (aislamiento de datos, cifrado, accesibilidad, borrado real). Es la prueba más fuerte.
2. **El copy público**: `<title>`, H1, meta description, Open Graph, CTAs, FAQ, precios,
   páginas legales y de seguridad. Lo que promete hacia fuera.
3. **El copy de la interfaz**: ficheros de traducción, mensajes de error, estados vacíos.
4. **La documentación de marca**: guías, `brand-identity`, `product-design`. Dice lo que
   la marca *quiere* ser; puede estar desfasada respecto al código (ver auditoría).

Busca también lo que el equipo **se prohíbe**: reglas internas, anti-patrones, frases
vetadas. Una regla como "no mostramos certificaciones que no tenemos" es un valor (honestidad)
aunque nadie lo haya listado como tal.

## Procedimiento

1. **Inventario de lo declarado.** Lista literal de valores, atributos, taglines y principios
   que aparecen en documentación y web, con `fichero:línea` o URL.
2. **Inventario de lo demostrado.** Para cada área del producto, ¿qué compromiso cumple sin
   decirlo? Anota la prueba concreta.
3. **Cruce.** Tres resultados posibles por valor:
   - *Declarado y probado*: valor sólido. Se mantiene.
   - *Declarado sin prueba*: promesa vacía. Se señala como riesgo.
   - *Probado sin declarar*: **activo oculto**. Suele ser el hallazgo más valioso.
4. **Selección.** De 4 a 6 valores núcleo. Cada uno con: nombre, definición en una frase
   de conducta y al menos una prueba con referencia.
5. **Personalidad.** De 4 a 6 rasgos de cómo suena y se ve, con ejemplo de copy real.
6. **Diagnóstico.** Revisa siempre estas brechas:
   - Valores que son en realidad atributos de percepción.
   - Diferenciales del producto que no aparecen en los principios de marca.
   - **Proliferación de taglines**: cuenta cuántas frases distintas compiten como lema.
   - La web o la app incumplen reglas de la propia guía de marca (iconos, tipografías, color).
   - Desfases entre documentación y producto (idiomas, módulos, cifras).
   - Pruebas de confianza que la web no comunica. Si se proponen como claim, marcar que
     requieren validación legal antes de publicarse.
7. **Recomendación.** Qué lista de valores adoptar y qué corregir primero.

## Señales de calidad

- Cada valor tiene una prueba con referencia. Sin prueba, no entra.
- El posicionamiento se explica en dos frases, incluido el contexto del sector.
- Los claims sobre el mercado o la competencia sin fuente se formulan como tendencia
  ("suele", "es poco habitual"), nunca como hecho (AP-M06).
- Se cita el copy real entre comillas, no se parafrasea.

Formato de salida: `plantillas/valores.md`.
