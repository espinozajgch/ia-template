/**
 * Cada rol ve lo suyo, y NO alcanza lo ajeno.
 *
 * Ojo con lo que este spec sí y no demuestra: comprueba la interfaz, así que atrapa el
 * caso de «el botón de administración le aparece a quien no debe». **No sustituye a la
 * autorización del servidor**: esconder un enlace no protege nada, porque la URL se
 * escribe a mano.
 *
 * La comprobación de verdad vive en el backend (pack api-backend) y, si hay varios
 * clientes, en la prueba de fuga con base real (pack saas-multitenant). Éste cubre la
 * mitad que se ve.
 */
import { test, expect } from './fixtures/api';
import { ROLES, SESION, SEL } from './rutas';

/** Entra como un rol concreto: la sesión falsa lleva el rol dentro. */
async function comoRol(page: import('@playwright/test').Page, rol: string) {
  await page.addInitScript(([k, v, r]) => {
    localStorage.setItem(k, v);
    localStorage.setItem('rol', r);          // AJUSTAR a cómo guarda el rol la aplicación
  }, [SESION.clave, SESION.valor, rol]);

  await page.route('**/api/session', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ usuario: { id: 1, nombre: `usuario-${rol}`, rol } }),
  }));
}

for (const { rol, ve, noAlcanza } of ROLES) {
  for (const ruta of ve) {
    test(`${rol} entra en ${ruta}`, async ({ page }) => {
      await comoRol(page, rol);
      const r = await page.goto(ruta);
      expect(r?.status(), `${rol} no pudo entrar en ${ruta}`).toBeLessThan(400);
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator(SEL.bannerError)).toHaveCount(0);
    });
  }

  for (const ruta of noAlcanza) {
    test(`${rol} NO alcanza ${ruta}`, async ({ page }) => {
      await comoRol(page, rol);
      // Con la ruta prohibida, el servidor simulado responde 403.
      await page.route('**/api/**', route => {
        const p = new URL(route.request().url()).pathname;
        return p.includes('session')
          ? route.fallback()
          : route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'sin permiso' }) });
      });
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');

      const cuerpo = (await page.locator('body').innerText()).toLowerCase();
      const redirigido = !page.url().includes(ruta);
      const loDice = /sin permiso|no autorizado|acceso denegado|403|no tienes/.test(cuerpo);

      // Cualquiera de las dos vale: llevarlo a otro sitio, o decírselo. Lo que no vale es
      // quedarse en la ruta enseñando la pantalla como si nada.
      expect(redirigido || loDice, `${rol} se quedó en ${ruta} sin aviso ni redirección`).toBe(true);
    });
  }

  test(`${rol} no ve enlaces a lo que no alcanza`, async ({ page }) => {
    if (noAlcanza.length === 0) test.skip(true, 'este rol lo alcanza todo');
    await comoRol(page, rol);
    await page.goto(ve[0]);
    await page.waitForLoadState('networkidle');

    for (const prohibida of noAlcanza) {
      const enlace = page.locator(`a[href="${prohibida}"]`);
      // Enseñar un enlace que lleva a un 403 es una mala experiencia, no un fallo de
      // seguridad. El fallo de seguridad sería que la ruta respondiera.
      await expect(enlace, `${rol} ve un enlace a ${prohibida}`).toHaveCount(0);
    }
  });
}
