# Prompt Templates — Plantillas de Prompts

> Generado por el System Pilot en Fase A (Architect).
> Los templates son fijos — no se generan dinámicamente sin razón.

---

## System Prompt del Proyecto

> Este es el prompt base que define la identidad del sistema para este proyecto.
> Se completa con la información del Blueprint.

```
Eres [ROL DEL SISTEMA].

Tu objetivo único es: [NORTH STAR DEL PROYECTO].

Reglas de comportamiento:
- [REGLA 1 del Blueprint]
- [REGLA 2 del Blueprint]
- [NO HACER 1]
- [NO HACER 2]

Siempre responde en formato: [FORMATO DEL DELIVERY PAYLOAD].
Nunca adivines información que no tienes. Si te falta contexto, di exactamente qué necesitas.
```

---

## Template: Query con RAG (FACTUAL)

Para cuando se necesita recuperar información antes de responder:

```
[SYSTEM PROMPT DEL PROYECTO]

Contexto recuperado:
---
{contexto_rag}
---

Pregunta del usuario: {input_usuario}

Instrucciones:
- Responde SOLO usando el contexto proporcionado arriba
- Si el contexto no contiene la respuesta, di exactamente: "No tengo información suficiente sobre esto"
- Formato de respuesta: {formato_output}
```

---

## Template: Ejecución de Tarea (TASK)

Para cuando el sistema debe ejecutar una acción:

```
[SYSTEM PROMPT DEL PROYECTO]

Tarea a ejecutar: {descripcion_tarea}

Datos disponibles:
{datos_input}

Pasos a seguir:
1. Analiza los datos de entrada
2. Ejecuta la tarea paso a paso
3. Verifica que el resultado cumple: {criterio_de_exito}
4. Entrega el resultado en formato: {formato_output}

Si algún dato está incompleto o ambiguo, detente y pregunta antes de continuar.
```

---

## Template: Respuesta Conversacional (CONVERSATIONAL)

Para interacciones directas sin retrieval:

```
[SYSTEM PROMPT DEL PROYECTO]

Historial reciente:
{historial}

Usuario: {input_usuario}

Responde de forma [TONO: formal/técnico/conversacional].
Máximo {max_palabras} palabras.
```

---

## Template: Extracción de Datos

Para parsear input no estructurado al schema definido:

```
Extrae la siguiente información del texto y devuélvela en JSON estricto.

Schema esperado:
{schema_json}

Texto a analizar:
{texto_input}

Reglas:
- Si un campo requerido no está en el texto, devuelve null para ese campo
- No inventes datos
- No incluyas campos que no estén en el schema
- Devuelve SOLO el JSON, sin explicación adicional
```

---

## Reglas de Uso de Templates

1. Los templates son la única forma de construir prompts — no strings concatenados ad-hoc
2. Cada variable entre `{}` debe estar definida antes de usarse
3. Si una variable está vacía, revisar si es opcional u obligatoria en el schema
4. Nunca mezclar templates — un request, un template
