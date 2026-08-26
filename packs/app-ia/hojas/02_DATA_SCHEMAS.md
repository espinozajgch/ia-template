<!-- ejemplo-rellenado -->
> ## ⚠️ ESTO ES UN EJEMPLO YA RELLENADO, DE OTRO PROYECTO
>
> Lo que hay debajo son las respuestas de **futbot-v2** — un bot de narración deportiva en Discord—, no las de este
> proyecto. Se instala así a propósito: **una hoja bien rellenada enseña qué nivel de
> detalle hace falta**, y una plantilla vacía no enseña nada.
>
> **Reemplázalo antes de que ningún agente lo lea como si fuera cierto aquí.** Una hoja
> de otro proyecto no es contexto neutro: es contexto FALSO con formato de verdad, y se
> obedece igual que el bueno. Los modelos, las rutas de fichero y los GAP de abajo son
> de aquel sistema.
>
> Las rutas relativas apuntan a la raíz del proyecto (`../../`) porque esta hoja se
> instala en `agente/sistema/`.

---

# Data Schemas — Esquemas de Datos

> Generado por el System Pilot en Fase B (Blueprint) — Regla Data-First.
> El schema se define ANTES de escribir cualquier código.

---

## Regla Data-First

El sistema no comienza a codificar hasta que:
- [ ] El schema de Input está definido y aprobado
- [ ] El schema de Output está definido y aprobado
- [ ] El usuario confirmó el Blueprint

---

## Schema de Input

```json
{
  "input": {
    "tipo": "[texto / json / evento / webhook]",
    "campos_requeridos": [
      {
        "nombre": "[campo]",
        "tipo": "[string / number / boolean / object / array]",
        "descripcion": "[qué representa este campo]"
      }
    ],
    "campos_opcionales": [
      {
        "nombre": "[campo]",
        "tipo": "[tipo]",
        "default": "[valor por defecto si no viene]"
      }
    ],
    "ejemplo": {
      "[campo_requerido_1]": "[valor de ejemplo]",
      "[campo_requerido_2]": "[valor de ejemplo]"
    }
  }
}
```

---

## Schema de Output (Delivery Payload)

```json
{
  "output": {
    "formato": "[json / markdown / texto / webhook]",
    "destino": "[slack / base_de_datos / api / stdout / email]",
    "campos": [
      {
        "nombre": "[campo]",
        "tipo": "[tipo]",
        "requerido": true,
        "descripcion": "[qué representa]"
      }
    ],
    "ejemplo": {
      "[campo_1]": "[valor de ejemplo]",
      "[campo_2]": "[valor de ejemplo]"
    }
  }
}
```

---

## Validaciones

| Campo | Regla | Error si falla |
|---|---|---|
| [campo] | [requerido / formato / rango] | [mensaje de error] |

---

## Historial de cambios al Schema

| Versión | Cambio | Fecha | Aprobado por |
|---|---|---|---|
| v1.0 | Schema inicial | [FECHA] | [usuario] |
