# Pack · instagram-marketing

**Se activa si:** el proyecto opera o gestiona una cuenta de Instagram como canal de
negocio — no es un pack de ingeniería de software, es contenido y marketing.

**Origen:** no sale de la cantera de proyectos. Es trabajo de terceros, vendorizado
completo:

> **The Instagram agent skill** — Jake Schincariol ([opusjake.ai](https://opusjake.ai)),
> MIT License, Copyright (c) 2026 Jake Schincariol.
> Repositorio: <https://github.com/Jakeschincariol/instagram-agent-skill>
> Licencia completa: [`LICENSE-instagram-agent-skill`](LICENSE-instagram-agent-skill).

Trece skills tal cual las publicó su autor, sin reescribir. Si el repositorio original
actualiza algo, este pack queda desactualizado hasta que alguien lo vuelva a copiar —
**no hay actualización automática**. Comprobar la fecha de este pack contra la del
repositorio antes de asumir que está al día.

---

## Por qué está aquí y no en `nucleo/`

Ninguna regla del kit encaja: no es un patrón cosechado de dos proyectos (viene de un
solo autor externo), no es ingeniería de software (es redacción y estrategia de
contenido) y no aplica por defecto a ningún proyecto de la cantera actual (hipismo,
pulso, analisis, logroño-united, tasas-bcv-api no gestionan Instagram como canal). Por
eso es un pack de instalación explícita, igual que `facturacion` o `notificaciones`:
quien lo necesita lo pide, quien no, nunca lo ve.

---

## Qué instala

Trece skills bajo `.claude/skills/` y `.agents/skills/`, cada una con su propio alcance:

| Skill | Para qué |
|---|---|
| `ig-reel` | guion de Reel desde una idea — gancho, voz en off, texto en pantalla, guion de tiempos, con puntuación antes de grabar |
| `ig-viral` | encuentra qué funciona ahora en el nicho del usuario, lo rankea y lo convierte en fichero de referencia |
| `ig-caption` | el texto que sobrevive al corte de «… más», con lint de truncamiento |
| `ig-carousel` | portada, copy diapositiva por diapositiva, ficheros 1080×1350 |
| `ig-story` | secuencia de Stories, de qué sticker en qué frame |
| `ig-profile` | puntúa el perfil sobre 100 contra una rúbrica y reescribe lo que pierde puntos |
| `ig-plan` | la semana: qué publicar, en qué formato, cuándo, a quién responder |
| `ig-comment` / `ig-reply` | comentarios y respuestas que leen como una persona, no como un bot |
| `ig-dm` | mensajes directos con seguimiento |
| `ig-repurpose` | convierte un vídeo/podcast/artículo largo en una semana de contenido |
| `ig-audit` | post-mortem de lo ya publicado: qué funcionó y por qué |
| `ig-human` | quita la huella de máquina (rayas largas, vocabulario de IA, caracteres invisibles) y puntúa contra un panel de cinco comprobaciones — la razón por la que las demás son usables |

**Nada se publica solo.** Las skills escriben; publicar es una decisión de quien usa el
proyecto, igual que el resto de acciones irreversibles de `nucleo/AGENTS.md` §5.1.

---

## Antes de activarlo

- [ ] El proyecto gestiona de verdad una cuenta de Instagram — si no, este pack es
      contexto que el agente lee y no usa
- [ ] `voice.md` rellenado con la voz de marca real, no el ejemplo
- [ ] Revisado que el repositorio original no tenga una versión más nueva
