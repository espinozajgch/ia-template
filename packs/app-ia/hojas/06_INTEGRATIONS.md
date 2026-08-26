<!-- ejemplo-rellenado -->
> ## ⚠️ ESTO ES UN EJEMPLO YA RELLENADO, DE OTRO PROYECTO
>
> Lo que hay debajo son las respuestas de **futbot-v2** — un bot de narración deportiva en Discord—, no las de este
> proyecto. Se instala así a propósito: **una hoja bien rellenada enseña qué nivel de
> detalle hace falta**, y una plantilla vacía no enseña nada.
>
> **Reemplázalo antes de que ningún agente lo lea como si fuera cierto aquí.** Una hoja
> de otro proyecto no es contexto neutro: es contexto FALSO con formato de verdad, y se
> obedece igual que el bueno. Los modelos, las rutas de fichero y los GAP de abajo son
> de aquel sistema.
>
> Las rutas relativas apuntan a la raíz del proyecto (`../../`) porque esta hoja se
> instala en `agente/sistema/`.

---

# Integrations — Servicios Externos

> Fase B (Blueprint) y **verificado en Fase L (Link) el 2026-07-31**.
> El catálogo operativo con detalle de errores está en [`04_TOOLS.md`](04_TOOLS.md); aquí queda el
> inventario y el estado de credenciales.

---

## Inventario

| Servicio | Tipo | Propósito | Autenticación | Estado |
|---|---|---|---|---|
| **OpenAI** | API REST (SDK oficial) | Redactar todos los mensajes | API Key | **VERIFICADO** |
| **Opta** | HTTP + XML | Fuente de verdad de los hechos | Usuario/contraseña en la URL | **ROTO** (credenciales) |
| **Discord** | SDK (`discord.py`) | Publicar en canales e idiomas | Bot token | **ROTO** (`test` inalcanzable) |
| **Sistema de ficheros** | Local | Calendario, feeds, escudos, Excel, logs, informes | — | **ROTO** (`${BOT_MEDIA}`) |
| **X / Twitter** | — | Publicación resumida | Usuario/contraseña | **INACTIVO** |

---

## OpenAI

| Campo | Valor |
|---|---|
| Endpoint | `https://api.openai.com/v1` |
| Modelo | `gpt-4o-mini` (`OPENAI_MODEL`) |
| Variable | `OPENAI_KEY` |
| Verificador | `tools/verify_openai.py` |
| Estado | **VERIFICADO** — 133 modelos accesibles, modelo disponible |
| Rate limit | No medido. **Sin manejo de 429** en el código |

Es la única integración que falla ruidosamente si falta la credencial:
`OpenAIService.__init__` lanza `ValueError`.

---

## Opta

| Campo | Valor |
|---|---|
| Endpoint | `https://omo.akamai.opta.net` |
| Feeds | `f13`, `f24`, `f70`, `f30`, `f40`, `f9`, `f42` |
| Autenticación | **En la query string**: `?…&user=<user>&psw=<pass>` |
| Variables | `OPTA_USER` / `OPTA_PASS` — **declaradas y jamás leídas** |
| Verificador | `tools/verify_opta.py` |
| Estado | Conectividad **correcta** (F42: 1,15 MB, 380 partidos); credenciales **rotas por diseño** |

### Hallazgo crítico

La credencial está **incrustada 49 veces en 9 ficheros de `code/`, versionados en git**. El README
documenta `OPTA_USER`/`OPTA_PASS`, existen en el `.env`, y `grep -rn "OPTA_USER" code/` no devuelve
nada: **son decorativas**.

Deuda técnica aceptada (Blueprint §7.2), aplazada por decisión del usuario. La rotación con el
proveedor sigue pendiente.

**Único servicio con reintentos:** 30 s si es *timeout*, 60 s si es excepción. El patrón que el
resto debería seguir.

---

## Discord

| Campo | Valor |
|---|---|
| SDK | `discord.py` 2.3.2 |
| Autenticación | Bot token, **por argumento de línea de órdenes** (`--discord_token`) |
| Verificador | `tools/verify_discord.py` — **solo lectura, no publica nunca** |
| Estado | Token válido (`Futbot-en-v2`); **403 en los 3 canales de `test`**, acceso en los 3 de `official` |

### Hallazgo operativo

**El entorno seguro es el que está roto.** `test` es el destino por defecto y la red de seguridad
de R2; hoy no funciona, y `official` —el público— sí. El incentivo bajo presión empuja al canal
equivocado. Blueprint §7.1.7. **No está cubierto por el aplazamiento de la deuda de secretos.**

### Fuga del token

El token llega por `argv` (legible con `ps aux`), se vuelca al log del partido
([`main.py:104`](../../code/main.py#L104)), se registra otra vez en `set_env_variable`, y **se escribe
en el fichero `.env`**. Cuatro caminos para el mismo secreto. Blueprint §7.1.1 y §7.1.4.

---

## Sistema de ficheros

No es un detalle de implementación: es una integración con su propio modo de fallo, y falla
**en tiempo de partido**.

| Recurso | Variable | Estado |
|---|---|---|
| Calendario | `CALENDAR_PATH` | OK — 382 líneas para 23/2025 |
| Feeds Opta | `DATA_PATH/<version>/opta` | OK |
| Escudos | `MEDIA_PATH/<version>/teams` | **Vacío en local** |
| Publicidad · contenido | `advertising/add.xlsx` · `custom/custom.xlsx` | OK |
| Informes | `REPORT_BASE_PATH` · `SUMMARY_PATH` | OK |
| Logos y fuente del informe | `ASSETS_PATH` | OK |

**Fallo abierto:** `${BOT_MEDIA}` no está definida y `python-dotenv` la sustituye por cadena vacía
en silencio.

**Aviso estructural:** el `.env` **no es configuración estable**. `set_env_variable` lo reescribe
en cada ejecución y con ruta relativa: lanzar desde `code/` escribe en `code/.env`. Deuda D10.

---

## X / Twitter — inactivo

Import comentado ([`main.py:27`](../../code/main.py#L27)), las 7 llamadas a `manage_tweets`
comentadas, y `python-twitter` comentado en `requirements.txt`. Sigue vivo un prompt `twitter` que
nada invoca. Decidir si se recupera o se retira.

---

## Verificación

```bash
python3 tools/verify_all.py     # los cuatro, desde la raíz del repo
```

**3 de 4 en rojo.** El protocolo prohíbe construir lógica sobre un Link roto. Los tres fallos son
de configuración y credenciales: se corrigen sin tocar `main.py`.
