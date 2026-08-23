# AGENTS.md — ia-template

> Contexto para trabajar **en el kit**. No es la plantilla que se instala en los proyectos:
> esa es [`nucleo/AGENTS.md`](nucleo/AGENTS.md), y lleva marcadores `[…]` a propósito.

---

## Qué es esto

Un kit que define cómo trabajan los agentes de IA en cualquier proyecto: Claude Code,
Gemini/Antigravity, Cursor, Copilot, Windsurf y Codex, con un solo cuerpo de conocimiento.

Se instala con `./instalar.sh <proyecto> <packs…>`. **Este repositorio no se instala sobre
sí mismo.**

---

## Mapa

```text
nucleo/       lo que se instala SIEMPRE — plantillas, skills, protocolo, hooks, herramientas
packs/        13 packs por nicho; se instalan solo los que aplican
prompts/      una versión canónica de cada prompt especializado
prompts/_dominio/   prompts de un dominio concreto — NUNCA se instalan por defecto
docs/         de dónde salió cada pieza, cómo migrar, y lo que quedó superado
instalar.sh   el instalador
```

---

## Comandos

```bash
./instalar.sh --packs                  # listar packs y cuándo aplican
./instalar.sh /ruta/proyecto <packs…>  # instalar (idempotente, no pisa nada sin --force)
bash -n instalar.sh nucleo/tools/*.sh  # sintaxis de los scripts
```

**La puerta de calidad de este repositorio** (no hay build; son ficheros y scripts):

```bash
for d in packs/*/;   do [ -f "$d/PACK.md" ] || echo "✗ falta PACK.md en $d"; done
for f in nucleo/skills/*/SKILL.md; do sed -n '2,4p' "$f" | grep -q '^name:' || echo "✗ frontmatter en $f"; done
python3 -c "import json;json.load(open('nucleo/hooks/settings.json'));json.load(open('nucleo/mcp/.mcp.json'))"
bash -n instalar.sh nucleo/tools/ratchet.sh nucleo/tools/puerta.sh
```

---

## Reglas al tocar el kit

### Una regla entra en el núcleo cuando fue útil en DOS proyectos

Si solo lo fue en uno, va a un pack. Si es de un dominio concreto, a `prompts/_dominio/`.
Es la regla que evita que el núcleo vuelva a engordar hasta las 9.000 líneas.

### Nada se duplica

Si un texto aparece en dos sitios, uno de los dos debe ser un enlace. La duplicación es
justo lo que este kit existe para eliminar: reintroducirla aquí sería irónico y caro.

### `nucleo/AGENTS.md` se queda por debajo de 250 líneas

Es la plantilla. Lo que crezca por encima baja a `nucleo/knowledge/` o a un pack.

### Los prompts tienen una sola versión

Antes de añadir uno, comprobar que no está ya en `prompts/`. Si hay una versión mejor en un
proyecto, se **reemplaza** la del kit y se anota el origen en `docs/DE-DONDE-SALIO.md`.

### Los scripts, portables a bash 3.2

Es el bash que trae macOS. Sin `mapfile`, sin arrays asociativos, sin `${var,,}`.
Comprobar con `bash -n` y probándolos contra un proyecto real.

### Un pack nuevo necesita cuatro cosas

`PACK.md` con su «se activa si» en la primera línea (el instalador lo lee para `--packs`) ·
reglas con el **porqué**, no solo el qué · un checklist de cierre · y su entrada en
`prompts_de_pack()` de `instalar.sh`. Opcional pero recomendable: `rule.mdc` con globs.

---

## Trampas conocidas

- **`instalar.sh` lee la primera línea `**Se activa si:**` de cada `PACK.md`** para
  `--packs`. Si cambia ese formato, la lista sale vacía y nadie se entera.
- **Un pack sin entrada en `prompts_de_pack()`** hace fallar el instalador con «pack
  desconocido», aunque el directorio exista.
- **El remoto de git lleva el token embebido en la URL.** Ver §Seguridad.

---

## Seguridad

⚠️ **`.git/config` tiene un token de GitHub en la URL del remoto.** Cualquiera con acceso al
disco o a un backup de este directorio lo tiene. Hay que **rotarlo** en GitHub y volver a
configurar el remoto sin credencial:

```bash
git remote set-url origin https://github.com/espinozajgch/ia-template.git
# y autenticar con gh auth login o con el gestor de credenciales del sistema
```

Mientras tanto: **no publicar este repositorio** ni compartir copias del directorio.
