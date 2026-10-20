# Encargos listos para pegar

Para agentes que no descubren skills solos (Cursor, Copilot, Windsurf, Codex) o para lanzar
una etapa concreta en cualquier agente. Sustituye lo que va entre `<>`.

Todos parten de la misma regla: el agente trabaja en la raíz del proyecto, lee el
procedimiento escrito en `agente/packs/estudio-marca/` y lo sigue. No improvisa el método.

---

## Encargo completo

```text
Lee agente/packs/estudio-marca/PACK.md entero y después
agente/packs/estudio-marca/skills/estudio-marca/SKILL.md, y sigue ese procedimiento.

Proyecto a analizar (solo lectura): <ruta o URL>
Slug: <slug>
Quién leerá el resultado: <yo / mi equipo / un cliente>

Quiero: valores de marca, auditoría de los colores actuales, una paleta de cinco colores
(principal, dos acentos, neutro oscuro, neutro claro) y dos rutas alternativas, con la
hoja de paleta generada.
```

## 1 · Valores de marca

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/valores-marca/SKILL.md y sigue ese procedimiento.
Analiza <ruta o URL> como experto en marketing y dime los valores de marca.
Slug: <slug>.
```

## 2 · Colores actuales

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/auditoria-color/SKILL.md y sigue ese procedimiento.
Dime los colores de la identidad de marca que tiene ahora <ruta>, y en qué difieren la
documentación, la app y la web. Slug: <slug>.
```

## 3 · Paleta

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/paleta-marca/SKILL.md y sigue ese procedimiento.
De acuerdo a los valores de marca de knowledge/estudios-marca/<slug>/, créame una paleta
con color principal, dos acentos, un neutro oscuro y un neutro claro. Genera la hoja.
```

## 4 · Más opciones o una combinación concreta

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/rutas-paleta/SKILL.md y sigue ese procedimiento.
Añade <N> opciones más de paleta en knowledge/estudios-marca/<slug>/paleta.json.
```

```text
… Añade una opción con: color principal <nombre o hex>, acento 1 <…>, acento 2 <…>,
neutro oscuro <…>, neutro claro <…>, y una variante donde el acento 2 sea <…>.
```

## 5 · Síntesis

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/sintesis-paleta/SKILL.md y sigue ese procedimiento.
Tomando como base las opciones <X> y <Y> de knowledge/estudios-marca/<slug>/paleta.json,
genera una opción que mezcle lo mejor de ambas y no tenga puntos débiles de diseño.
```

## 6 · Hoja de paleta

```text
Lee agente/packs/estudio-marca/PACK.md y
agente/packs/estudio-marca/skills/hoja-paleta/SKILL.md y sigue ese procedimiento.
Genera la hoja de knowledge/estudios-marca/<slug>/paleta.json y dime cómo abrirla.
```
