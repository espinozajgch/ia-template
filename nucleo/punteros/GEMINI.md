# GEMINI.md

**El contexto de este proyecto vive en [`AGENTS.md`](AGENTS.md). Léelo entero antes de trabajar.**
Este archivo solo añade lo que es específico de Gemini / Antigravity.

## Específico de Antigravity

- Reglas de proyecto: `.agents/rules/project.md`
- Skills: `.agents/skills/` — mismos nombres y mismo contenido que las de Claude Code.
  `blueprint` · `tarea` · `avanzar` · `verificar` · `auditar` · `preproduccion` · `informe` ·
  `estimar` · `flujo-web-api`. Lo propio de este proyecto, en `knowledge/wiki/skills/<skill>.md`.
- Antigravity carga varios ficheros de golpe: si el contexto se llena, prioriza
  `AGENTS.md` §5 (reglas que no se negocian) y `knowledge/wiki/anti-patterns.md`.
