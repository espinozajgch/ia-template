# CLAUDE.md — [NOMBRE DEL PROYECTO]

> Contexto del proyecto para Claude Code.
> Editar este archivo después de completar el Blueprint (Fase B del protocolo B.L.A.S.T.).

---

## Proyecto

**North Star:** [Completar con respuesta a Pregunta 1 del Blueprint]

**Stack:** [Ej: Python 3.12 + FastAPI + PostgreSQL]

**Punto de entrada:** [Ej: app/main.py]

---

## Arquitectura (Capas A.N.T.)

```
[proyecto]/
├── knowledge/wiki/   ← fuente de verdad — leer antes de cualquier cambio
├── llm-wiki/         ← reglas del sistema y protocolo B.L.A.S.T.
├── app/              ← código de ejecución
└── tools/            ← scripts de verificación de integraciones
```

---

## Comandos esenciales

```bash
# Configurar entorno
cp .env.example .env   # completar credenciales

# Verificar conexiones (Fase L)
python tools/verify_[servicio].py

# Ejecutar
[COMANDO PRINCIPAL]

# Tests
[COMANDO DE TESTS]
```

---

## Convenciones

- Protocolo B.L.A.S.T. activo — respetar las 5 fases en orden
- Schema de datos definido en `llm-wiki/02_DATA_SCHEMAS.md` — consultar antes de crear tipos nuevos
- Funcionalidad del producto definida en `knowledge/wiki/features.md` — consultar antes de cambiar módulos, pantallas, endpoints o flujos
- Si hay frontend, marca y diseño definidos en `knowledge/wiki/product-design.md` — consultar antes de crear componentes visuales
- Credenciales siempre desde `.env` — nunca literales en el código
- No avanzar de fase sin confirmación explícita del usuario

---

## Reglas de comportamiento del agente

- Leer archivos relevantes ANTES de escribir código, en paralelo si son independientes
- Edición parcial para cambios — nunca reescribir archivo completo salvo >80% de cambio
- No copiar código editado en la respuesta — el usuario lo ve en el diff
- Sin frases aduladoras — ir directo al trabajo
- Nunca declarar "listo" sin evidencia de que funciona

---

## Restricciones del proyecto

[Completar con respuesta a Pregunta 5 del Blueprint — las cosas que el sistema NO debe hacer]

---

## Referencias

- Fuente de verdad: [`knowledge/wiki/project.md`](knowledge/wiki/project.md)
- Funcionalidad: [`knowledge/wiki/features.md`](knowledge/wiki/features.md)
- Product Design: [`knowledge/wiki/product-design.md`](knowledge/wiki/product-design.md)
- Protocolo B.L.A.S.T.: [`llm-wiki/09_BLAST_PROTOCOL.md`](llm-wiki/09_BLAST_PROTOCOL.md)
- Schemas: [`llm-wiki/02_DATA_SCHEMAS.md`](llm-wiki/02_DATA_SCHEMAS.md)
- Integraciones: [`llm-wiki/06_INTEGRATIONS.md`](llm-wiki/06_INTEGRATIONS.md)
- Arquitectura: [`llm-wiki/08_ARCHITECTURE.md`](llm-wiki/08_ARCHITECTURE.md)
