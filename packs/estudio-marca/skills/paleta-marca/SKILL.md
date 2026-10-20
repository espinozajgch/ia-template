---
name: paleta-marca
description: Crea una paleta de cinco colores (principal, dos acentos, neutro oscuro y neutro claro) derivada de los valores de marca, con nombres del vocabulario del sector, variantes para claro y oscuro, proporción de uso y validación de contraste WCAG, distancia a estados y daltonismo. Úsala cuando pidan crear o proponer la paleta de una marca.
---

# Paleta de marca

Cada color expresa un valor y cada cifra se puede reproducir. Una paleta que no pasa
`color.py validar` no se entrega.

**Antes de nada:** lee `agente/packs/estudio-marca/metodo/color.md` y
`agente/packs/estudio-marca/metodo/anti-patrones.md`. Necesitas `01-valores.md` y
`02-auditoria-color.md` del proyecto; si faltan, haz antes `valores-marca` y
`auditoria-color` en versión breve.

---

## 1 · Asigna un valor a cada rol

Con los valores núcleo de `01-valores.md`:
- **Principal**: el valor que guía la acción (control, confianza, energía…).
- **Acento 1**: el valor de firma o aspiración (ambición, excelencia…).
- **Acento 2**: preferiblemente un **activo oculto** del diagnóstico, algo que el producto
  hace bien y la marca no comunica.
- **Neutro oscuro** y **neutro claro**: valores de fondo (confidencialidad, honestidad…).

## 2 · Parte del capital existente

La primera paleta es la ruta de **continuidad**: conserva los colores que el mercado ya
reconoce (los del logo o el icono, el color de acción actual) y ajústalos lo mínimo para
cumplir. Unifica los valores duplicados que encontró la auditoría.

## 3 · Elige y ajusta cada color con las herramientas

```bash
# ¿Cumple el principal como texto sobre el claro y con texto blanco encima?
python3 agente/packs/estudio-marca/herramientas/color.py contraste "#ffffff" "#2169de" "#2169de" "#f4f7fb"
# Un acento de un tono que cumpla en los dos fondos
python3 agente/packs/estudio-marca/herramientas/color.py buscar --tono 137 --restriccion "#f4f7fb:4.5" --sat 40-70
# ¿Se confunde con un estado?
python3 agente/packs/estudio-marca/herramientas/color.py estados "#237a3b" --estados "éxito=#047857,aviso=#c2410c,error=#b91c1c,información=#0c4a6e"
# Variante para texto sobre el oscuro
python3 agente/packs/estudio-marca/herramientas/color.py variante "#237a3b" --fondo "#0b1626" --min 7
```

Usa los estados reales del proyecto (de la auditoría), nunca unos genéricos.

## 4 · Nombra cada color

Nombre evocador del vocabulario del sector + descripción de una frase que una color y
valor + uso concreto. Nunca "Azul 500".

## 5 · Escribe `knowledge/estudios-marca/<slug>/paleta.json`

Copia `agente/packs/estudio-marca/plantillas/paleta.ejemplo.json` y rellénalo. Es la única
fuente de la paleta: la hoja y cualquier cifra salen de aquí. Esta primera paleta es la
opción A.

## 6 · Valida

```bash
python3 agente/packs/estudio-marca/herramientas/color.py validar knowledge/estudios-marca/<slug>/paleta.json
```

Sin errores. Cada aviso se resuelve o se explica en `bloques` de la opción.

## 7 · Entrega

- Responde con la tabla: rol, nombre, hex, valor que expresa, uso.
- Proporción de uso, qué cambia respecto a la paleta actual (con cifras) y las variantes
  de apoyo.
- Un riesgo a vigilar, si lo hay.
- Genera la hoja con `hoja-paleta`: una paleta no se puede ver en la terminal.

## Antes de entregar

- [ ] `color.py validar` sin errores.
- [ ] Cada color tiene valor, nombre, descripción y uso.
- [ ] Los acentos están a ≥ 30° de cualquier estado o el aviso está explicado.
- [ ] La proporción suma 100.
- [ ] Ninguna cifra escrita a mano.
