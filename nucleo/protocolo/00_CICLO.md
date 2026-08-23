# El ciclo de trabajo

> Cinco fases. No se avanza sin cerrar la anterior. Es el protocolo B.L.A.S.T. de la v1,
> reducido a lo que de verdad se usa y con el hueco que le faltaba: la fase de
> **verificación** como puerta, no como buena intención.

```
BLUEPRINT ──▶ ENLACE ──▶ ARQUITECTURA ──▶ EJECUCIÓN ──▶ PUERTA
    │                                                      │
    └──────────────── memoria ◀────────────────────────────┘
```

---

## B · Blueprint — antes de una línea de código

Skill: [`blueprint`](../skills/blueprint/SKILL.md)

Las cinco preguntas (North Star · integraciones · fuente de datos · entrega ·
restricciones) y, si hay interfaz, marca, diseño y funcionalidad.

**Data-First:** el esquema de entrada y salida se define **antes** que el código. Un tipo
inventado se propaga a todo el repositorio antes de que nadie lo revise.

**Clasificar la intención** determina el resto:

| Intención | Qué es | Lo que la hace fallar |
|---|---|---|
| FACTUAL | responde con datos que ya existen | recuperación mala, no generación mala |
| TAREA | ejecuta acciones con efectos | herramientas mal definidas, permisos, idempotencia |
| CONVERSACIONAL | mantiene un intercambio | pérdida de estado y de tono |
| ANALÍTICO | transforma y resume grandes volúmenes | coste y ventana de contexto |

---

## L · Enlace — que las conexiones existan de verdad

Nada se construye sobre una integración no probada. Por cada servicio externo:

1. **Un verificador**, `tools/verificar-<servicio>.<ext>`, que hace **una** llamada real
   mínima y falla ruidosamente. Es lo que distingue «no hay datos» de «la credencial
   caducó», que son el mismo silencio y problemas opuestos.
2. **Credenciales solo desde el entorno.** Nunca literales. `.env.example` con todas las
   claves y ningún valor.
3. **Límites declarados**: timeout, reintentos con espera creciente y *jitter*, y qué se
   hace cuando el servicio no está — degradar, encolar o fallar. Decidido aquí, no en
   medio de un incidente.

> Un servicio secundario **nunca** rompe el resultado principal. Y un fallo nunca se
> convierte en un resultado vacío que parece correcto.

---

## A · Arquitectura — decidir la forma antes de construirla

Skill de apoyo: prompt `ARCHITECTURE_PROMPT.md` del pack correspondiente.

Se decide y se escribe en `knowledge/wiki/decisions.md`: límites de módulos y quién posee
qué dato · dónde se validan las invariantes · qué es transaccional y qué es eventual ·
dónde vive la autorización — **una sola vez, en el borde, no repartida** · qué se cachea y
cómo se invalida.

Nada de microservicios, colas, caches ni abstracciones **por moda**. Cada pieza entra con
la fuerza concreta que la obliga a existir.

---

## E · Ejecución — construir

Skills: [`tarea`](../skills/tarea/SKILL.md) para acotar · [`avanzar`](../skills/avanzar/SKILL.md)
para ejecutar sin parar a cada paso.

Una tarea = un commit coherente. Estructura y conducta, separados. Lo nuevo nace con sus
tests. Las decisiones ajenas se aparcan en `decisiones-pendientes.md` y **no detienen el
trabajo**.

---

## P · Puerta — nada está hecho hasta que pasa

Skill: [`verificar`](../skills/verificar/SKILL.md) · detalle en
[`02_PUERTA_DE_CALIDAD.md`](02_PUERTA_DE_CALIDAD.md)

La puerta entera, no los pasos que parezcan relacionados. Después, recorrer a mano el flujo
real que cambió. Y decir el hueco: **¿lo que cambié lo recorre algo de lo que acabo de
correr?** Si no, se dice y se cubre de otra forma.

Salida con números, no con adjetivos.

---

## Y la vuelta: memoria

Cada corrección del usuario, cada decisión, cada trampa descubierta vuelve a
`knowledge/wiki/`. Ver [`03_MEMORIA.md`](03_MEMORIA.md).

Sin este paso el ciclo es una metodología. Con él, es un sistema que aprende.
