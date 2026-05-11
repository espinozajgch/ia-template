# [NOMBRE DEL PROYECTO] — GitHub Copilot Instructions

> Editar este archivo después de completar el Blueprint.

## Proyecto

**North Star:** [Completar con respuesta a Pregunta 1 del Blueprint]
**Stack:** [Completar]

## Arquitectura

- `knowledge/wiki/` — fuente de verdad (no modificar sin Blueprint aprobado)
- `llm-wiki/` — reglas del sistema y protocolo B.L.A.S.T.
- `app/` + `tools/` — código de ejecución

## Convenciones de código

- Schema de datos en `llm-wiki/02_DATA_SCHEMAS.md` — consultar antes de crear tipos nuevos
- Credenciales siempre desde `.env` — nunca literales en el código
- Scripts de verificación de integraciones van en `tools/verify_[servicio].py`

## Lo que NO hacer

- No modificar `knowledge/wiki/project.md` sin revisar el Blueprint
- No crear integraciones sin el script de verificación correspondiente
- No hardcodear credenciales
- [Completar con restricciones de Pregunta 5 del Blueprint]

## Referencias

- Protocolo completo: `llm-wiki/09_BLAST_PROTOCOL.md`
- Fuente de verdad: `knowledge/wiki/project.md`
- Schemas: `llm-wiki/02_DATA_SCHEMAS.md`
