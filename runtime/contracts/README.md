# Contratos del runtime

Los adaptadores implementan estos conceptos sin importar código de negocio:

- `DomainPack`: manifiesto, entidades, relaciones, eventos, políticas, herramientas y
  evaluaciones.
- `ContextBundle`: petición, presupuesto, candidatos, evidencias, exclusiones, huecos y
  procedencia.
- `Tool`: contrato de entrada/salida, permisos, coste, sensibilidad y efectos.
- `MemoryRecord`: decisión, contexto, evidencia, resultado, autoría, versión y caducidad.
- `EvaluationCase`: entrada, baseline, resultado esperado, métrica y criterio de promoción.

Un proyecto puede usar solo los contratos que necesita. El runtime nunca presupone que el
dominio sea código, fútbol, CRM o documentos.
