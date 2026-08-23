/**
 * ¿Carga lo principal?
 *
 * El test más barato y el que más despliegues rotos ha atrapado: un bundle que no se
 * sirve, una ruta que dejó de existir, un import que solo falla en producción. No prueba
 * lógica — prueba que la aplicación existe.
 */
import { test, expect, conSesion } from './fixtures/api';
import { RUTAS, SEL } from './rutas';

for (const ruta of RUTAS) {
  test(`carga ${ruta.nombre} (${ruta.path})`, async ({ page }) => {
    if ('requiereSesion' in ruta && ruta.requiereSesion) await conSesion(page);

    // Cualquier error de consola es una pista de algo roto que la pantalla no cuenta.
    const errores: string[] = [];
    page.on('pageerror', e => errores.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });

    const respuesta = await page.goto(ruta.path);
    expect(respuesta?.status(), `${ruta.path} devolvió ${respuesta?.status()}`).toBeLessThan(400);

    // Que haya contenido, no solo un <div id="root"> vacío: un fallo de arranque de
    // JavaScript devuelve 200 con la página en blanco.
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    // Nada debe quedarse cargando para siempre.
    await expect(page.locator(SEL.cargando)).toHaveCount(0, { timeout: 10_000 });

    expect(errores, `errores de consola en ${ruta.path}`).toEqual([]);
  });
}

test('la navegación principal lleva a alguna parte', async ({ page }) => {
  await conSesion(page);
  await page.goto('/dashboard');
  const enlaces = page.locator(`${SEL.navPrincipal} a[href^="/"]`);
  const n = await enlaces.count();
  expect(n, 'no hay navegación principal').toBeGreaterThan(0);

  for (let i = 0; i < Math.min(n, 5); i++) {
    const href = await enlaces.nth(i).getAttribute('href');
    if (!href || href.startsWith('#')) continue;
    const r = await page.goto(href);
    expect(r?.status(), `el enlace ${href} lleva a un ${r?.status()}`).toBeLessThan(400);
  }
});
