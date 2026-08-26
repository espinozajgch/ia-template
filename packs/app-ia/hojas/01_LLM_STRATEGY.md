<!-- ejemplo-rellenado -->
> ## ⚠️ ESTO ES UN EJEMPLO YA RELLENADO, DE OTRO PROYECTO
>
> Lo que hay debajo son las respuestas de **futbot-v2** — un bot de narración deportiva en Discord—, no las de este
> proyecto. Se instala así a propósito: **una hoja bien rellenada enseña qué nivel de
> detalle hace falta**, y una plantilla vacía no enseña nada.
>
> **Reemplázalo antes de que ningún agente lo lea como si fuera cierto aquí.** Una hoja
> de otro proyecto no es contexto neutro: es contexto FALSO con formato de verdad, y se
> obedece igual que el bueno. Los modelos, las rutas de fichero y los GAP de abajo son
> de aquel sistema.
>
> Las rutas relativas apuntan a la raíz del proyecto (`../../`) porque esta hoja se
> instala en `agente/sistema/`.

---

# LLM Strategy — Estrategia del Modelo

> Fase A (Architect), ejecutada el 2026-07-31 sobre el código real de `futbot-v2`.
> **Documenta lo que el sistema hace hoy, no lo que debería hacer.** Las divergencias respecto a
> lo que prescribe el protocolo están marcadas como GAP.
> Fuente: [`code/chat/`](../../code/chat/) · Blueprint: [`knowledge/wiki/project.md`](../../knowledge/wiki/project.md)

---

## Intent del Sistema

| Campo | Valor |
|---|---|
| Tipo de intent | **TASK** |
| Descripción | Proceso por lotes que convierte eventos de un feed deportivo en mensajes publicados. No hay usuario haciendo preguntas: el disparador es la llegada de un comentario nuevo al f13. Las interacciones conversacionales existían en el código (`chat/reply.py`), desactivadas por un `CLOSE_PROCESS_FLAG = 'true'` fijado a mano; **retiradas el 2026-08-05** (D-04) |

**El LLM no decide qué se cuenta.** Recibe un comentario ya redactado por Opta y lo reformula. La
acción principal se llama literalmente `rewrite`. Esto es una elección de arquitectura, no un
detalle: mantiene la trazabilidad que exige el North Star.

---

## Modelo Seleccionado

| Campo | Valor real |
|---|---|
| Proveedor | **OpenAI** — no Anthropic. La plantilla de este documento asume modelos Claude; no aplica |
| Modelo | **`gpt-4o-mini`**, de `OPENAI_MODEL`; el mismo valor por defecto en [`openai_service.py:17`](../../code/chat/openai_service.py#L17) |
| Cliente | `openai>=2.0`, `chat.completions.create` directo. Sin framework |
| Temperatura | **NO SE FIJA** → la API aplica su valor por defecto, `1.0` |
| Max tokens output | **NO SE FIJA** |
| Timeout | **NO SE FIJA** |

### GAP A1 — temperatura por defecto en un sistema de fidelidad

El trabajo del modelo es **reescribir sin inventar**: 16 de los 22 prompts se lo piden
explícitamente. Pero al no fijar `temperature`, se ejecuta a `1.0`, el ajuste más creativo que
ofrece la API por omisión.

Se está pidiendo fidelidad por prompt mientras se configura variabilidad por parámetro. Es
contradictorio y **la única transmisión donde se nota es la que ya se emitió**.

### GAP A2 — sin `max_tokens`, el control de longitud es posterior

Los prompts piden «no más de 60 palabras» y la salida se trunca a **1 020 caracteres** en
[`chat_util.py`](../../code/chat/chat_util.py) por el límite de embed de Discord. El truncado es
**duro y silencioso**: corta a mitad de frase y añade `...`. No hay presupuesto de tokens que
evite llegar a ese punto.

---

## Estrategia de Contexto

### Orden de inyección real

```
1. System prompt   → contexto del partido, construido en main_loop:
                     fecha, equipos, jornada, hora, equipo fan y tono
2. Historial       → ventana deslizante de 6 mensajes (ChatManager.MAX_HISTORY)
3. Prompt de acción→ uno de los 22 de PromptManager.get(action)
4. Input           → el comentario de Opta, concatenado tras el prompt
```

El mensaje 3 y el 4 viajan **juntos en el mismo mensaje `user`**:
`content = f"{prompt}\n\n{question}"` ([`chat_manager.py`](../../code/chat/chat_manager.py)).

### Ventana de conversación

`MAX_HISTORY = 6`. Al superarla se conserva **siempre el mensaje `system`** y se descartan los
más antiguos. Implementación correcta: el contexto del partido nunca se pierde.

### RAG vs contexto directo

| Situación | Estrategia real |
|---|---|
| Datos del partido | **Contexto directo.** El comentario llega como input |
| Reglas de negocio | **En el prompt**, codificadas en `prompt_manager.py` |
| Historial | Ventana de 6, sin resumen ni compactación |
| Recuperación semántica | **No existe** |

**No hay RAG en este sistema, y desde el 2026-08-05 tampoco en `requirements.txt`.** Sí lo hubo
en código —un bot `!ask` que nunca estuvo cableado— y con él seis dependencias. Retirado entero
por decisión del usuario (D-04): el lock baja de 98 a 69 paquetes. Ver
[`03_RETRIEVAL.md`](03_RETRIEVAL.md).

---

## Manejo de Límite de Contexto

**No hay gestión de límite.** Con una ventana de 6 mensajes y comentarios cortos, el contexto no
se acerca al límite de `gpt-4o-mini` (128k). El riesgo es el contrario: la ventana es tan corta
que el modelo **no recuerda lo ocurrido hace 7 comentarios**, lo que explica las instrucciones
repetidas de «do not repeat yourself» en el contexto `system`.

El fichero acumulado `logs/current_match/current_match_events.txt` compensa esto parcialmente:
alimenta las encuestas y los resúmenes con la traza completa del partido, no con la ventana.

---

## Estrategia de Fallback

| Escenario | Lo que prescribe el protocolo | Lo que hace el sistema |
|---|---|---|
| Error de la API | Retry con backoff, máx 3 | **Ninguno.** `ChatManager.chat` captura la excepción, la escribe en `chat_errors.csv` y devuelve sin reescribir |
| Output no cumple formato | Regenerar, máx 2 | **No se valida el formato.** Lo que devuelva el modelo se publica |
| Rate limit (429) | Esperar y reintentar | **No se distingue** de cualquier otro error |
| Modelo no disponible | Notificar, no degradar | Sin comprobación previa. `tools/verify_openai.py` lo detecta **antes** del partido, no durante |

### GAP A3 — un fallo transitorio pierde un comentario del partido, y el partido no se repite

Es la consecuencia más cara de la arquitectura actual. Una incidencia de red de dos segundos
durante un gol significa que ese gol no se narra. No hay cola, ni reintento, ni aviso al operador:
solo una línea en un CSV que nadie mira en directo.

**Corrección mínima cuando se retome:** `max_retries` del cliente OpenAI y un `timeout` explícito.
Son dos parámetros en el constructor.

---

## Coste

No medido. Con `gpt-4o-mini`, una transmisión con `COMMENT_COUNT` comentarios ejecuta como mínimo
una llamada `rewrite` por comentario, **más una llamada `translate` por cada idioma configurado**.
Con 2 idiomas, el coste por comentario se triplica.

`LANGUAGES = "English,English"` en el `.env` actual duplica el idioma inglés: si el código no
deduplica, **se paga y se publica dos veces lo mismo**. `tools/verify_discord.py` avisa de esto.
