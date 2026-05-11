# LLM Strategy — Estrategia del Modelo

> Generado por el System Pilot en Fase A (Architect).
> Se completa automáticamente con las respuestas del Blueprint.

---

## Intent del Sistema

| Campo | Valor |
|---|---|
| Tipo de intent | [FACTUAL / TASK / CONVERSATIONAL / MIXED] |
| Descripción | [Se completa con la respuesta al North Star] |

---

## Modelo Seleccionado

| Campo | Valor |
|---|---|
| Modelo | [claude-sonnet-4-6 / claude-opus-4-7 / claude-haiku-4-5] |
| Razón | [Se completa según complejidad de la tarea] |
| Temperatura | [0.0 determinista / 0.7 creativo] |
| Max tokens output | [PENDIENTE] |

### Criterios de selección

| Caso | Modelo |
|---|---|
| Razonamiento complejo, análisis profundo | claude-opus-4-7 |
| Velocidad + confiabilidad, uso general | claude-sonnet-4-6 |
| Clasificación, extracción simple, alto volumen | claude-haiku-4-5 |

---

## Estrategia de Contexto

### Orden de inyección en el prompt

```
1. System prompt + identidad del sistema
2. Reglas de comportamiento (del Blueprint)
3. Conocimiento recuperado (RAG/Link)
4. Historial reciente relevante
5. Input del usuario
6. Instrucciones de formato (Stylize)
```

### RAG vs Contexto Directo

| Situación | Estrategia |
|---|---|
| Datos cambian frecuentemente | RAG — recuperar en cada request |
| Reglas de negocio estables | System prompt — hardcoded |
| Documentos > 10k tokens | RAG con chunking |
| Datos pequeños y fijos | Contexto directo |
| Source of Truth es una API | Fetch en Fase L (Link) |

---

## Manejo de Límite de Contexto

Si el contexto supera el límite, priorizar en orden:

1. Reglas de comportamiento — nunca omitir
2. Conocimiento recuperado relevante al query actual
3. Historial reciente (últimas N interacciones)
4. Historial antiguo — truncar primero

---

## Estrategia de Fallback

| Escenario | Acción |
|---|---|
| Contexto insuficiente | Preguntar al usuario — nunca adivinar |
| Output no cumple schema | Reintentar máx 2 veces |
| Output ambiguo | Registrar + escalar, no entregar |
| Modelo no disponible | Notificar, no usar modelo inferior sin avisar |
