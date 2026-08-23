# features.md — Funcionalidad del producto

> Qué hace el producto **hoy**, no qué se planeó. Se consulta **antes** de tocar módulos,
> pantallas, endpoints o flujos, y se actualiza en el mismo commit que los cambia.
>
> Una funcionalidad que está en el código y no aquí es una funcionalidad que el agente va
> a reimplementar.

---

## Módulos

| Módulo | Qué resuelve | Estado | Entrada en el código |
|---|---|---|---|
| | | activo / en obras / obsoleto | `ruta` |

---

## Pantallas y rutas

| Ruta | Pantalla | Quién entra | Qué puede hacer |
|---|---|---|---|
| `/…` | | rol | |

---

## Endpoints

| Método | Ruta | Qué hace | Auth | Quién puede |
|---|---|---|---|---|
| GET | `/api/…` | | sí/no | rol |

---

## Flujos principales

### [nombre del flujo]

1. …
2. …

**Estados posibles:** …
**Qué pasa si falla a medias:** … ← la pregunta que más código ahorra

---

## Roles y permisos

| Rol | Ve | Puede | No puede |
|---|---|---|---|
