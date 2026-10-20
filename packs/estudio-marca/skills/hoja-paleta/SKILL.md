---
name: hoja-paleta
description: Genera la hoja de paleta en HTML a partir de paleta.json: comparativa de opciones, fichas de color con copia de código, la paleta aplicada a una ficha en claro y oscuro, contrastes medidos y avisos de validación. Úsala cuando haya que ver, compartir o presentar una o varias paletas.
---

# Hoja de paleta

Una paleta no se puede ver en la terminal. La hoja es el entregable visual, y se genera:
**nunca se edita a mano** (AP-M14).

**Antes de nada:** el `paleta.json` del proyecto debe pasar la validación.

---

## 1 · Valida

```bash
python3 agente/packs/estudio-marca/herramientas/color.py validar knowledge/estudios-marca/<slug>/paleta.json
```

Con errores no se genera la hoja: corrige `paleta.json` primero.

## 2 · Completa los campos de presentación

En `paleta.json`, revisa que existan: `marca`, `titulo`, `h1`, `intro`, `icono` (ruta al
PNG o SVG del icono, copiado en `knowledge/estudios-marca/<slug>/activos/`), `ejemplo`
(una ficha con contenido real del sector, marcada como ilustrativa), `criterios`,
`recomendacion`, `reglas` y `pie`.

Si la marca ya tiene tipografía decidida, decláralo para que la hoja se componga con ella:
`"tipografia": {"display": "Manrope", "texto": "Inter", "mono": null}`. `mono: null` indica
que la marca no tiene monoespaciada: los hex usan la letra de texto con cifras tabulares. Sin
el campo, la hoja usa Manrope, DM Sans y JetBrains Mono.

## 3 · Genera

```bash
python3 agente/packs/estudio-marca/herramientas/hoja_paleta.py knowledge/estudios-marca/<slug>/paleta.json
```

Crea `knowledge/estudios-marca/<slug>/hoja-paleta.html`: un único fichero con el icono
embebido, que se adapta al tema claro u oscuro del navegador.

## 4 · Revisa antes de entregar

Abre el fichero o léelo. Comprueba que:
- cada opción tiene sus cinco fichas, su escenario en claro y oscuro y su tabla de contrastes;
- la comparativa muestra todas las opciones;
- los avisos automáticos que aparecen están explicados en el texto de la opción.

## 5 · Entrega

- Si tu entorno puede publicar páginas privadas (por ejemplo, la herramienta Artifact de
  Claude Code), publícala y da el enlace: es la forma de verla. Publicar en privado no es
  compartir; compartirla con otras personas lo decide el usuario.
- Si no, da la ruta del fichero para abrirla en el navegador.
- Para actualizarla: cambia `paleta.json`, regenera y vuelve a publicar en el mismo enlace.

## Antes de entregar

- [ ] `color.py validar` sin errores.
- [ ] Hoja regenerada después del último cambio de `paleta.json`.
- [ ] El ejemplo está marcado como datos ilustrativos.
- [ ] No has editado el HTML a mano.
