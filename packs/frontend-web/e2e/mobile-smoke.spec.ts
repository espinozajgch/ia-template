/**
 * Móvil de verdad: 320 px, área táctil y teclado virtual.
 *
 * Corre con el proyecto `movil` de playwright.config (ver el README del pack).
 *
 * 320 px es donde se rompe todo lo que en un portátil parece correcto. Y el teclado
 * virtual, que ocupa media pantalla, es lo que deja el botón de enviar fuera de vista —
 * un fallo que no se ve nunca desde el escritorio.
 */
import { test, expect, conSesion } from './fixtures/api';
import { RUTAS, SEL } from './rutas';

const ESTRECHO = { width: 320, height: 640 };
const CON_TECLADO = { width: 320, height: 350 };   // el teclado se come el resto

for (const ruta of RUTAS) {
  test(`${ruta.nombre} no desborda a 320 px`, async ({ page }) => {
    if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
    await page.setViewportSize(ESTRECHO);
    await page.goto(ruta.path);
    await page.waitForLoadState('networkidle');

    const desborde = await page.evaluate(() => {
      const d = document.documentElement;
      if (d.scrollWidth <= d.clientWidth) return null;
      // Señalar QUÉ desborda: «la página desborda» no se puede arreglar.
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
        const r = el.getBoundingClientRect();
        if (r.right > d.clientWidth + 1 && r.width > 20) {
          return { culpable: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
                   ancho: Math.round(r.width), sobra: Math.round(r.right - d.clientWidth) };
        }
      }
      return { culpable: '(no identificado)', ancho: d.scrollWidth, sobra: d.scrollWidth - d.clientWidth };
    });
    expect(desborde, `${ruta.path} desborda horizontalmente: ${JSON.stringify(desborde)}`).toBeNull();
  });
}

/**
 * Las áreas táctiles, en TODAS las pantallas y TODOS los anchos.
 *
 * Medirlo en una sola pantalla es lo que produce el falso aprobado: en un proyecto real,
 * comprobar solo la de acceso dejó pasar **seis controles** —de 36, 38, 38, 40, 42 y 42
 * píxeles— repartidos por las otras dieciséis pantallas. El proyecto declaraba 44 px y lo
 * exigía en una de diecisiete.
 *
 * El coste de la matriz completa es tiempo de ejecución. El de medir una pantalla es creer
 * que está resuelto.
 */
const ANCHOS = [320, 390, 430];

for (const ruta of RUTAS) {
  for (const ancho of ANCHOS) {
    test(`áreas táctiles · ${ruta.nombre} a ${ancho} px`, async ({ page }) => {
      if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
      await page.setViewportSize({ width: ancho, height: 780 });
      await page.goto(ruta.path);

      // Que la pantalla haya pintado algo SUYO antes de medir. Un esqueleto vacío da
      // cero controles pequeños y un aprobado que no significa nada — y `networkidle`
      // no basta: la red puede estar quieta con la pantalla todavía en blanco.
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 });

      const medidas = await page.evaluate(() => {
        const pequenos: { que: string; w: number; h: number }[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, summary, [role="button"], [role="tab"]'))) {
          const r = el.getBoundingClientRect();
          // Lo que no se ve no se pulsa: un menú cerrado no cuenta.
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < 44 || r.height < 44) {
            pequenos.push({
              que: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30),
              w: Math.round(r.width), h: Math.round(r.height),
            });
          }
        }
        return pequenos.slice(0, 10);
      });

      // Lo que con el ratón funciona, con el pulgar falla — y el usuario no sabe por qué.
      expect(medidas, `controles por debajo de 44 px en ${ruta.path} a ${ancho} px`).toEqual([]);
    });
  }
}

test('con el teclado abierto, el botón de enviar sigue alcanzable', async ({ page }) => {
  await page.setViewportSize(CON_TECLADO);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const campo = page.locator('input').first();
  if (await campo.count() === 0) test.skip(true, 'no hay formulario aquí');
  await campo.focus();

  const boton = page.locator(SEL.botonEnviar).first();
  await expect(boton).toBeVisible();
  // Puede quedar fuera de la ventana, pero tiene que poder llegarse por scroll.
  await boton.scrollIntoViewIfNeeded();
  await expect(boton).toBeInViewport();
});
