# Pack · marketing-contenido

**Se activa si:** el proyecto gestiona marketing, contenido o redes sociales — propio o de
un cliente. No es un pack de ingeniería de software: comparte el núcleo de orquestación
(`avanzar`, los subagentes, el contrato de delegación) pero sus roles son de otro dominio.

---

## Por qué existe

El mismo problema que resolvieron `frontend`/`backend`/`verificador`/`documentador` para
código —dejar de ser quien reparte cada paso a mano entre roles— aplica igual de bien a
una cuenta de redes sociales o a una campaña: hay un rol que decide QUÉ y CUÁNDO, uno que
escribe, uno que diseña, y uno que publica. Los cuatro de aquí siguen la misma mecánica:
reciben una ficha (`tarea`), trabajan dentro de su frontera, y devuelven un informe
verificable — nunca una narración.

## Qué instala

Cuatro subagentes en `.claude/agents/` (solo Claude Code — ver la limitación de
`nucleo/agentes`):

| Subagente | Decide / produce | Nunca hace |
|---|---|---|
| `marketing` | estrategia, calendario, qué publicar y cuándo, auditoría de lo ya publicado | escribir el contenido final ni publicarlo |
| `editor-contenido` | el texto: captions, guiones, posts, respuestas, DMs | diseño visual ni publicación |
| `disenador` | el activo visual: carrusel, portada, especificación de imagen | el texto final ni publicación |
| `publicador-rrss` | la cola de publicación ya revisada, lista para que una persona la apruebe | **publicar nada él mismo** — ver más abajo |

## Si también tenés el pack `instagram-marketing`

Sus trece skills (`ig-reel`, `ig-caption`, `ig-carousel`, `ig-plan`, `ig-audit`, `ig-human`…)
son las **herramientas** que estos subagentes siguen para Instagram específicamente:
`marketing` usa `ig-plan`/`ig-audit`/`ig-viral`; `editor-contenido` usa
`ig-caption`/`ig-reel`/`ig-story`/`ig-dm`/`ig-comment`/`ig-reply` y **siempre** pasa por
`ig-human` antes de dar un borrador por terminado; `disenador` usa `ig-carousel`. Sin ese
pack, los subagentes trabajan con criterio general de redacción y diseño — menos afinado,
pero no bloqueado.

## Si también tenés el pack `estudio-marca`

No es una herramienta más entre varias: es la **fuente de verdad** de dos subagentes.

- `marketing` lee `knowledge/estudios-marca/<slug>/01-valores.md` — los valores núcleo con
  su prueba, no una suposición — y cada pieza del plan nombra qué valor expresa.
- `disenador` lee `knowledge/estudios-marca/<slug>/paleta.json` (la opción `destacada`) en
  vez de inventar o aproximar un color: cada hex de ahí ya pasó validación de contraste
  WCAG, distancia a estados semánticos y separación con daltonismo.

Sin ese pack, los dos siguen funcionando con `knowledge/wiki/product-design.md` o el
criterio general — pero si existe un estudio de marca hecho, es lo que manda, no una
paleta improvisada para la ocasión. Si no existe todavía ninguno de los dos ficheros, el
subagente lo dice y sugiere correr `estudio-marca` antes de seguir, en vez de inventar
valores o colores por su cuenta.

## La frontera que no se negocia

**Publicar en una red social es publicar en un servicio externo** — la misma categoría que
`git push` o desplegar a producción en `nucleo/AGENTS.md` §5.1. Ningún subagente de este
pack tiene permiso de llamar a una API de publicación real, programar un envío en firme, ni
tocar credenciales de ninguna plataforma, **aunque la ficha se lo pida explícitamente**. El
único resultado que `publicador-rrss` entrega es una cola revisable: qué se publicaría,
dónde y cuándo, para que una persona —no un agente— dé el visto bueno pieza por pieza.

Esto no es una limitación temporal del MVP: es la misma regla que ya protege despliegues y
bases de datos, aplicada al único lugar donde este pack podría causar daño irreversible —
una publicación pública no se puede "revertir" de verdad una vez que alguien la vio.

## Checklist

- [ ] `marketing` decide el plan; no escribe ni publica
- [ ] `editor-contenido` pasa por `ig-human` (u otro humanizador) antes de marcar un borrador listo
- [ ] `disenador` entrega especificación o activo, nunca el texto final
- [ ] `publicador-rrss` entrega una cola, nunca publica — la aprobación es de una persona, por pieza
- [ ] Ninguna credencial de ninguna plataforma vive en un prompt, un log o un commit
- [ ] Si existe `estudio-marca`, `marketing` y `disenador` usan sus entregables como fuente — no inventan valores ni colores en paralelo
