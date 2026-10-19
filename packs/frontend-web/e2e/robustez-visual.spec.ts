/**
 * Lo que `wcag.spec.ts` (axe) y `mobile-smoke.spec.ts` no miden.
 *
 * axe atrapa contraste, nombre accesible y jerarquía de encabezados. `mobile-smoke` atrapa
 * desbordamiento y área táctil. Ninguno de los dos ve estas cuatro formas de romperse —
 * medibles, con DOM ya pintado, y que no son «criterio visual»: texto que se derrama fuera
 * de su caja, una hoja de estilo que se descarga pero no llega a aplicarse, un botón de
 * enviar que cae fuera de la pantalla, o una tabla que exige scroll lateral por debajo de
 * `md`. Las cuatro salieron de una auditoría móvil real donde cada una pasó inadvertida
 * una temporada porque ninguna otra sonda las cubría.
 *
 * Deliberadamente NO se repiten aquí: contraste, nombre accesible, salto de encabezado —
 * ya los corre `wcag.spec.ts` con axe, y duplicarlos solo daría dos sitios que mantener
 * sincronizados.
 */
import { test, expect, conSesion } from './fixtures/api';
import { RUTAS } from './rutas';

const ANCHOS = [320, 390, 768];

for (const ruta of RUTAS) {
  for (const ancho of ANCHOS) {
    test(`${ruta.nombre} a ${ancho} px: sin texto derramado ni hojas sin aplicar`, async ({ page }) => {
      if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.goto(ruta.path);
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 });

      const hallazgo = await page.evaluate(() => {
        // --- Texto que se sale de su caja -------------------------------------
        // Un rótulo con `white-space: nowrap` dentro de una caja flexible que sí
        // puede encoger no se parte ni se recorta: se derrama fuera de su caja y
        // lo tapa el elemento siguiente, que sí tiene fondo. Desde fuera parece un
        // texto cortado a mitad de palabra, y ninguna otra sonda lo ve — el
        // documento no desborda y el contraste del texto es correcto.
        const derramado: { texto: string; clase: string }[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
          const propio = Array.from(el.childNodes)
            .filter((n) => n.nodeType === 3)
            .map((n) => (n.textContent ?? '').trim())
            .join(' ').trim();
          if (!propio) continue;
          const style = getComputedStyle(el);
          if (!style.whiteSpace.includes('nowrap') || style.visibility === 'hidden') continue;
          if (el.scrollWidth <= el.clientWidth + 1) continue;
          derramado.push({ texto: propio.slice(0, 40), clase: (el.getAttribute('class') ?? '').slice(0, 90) });
        }

        // --- Hojas de estilo que se descargan y no pintan nada ----------------
        // Basta con que quede en `media="print"`, o que la política de seguridad
        // bloquee lo que debía devolverla a `all`: la página sale con los estilos
        // del navegador y ninguna otra sonda lo dice con claridad, porque el
        // contraste y el desbordamiento se disparan a la vez y el diagnóstico se
        // pierde entre el ruido.
        const hojasSinAplicar: { href: string; medio: string }[] = [];
        for (const hoja of Array.from(document.styleSheets)) {
          let reglas = 0;
          try { reglas = hoja.cssRules.length; } catch { reglas = -1; }
          const medio = hoja.media?.mediaText ?? '';
          if (medio === 'print' || reglas === 0) hojasSinAplicar.push({ href: hoja.href ?? '(en línea)', medio });
        }

        return { derramado: derramado.slice(0, 5), hojasSinAplicar };
      });

      expect(hallazgo.derramado, `texto derramado en ${ruta.path} a ${ancho}px: ${JSON.stringify(hallazgo.derramado)}`).toEqual([]);
      expect(hallazgo.hojasSinAplicar, `hoja de estilo sin aplicar en ${ruta.path}: ${JSON.stringify(hallazgo.hojasSinAplicar)}`).toEqual([]);
    });
  }
}

for (const ruta of RUTAS) {
  test(`${ruta.nombre}: la acción principal no cae fuera de la pantalla`, async ({ page }) => {
    if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(ruta.path);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 });

    // La acción que remata un formulario corto tiene que verse sin desplazarse: si
    // queda por debajo del pliegue en una pantalla que parece completa, se lee como
    // que no hay nada más que hacer.
    const boton = page.locator('form button[type="submit"]').first();
    if (await boton.count() === 0) { test.skip(true, 'no hay formulario aquí'); return; }
    const caeFueraDePantalla = await boton.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.height > 0 && box.bottom + window.scrollY > window.innerHeight;
    });
    expect(caeFueraDePantalla, `${ruta.path}: el botón de enviar queda fuera de la primera pantalla`).toBe(false);
  });
}

for (const ruta of RUTAS) {
  test(`${ruta.nombre} a 375 px: ninguna tabla exige scroll lateral`, async ({ page }) => {
    if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(ruta.path);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 });

    // Por debajo de `md` un listado tiene que leerse entero sin arrastrar: es lo que
    // separa «tabla contenida en su propio scroll, declarado» de «media tabla
    // invisible, con la columna de acciones fuera de la pantalla». No se busca una
    // clase concreta: cualquier contenedor con scroll horizontal propio que
    // encierre una tabla y no lo declare con `aria-label` cuenta.
    const anchas = await page.evaluate(() => {
      const hallados: { visible: number; contenido: number }[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        if (!el.querySelector('table')) continue;
        const style = getComputedStyle(el);
        if (!/(auto|scroll)/.test(style.overflowX)) continue;
        if (el.scrollWidth <= el.clientWidth + 1) continue;
        if (el.getAttribute('aria-label')) continue;
        hallados.push({ visible: el.clientWidth, contenido: el.scrollWidth });
      }
      return hallados;
    });
    expect(anchas, `${ruta.path}: tabla con scroll lateral sin aria-label — ${JSON.stringify(anchas)}`).toEqual([]);
  });
}

/**
 * CLS (Cumulative Layout Shift) por ruta, con el umbral «bueno» de Core Web Vitals.
 *
 * `audit-lighthouse.mjs` ya mide CLS, pero sobre UNA url estática. Esto lo mide por
 * cada ruta de `RUTAS`, con sesión si hace falta — donde Lighthouse no llega sin un
 * guion de navegación aparte.
 */
for (const ruta of RUTAS) {
  test(`${ruta.nombre}: CLS dentro de lo «bueno» (< 0,1)`, async ({ page }) => {
    if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((lista) => {
        for (const entrada of lista.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
          if (entrada.hadRecentInput) continue;
          (window as unknown as { __cls: number }).__cls += entrada.value ?? 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(ruta.path);
    await page.waitForLoadState('networkidle');
    const cls = await page.evaluate(() => Math.round(((window as unknown as { __cls: number }).__cls ?? 0) * 1000) / 1000);
    expect(cls, `${ruta.path}: CLS de ${cls}`).toBeLessThan(0.1);
  });
}
