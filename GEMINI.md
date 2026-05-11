# GEMINI.md — [NOMBRE DEL PROYECTO]

> Contexto del proyecto para Antigravity (Google Gemini).
> Editar este archivo después de completar el Blueprint (Fase B del protocolo B.L.A.S.T.).
> Para reglas globales que aplican a todos tus proyectos, ver ~/.gemini/GEMINI.md

---

## Proyecto

**North Star:** [Completar con respuesta a Pregunta 1 del Blueprint]

**Stack:** [Ej: Python 3.12 + FastAPI + PostgreSQL]

**Punto de entrada:** [Ej: app/main.py]

---

## Arquitectura (Capas A.N.T.)

- **Knowledge** (`knowledge/wiki/`): Fuente de verdad — leer antes de cualquier cambio
- **System** (`llm-wiki/`): Reglas del sistema y protocolo B.L.A.S.T.
- **Execution** (`app/`, `tools/`): Código de ejecución

---

## Protocolo activo

Este proyecto usa B.L.A.S.T. — 5 fases en orden estricto:
1. **B — Blueprint**: Definir antes de codificar. Schema de datos aprobado antes de cualquier código.
2. **L — Link**: Verificar conexiones externas antes de la lógica principal.
3. **A — Architect**: Construir prompt/lógica con contexto completo.
4. **S — Stylize**: Validar que el output cumple el schema.
5. **T — Trigger**: Ejecutar y enrutar el resultado.

Nunca avanzar de fase sin confirmación del usuario.
Nunca adivinar lógica de negocio.

Protocolo completo: `llm-wiki/09_BLAST_PROTOCOL.md`

---

## Reglas de comportamiento del agente

- Leer archivos relevantes ANTES de escribir código, en paralelo si son independientes
- Edición parcial para cambios — nunca reescribir archivo completo salvo >80% de cambio
- No copiar código editado en la respuesta — el usuario lo ve en el diff
- Sin frases aduladoras — ir directo al trabajo
- Nunca declarar "listo" sin evidencia de que funciona
- Ante corrección: registrar el patrón en `knowledge/wiki/lessons.md`

---

## Restricciones del proyecto

[Completar con respuesta a Pregunta 5 del Blueprint — las cosas que el sistema NO debe hacer]

---

## Skills disponibles

- `@blast-new` — Inicializar proyecto nuevo con el protocolo B.L.A.S.T. completo
- `@blast-audit` — Auditar proyecto existente e inferir Blueprint automáticamente

---

## Referencias

- Fuente de verdad: `knowledge/wiki/project.md`
- Protocolo B.L.A.S.T.: `llm-wiki/09_BLAST_PROTOCOL.md`
- Schemas de datos: `llm-wiki/02_DATA_SCHEMAS.md`
- Integraciones: `llm-wiki/06_INTEGRATIONS.md`
- Arquitectura: `llm-wiki/08_ARCHITECTURE.md`
- Lecciones aprendidas: `knowledge/wiki/lessons.md`
