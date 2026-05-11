# Reliability — Validación y Manejo de Errores

> Generado por el System Pilot en Fase S (Stylize).
> Define qué es un output válido y qué hacer cuando algo falla.

---

## Contrato de Output

El output es válido si:

- [ ] Contiene todos los campos requeridos del schema (ver `02_DATA_SCHEMAS.md`)
- [ ] El formato coincide con el Delivery Payload definido en Blueprint
- [ ] No viola ninguna Regla de Comportamiento del Blueprint
- [ ] El contenido responde al North Star del proyecto

Si falla cualquier punto: **no entregar** — reintentar o notificar.

---

## Matriz de Errores

| Escenario | Acción | Máx reintentos | Notificar |
|---|---|---|---|
| Output no cumple schema | Regenerar con instrucción explícita | 2 | Si falla 3ª vez |
| Tool externa no responde | Detener + log con contexto | 3 | Siempre |
| Credencial faltante o inválida | Detener inmediatamente | 0 | Siempre |
| Output ambiguo o incompleto | Preguntar al usuario | 0 | Siempre |
| Modelo devuelve error 5xx | Retry con backoff exponencial | 3 | Si falla 3ª vez |
| Contexto insuficiente | Preguntar — no adivinar | 0 | Siempre |

---

## Estrategia de Retry

```
Intento 1 → falla
    │
    ├─ ¿Error recuperable? (timeout, rate limit, formato)
    │       → Sí: esperar [1s / 2s / 4s] y reintentar
    │       → No: detener inmediatamente
    │
Intento 2 → falla
    │
    └─ Notificar con:
         - Qué falló
         - En qué fase (B/L/A/S/T)
         - Input que causó el fallo
         - Error exacto recibido
```

---

## Formato del Log de Errores

```json
{
  "timestamp": "ISO-8601",
  "fase": "B | L | A | S | T",
  "error_tipo": "validation | connection | timeout | unknown",
  "input": "[input que causó el error]",
  "error_mensaje": "[mensaje exacto]",
  "accion_tomada": "retry | stop | notify",
  "resuelto": true
}
```

---

## Reglas de Comportamiento

> Copiadas de la Pregunta 5 del Blueprint — Reglas de "No hacer"

| Regla | Razón |
|---|---|
| [PENDIENTE — se llena con respuesta de Blueprint] | [PENDIENTE] |

---

## Checklist de Validación Pre-Entrega

Antes de pasar a Trigger, verificar:

```
[ ] ¿El output tiene todos los campos requeridos?
[ ] ¿El formato es correcto (JSON válido, markdown bien formado, etc.)?
[ ] ¿El contenido responde al North Star?
[ ] ¿No viola ninguna regla de "No hacer"?
[ ] ¿El tono es correcto según las reglas de comportamiento?
```
