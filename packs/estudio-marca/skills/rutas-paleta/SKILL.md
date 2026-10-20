---
name: rutas-paleta
description: Añade opciones de paleta que son rutas estratégicas distintas (cada una pone el peso en un valor de marca diferente), o construye la combinación o la variante exacta que pida el usuario, y las compara por diferenciación, riesgo, coste de cambio, estados y daltonismo con una recomendación. Úsala cuando pidan más opciones, alternativas, otra combinación o una variante de una paleta.
---

# Rutas de paleta

Varias opciones solo ayudan a decidir si responden a estrategias distintas.

**Antes de nada:** lee `agente/packs/estudio-marca/metodo/rutas.md`,
`agente/packs/estudio-marca/metodo/color.md` y
`agente/packs/estudio-marca/metodo/anti-patrones.md` (AP-M04, AP-M06, AP-M07). Lee el
`paleta.json` del proyecto: las opciones nuevas se añaden a la lista existente, no la
sustituyen.

---

## 1 · Decide qué construyes

- **"Dame N opciones más"**: diseña N rutas con tesis distintas (`metodo/rutas.md`). Cada
  una debe cambiar qué valor lleva el peso.
- **"Haz una con estos colores"**: construye exactamente esa combinación, aunque no la
  recomendarías, y evalúala con la misma honestidad.
- **"Una variante donde X sea Y"**: copia la opción base, cambia solo lo pedido y
  etiquétala como variante (`"etiqueta": "Variante D2"`).

## 2 · Construye cada opción

Para cada color: busca, ajusta y valida con `color.py` como en `paleta-marca`. Reutiliza
nombres y valores de colores que ya existen en otras opciones cuando sean el mismo color.

Escribe en la opción: `titular`, `tesis`, `lead`, `bloques` (A favor, En contra, Qué
cambia), `proporcion` y `comparativa` con los criterios de
`agente/packs/estudio-marca/metodo/rutas.md`.

## 3 · Sé honesto en "En contra"

Mide antes de escribir: contraste del acento 1 sobre el oscuro, distancia a estados,
ΔE con daltonismo entre acentos, temperatura de los neutros. Cada contra con su cifra.

## 4 · Valida y regenera

```bash
python3 agente/packs/estudio-marca/herramientas/color.py validar knowledge/estudios-marca/<slug>/paleta.json
python3 agente/packs/estudio-marca/herramientas/hoja_paleta.py knowledge/estudios-marca/<slug>/paleta.json
```

## 5 · Actualiza la recomendación

Revisa `recomendacion` en `paleta.json`: una opción, el motivo y para quién sería mejor la
alternativa. Si una opción nueva cambia la recomendación, dilo.

## 6 · Responde en el chat

Por cada opción nueva: su tabla de cinco colores, a favor y en contra con cifras.
Después, la comparativa de todas las opciones, la recomendación y el enlace o la ruta de
la hoja.

## Antes de entregar

- [ ] Cada opción nueva tiene una tesis distinta de las demás (salvo variantes declaradas).
- [ ] Cada "En contra" lleva su cifra.
- [ ] Ningún claim de mercado sin fuente.
- [ ] `color.py validar` sin errores y hoja regenerada.
