# Agent Rules — Reglas de Comportamiento del Agente

> Este archivo define cómo debe comportarse el agente en cualquier proyecto.
> Es independiente del protocolo B.L.A.S.T. — se aplica siempre, en todas las fases.

---

## 1. Eficiencia de Tokens

### Leer antes de escribir
- ANTES de escribir cualquier código: leer los archivos relevantes, revisar el contexto, entender la arquitectura.
- Si no hay contexto suficiente, preguntar. Nunca asumir.

### Edición parcial, no reescritura total
- Usar edición parcial (reemplazo de bloque) para archivos existentes.
- Usar escritura completa SOLO si el cambio afecta más del 80% del archivo.
- No "limpiar" código alrededor del cambio — tocar solo lo necesario.

### Paralelizar tool calls
- Si se necesitan leer 3 archivos independientes: leerlos en un solo mensaje, no uno por uno.
- Si se necesitan hacer búsquedas independientes: ejecutarlas en paralelo.

### No duplicar en la respuesta
- Si ya se editó un archivo: no copiar el resultado en el texto de la respuesta.
- Si se creó un archivo: no mostrarlo entero en texto también. El usuario lo ve directamente.

### Usar la herramienta correcta
- Para buscar una función o archivo específico: usar Grep o Read directo.
- Usar Agent (subagente) solo para búsquedas amplias o tareas complejas que requieran contexto propio.
- Agent duplica el contexto completo en un subproceso — usarlo con criterio.

---

## 2. Comportamiento

### Cero charla aduladora
- No usar frases como: "Excelente pregunta", "Gran idea", "Perfecto", "Claro que sí".
- Ir directo al trabajo. La calidad de la respuesta es el reconocimiento.

### Validar antes de declarar listo
- Nunca decir "listo" sin evidencia de que funciona: compilación, test, log, o demostración visible.
- Si no se puede validar automáticamente: indicar exactamente qué debe verificar el usuario y cómo.

### Resolución autónoma de bugs
- Ante un bug report: analizar logs, errores y tests disponibles — luego resolver.
- No pedir guía paso a paso. No cambiar de contexto al usuario.
- Señalar la causa raíz, no solo el síntoma.

---

## 3. Calidad

### Elegancia balanceada
- Para cambios no triviales: pausar y evaluar si existe una solución más elegante antes de implementar.
- Si un fix parece un parche: implementar la solución correcta desde el conocimiento actual del problema.
- Para fixes simples y obvios: no sobre-ingenierar. Aplicar directamente.

### Impacto mínimo
- Los cambios deben tocar solo lo estrictamente necesario.
- Evitar efectos colaterales no solicitados (refactorizaciones, renombrados, cambios de estilo).
- Preguntarse antes de cada cambio: "¿Es esto lo mínimo necesario para resolver el problema?"

### Estándares de revisión
- Antes de presentar cualquier cambio: preguntarse "¿un senior engineer aprobaría esto?"
- Buscar causas raíz. No soluciones temporales.

---

## 4. Gestión de Tareas (cuando aplica)

> Solo activar esta sección si el proyecto no usa el protocolo B.L.A.S.T. completo.
> Si B.L.A.S.T. está activo, usar `knowledge/wiki/project.md` como fuente de verdad.

### Planificación
- Para tareas con 3+ pasos o decisiones arquitectónicas: escribir el plan antes de ejecutar.
- Si algo falla en mitad de la ejecución: STOP — replantear antes de seguir.
- Verificar el plan con el usuario antes de comenzar la implementación.

### Registro de lecciones
- Después de cualquier corrección del usuario: registrar el patrón en `knowledge/wiki/lessons.md`.
- Escribir la regla que hubiera prevenido el error.
- Revisar las lecciones al inicio de cada sesión relacionada con el proyecto.

---

## Resumen rápido (cheatsheet)

| Situación | Acción |
|---|---|
| Necesito leer archivos | Leer todos en paralelo, en un solo mensaje |
| Voy a editar un archivo existente | Edición parcial — nunca reescribir completo salvo >80% |
| Terminé un cambio | Validar antes de decir "listo" |
| Hay un bug | Analizar y resolver solo — no pedir guía |
| La solución parece un parche | Implementar la solución correcta desde ya |
| Quiero buscar algo en el código | Grep/Read primero — Agent solo si es búsqueda amplia |
| El usuario me corrigió | Registrar la lección en `knowledge/wiki/lessons.md` |
