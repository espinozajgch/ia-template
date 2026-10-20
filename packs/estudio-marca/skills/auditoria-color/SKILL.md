---
name: auditoria-color
description: Inventaría los colores de identidad que un proyecto usa de verdad (tokens, CSS, configuración de Tailwind, web pública, icono) y los compara con su documentación de marca. Detecta desfases, valores duplicados para un mismo rol, tokens sin uso, contrastes que no cumplen y reglas de marca incumplidas. Úsala cuando pregunten qué colores tiene la marca ahora o antes de proponer una paleta.
---

# Auditoría de la identidad de color

La guía de marca dice lo que la marca quiere ser. El código dice lo que es. Esta skill
describe lo segundo y mide la distancia con lo primero.

**Antes de nada:** lee `agente/packs/estudio-marca/metodo/color.md` y
`agente/packs/estudio-marca/metodo/anti-patrones.md` (AP-M02, AP-M12, AP-M13).

---

## 1 · Inventario automático

```bash
python3 agente/packs/estudio-marca/herramientas/color.py extraer /ruta/al/proyecto --max 40 --max-vars 150
```

Te da los colores más usados y las variables CSS con color literal, con `fichero:línea`.

## 2 · Lee las fuentes de tokens

Localiza y lee: la configuración del sistema de diseño (Tailwind, theme), los bloques
`:root` y de modo oscuro del CSS principal, el CSS de la web pública y la guía de marca.
Si hay varias capas que se sobrescriben (un `:root` más abajo que redefine otro), la que
manda es la última: compruébalo.

## 3 · Clasifica

| Grupo | Qué anotar |
|---|---|
| Colores de marca | Rol, hex en claro y en oscuro, uso, `fichero:línea` |
| Neutros | Fondo, superficies, texto principal y secundario, líneas |
| **Estados semánticos** | Éxito, aviso, error, información: hex exacto. Los necesitarás en `paleta.json` |
| Categorías | Solo constatar que existen; no son criterio de colisión |
| Icono o logo | Colores muestreados con `color.py muestra-png` |

## 4 · Busca inconsistencias

- La guía dice un valor y el código otro.
- Un mismo rol con varios valores en distintas partes (app, web, documentación).
- La web usa un tono distinto del canónico para el mismo rol.
- Tokens definidos y nunca usados (busca `var(--nombre)` en el código).
- Pares actuales que no cumplen contraste: mídelos con `color.py contraste`.
- Reglas de la guía que la web o la app incumplen (iconos, tipografía, uso del color).

## 5 · Escribe `knowledge/estudios-marca/<slug>/02-auditoria-color.md`

Con la estructura de `agente/packs/estudio-marca/plantillas/auditoria-color.md`. Incluye
el bloque de estados listo para copiar en `paleta.json`.

## 6 · Responde en el chat

Tablas de colores de marca y neutros con hex y uso, la lista de diferencias entre
documentación, app y web, y qué arreglarías primero.

## Antes de entregar

- [ ] Cada color citado lleva `fichero:línea`.
- [ ] Has comprobado qué capa de tokens manda de verdad.
- [ ] Los estados semánticos están anotados con su hex exacto.
- [ ] Las cifras de contraste salen de `color.py`.
- [ ] No has modificado nada del proyecto analizado.
