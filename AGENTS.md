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
packs/        23 packs por nicho (2026-08-27); se instalan solo los que aplican
tools/        herramientas del kit que NO se instalan en nadie
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
./verificar.sh                         # la puerta entera. Es la que corre CI.
```

Sintaxis, estructura de packs y skills, JSON, plantillas y secretos. **No copies aquí lo
que comprueba.** Esta lista estuvo escrita a mano en este fichero mientras CI corría otra,
y para el 2026-08-27 ya habían divergido: la de aquí no incluía ni el detector de
plantillas ni el de secretos. Es lo que el kit le exige a los proyectos que instala —ver
[`nucleo/protocolo/02_PUERTA_DE_CALIDAD.md`](nucleo/protocolo/02_PUERTA_DE_CALIDAD.md)— y
no se lo aplicaba a sí mismo.

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
  `--packs`. Si cambia ese formato, la lista sale vacía y nadie se entera. **Ya pasó:**
  `packs/seguridad` decía «Se activa siempre que…» y salía sin descripción. Lo vigila
  `verificar.sh` desde el 2026-08-27, que es como se encontró.
- ~~**Un pack sin entrada en `prompts_de_pack()`** hace fallar el instalador.~~ **Ya no.**
  El caso por defecto acepta cualquier pack con `PACK.md`; simplemente no instala prompts.
  Comprobado instalando `tasas-de-cambio`, que no tiene entrada.
- **Un pack que traiga un fichero suelto en su raíz se instala entero**, sin lista de
  extensiones. La había, y dejaba fuera el `canario.yml` del pack de tasas que su propio
  `PACK.md` manda usar. Si añades un tipo de fichero nuevo, no hay nada que tocar.
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
