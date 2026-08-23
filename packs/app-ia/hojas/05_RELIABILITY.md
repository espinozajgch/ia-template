# Reliability - Cartelera My Own Business

> Generado: 2026-06-16
> Fase: Stylize

## Formato Exacto del Output

El sistema debe poder entregar el mismo analisis en cuatro formatos:

1. Pantalla web.
2. JSON estructurado.
3. Excel.
4. PDF o imagen de la cartelera.

## JSON de Salida

```json
{
  "raceDayId": "string",
  "summary": {
    "trackName": "La Rinconada",
    "date": "2026-05-31",
    "numberOfRaces": 6,
    "horsesPerRace": 3,
    "totalCombinations": 729,
    "cost": 600,
    "basePrize": 21000,
    "accumulatedPrize": 3000,
    "totalPrize": 24000,
    "costPerCombination": 0.82,
    "ticketCount": 0
  },
  "winners": [
    { "raceNumber": 1, "winnerNumber": 3 },
    { "raceNumber": 2, "winnerNumber": 3 },
    { "raceNumber": 3, "winnerNumber": 1 },
    { "raceNumber": 4, "winnerNumber": 1 },
    { "raceNumber": 5, "winnerNumber": 8 },
    { "raceNumber": 6, "winnerNumber": 2 }
  ],
  "ranking": [
    {
      "position": 1,
      "ticketId": "string",
      "tipsterId": "string",
      "tipsterCode": "17",
      "tipsterName": "GABRIEL D",
      "totalHits": 6,
      "effectivenessPercentage": 100,
      "isFullWinner": true
    }
  ],
  "fullWinners": ["ticketId"],
  "hitBuckets": [
    { "hits": 6, "count": 0 },
    { "hits": 5, "count": 0 },
    { "hits": 4, "count": 0 },
    { "hits": 3, "count": 0 },
    { "hits": 2, "count": 0 },
    { "hits": 1, "count": 0 },
    { "hits": 0, "count": 0 }
  ],
  "heatmap": [
    {
      "raceNumber": 1,
      "horses": [
        { "horseNumber": 3, "count": 10 }
      ]
    }
  ],
  "warnings": []
}
```

## Markdown de Resumen

```text
Resumen de la jornada
- Hipodromo: [trackName]
- Fecha: [date]
- Jugadas analizadas: [ticketCount]
- Ganadores registrados: [registeredWinners]/6
- Total a repartir: [totalPrize]
- Combinaciones teoricas: 729

Ranking
1. [codigo] [nombre] - [totalHits]/6 ([effectivenessPercentage]%)

Ganadores 6/6
- [codigo] [nombre]

Alertas
- [warnings]
```

## Reglas de Validacion Antes de Entregar

### Jornada

- `trackName` no puede estar vacio.
- `date` debe ser una fecha valida.
- `numberOfRaces` debe ser 6 para el juego 3x6.
- `cost`, `basePrize`, `accumulatedPrize` y `totalPrize` deben ser numericos y no negativos.
- `totalPrize` debe coincidir con `basePrize + accumulatedPrize`, o generar warning si se permite edicion manual.

### Usuarios

- `name` no puede estar vacio.
- `code` o numero de fila debe ser unico dentro de la jornada.
- `notes` es opcional.

### Jugadas

- Cada jugada debe pertenecer a una jornada existente.
- Cada jugada debe pertenecer a un usuario existente en la misma empresa.
- Cada jugada debe tener 6 validas.
- Cada valida debe tener exactamente 3 ejemplares.
- Los 3 ejemplares dentro de una valida deben ser distintos.
- Los numeros de ejemplar deben ser enteros positivos.
- Un usuario no debe tener dos jugadas activas en la misma jornada salvo que el sistema soporte múltiples tickets explícitamente.

### Resultados

- Cada valida puede tener cero o un ganador real.
- Un ganador real debe ser entero positivo.
- Al cambiar resultados, recalcular todas las jugadas.

### Calculos

- `isHit = winnerNumber in horses`.
- `totalHits = suma de isHit`.
- `effectivenessPercentage = totalHits / 6 * 100`.
- `isFullWinner = totalHits === 6`.
- `totalCombinations = 3^6 = 729`.
- `costPerCombination = cost / 729`.

## Manejo de Fallos

| Falla | Accion |
|---|---|
| JSON local corrupto | Detener carga, mostrar error y pedir restaurar/importar respaldo |
| Falta archivo JSON | Crear archivo vacio `[]` y registrar warning |
| Imagen de referencia ausente | Continuar sin imagen, pero marcar referencia visual como pendiente |
| Duplicado de usuario | Bloquear guardado por nombre o identificación repetida |
| Ejemplar repetido en una valida | Bloquear guardado y enfocar la valida afectada |
| Resultado invalido | Bloquear guardado de esa valida |
| Exportacion PDF falla | Mostrar error y sugerir exportar imagen o Excel |
| Exportacion Excel falla | Mantener datos en pantalla y permitir descargar JSON |
| Borrado de jornada solicitado | Exigir confirmacion explicita antes de ejecutar |
| Falta credencial futura | Marcar integracion como PENDIENTE, no romper MVP local |

## Reglas de Tono y Comportamiento

- Usar lenguaje operativo y analitico.
- No incentivar apuestas.
- No presentar el sistema como plataforma de dinero real.
- No prometer ganancias.
- No usar APIs externas sin aprobacion del usuario.
- No usar Docker en el flujo local.
- No borrar datos sin confirmacion.
- Explicar errores con mensajes concretos: que campo fallo y como corregirlo.
- Distinguir claramente entre resultados registrados y resultados pendientes.

## Checklist de Confiabilidad Local

```text
[ ] data/racedays.json existe y contiene JSON valido
[ ] data/tipsters.json existe y contiene JSON valido
[ ] data/tickets.json existe y contiene JSON valido
[ ] data/results.json existe y contiene JSON valido
[ ] data/raw/capture.jpeg existe como referencia visual
[ ] Validacion de 6 validas activa
[ ] Validacion de 3 ejemplares por valida activa
[ ] Validacion de no repetidos activa
[ ] Recalculo automatico al cambiar resultados
[ ] Exportacion PDF disponible
[ ] Exportacion imagen disponible
[ ] Exportacion Excel disponible
[ ] Borrado de jornada pide confirmacion
```

## Pruebas Minimas Recomendadas

- Jugada con 6 aciertos debe marcar `isFullWinner = true`.
- Jugada con ganador pendiente no debe sumar acierto en esa valida.
- Valida con ejemplares duplicados debe fallar validacion.
- Cambio de ganador real debe recalcular todos los tickets.
- Heatmap debe contar los 3 ejemplares de cada valida por cada ticket.
- Exportacion JSON debe cumplir `llm-wiki/02_DATA_SCHEMAS.md`.
