# Prompt maestro · Implementación de PWA (app instalable)

## Propósito

Convertir cualquier SPA/web en una **PWA instalable** ("Add to Home Screen" / botón
Instalar) con app-shell offline, de forma **segura** (sin cachear respuestas autenticadas)
y **reproducible**, sin presuponer el stack, el bundler ni el servidor. Portable entre
proyectos: el prompt se adapta al repo, no al revés.

## Cómo usarlo

Pegá el bloque de abajo en el asistente de código, ajustando los `PARÁMETROS`. Si un
parámetro no aplica, el asistente lo infiere inspeccionando el repo (Fase 0) y lo declara.

---

## Prompt

```text
Actúa como Frontend/Platform Engineer especializado en Progressive Web Apps.

PARÁMETROS (completá lo que sepas; el resto se infiere en Fase 0):
APP_NAME=<nombre visible de la app>
SHORT_NAME=<≤12 chars para el ícono del launcher>
DESCRIPTION=<1 frase>
THEME_COLOR=<hex, p. ej. #f59e0b>          # barra de estado / tema del SO
BACKGROUND_COLOR=<hex, p. ej. #ffffff>      # splash de arranque
LANG=<es|en|…>
ICON_SOURCE=<ruta a un logo cuadrado ≥512px, o "generar">
BUNDLER=<vite|webpack|next|astro|otro|ninguno>
SERVER=<nginx|apache|caddy|node-express|vercel|netlify|cloudflare|otro>
OFFLINE_SCOPE=<app-shell|app-shell+datos>   # por defecto app-shell
BACKEND_PREFIXES=<lista de prefijos que el SW NO debe interceptar: /api, /uploads, …>

OBJETIVO:
- app instalable en desktop (Chrome/Edge) y móvil (Android/iOS Safari "Add to Home Screen");
- app-shell offline (el cascarón carga sin red; los datos siguen requiriendo red salvo que
  OFFLINE_SCOPE lo pida);
- actualizaciones que llegan al instante (autoUpdate) sin que el usuario reinstale;
- SEGURA: el service worker NUNCA cachea respuestas autenticadas ni el backend.

PRINCIPIOS (no negociables):
- PRECACHE-ONLY por defecto. El SW precachea SOLO el app-shell estático (js/css/html/fuentes).
  NADA de `runtimeCaching` de respuestas de API por defecto: cachear una respuesta autenticada
  la deja legible offline para cualquiera con el dispositivo, y puede servir datos de un
  usuario a otro tras un cambio de sesión. Si OFFLINE_SCOPE pide datos offline, hacerlo
  explícito, por-endpoint, con NetworkFirst + expiración corta, y NUNCA para respuestas con
  datos sensibles/por-usuario.
- El SW NO intercepta el backend. Excluir BACKEND_PREFIXES del navigateFallback (denylist).
- El registro del SW debe respetar la CSP del sitio (ver Fase 3).
- En DESARROLLO el SW va DESHABILITADO (evita cachés fantasma que enloquecen el dev-loop).
  La PWA se prueba desde un BUILD DE PRODUCCIÓN servido localmente.
- Idempotencia: re-ejecutar cualquier paso no debe romper ni duplicar nada.

No inventes rutas, íconos, colores ni endpoints: inspeccioná el repo. No toques la config del
servidor de producción sin confirmar (Fase 4 propone; aplicar es decisión del dueño).

FASE 0 · DESCUBRIMIENTO
Detectá y anotá: framework/bundler y su plugin PWA disponible; si ya hay manifest / service
worker / registro; el `index.html` (dónde inyectar `<link rel="manifest">`); la CSP efectiva
(`script-src`, `worker-src`, `connect-src`); si el sitio se sirve por HTTPS (requisito duro,
salvo localhost); el servidor real y cómo sirve estáticos; los prefijos del backend/uploads.
Entregá un mini-inventario antes de tocar nada.

FASE 1 · MANIFEST
Generá/ajustá el web app manifest con los campos que exige la instalabilidad:
- name, short_name, description, lang
- start_url (normalmente "/"), scope
- display: "standalone" (o "minimal-ui")
- theme_color, background_color
- id (estable, p. ej. "/") — evita que el navegador trate re-deploys como apps distintas
- icons: AL MENOS 192×192 y 512×512 con purpose "any", MÁS un 512×512 purpose "maskable"
- screenshots (form_factor "wide" + "narrow") → habilitan el diálogo de instalación RICO
Enlazá el manifest en el `<head>`: `<link rel="manifest" href="/manifest.webmanifest">`.

FASE 2 · ÍCONOS
Desde ICON_SOURCE (logo cuadrado): emití 192, 512 "any" y un 512 "maskable" con PADDING
(safe zone ~20%) sobre BACKGROUND/THEME sólido, para que Android no recorte el logo dentro
del círculo. Añadí apple-touch-icon.png (180×180) para iOS. Verificá que todos se sirvan 200.

FASE 3 · SERVICE WORKER + REGISTRO
Usá el generador del bundler (para Vite: `vite-plugin-pwa` con Workbox). Config SEGURA:
- registerType: 'autoUpdate' (Workbox reemplaza el SW viejo al detectar uno nuevo).
- injectRegister: 'script' (registro por script EXTERNO same-origin, NO inline) si la CSP
  tiene `script-src 'self'` sin `'unsafe-inline'`. Asegurate de `worker-src 'self' blob:`.
- Precache SOLO el app-shell: globPatterns ['**/*.{js,css,html,woff2}'].
- globIgnores de los vendors PESADOS cargados lazy (pdf/xlsx/ocr/…) → install liviano y no
  se rompe el lazy-load.
- navigateFallback: 'index.html'  (SPA), con
  navigateFallbackDenylist: [BACKEND_PREFIXES…]  → el SW NO sirve index.html para /api, /uploads, etc.
- cleanupOutdatedCaches: true.
- maximumFileSizeToCacheInBytes acorde al shell.
- devOptions.enabled: false (SW OFF en dev).
NO agregues runtimeCaching de API salvo que OFFLINE_SCOPE lo exija (y ahí, con las cautelas
del principio de arriba).

FASE 4 · SERVIDOR (el pitfall que rompe la instalación en prod)
El build produce el manifest y el sw.js correctos, PERO el navegador solo instala si el
SERVIDOR los sirve bien. Verificá y corregí, según SERVER:

1) Content-Type del manifest (LA CAUSA #1 de "no aparece Instalar"):
   `manifest.webmanifest` DEBE servirse como `application/manifest+json`. Muchos servidores no
   conocen la extensión `.webmanifest` y la sirven como `application/octet-stream`; con
   `X-Content-Type-Options: nosniff` el navegador RECHAZA el manifest en silencio → sin botón
   de instalar, aunque el manifest y los íconos sean válidos.
   - Nginx: agregá el MIME (aditivo, los bloques `types` de http{} se mergean):
       types { application/manifest+json  webmanifest; }
     en un `conf.d/*.conf`. (Evitá `default_type` global.)
   - Apache: `AddType application/manifest+json .webmanifest`
   - Caddy/Express/hosts estáticos: configurá el header/tipo para `.webmanifest`.
   VERIFICÁ POR LA RED: `curl -sI https://<host>/manifest.webmanifest | grep -i content-type`
   → debe decir `application/manifest+json`.
2) Cache headers (para que las ACTUALIZACIONES lleguen al instante):
   `sw.js`, el registrador y `manifest.webmanifest` → `Cache-Control: no-cache, must-revalidate`
   (si no, un sw.js cacheado 1 año nunca actualiza la PWA). Los assets HASHEADOS
   (js/css/img/fuentes con hash en el nombre) → `immutable, max-age=1y`. `index.html` → no-cache.
   Ojo con reglas regex de estáticos: `sw.js` termina en `.js` y podría caer en la regla
   `immutable` — un `location =` exacto (o equivalente) debe ganarle.
3) HTTPS obligatorio (salvo localhost). Cualquier cambio de servidor: validar la config y
   recargar sin downtime (p. ej. `nginx -t && systemctl reload nginx`).

FASE 5 · VERIFICACIÓN
- Build de PRODUCCIÓN + servirlo local (p. ej. `vite preview`) o el entorno real HTTPS.
- DevTools → Application → Manifest: sin errores, íconos OK, "Installability" en verde.
- DevTools → Application → Service Workers: registrado, activo, scope correcto.
- Lighthouse → categoría PWA / "Installable": todos los checks en verde.
- `curl -sI` del manifest → `application/manifest+json`; de sw.js → `application/javascript`.
- Aparece el botón "Instalar" (barra de direcciones desktop) / "Add to Home Screen" (móvil).
- Prueba de UPDATE: cambiá algo, re-deploy, recargá → la versión nueva se aplica sin reinstalar.
- Prueba OFFLINE: con red cortada, el app-shell carga (los datos, según OFFLINE_SCOPE).

CHECKLIST DE INSTALABILIDAD (todo debe cumplirse):
[ ] HTTPS (o localhost)
[ ] `<link rel="manifest">` en el HTML servido
[ ] manifest servido como application/manifest+json (¡el pitfall!)
[ ] manifest con name, short_name, start_url, display standalone, theme/background_color
[ ] íconos 192 + 512 "any" + 512 "maskable", todos 200
[ ] service worker registrado con handler de fetch (el precache lo aporta)
[ ] SW OFF en dev; probado desde build de prod
[ ] sw.js / manifest con no-cache (updates); assets hasheados immutable
[ ] el SW NO intercepta BACKEND_PREFIXES (denylist) ni cachea respuestas autenticadas

GOTCHAS / LECCIONES (por qué falla en la práctica):
- **MIME del manifest**: octet-stream + nosniff = rechazo silencioso. Es la causa #1 de
  "todo se ve bien pero no aparece Instalar". Verificar SIEMPRE con `curl -I` en el host real,
  no confiar en que el build lo generó bien (el build no controla cómo lo sirve el servidor).
- **Config del servidor separada del deploy**: si el deploy solo publica estáticos y no toca
  el servidor (Nginx manual, etc.), los headers/MIME de la PWA hay que aplicarlos aparte —
  y son fáciles de olvidar. Versionalos (snippet + script idempotente) y documentalos.
- **Precache-only por seguridad**: cachear respuestas de API es una fuga (datos legibles
  offline, cruce entre sesiones). Por defecto, el SW no toca el backend.
- **SW en dev = dolor**: cachés fantasma que sirven código viejo. Deshabilitalo en dev; probá
  la PWA con `vite preview`/build de prod.
- **CSP y el registro**: con `script-src 'self'` el registro del SW debe ser un script externo
  (`injectRegister: 'script'`), no inline; y `worker-src 'self' blob:` debe permitir el sw.js.
- **Maskable sin padding**: Android recorta el logo dentro del círculo → poné safe zone (~20%)
  sobre fondo sólido, en un ícono `purpose: "maskable"` aparte del `"any"`.
- **Diálogo de instalación pobre**: sin `screenshots` (wide + narrow) el prompt es mínimo;
  con ellos, el navegador muestra el diálogo rico.
- **Updates que no llegan**: sw.js cacheado por el servidor → la PWA queda pegada a una versión
  vieja. no-cache en sw.js/registrador/manifest.

DEFINICIÓN DE TERMINADO:
- Lighthouse "Installable" en verde y el botón de instalar aparece en el host real.
- manifest servido como application/manifest+json (verificado por red).
- SW precache-only, sin interceptar el backend, OFF en dev.
- Config de servidor versionada + documentada (no un cambio manual perdido).
- Update propaga sin reinstalar; app-shell carga offline.
```

---

## Config de referencia (Vite + vite-plugin-pwa) — probada en producción

Plantilla del plugin (genérica; reemplazá `APP_NAME`, colores, íconos y **tus** prefijos de
backend en el denylist):

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'script',            // registro externo same-origin (CSP script-src 'self')
  includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
  devOptions: { enabled: false },      // SW OFF en dev
  manifest: {
    id: '/',
    name: 'APP_NAME',
    short_name: 'APP',
    description: '…',
    lang: 'es',
    theme_color: '#f59e0b',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, // con padding
    ],
    screenshots: [
      { src: 'screenshot-wide.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide' },
      { src: 'screenshot-narrow.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2}'],   // solo app-shell
    globIgnores: ['**/xlsx-*.js', '**/pdf-*.js', '**/pdf.worker*.{js,mjs}', '**/tesseract*/**', '**/html2pdf*.js'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api/, /^\/uploads/],  // ← reemplazá por TUS prefijos de backend
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    // SIN runtimeCaching de API por defecto (precache-only, seguro).
  },
})
```

Fix de servidor imprescindible (el pitfall) — ejemplos por servidor:

```nginx
# Nginx: /etc/nginx/conf.d/webmanifest-mime.conf  (aditivo, no rompe el resto del mime map)
types { application/manifest+json  webmanifest; }
```
```apache
# Apache
AddType application/manifest+json .webmanifest
```
Verificación única e infalible: `curl -sI https://<host>/manifest.webmanifest` → debe decir
`Content-Type: application/manifest+json`. Si dice `application/octet-stream`, la PWA NO
instala aunque todo lo demás esté perfecto.
```
