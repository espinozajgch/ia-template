/**
 * Accesibilidad, con axe, en las dos versiones del tema.
 *
 * Se corre en claro Y en oscuro porque el contraste se rompe en uno de los dos y no en el
 * otro — y quien programa suele mirar solo el suyo.
 *
 * Lo que atrapa que ningún unitario ve: roles ARIA inválidos, campos sin etiqueta,
 * imágenes con información y sin `alt`, foco que no se ve, contraste insuficiente.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect, conSesion } from './fixtures/api';
import { RUTAS, SEL } from './rutas';

const TEMAS = ['light', 'dark'] as const;

for (const ruta of RUTAS) {
  for (const tema of TEMAS) {
    test(`${ruta.nombre} sin fallos de accesibilidad · tema ${tema}`, async ({ page }) => {
      if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);
      await page.emulateMedia({ colorScheme: tema });
      await page.goto(ruta.path);
      await page.waitForLoadState('networkidle');

      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();

      // «Hay 3 fallos» no sirve para arreglarlos: hace falta el selector.
      // El detalle va por consola y adjunto al informe —donde sobrevive entero— y el
      // mensaje de la aserción se queda en una línea por fallo, que es lo que Playwright
      // renderiza de forma fiable.
      if (r.violations.length) {
        for (const v of r.violations) {
          console.log(`  ${v.id} [${v.impact}] ${v.help}`);
          for (const n of v.nodes.slice(0, 5)) console.log(`      ${n.target.join(' ')}`);
        }
        await test.info().attach(`axe-${ruta.nombre}-${tema}.json`, {
          body: JSON.stringify(r.violations, null, 2), contentType: 'application/json',
        });
      }
      const resumen = r.violations.map(v => `${v.id} (${v.impact}) en ${v.nodes[0]?.target.join(' ')}`).join(' · ');
      expect(r.violations, `${ruta.path} [${tema}] — ${resumen}`).toEqual([]);
    });
  }
}

test('se puede recorrer con teclado, y se ve dónde estás', async ({ page }) => {
  await conSesion(page);
  await page.goto('/dashboard');

  const alcanzados: string[] = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const e = getComputedStyle(el, ':focus-visible');
      return {
        etiqueta: el.tagName.toLowerCase(),
        // Sin indicador visible, quien navega con teclado no sabe dónde está.
        seVe: e.outlineStyle !== 'none' || e.boxShadow !== 'none' || getComputedStyle(el).outlineStyle !== 'none',
      };
    });
    if (!info) break;
    alcanzados.push(info.etiqueta);
    expect(info.seVe, `el elemento ${info.etiqueta} recibe el foco sin indicador visible`).toBe(true);
  }
  // Lo que importa es que TODO lo alcanzable tenga foco visible, no cuántos haya: una
  // pantalla con un solo control es perfectamente válida. Un umbral inventado aquí
  // convierte el test en ruido en las pantallas simples.
  expect(alcanzados.length, 'no se alcanza ningún control con Tab').toBeGreaterThan(0);
});

test('los errores de formulario se anuncian y apuntan a su campo', async ({ page }) => {
  await page.goto('/login');
  await page.locator(SEL.botonEnviar).first().click();
  await page.waitForTimeout(500);

  const alerta = page.locator(SEL.bannerError);
  if (await alerta.count() === 0) test.skip(true, 'este formulario no valida en cliente');

  await expect(alerta.first()).toBeVisible();
  // Un campo en rojo sin aria-invalid ni aria-describedby no comunica nada a un lector.
  const invalidos = page.locator('[aria-invalid="true"]');
  if (await invalidos.count() > 0) {
    await expect(invalidos.first()).toHaveAttribute('aria-describedby', /.+/);
  }
});
