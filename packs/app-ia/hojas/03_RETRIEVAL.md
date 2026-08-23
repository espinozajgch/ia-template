# Retrieval — NO APLICA a la narración (pero hay RAG en un camino aparte)

> Fase A (Architect), resuelta el 2026-07-31.
> **Este proyecto no usa RAG ni memoria vectorial.** Documentado como `NO APLICA` en lugar de
> dejar la plantilla, según la regla del protocolo de no presentar como funcionando lo que no
> se ha verificado.

---

## Decisión

| Condición del protocolo | ¿Se cumple aquí? |
|---|---|
| Source of Truth > 1000 documentos | **No.** Es un puñado de ficheros XML por partido |
| Source of Truth cambia frecuentemente | Sí, pero de forma **incremental y ordenada**: comentarios nuevos al final del f13 |
| Los documentos superan el contexto | **No.** Un comentario de Opta son un par de frases |
| Datos pequeños y acotados | **Sí** |

**Decisión: contexto directo. RAG no aporta nada a este sistema.**

El acceso a los datos es *por índice*, no *por similitud*: `main_loop` lleva el índice del último
comentario emitido y procesa los nuevos en orden. Buscar semánticamente sobre un flujo secuencial
sería resolver un problema que no existe.

---

## Sustituto real de la memoria

Lo que en otro sistema haría un vector store, aquí lo hacen tres ficheros planos:

| Fichero | Contenido | Quién lo consume |
|---|---|---|
| `logs/current_match/current_match_events.txt` | Traza acumulada del partido, añadida comentario a comentario | Encuestas y resúmenes: reciben el partido entero, no la ventana de 6 |
| `logs/chat_log/chat_log.json` | Historial de la conversación con el modelo | `ChatManager`, ventana deslizante |
| `logs/chat_log/response.txt` | Última respuesta emitida | Depuración |

Los tres se **borran al arrancar** cada transmisión (`util.reset_chat_log_files`). Es correcto: el
contexto de un partido no debe contaminar el siguiente.

**Este es el mecanismo que compensa la ventana de solo 6 mensajes** descrita en
[`01_LLM_STRATEGY.md`](01_LLM_STRATEGY.md). No es memoria semántica, es un fichero que crece.

---

## Corrección importante (2026-08-03): SÍ hay código RAG, pero no en el camino del partido

La versión anterior de este documento afirmaba que las dependencias de LangChain y FAISS eran
huérfanas y que «no hay búsqueda vectorial». **Es falso**, y el error venía de buscar `import faiss`
en vez de rastrear cómo llega FAISS al proyecto.

`chat/reply.py` y `discord_bot/reply_bk.py` **sí montan un RAG**:

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.vectorstores import FAISS
```

Es un bot de Discord con comando `!ask`: carga documentos de un directorio, los trocea, los indexa
en un vector store FAISS y responde preguntas sobre ellos. `faiss-cpu` es requisito de ese store.

**Lo que sigue siendo cierto:** el **camino del partido no usa nada de esto**. La narración accede
al modelo con una llamada directa a `chat.completions.create` en
[`openai_service.py`](../code/chat/openai_service.py), sin recuperación de ningún tipo, y la
decisión de §1 —contexto directo, no RAG— se mantiene para la narración.

**Estado real de esa funcionalidad:**

| Fichero | Situación |
|---|---|
| `chat/reply.py` | Entry point que **nada invoca**. Las interacciones están desactivadas por `CLOSE_PROCESS_FLAG='true'`, fijado en código |
| `discord_bot/reply_bk.py` | Respaldo muerto (`_bk`), con entry point arrancable — deuda D4 |

**Acción, reformulada:** no es limpieza de `requirements.txt`. Es decidir si el bot de preguntas
con RAG **es producto o se retira**. Quitar las dependencias sin decidirlo rompería ambos ficheros
al importar.

## Resuelto el 2026-08-05: se retira (D-04)

**El usuario decidió retirarlo.** `chat/reply.py` y `discord_bot/reply_bk.py` están borrados, y
con ellos `langchain`, `langchain-openai`, `langchain-community`, `langchain-text-splitters`,
`faiss-cpu` y `tiktoken`. **`requirements.lock` baja de 98 a 69 paquetes.**

Así que la afirmación original de este documento vuelve a ser cierta, pero ahora por
construcción y no por descuido: **no hay RAG en este proyecto**, ni código ni dependencias. Lo
guarda `tests/test_runtime_declarado.py`, que falla si alguna de las seis reaparece en
`requirements.txt`, en el lock o como `import` dentro de `code/`.

La decisión de §1 no cambia: los hechos salen del feed de Opta y el modelo solo redacta (R1).
No había nada que recuperar.

**Lo único que sobrevive** es el prompt `reply` en el catálogo, ya sin ningún llamador. Es
contenido editorial, y retirarlo es del usuario.

---

## Si algún día hiciera falta

El caso que lo justificaría: dar al modelo **contexto histórico entre partidos** — enfrentamientos
anteriores, rachas, estadísticas de temporada — en lugar de solo el partido en curso. Hoy eso se
resuelve inyectando el `f30` directamente, y mientras el volumen siga siendo un fichero por
equipo, el contexto directo sigue ganando.

Revisar esta decisión solo si el contexto por partido deja de caber, no antes.
