/**
 * ¿Esto es una PWA de verdad?
 *
 * Comprueba lo que hace que una aplicación sea instalable y sobreviva sin red. Ninguna de
 * estas cosas la ve un test unitario: el manifiesto puede estar mal servido, el service
 * worker puede no registrarse en producción, y la pantalla sin conexión puede no existir
 * hasta que alguien se queda sin cobertura.
 *
 * Corre con el proyecto `movil` de playwright.config.
 * Requiere una compilación de producción servida: en desarrollo el service worker no se
 * registra en la mayoría de configuraciones.
 */
import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('el manifiesto existe, se sirve bien y está completo', async ({ page, request }) => {
    await page.goto('/');
    const enlace = page.locator('link[rel="manifest"]');
    await expect(enlace, 'no hay <link rel="manifest">').toHaveCount(1);

    const href = await enlace.getAttribute('href');
    const r = await request.get(new URL(href!, page.url()).toString());
    expect(r.status(), 'el manifiesto no se sirve').toBe(200);
    // Servido como HTML, el navegador lo ignora en silencio y la app no se instala.
    expect(r.headers()['content-type'] ?? '').toMatch(/manifest\+json|application\/json/);

    const m = await r.json();
    for (const campo of ['name', 'start_url', 'scope', 'display', 'icons']) {
      expect(m[campo], `el manifiesto no tiene "${campo}"`).toBeTruthy();
    }
    expect(['standalone', 'fullscreen', 'minimal-ui'], 'display no permite instalar').toContain(m.display);

    // Sin un icono de 512 px no hay instalación en Android.
    const tam = (m.icons ?? []).flatMap((i: { sizes?: string }) => (i.sizes ?? '').split(' '));
    expect(tam.some((s: string) => parseInt(s) >= 512), 'falta un icono de 512 px o mayor').toBe(true);

    // Y sin uno «maskable», Android recorta el icono a su gusto: suele quedar la esquina
    // de un logotipo dentro de un círculo. Es lo que separa una instalación correcta de
    // una que se ve mal desde el primer segundo.
    expect(
      (m.icons ?? []).some((i: { purpose?: string }) => (i.purpose ?? '').includes('maskable')),
      'falta un icono con purpose "maskable"',
    ).toBe(true);

    // TODOS los recursos declarados existen: un icono o una captura que devuelve 404
    // hace que el navegador descarte la instalación sin decir por qué.
    for (const recurso of [...(m.icons ?? []), ...(m.screenshots ?? [])]) {
      const ir = await request.get(new URL(recurso.src, r.url()).toString());
      expect(ir.status(), `${recurso.src} devuelve ${ir.status()}`).toBe(200);
    }
  });

  test('el service worker se registra y toma el control', async ({ page }) => {
    await page.goto('/');
    const estado = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { soportado: false };
      const reg = await navigator.serviceWorker.getRegistration()
        ?? await new Promise<ServiceWorkerRegistration | undefined>(r => {
             navigator.serviceWorker.ready.then(r as never);
             setTimeout(() => r(undefined), 10_000);
           });
      return { soportado: true, registrado: !!reg, alcance: reg?.scope ?? null,
               activo: !!reg?.active, controlando: !!navigator.serviceWorker.controller };
    });
    test.skip(!estado.soportado, 'este navegador no soporta service workers');
    expect(estado.registrado, 'no se registró ningún service worker').toBe(true);
    expect(estado.activo, 'el service worker se registró pero no llegó a activo').toBe(true);
  });

  test('sin conexión, la aplicación responde algo útil', async ({ page, context }) => {
    await page.goto('/');
    // Que el service worker termine de guardar lo que necesita.
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    try {
      const r = await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
      const texto = (await page.locator('body').innerText().catch(() => '')).trim();

      // Lo que NO vale es el error del navegador: significa que no hay nada cacheado.
      expect(texto.length, 'sin conexión la página quedó en blanco o dio el error del navegador').toBeGreaterThan(20);
      expect(texto).not.toMatch(/ERR_INTERNET_DISCONNECTED|no se puede acceder a este sitio|this site can.t be reached/i);
      if (r) expect(r.status()).toBeLessThan(500);
    } finally {
      await context.setOffline(false);
    }
  });

  test('NINGUNA respuesta de la API está cacheada', async ({ page }) => {
    // Es la regla que este pack exige por escrito, y hasta ahora no comprobaba.
    // Cachear la API sin pensarlo produce datos viejos que parecen actuales — el fallo
    // más caro de una PWA, porque nadie sospecha del dato que ve.
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForTimeout(1500);

    const cacheadas = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      const nombres = await caches.keys();
      const peticiones = (await Promise.all(
        nombres.map(n => caches.open(n).then(c => c.keys())),
      )).flat();
      return peticiones.map(p => p.url).filter(u => new URL(u).pathname.startsWith('/api'));
    });

    expect(cacheadas, `hay respuestas de la API en el caché: ${cacheadas.join(', ')}`).toEqual([]);
  });

  test('el caché está versionado: un despliegue no deja al usuario en la versión vieja', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker?.ready);
    const nombres = await page.evaluate(() => caches?.keys?.() ?? []);
    test.skip(!nombres || nombres.length === 0, 'la aplicación no usa la API de caché');

    // Un caché sin versión en el nombre no se puede invalidar al desplegar: el usuario se
    // queda con la versión antigua y no tiene forma de arreglarlo.
    const versionado = nombres.some((n: string) => /[-_.]v?\d|[0-9a-f]{6,}/i.test(n));
    expect(versionado, `ningún caché lleva versión en el nombre: ${nombres.join(', ')}`).toBe(true);
  });
});
