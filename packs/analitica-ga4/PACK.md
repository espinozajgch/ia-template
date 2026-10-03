# Pack · analitica-ga4

**Se activa si:** el producto tiene una propiedad de Google Analytics 4 y quieres que el
agente responda con datos reales —«¿cuántos llegaron al pago la semana pasada?»— en vez de
suponerlos.

**Sale de** el servidor MCP oficial de Google Analytics,
[googleanalytics/google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp)
(Apache 2.0, paquete `analytics-mcp` en PyPI). El pack no reimplementa nada: lo declara,
lo fija a una versión, explica cómo darle credenciales sin meterlas en el repositorio y pone
las reglas para usarlo bien.

---

## Por qué este pack existe

Un agente que decide sobre producto sin datos opina. Con este servidor puede preguntar a GA4
directamente, en sólo lectura, y citar la cifra con su rango de fechas.

Va como pack y **no** en el `.mcp.json` del núcleo por lo que dice ese mismo fichero: un MCP
declarado y no usado gasta contexto en cada arranque. Son nueve herramientas que sólo
sirven a quien tiene GA4.

---

## Qué trae

| Fichero | Qué es |
|---|---|
| `mcp.json` | el servidor, fijado a `analytics-mcp==0.7.0`. `instalar.sh` lo **fusiona** en el `.mcp.json` del proyecto, sin pisar lo que ya haya |
| `rule.mdc` | regla de Cursor por glob, para el código que instrumenta la analítica |

Herramientas que expone la 0.7.0, comprobadas con `tools/list` el 2026-10-03 (el README del
repositorio sólo nombra siete):

| Herramienta | Para qué |
|---|---|
| `get_account_summaries` | cuentas y propiedades a las que tienen acceso las credenciales. **Empezar siempre aquí** |
| `get_property_details` | detalle de una propiedad (zona horaria, moneda…) |
| `get_custom_dimensions_and_metrics` | dimensiones y métricas personalizadas de la propiedad |
| `run_report` | el informe normal: dimensiones, métricas, filtros, rango de fechas |
| `run_realtime_report` | lo que pasa ahora (últimos 30 minutos) |
| `run_funnel_report` | embudos: cuántos pasan de un paso al siguiente |
| `run_conversions_report` | conversiones (eventos clave) |
| `list_property_annotations` | anotaciones de la propiedad: despliegues, campañas, incidencias |
| `list_google_ads_links` | vínculos con Google Ads |

**Sólo lectura.** Usa el alcance `analytics.readonly`: no puede crear, cambiar ni borrar
nada en GA4. El proyecto lo marca como *experimental*.

---

## Puesta en marcha (una vez por máquina)

Requisitos: Python 3.10+ y `pipx` (`brew install pipx`).

1. En un proyecto de Google Cloud, **habilitar** la *Google Analytics Admin API* y la
   *Google Analytics Data API*.
2. Crear un cliente OAuth de **escritorio** y descargar su JSON. Va FUERA del repositorio
   (`~/.config/gcloud/` o similar), nunca dentro.
3. Generar las credenciales por defecto (ADC) con el alcance de sólo lectura:

   ```bash
   gcloud auth application-default login \
     --scopes https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform \
     --client-id-file=/ruta/fuera/del/repo/cliente-oauth.json
   ```

   El comando imprime la ruta del fichero de credenciales que ha guardado.
4. Exportar en el perfil del shell (no en el repositorio):

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json"
   export GOOGLE_PROJECT_ID="tu-proyecto-de-cloud"
   ```

   El `mcp.json` del pack las referencia como `${GOOGLE_APPLICATION_CREDENTIALS}` y
   `${GOOGLE_PROJECT_ID}`: Claude Code las expande al arrancar. Así el `.mcp.json` se puede
   versionar sin llevar ninguna ruta ni identificador personal.
5. Reiniciar el cliente y comprobar con `/mcp` (Claude Code) que `google-analytics` aparece
   conectado. La primera llamada útil es `get_account_summaries`.

**Gemini CLI** no lee `.mcp.json`: el mismo bloque va en `~/.gemini/settings.json` bajo
`mcpServers`, con las rutas escritas (fuera del repositorio).

Si las variables no están definidas, el servidor arranca pero cada llamada falla por falta de
credenciales. No rompe nada más.

---

## Reglas de uso

1. **Primero `get_account_summaries`, después el resto.** El identificador de propiedad
   (`properties/123456789`) no se adivina. Cuando se conozca, se apunta en
   `knowledge/wiki/project.md` para no volver a buscarlo.
2. **Toda cifra va con su rango de fechas y su propiedad.** «1.240 usuarios» no dice nada;
   «1.240 usuarios activos del 2026-09-01 al 2026-09-30 en la propiedad X» sí.
3. **Las fechas, en la zona horaria de la propiedad** (`get_property_details`), no en la de la
   máquina. Un día de GA4 en Caracas no es un día UTC.
4. **GA4 muestrea y umbraliza.** Con poco tráfico o rangos largos, las cifras pueden ser
   aproximadas o venir recortadas por privacidad. Si el informe lo indica, se dice. No se
   presenta como exacto.
5. **No se cruzan datos de GA4 con datos personales del producto.** GA4 da agregados; unirlos
   con la base de usuarios para identificar personas es lo que el pack `datos-personales`
   prohíbe hacer sin base legal.
6. **Nada de esto sale del chat sin revisar.** Un informe que se va a compartir pasa por el
   pack `auditoria-informes`: fuente, fecha de extracción y limitaciones a la vista.

---

## Seguridad

- Las credenciales **nunca** entran en el repositorio: ni el JSON del cliente OAuth ni el de
  ADC. Un `GOOGLE_APPLICATION_CREDENTIALS` con ruta escrita dentro de `.mcp.json` es un fallo,
  aunque la ruta esté fuera del repo, porque delata usuario y estructura de la máquina.
- La versión va **fijada** (`--spec analytics-mcp==0.7.0`). `pipx run analytics-mcp` a secas
  ejecuta la última publicada en cada arranque: cualquier versión nueva entra sin revisión,
  con acceso a tus credenciales de Google.
- Para subir de versión: leer el registro de cambios, probar `tools/list` y actualizar este
  PACK.md y `mcp.json` en el mismo commit.

---

## Checklist

- [ ] APIs Admin y Data habilitadas; ADC generado con `analytics.readonly`
- [ ] Credenciales fuera del repositorio; `.mcp.json` sólo con `${VARIABLES}`
- [ ] `/mcp` muestra `google-analytics` conectado y `get_account_summaries` responde
- [ ] La propiedad del proyecto, apuntada en `knowledge/wiki/project.md`
- [ ] La versión de `analytics-mcp` sigue fijada
