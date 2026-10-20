---
name: sintesis-paleta
description: Crea una opción de paleta que combina lo mejor de otras y resuelve sus puntos débiles de diseño, con una tabla de antes y después medida, y declara con honestidad los costes y reglas de uso que ninguna paleta evita. Úsala cuando pidan "lo mejor de ambas", "una opción sin aspectos en contra" o una mezcla de opciones existentes.
---

# Síntesis de paleta

"Sin contras" no existe. Lo que sí existe es una opción sin puntos débiles de diseño, con
los costes inherentes declarados. Esta skill construye eso y lo demuestra con cifras.

**Antes de nada:** lee `agente/packs/estudio-marca/metodo/sintesis.md`,
`agente/packs/estudio-marca/metodo/color.md` y
`agente/packs/estudio-marca/metodo/anti-patrones.md` (AP-M04, AP-M05, AP-M08). Lee el
`paleta.json` del proyecto.

---

## 1 · Lista y clasifica los puntos débiles

De cada opción de partida, toma su "En contra" y los avisos de `color.py validar`.
Clasifica cada uno: **diseño** (se resuelve), **coste inherente** (se declara) o **regla de
uso** (se documenta).

## 2 · Conserva lo que funciona

Anota qué toma la síntesis de cada opción. Irá en `bloques` como "Conserva de X".

## 3 · Resuelve cada punto de diseño con el cambio mínimo

| Punto débil típico | Herramienta |
|---|---|
| Un acento desaparece sobre el oscuro | `buscar` con restricción sobre el claro (4,5) y sobre el oscuro (3) |
| Un acento se parece a un estado | `estados`; busca un tono a ≥ 30° de todos |
| Poca energía | `info` para comparar croma; sube saturación con `buscar --sat` |
| Dos acentos que se confunden | `daltonismo`; separa luminosidad, no solo tono |
| Neutros que chocan de temperatura | Reduce la diferencia R−B del claro |

## 4 · Vuelve a medirlo todo

```bash
python3 agente/packs/estudio-marca/herramientas/color.py validar knowledge/estudios-marca/<slug>/paleta.json
python3 agente/packs/estudio-marca/herramientas/color.py daltonismo ACENTO1 ACENTO2
```

Compara la síntesis con **cada** opción de partida en **cada** métrica. Si empeora algo,
se dice. Si una medición desmiente algo que dijiste antes, corrígelo con la cifra (en
`notas` de la opción y en la respuesta).

## 5 · Escribe la opción

En `paleta.json`: `destacada: true`, nombre propio y tesis, `bloques` (Conserva de…,
Lo que ninguna paleta de esta ruta evita, Reglas de uso), `resuelve` (punto débil, dónde,
cómo, dato antes → después) y `notas` para correcciones. Actualiza `recomendacion`.

## 6 · Regenera y responde

Regenera la hoja con `hoja-paleta`. En el chat:
- la tabla de cinco colores con qué cambia respecto a las opciones de partida;
- cómo resuelve cada punto débil, con cifra;
- correcciones, si las hay;
- lo que sigue en contra y no depende de la paleta;
- la recomendación actualizada.

## Antes de entregar

- [ ] No prometes "sin contras": separas diseño, costes y reglas.
- [ ] Cada fila de `resuelve` tiene un dato reproducible.
- [ ] Has comparado todas las métricas, no solo las que mejoran.
- [ ] Las afirmaciones anteriores desmentidas están corregidas.
- [ ] `color.py validar` sin errores y hoja regenerada.
