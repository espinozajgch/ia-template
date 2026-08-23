# Pack · datos-rag

**Se activa si:** hay recuperación de documentos, embeddings, búsqueda semántica o un
pipeline de datos que alimenta a un modelo.

**Prompts:** `RAG_PROMPT.md` · `01_LLM_STRATEGY.md` · `03_RETRIEVAL.md`

---

## Reglas

### La recuperación es el problema, no la generación

Cuando un sistema de este tipo responde mal, casi nunca es porque el modelo genere mal:
es porque le llegó el fragmento equivocado. **Se mide la recuperación por separado** —con
un conjunto de preguntas y sus fragmentos correctos— antes de tocar el prompt.

### Sin cita, no hay respuesta

Toda afirmación devuelve de dónde salió: documento, sección, y a ser posible el fragmento.
Sin trazabilidad, nadie puede distinguir una respuesta correcta de una inventada.

### «No lo sé» es una respuesta válida y hay que provocarla

Si nada relevante supera el umbral, el sistema lo dice. Un sistema que siempre responde es
un sistema que a veces inventa, y no hay forma de saber cuándo.

### El troceado se decide con los datos delante

Tamaño y solapamiento dependen del documento real. Un contrato, una tabla de resultados y
una conversación no se trocean igual. Se prueban dos o tres estrategias contra el conjunto
de evaluación; no se elige por costumbre.

### Reindexar es parte del sistema

Cuando cambia el modelo de embeddings, el troceado o el corpus, hay que reindexar. Si eso
no es un comando reproducible, el índice se vuelve un artefacto que nadie sabe recrear.

### El coste y la latencia se miden por consulta

Tokens de entrada, de salida, llamadas al almacén vectorial y tiempo total. Un sistema que
funciona a diez consultas puede ser inviable a diez mil, y eso se sabe antes, no después.

### Los datos que entran se versionan

Qué documentos, de qué fecha, con qué proceso. Una respuesta que era correcta y deja de
serlo es casi siempre un cambio en el corpus que nadie registró.

---

## Checklist

- [ ] Conjunto de evaluación con preguntas y fragmentos esperados, en el repositorio
- [ ] Recuperación medida por separado de la generación
- [ ] Toda respuesta con su cita
- [ ] Umbral que produce «no lo sé», probado
- [ ] Reindexado como comando reproducible
- [ ] Coste y latencia por consulta, medidos
- [ ] Corpus versionado, con fecha y proceso
