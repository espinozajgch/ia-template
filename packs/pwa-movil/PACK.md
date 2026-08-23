# Pack · pwa-movil

**Se activa si:** hay aplicación instalable, service worker, o uso móvil real y frecuente.

**Prompts:** `PWA_PROMPT.md` · más el pack `frontend-web`

---

## Reglas

### El service worker es el mayor riesgo de la aplicación

Un service worker mal configurado sirve una versión antigua **para siempre** y el usuario
no tiene forma de arreglarlo. Estrategia de caché explícita por tipo de recurso, versionado
del caché en cada despliegue, y un camino de actualización que el usuario pueda forzar.

### Nunca se cachea la API por defecto

Cachear respuestas de la API sin pensarlo produce datos viejos que parecen actuales. Se
decide recurso por recurso, y lo que se cachea se muestra marcado como tal.

### Sin conexión: decidir qué pasa, no dejarlo al azar

Qué se puede hacer sin red, qué se encola, qué se rechaza con un mensaje claro. Una cola de
acciones pendientes necesita idempotencia en el servidor: se van a reenviar.

### El área táctil mínima es real

44 × 44 px. Un botón que en el ratón funciona, con el pulgar falla, y el usuario no sabe
por qué.

### El teclado virtual tapa media pantalla

Los formularios se prueban **con el teclado abierto**, a 320 × 350. Es donde se descubre
que el botón de enviar quedó debajo.

### El presupuesto de rendimiento es un número

Peso del paquete inicial y tiempo hasta ser interactivo, medidos en red móvil simulada,
con un umbral que la puerta comprueba. Sin número, el rendimiento se degrada solo.

---

## Las dos herramientas del pack

```bash
node agente/packs/pwa-movil/presupuesto.mjs paquete   # peso, sin navegador, instantáneo
node agente/packs/pwa-movil/presupuesto.mjs fijar     # fija el presupuesto con lo medido
node agente/packs/pwa-movil/presupuesto.mjs medir     # compara, y rompe la puerta si se pasa
```

Y `e2e/pwa.spec.ts` con `playwright.movil.config.ts`:

| Comprueba | Por qué |
|---|---|
| manifiesto servido con `application/manifest+json` | servido como HTML, el navegador lo ignora en silencio |
| `id`, `start_url`, `scope`, `display`, iconos | sin ellos no hay instalación |
| un icono de 512 px **y uno `maskable`** | sin el maskable, Android recorta el logotipo a su gusto |
| **todos** los iconos y capturas existen | uno que devuelve 404 hace que el navegador descarte la instalación sin decir por qué |
| service worker registrado **y activo** | registrado no es lo mismo que controlando |
| **ninguna respuesta de `/api` cacheada** | es la regla de arriba, comprobada |
| responde sin conexión | y no con el error del navegador |
| el caché lleva versión en el nombre | sin ella no se puede invalidar al desplegar, y el usuario se queda en la versión vieja **sin forma de arreglarlo** |

> **La configuración construye en producción** (`build && preview`), no el servidor de
> desarrollo. En desarrollo el service worker **no se registra** en la mayoría de
> configuraciones: toda la suite pasaría sin probar nada, verde y con la aplicación
> instalada rota. Es más lento; es la única forma de que signifique algo.

> **El umbral arranca en lo medido**, con margen para el ruido. Un listón por encima de lo
> alcanzado convierte la puerta en un adorno que todo el mundo aprende a ignorar.

## La trampa de medir en una sola pantalla

En un proyecto real la comprobación de área táctil corría **solo en la pantalla de acceso**,
y por eso pasaron seis controles —de 36, 38, 38, 40, 42 y 42 píxeles— repartidos por las
otras dieciséis. El proyecto declaraba 44 px y lo exigía **en una pantalla de diecisiete**.

`mobile-smoke.spec.ts` del pack `frontend-web` recorre la matriz completa de pantallas ×
anchos. Y mide solo **después** de que la pantalla haya pintado algo suyo: un esqueleto
vacío da cero controles pequeños y un aprobado que no significa nada — y esperar a que la
red se calme no basta, porque puede estar quieta con la pantalla en blanco.

## Checklist

- [ ] Estrategia de caché explícita por tipo de recurso
- [ ] Caché versionado; el despliegue invalida el anterior
- [ ] Camino de actualización visible para el usuario
- [ ] Comportamiento sin conexión decidido y probado, con reenvío idempotente
- [ ] Áreas táctiles de 44 px, medidas en **todas** las pantallas y anchos, no en una
- [ ] Formularios probados con el teclado virtual abierto, a 320 px
- [ ] Presupuesto de rendimiento con número, comprobado en la puerta
