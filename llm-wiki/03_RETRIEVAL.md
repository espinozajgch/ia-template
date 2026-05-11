# Retrieval — Configuración RAG / Memoria

> Generado por el System Pilot en Fase A (Architect).
> Solo aplica si el Source of Truth requiere búsqueda. Si los datos caben en el contexto, usar inyección directa.

---

## ¿Este proyecto necesita RAG?

| Condición | ¿RAG? |
|---|---|
| Source of Truth es una base de datos grande (>1000 documentos) | Sí |
| Source of Truth cambia frecuentemente | Sí |
| Los documentos superan el contexto del modelo | Sí |
| Los datos son pequeños y estáticos | No — usar contexto directo |

**Decisión para este proyecto:** [PENDIENTE — se completa con respuesta al Source of Truth]

---

## Estrategia de Retrieval

| Campo | Valor |
|---|---|
| Tipo | [embeddings semánticos / keyword / híbrido] |
| Base de vectores | [Pinecone / Chroma / pgvector / FAISS / ninguna] |
| Modelo de embeddings | [text-embedding-3-small / otro] |
| Chunk size | [512 tokens recomendado] |
| Chunk overlap | [50 tokens recomendado] |
| Top-K documentos | [3-5 recomendado] |

---

## Pipeline de Ingestión

```
Source of Truth
      │
      ▼
  Limpiar datos
      │
      ▼
  Dividir en chunks
      │
      ▼
  Generar embeddings
      │
      ▼
  Guardar en /knowledge/wiki/
      │
      ▼
  Indexar en base de vectores
```

**Frecuencia de re-ingestión:** [manual / diaria / en cada cambio]

---

## Query de Retrieval

Template para buscar en la base de conocimiento:

```
Dado este input del usuario: {input}
Busca en la base de conocimiento los documentos más relevantes para responder.
Retorna los top {k} fragmentos con mayor relevancia semántica.
```

---

## Criterio de Relevancia

| Score | Acción |
|---|---|
| > 0.8 | Incluir en contexto |
| 0.5 - 0.8 | Incluir con nota de baja confianza |
| < 0.5 | Descartar — no incluir |

Si ningún documento supera 0.5: notificar al usuario que no hay información suficiente. **No inventar.**

---

## Fuentes de Conocimiento

| Fuente | Tipo | Ubicación | Frecuencia de actualización |
|---|---|---|---|
| [PENDIENTE] | [doc / db / api] | [path o URL] | [PENDIENTE] |
