---
name: valores-marca
description: Analiza un producto como estratega de marca y entrega sus valores núcleo con la prueba de cada uno en el producto, su personalidad, su posicionamiento y un diagnóstico de brechas (valores sin prueba, activos ocultos, taglines que compiten, reglas propias incumplidas). Úsala cuando pidan valores de marca, posicionamiento o un análisis de marketing de un proyecto.
---

# Valores de marca

Un valor sin prueba es un adjetivo. Esta skill solo admite valores que el producto demuestra.

**Antes de nada:** lee `agente/packs/estudio-marca/metodo/valores.md` y
`agente/packs/estudio-marca/metodo/anti-patrones.md` (AP-M06, AP-M10).
Si existe `knowledge/estudios-marca/<slug>/brief.md`, léelo.

---

## 1 · Reúne las fuentes en paralelo

En el proyecto analizado, lee a la vez:
- documentación de marca y diseño (guías, `brand*`, `product-design*`, `README`);
- la web pública: `<title>`, H1, meta y Open Graph, CTAs, FAQ, precios, páginas de
  seguridad y privacidad;
- el copy de la interfaz (ficheros de traducción, mensajes);
- las decisiones de producto que encarnan valores: permisos, aislamiento de datos, cifrado,
  accesibilidad, portales para terceros.

Anota cada hallazgo con `fichero:línea` o URL.

## 2 · Sigue el procedimiento de `metodo/valores.md`

Inventario de lo declarado → inventario de lo demostrado → cruce → selección de 4 a 6
valores → personalidad → diagnóstico → recomendación.

## 3 · Escribe `knowledge/estudios-marca/<slug>/01-valores.md`

Con la estructura de `agente/packs/estudio-marca/plantillas/valores.md`. Cada valor con
definición de conducta y prueba referenciada. Cita el copy real entre comillas.

## 4 · Responde en el chat

- Posicionamiento en dos frases.
- Tabla de valores núcleo: valor, qué significa, dónde se demuestra.
- Personalidad en una lista corta.
- Diagnóstico: lo fuerte y las brechas, con cifras.
- Una recomendación.

## Antes de entregar

- [ ] Ningún valor sin prueba.
- [ ] Ningún claim de mercado presentado como hecho sin fuente.
- [ ] Distingues valores de atributos de percepción.
- [ ] Has contado los taglines que compiten.
- [ ] No has modificado nada del proyecto analizado.
