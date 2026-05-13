# Funcionalidades del Producto

> Fuente de verdad para la funcionalidad actual o prevista del proyecto.
> En proyectos existentes se completa desde el codigo, rutas, pantallas, handlers, servicios y documentacion.
> En proyectos nuevos se completa desde el Blueprint y se actualiza cuando el alcance cambia.

---

## Estado

| Campo | Valor |
|---|---|
| Tipo de proyecto | [NUEVO / EXISTENTE / BACKEND-ONLY / FRONTEND] |
| Fuente principal | [Codigo / Blueprint / README / Usuario] |
| Ultima actualizacion | [FECHA] |

---

## Resumen Funcional

[Describe en 3-5 bullets que permite hacer el producto actualmente o que debe permitir hacer.]

---

## Modulos

### [Nombre del modulo]

| Campo | Valor |
|---|---|
| Estado | [EXISTENTE / PARCIAL / PLANIFICADO / DEPRECADO] |
| Usuarios/roles | [Roles afectados] |
| Archivos fuente | [Rutas relevantes] |

**Responsabilidad:**
[Que resuelve este modulo.]

**Funcionalidades:**
- [Accion o capacidad 1]
- [Accion o capacidad 2]

**Entradas:**
- [Datos que recibe]

**Salidas:**
- [Resultado que produce]

**Reglas de negocio:**
- [Regla detectada o definida]

**Gaps / pendientes:**
- [Limitacion, deuda o pregunta abierta]

---

## Pantallas o Endpoints

| Nombre | Tipo | Ruta/archivo | Proposito | Estado |
|---|---|---|---|---|
| [Nombre] | [Pantalla / API / CLI / Worker] | [Ruta] | [Que hace] | [Estado] |

---

## Flujos de Usuario

### [Nombre del flujo]

| Campo | Valor |
|---|---|
| Actor | [Usuario/rol/sistema] |
| Inicio | [Pantalla, endpoint o evento inicial] |
| Final esperado | [Resultado] |
| Estado | [EXISTENTE / PARCIAL / PLANIFICADO] |

**Pasos:**
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

**Estados relevantes:**
- Carga: [Comportamiento]
- Exito: [Comportamiento]
- Error: [Comportamiento]
- Vacio: [Comportamiento]

---

## Reglas de Mantenimiento

- Actualizar este archivo cuando se agregue, elimine o cambie una funcionalidad.
- En auditorias, citar archivos fuente para cada modulo inferido.
- No usar este archivo para decisiones tecnicas profundas; esas van en `knowledge/wiki/decisions.md`.
- Si una funcionalidad depende de una integracion externa, reflejarla tambien en `llm-wiki/06_INTEGRATIONS.md`.
