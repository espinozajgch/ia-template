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

# Prompt Templates — Catálogo real de prompts

> Fase A (Architect), ejecutada el 2026-07-31 sobre [`code/chat/prompt_manager.py`](../../code/chat/prompt_manager.py).
> **Inventario medido, no propuesto.** La plantilla original de este archivo describía templates
> genéricos (FACTUAL/RAG/agente) que este sistema no usa; se sustituye por lo que hay.

---

## Cómo se ensambla un prompt

`PromptManager.get(action, fan, language)` devuelve una cadena. `ChatManager.chat` la concatena
con el input y la envía como **un único mensaje `user`**:

```python
user_message = {"role": "user", "content": f"{prompt}\n\n{question}"}
```

El `system` no lo pone `PromptManager`: lo construye `main_loop` con el contexto del partido
(fecha, equipos, jornada, hora, equipo *fan* y tono). Ver [`01_LLM_STRATEGY.md`](01_LLM_STRATEGY.md).

No hay plantillas en fichero, ni versionado, ni tests. **Los 22 prompts son literales de Python
dentro de un `dict` de ~350 líneas.**

`PromptManager.get` es el **segundo símbolo más llamado del repositorio** (fan-in **82**, medido
en el grafo de código; solo `list.append` tiene más). Es el nudo del sistema.

---

## System prompt real

No es una plantilla fija: se genera por partido en `main_loop`. Tres variantes según el equipo
*fan*:

| Caso | Tono pedido |
|---|---|
| El *fan* juega | «completely impartial towards your team… and provide them EXTREME SUPPORT» |
| El *fan* no juega | «provide EXTREME SUPPORT to your team» |
| Sin *fan* definido | «original, amusing, funny and entertaining» |

> **Contradicción literal en el primer caso:** pide ser *completamente imparcial* hacia el equipo
> y a la vez darle *apoyo extremo*. El modelo recibe dos instrucciones opuestas en la misma frase.
> No está registrado como deuda en el Blueprint; queda anotado aquí.

Las tres variantes terminan con «Do not repeat yourself, and recall your context» — una compensación
por la ventana de solo 6 mensajes.

---

## Los 22 prompts

| Acción | Momento | Interpola | Anti-invención |
|---|---|---|---|
| `rewrite` | Cada comentario — **el principal** | `MAX_WORDS` | Sí |
| `prematch` | Previa | `fan` | Sí |
| `lineup` | Alineaciones | — | Sí |
| `stats` | Estadísticas | — | Sí |
| `xG` | Goles esperados | — | Sí |
| `translate` | Por cada idioma configurado | `language` | **No** |
| `reply` | Respuesta a usuario (desactivado) | `MAX_WORDS` | **No** |
| `action` | Acción genérica | `MAX_WORDS` | **No** |
| `twitter` | Publicación en X (inactivo) | `DISCORD_INVITATION` | **No** |
| `GOAL` | Gol a favor | — | **No** |
| `OT_GOAL` | Gol en contra | — | **No** |
| `pool` | Encuesta en juego | — | Sí |
| `pool_end_1` | Encuesta al descanso | — | Sí |
| `pool_end_2` | Encuesta al final | — | Sí |
| `pizzaplot_percentiles` | Gráfico de percentiles | — | Sí |
| `pizzaplot_ranks` | Gráfico de rangos | — | Sí |
| `fantasy_top_10` | Ranking de participantes | — | Sí |
| `fantasy_pre` | Puntos previos | `fan` | Sí |
| `fantasy_half` | Puntos al descanso | `fan` | Sí |
| `fantasy_intra` | Puntos en juego | `fan` | Sí |
| `fantasy_single_player` | Actualización de un jugador | `fan` | Sí |
| `fantasy_full` | Tabla final | `fan` | Sí |

`get` lanza `ValueError` si la acción no existe. Es el único control de errores del módulo, y está
bien: falla ruidosamente.

---

## GAP P1 — los seis sin cláusula anti-invención son los de tono libre

`translate`, `reply`, `action`, `twitter`, `GOAL`, `OT_GOAL`.

No es aleatorio: son justo los que piden *celebrar*, *lamentar*, *traducir* o *resumir* — donde
más fácil resulta añadir un detalle que no estaba. `GOAL` dice «Praise the masterful shot and
celebrate the goal!» sin ninguna restricción sobre los hechos.

Con el North Star confirmado (**todo el ciclo del partido**, con trazabilidad al feed), esto es un
**incumplimiento de R1**, no una omisión tolerable.

---

## GAP P2 — Barcelona incrustado en el catálogo

**15 de los 22** fuerzan «FC Barcelona». Y `pool`, `pool_end_1` y `pool_end_2` afirman literalmente

> «We are talking about the Barcelona Women's team»

**sea cual sea el equipo y el género reales de la transmisión.** El bot admite tres competiciones
y `--bot_version male|female`; los prompts no lo respetan. Al transmitir otro partido, el modelo
recibe instrucciones sobre un equipo que no está jugando.

Es la deuda D2 del Blueprint, y el grafo confirma que vive en el símbolo más acoplado del repo.

---

## GAP P3 — erratas que llegan literalmente al modelo

| Errata | Ocurrencias |
|---|---|
| `Alway uset FC Barcelona…` (por *Always use*) | **14** |
| `Alway use FC Barcelona…` (correcto) | 1 |
| `P               Perform the following action` — `P` suelta al inicio de `action` | 1 |

Arreglo: minutos. Efecto: directo sobre la calidad de salida.

---

## Lo que está bien resuelto — no romperlo

- **Ejemplos de salida completos** (*few-shot*) en `prematch`, `lineup` y los seis `fantasy_*`,
  con emojis y estructura. Es la razón de que el formato salga consistente.
- **Reglas de formato negativas y verificables:** «Do not use ""», «Convert yards to meters»,
  «Do not add hyperlinks if there are none».
- **Glosario de traducción por idioma** en `translate`: *corner* → «saque de esquina»,
  *clean sheets* → «porterías a cero», *header* → «cabezazo». Conocimiento de dominio real y
  difícil de reconstruir si se pierde.

---

## Qué falta

- **Versionado:** cambiar un prompt no se distingue en el historial de un cambio de código.
- **Evaluación:** no hay forma de saber si una edición mejora la salida salvo transmitir un partido.
- **Separación del código:** 350 líneas de texto en un `dict` de Python impiden que alguien no
  técnico revise el tono.
