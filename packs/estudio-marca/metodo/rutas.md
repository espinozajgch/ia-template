# Rutas de paleta: cómo se diseñan y se comparan

## Una ruta es una tesis, no un tono

Cada opción responde a la pregunta **¿qué valor lleva el peso?** Dos opciones que solo
cambian matices del mismo azul no son rutas: son la misma ruta (AP-M07).

Rutas que suelen funcionar como punto de partida, a adaptar a cada marca:

| Ruta | Tesis | Cambia |
|---|---|---|
| **Continuidad** | Evolucionar sin romper | Ajustes de accesibilidad y coherencia; un acento nuevo como mucho |
| **Diferenciación** | El color más reconocible de la marca pasa a ser el de acción | El color de acción y, con él, los neutros |
| **Sobriedad** | Seriedad institucional, máxima confianza | Un principal profundo y neutros más grises |

Si el usuario pide una combinación concreta, se construye exactamente esa y después se
evalúa con la misma honestidad que las propias. Si pide una **variante**, solo cambia lo
que pidió, y se presenta como variante (D2), no como opción nueva.

## Contenido de cada opción

- `etiqueta` y `nombre` evocador (Palco, Pizarra, Vitrina…), `titular` y `tesis` de una frase.
- Bloques **A favor**, **En contra** y **Qué cambia**, con cifras donde las haya.
- Los cinco colores con valor, descripción, uso y variantes.
- Proporción de uso.
- Fila de la comparativa.

## Criterios de comparación

| Criterio | Cómo se decide |
|---|---|
| Color de acción | Automático: el principal y, si es otro, el color de enlaces |
| Valores protagonistas | Los dos o tres valores que más pesan en la ruta |
| Diferenciación | Media si sigue la convención del sector; Alta si se aparta de forma reconocible |
| Riesgo de diseño | Problemas de contraste, de estados, de daltonismo o de percepción (lujo, frialdad, casino) |
| Coste de cambio | Bajo: ajustes de tono. Medio: cambia el color de acción o los neutros. Alto: cambia el color de acción, los neutros y reglas documentadas |
| Acento 2 frente a estados | Automático (`hoja_paleta.py`) |
| Acentos con daltonismo | Automático (`hoja_paleta.py`) |
| Encaja si | Para quién o para qué objetivo es la mejor opción |

Riesgo y coste usan siempre los mismos niveles: Bajo, Medio, Alto (Media/Alta para
diferenciación).

## Recomendación

Una sola, con el motivo en una frase, y para quién sería mejor la alternativa. Si la ruta
recomendada cambia el color de acción, se propone validarla primero en la web pública con
una medición de conversión antes de llevarla al producto.
