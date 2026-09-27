---
name: informe
description: Genera un informe HTML autocontenido y presentable — auditoría, arquitectura, seguridad, valoración, migración — con un sistema de diseño estable entre corridas. Úsala cuando el entregable tiene que poder abrirse, filtrarse e imprimirse por alguien que no es el agente ni el desarrollador.
---

# Informe

Un hallazgo que nadie lee no existe. Un informe cuyo formato cambia en cada corrida no se
puede comparar con el anterior, y comparar corridas es la mitad de su valor.

**El contenido cambia. El formato NO se degrada entre versiones.**

**Antes de nada:** si existe `knowledge/wiki/skills/informe.md`, léelo. Es lo propio de este
proyecto para esta skill y, donde sea más estricto que ella, manda él.

---

## 1 · Un archivo, autocontenido

```
knowledge/informe-<tipo>-YYYY-MM-DD.html
```

- **Todo dentro:** CSS y JS en línea, sin CDN, sin fuentes remotas, sin peticiones de red.
  Se abre desde el escritorio de quien lo recibe, sin servidor.
- **Cada corrida crea un archivo nuevo con la fecha de hoy.** Nunca se sobrescribe el
  anterior: la serie es la que muestra si el proyecto mejora.
- Tipos habituales: `auditoria-forense` · `seguridad` · `arquitectura` · `diseno-responsive`
  · `valoracion` · `migracion`.

---

## 2 · Cada tipo tiene sus reglas, y no se mezclan

| Tipo | Se organiza por | Fuente de sus reglas |
|---|---|---|
| Auditoría forense integral | categoría técnica × severidad | `knowledge/wiki/informe-auditoria-formato.md` |
| Seguridad | severidad + OWASP | `knowledge/wiki/informe-seguridad-formato.md` |
| Arquitectura / valoración | dominio | plantilla de referencia del proyecto |

> Aplicar el formato forense a un informe de seguridad es un error real y repetido.
> Comprobar el tipo **antes** de empezar.

El **aspecto visual** —tokens, portada, tipografía, componentes, paleta, impresión— es
**uno solo para todos los informes del proyecto** y vive en
`knowledge/wiki/informe-diseno-estandar.md`. Un informe no lleva diseño propio: se parte
del `<style>` de la plantilla de referencia y se reutilizan sus componentes.

---

## 3 · Los datos mandan sobre los números

Este es el mecanismo que evita el error más común —un dashboard que dice 14 críticos sobre
un listado que tiene 11—:

- El **listado de hallazgos** es la fuente legible por máquina. Cada tarjeta lleva sus
  atributos: `data-sev`, `data-cat`, `data-est`, `data-file`.
- **Toda sección derivada** —KPIs, matriz severidad × categoría, hallazgos por archivo, top
  de riesgos, quick wins, roadmap, scorecard— **se recalcula desde esas tarjetas.**
  Nunca se escribe un total a mano.
- Un post-procesador recalcula y valida antes de publicar. Si un número no cuadra, el
  informe no sale.

```bash
python3 knowledge/wiki/informe-postprocess.py knowledge/informe-<tipo>-<fecha>.html
```

---

## 4 · Interactividad que no engaña

- Un filtro **filtra en el sitio**; no hace scroll ni redirige. Quien pulsa «Críticos»
  quiere ver críticos, no viajar por el documento.
- Los filtros se **combinan** (severidad × categoría × esfuerzo) y hay una forma visible
  de limpiarlos.
- El estado del filtro se refleja en lo que se ve: un contador «mostrando N de M».
- **Imprimible:** con `@media print` el documento sale entero, con los filtros deshechos,
  sin fondos que se coman el tóner y sin cortar una tarjeta a la mitad.
- Funciona en claro y en oscuro, y a 320 px de ancho.

---

## 5 · Secciones (auditoría; adaptar por tipo)

| § | Sección | Naturaleza |
|---|---|---|
| — | Portada: fecha, alcance, metodología, score global | derivada |
| 1 | Resumen ejecutivo | prosa + cifras derivadas |
| 2 | Dashboard de severidad | derivada |
| 3 | Hallazgos por categoría **+ el listado dentro** | derivada + fuente |
| 4 | Hallazgos por archivo | derivada |
| 5 | Top de riesgos | derivada |
| 6 | Quick wins — nuevos, esfuerzo bajo | derivada |
| 7 | Roadmap de corrección por fases | derivada |
| 8 | Scorecard por dominio + camino a 100 | juicio + derivada |

> El listado **vive dentro de §3**, junto a los filtros que lo gobiernan. Publicarlo al
> final deja al lector a seis secciones de distancia de los controles.

---

## 6 · Antes de entregar

- [ ] Abrir el archivo en el navegador. Un informe que no se abrió no se entrega.
- [ ] Cada número derivado cuadra con el listado — lo comprueba el post-procesador.
- [ ] Cada hallazgo tiene evidencia con `archivo:línea`.
- [ ] Los `AD-*` vigentes están citados, no re-reportados.
- [ ] Vista de impresión revisada.
- [ ] A 320 px no se rompe nada.
- [ ] Sin dependencias externas: `grep -c 'https\?://[^"]*\.\(js\|css\)' informe.html` → 0
