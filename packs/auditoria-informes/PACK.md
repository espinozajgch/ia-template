# Pack · auditoria-informes

**Se activa si:** el proyecto produce informes para alguien que no es el equipo —
dirección, cliente, auditoría, due diligence.

**Skills:** [`auditar`](../../nucleo/skills/auditar/SKILL.md) · [`informe`](../../nucleo/skills/informe/SKILL.md) · [`estimar`](../../nucleo/skills/estimar/SKILL.md)
**Prompts:** `FORENSIC_AUDITOR_PROMPT.md` · `AUDITOR_FORENSE.md` · `AUDIT_PROMPT.md` · `STAFF_PROMPT.md`

---

## Qué instala

```
knowledge/wiki/informe-diseno-estandar.md    el sistema visual, uno para TODOS los informes
knowledge/wiki/informe-<tipo>-formato.md     qué secciones y qué interactividad, por tipo
knowledge/wiki/informe-postprocess.py        recalcula las secciones derivadas y valida
```

---

## Reglas

### El formato no se degrada entre versiones

El contenido cambia en cada corrida; el formato **no**. Comparar la corrida de hoy con la
de hace tres meses es la mitad del valor del informe, y solo se puede si el formato aguantó.

### Un tipo, unas reglas

Auditoría forense se organiza por categoría técnica × severidad. Seguridad, por severidad +
OWASP. **Aplicar el formato de uno al otro es un error real y repetido.** Comprobar el tipo
antes de empezar.

### El aspecto visual es uno solo

Un informe no lleva diseño propio. Se parte del `<style>` de la plantilla de referencia del
proyecto y se reutilizan sus componentes. Cinco informes con cinco diseños distintos
parecen de cinco autores distintos.

### Los números se derivan, no se escriben

El listado de hallazgos lleva sus atributos legibles por máquina; todo lo demás —KPIs,
matrices, top de riesgos, roadmap, scorecard— se **recalcula** desde ahí con el
post-procesador. Un dashboard que dice 14 críticos sobre un listado que tiene 11 destruye
la credibilidad del documento entero.

### Un archivo nuevo por corrida

`informe-<tipo>-YYYY-MM-DD.html`. Nunca se sobrescribe el anterior: **la serie es la que
demuestra si el proyecto mejora.**

### Autocontenido

CSS y JS en línea. Sin CDN, sin fuentes remotas, sin peticiones de red. Se abre desde el
escritorio de quien lo recibe.

```bash
grep -cE 'src="https?://|href="https?://[^"]*\.css' informe.html   # debe dar 0
```

---

## Checklist

- [ ] Tipo de informe identificado y reglas correctas aplicadas
- [ ] Post-procesador ejecutado; todos los números derivados cuadran
- [ ] Cada hallazgo con evidencia `archivo:línea`
- [ ] `AD-*` vigentes citados, no re-reportados
- [ ] Abierto en el navegador y revisada la vista de impresión
- [ ] Sin dependencias externas
- [ ] Archivo nuevo con la fecha de hoy; el anterior intacto
