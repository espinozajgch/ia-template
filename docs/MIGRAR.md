# Migrar un proyecto al kit

> El kit **no borra nada**. El instalador se salta todo fichero que ya exista y lo reporta
> al final. Migrar es, en la práctica, instalar encima y luego decidir qué se consolida.

---

## Proyecto por proyecto, en 20 minutos

### 1 · Instalar encima

```bash
~/ia-template/instalar.sh . <packs que apliquen>
```

Nada de lo que ya estaba se toca. Al final aparece la lista de lo saltado: **esos son los
ficheros que hay que decidir**.

### 2 · Consolidar el contexto en `AGENTS.md`

El paso que da casi todo el valor. Hoy el mismo contenido está repetido en `CLAUDE.md`,
`GEMINI.md`, `.windsurfrules`, `.cursor/rules/core.mdc` y `copilot-instructions.md`.

1. Coge el **más completo** de los cinco — normalmente `CLAUDE.md` — y llévalo a
   `AGENTS.md` con la estructura de la plantilla (`~/ia-template/nucleo/AGENTS.md`).
2. Revisa los otros cuatro y sube lo que **solo** esté ahí. Suele haber una o dos reglas
   que se añadieron a uno y nunca a los demás.
3. Sustituye los cinco por los punteros del kit:
   ```bash
   ~/ia-template/instalar.sh . --force   # solo si ya salvaste el contenido en AGENTS.md
   ```
4. Comprueba que `AGENTS.md` **no pasa de 250 líneas**. Lo que sobre baja a `knowledge/wiki/`.

> El `CLAUDE.md` de ppsportmanagementarg tiene 677 líneas. Ese es exactamente el caso: lo
> que allí está en el archivo de contexto —anti-patrones con antes/después, la tabla de
> ratchets, el detalle del E2E— pertenece a `knowledge/wiki/anti-patterns.md` y a
> `agente/protocolo/02_PUERTA_DE_CALIDAD.md`, y `AGENTS.md` solo debe **enlazarlo**.

### 3 · Podar los prompts que no aplican

```bash
ls llm-wiki/           # lo que hay hoy
ls agente/prompts/     # lo que el pack instalado necesita de verdad
```

Lo que esté en `llm-wiki/` y no en `agente/prompts/` casi siempre llegó por copiar el kit
entero. Un prompt de tácticas de fútbol en un proyecto clínico no lo lee nadie, pero ocupa.

Si dudas de alguno: bórralo. Está en `~/ia-template/prompts/`, entero, y vuelve con una
línea.

### 4 · Levantar los IDs

Los proyectos que ya tienen `anti-patterns.md` o `architectural-debt.md` (cowork-app,
ppsportmanagementarg) ya están. Los demás:

- Abre el último informe de auditoría del proyecto.
- Los hallazgos que se **repiten entre corridas** pasan a `AP-*`.
- Los que se decidió **no** arreglar pasan a `AD-*`, con su **trigger** de reapertura.

Sin este paso, la siguiente auditoría vuelve a descubrir lo mismo.

### 5 · Un comando para la puerta

```bash
agente/tools/puerta.sh          # descubre qué hay y dice si falta el atajo
```

Si dice que no existe un comando único, **crearlo es la primera tarea**. Es la pieza de la
que dependen `verificar` y `avanzar`, y sin ella el resto del kit funciona a medias.

### 6 · Poner el primer ratchet

Uno solo, del problema que más te moleste hoy:

```bash
agente/tools/ratchet.sh baseline colores "grep -rnE '#[0-9a-fA-F]{3,6}' src/"
```

Añádelo al comando de la puerta. A partir de ahí el problema deja de crecer, aunque no lo
arregles todavía. Ese es todo el truco.

---

## Dónde quedó lo anterior

En `~/ia-template/docs/v1-superado/`: las skills `blast-new`, `blast-audit` y
`staff-estimate`, los cinco punteros con contenido duplicado, el README anterior y las hojas
`00_PROJECT_MAP`, `08_ARCHITECTURE`, `09_BLAST_PROTOCOL` y `10_AGENT_RULES`.

No se borró nada: está ahí y además en el historial de git. Si algo de la versión anterior
te resulta mejor que su reemplazo, sácalo de ahí y súbelo al núcleo — es exactamente el
camino de vuelta que el kit necesitaba.

---

## Orden recomendado de migración

| # | Proyecto | Por qué en ese orden |
|---|---|---|
| 1 | **laboratorio** | activo hoy; validas el kit donde más lo vas a usar |
| 2 | **ppsportmanagementarg** | el más maduro: es el que más devuelve al kit al consolidarlo |
| 3 | **cowork-app** | ya tiene `AP-*` y `AD-*`; la migración es casi solo el `AGENTS.md` |
| 4 | **futbot-v2** | pack `bot-automatizacion`; comprueba el modo validación |
| 5 | **hipismo** | quítale los prompts hípicos del núcleo; ya tiene las skills buenas |
| 6 | **APP_DUX · APP_Osasuna** | sin kit: instalación limpia, y prueba de que un proyecto de cero tarda un comando |
| — | el resto | cuando se toquen |

**No migres los trece de golpe.** Migra uno, trabaja una semana con él, y lo que te chirríe
súbelo al kit antes de tocar el segundo. Es exactamente el camino de vuelta que le
faltaba al kit.
