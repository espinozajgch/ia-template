# Síntesis: combinar lo mejor de varias opciones

Se usa cuando el usuario pide "lo mejor de A y B" o "una opción sin aspectos en contra".

## La petición "sin contras" se reformula, no se promete

Ninguna paleta carece de contras. Antes de diseñar, separa los contras de las opciones de
partida en tres grupos y dilo así en el entregable:

| Grupo | Qué es | Qué se hace |
|---|---|---|
| **Punto débil de diseño** | Un fallo medible del color: contraste, estado, daltonismo, temperatura, energía | Se resuelve |
| **Coste inherente** | Consecuencia de la ruta, no del color: coste de cambio, conversión sin medir | Se declara |
| **Regla de uso** | Una condición para usar bien un color | Se documenta |

## Procedimiento

1. **Lista los puntos débiles** de cada opción de partida, con su cifra y de qué opción vienen.
2. **Clasifícalos** en los tres grupos.
3. **Conserva lo que funciona**: anota qué toma la síntesis de cada opción.
4. **Resuelve cada punto de diseño con el cambio mínimo.** Usa `buscar`, `variante`,
   `estados` y `daltonismo`. No cambies un color que no tenga problema.
5. **Vuelve a medir todo** con `color.py validar`. Un arreglo puede romper otra cosa: en el
   caso de referencia, el violeta que alejaba el acento 2 de los estados quedaba con la
   misma luminosidad que el acero, y con daltonismo se separaban menos de lo esperado.
6. **Compara con las opciones de partida en cada métrica**, no solo en las que mejoran. Si
   la síntesis empeora algo, se dice.
7. **Corrige lo dicho antes** si una medición lo desmiente (AP-M05). En el caso de
   referencia, un supuesto punto débil de D2 resultó menor de lo indicado y se corrigió con
   la cifra en el entregable.
8. **Escribe la tabla "Cómo resuelve cada punto débil"** (`resuelve` en `paleta.json`):
   punto débil, dónde estaba, cómo lo resuelve, dato antes → después.
9. **Declara lo que queda** en un bloque aparte: costes inherentes y reglas de uso.

## Señales de calidad

- Cada fila de `resuelve` tiene un dato reproducible con las herramientas.
- La síntesis tiene un nombre propio y una tesis, no "Opción mezcla".
- La recomendación final se actualiza: si la síntesis sustituye a otras opciones, se dice cuáles.
