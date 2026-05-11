# Architecture — Arquitectura A.N.T.

> Generado por el System Pilot en Fase T (Trigger).
> Documenta cómo las 3 capas se conectan para este proyecto específico.

---

## Las 3 Capas A.N.T.

```
┌─────────────────────────────────────────────┐
│  KNOWLEDGE — /knowledge/wiki                │
│  Datos procesados, wiki, fuente de verdad   │
│  No cambia en runtime — solo en ingestión   │
└─────────────┬───────────────────────────────┘
              │ Lee conocimiento
              ▼
┌─────────────────────────────────────────────┐
│  SYSTEM — /llm-wiki                         │
│  Reglas, prompts, protocolo B.L.A.S.T       │
│  Define el comportamiento del sistema       │
└─────────────┬───────────────────────────────┘
              │ Orquesta ejecución
              ▼
┌─────────────────────────────────────────────┐
│  EXECUTION — /app + /tools                  │
│  Código que ejecuta el sistema              │
│  Llama APIs, procesa datos, entrega output  │
└─────────────────────────────────────────────┘
```

---

## Flujo Completo del Sistema

```
INPUT DEL USUARIO
      │
      ▼
[B] Blueprint
  ├─ Parsear input
  ├─ Clasificar intent (FACTUAL / TASK / CONVERSATIONAL)
  └─ Validar contra schema → si falta info, preguntar
      │
      ▼
[L] Link
  ├─ Verificar conexiones requeridas
  ├─ Fetch de datos si es necesario
  └─ Si falla → STOP + notificar
      │
      ▼
[A] Architect
  ├─ Seleccionar template de prompt
  ├─ Recuperar contexto (RAG si aplica)
  ├─ Ensamblar prompt completo
  └─ Si falta contexto → regresar a Blueprint
      │
      ▼
[S] Stylize
  ├─ Ejecutar el prompt contra el modelo
  ├─ Validar output contra schema
  └─ Si falla → reintentar (máx 2) → si persiste, notificar
      │
      ▼
[T] Trigger
  ├─ Rutear output (respuesta / tool / API / DB)
  ├─ Ejecutar entrega
  ├─ Verificar resultado vs North Star
  └─ Si falla → loop a Architect o STOP con log
      │
      ▼
OUTPUT ENTREGADO + LOG REGISTRADO
```

---

## Mapa de Capas para este Proyecto

### Knowledge

| Recurso | Tipo | Ubicación | Actualización |
|---|---|---|---|
| [PENDIENTE — Source of Truth del Blueprint] | | | |

### System

| Archivo | Propósito |
|---|---|
| `09_BLAST_PROTOCOL.md` | Protocolo de comportamiento |
| `07_PROMPT_TEMPLATES.md` | Templates de prompts |
| `02_DATA_SCHEMAS.md` | Contratos de datos |
| `05_RELIABILITY.md` | Reglas de validación |

### Execution

| Componente | Archivo | Responsabilidad |
|---|---|---|
| [PENDIENTE — se llena con el proyecto real] | | |

---

## Puntos de Fallo Conocidos

| Punto | Fase | Impacto | Mitigación |
|---|---|---|---|
| Integración externa caída | L — Link | Alto | Circuit breaker + notificación |
| Output no cumple schema | S — Stylize | Medio | Retry x2, luego notificar |
| Contexto insuficiente | A — Architect | Medio | Preguntar al usuario |
| Credencial faltante | L — Link | Alto | Detener inmediatamente |

---

## Cómo Ejecutar el Sistema

```bash
# 1. Verificar el entorno
cp .env.example .env  # llenar credenciales

# 2. Verificar conexiones (Fase L)
python tools/verify_[servicio].py

# 3. Ejecutar el sistema
[COMANDO PRINCIPAL — se define en Trigger]
```

---

## Decisiones de Arquitectura

| Decisión | Alternativa considerada | Razón de la elección | Fecha |
|---|---|---|---|
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] | [FECHA] |
