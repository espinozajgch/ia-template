# CLAUDE.md

**El contexto de este proyecto vive en [`AGENTS.md`](AGENTS.md). Léelo entero antes de trabajar.**
Este archivo solo añade lo que es específico de Claude Code.

## Específico de Claude Code

- **Skills disponibles** (`.claude/skills/`): `blueprint` · `tarea` · `avanzar` ·
  `verificar` · `auditar` · `preproduccion` · `informe` · `estimar`.
  Ante una petición nueva → `tarea`. Para ejecutar sin parar a cada paso → `avanzar`.
  Antes de cualquier commit que toque código → `verificar`. Lo propio de este proyecto
  para cada una, si lo hay, está en `knowledge/wiki/skills/<skill>.md`.
- **Hooks activos** (`.claude/settings.json`): el checklist de pre-commit y pre-push se
  inyecta solo. Si aparece, se ejecuta — no es decorativo.
- **MCP** (`.mcp.json`): con `codebase-memory` activo, el descubrimiento de código empieza
  por el grafo (`search_graph`, `trace_path`, `get_code_snippet`), no por `grep`.
- Los ficheros temporales van al scratchpad de la sesión, nunca al repositorio.
