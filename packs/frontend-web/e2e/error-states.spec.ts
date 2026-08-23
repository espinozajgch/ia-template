/**
 * Cuando la API falla, ¿la interfaz lo cuenta — y lo cuenta donde se oye?
 *
 * Esta es la familia que los tests unitarios nunca ven, porque el componente sí renderiza
 * su mensaje: lo que falla es que el mensaje no llega al lector de pantalla, o que el
 * fallo se convierte en un «no hay resultados» que parece correcto.
 *
 * Ese último caso es el más caro de todos: nadie investiga una pantalla vacía.
 */
import { test, expect, simularApi, conSesion } from './fixtures/api';
import { SEL } from './rutas';

test('un 500 se anuncia, no se traga', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, 'error500');
  await page.goto('/dashboard');

  // role="alert" no es decoración: es lo que hace que un lector de pantalla lo lea sin
  // que el usuario tenga que ir a buscarlo.
  const alerta = page.locator(SEL.bannerError);
  await expect(alerta.first()).toBeVisible({ timeout: 10_000 });

  const texto = (await alerta.first().textContent())?.trim() ?? '';
  expect(texto.length, 'la alerta está vacía').toBeGreaterThan(3);
  // Un mensaje que enseña el error crudo del servidor filtra detalle interno.
  expect(texto).not.toMatch(/stack|traceback|at \w+\.\w+|ECONNREFUSED|psql|drizzle/i);
});

test('un fallo NO se disfraza de resultado vacío', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, 'error500');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const cuerpo = (await page.locator('body').textContent())?.toLowerCase() ?? '';
  const pareceVacio = /no hay (resultados|datos|elementos)|sin resultados|lista vacía|nada que mostrar/.test(cuerpo);
  const hayAlerta = await page.locator(SEL.bannerError).count() > 0;

  // Con la API caída, decir «no hay datos» es mentir: nadie va a investigar.
  expect(pareceVacio && !hayAlerta, 'un error 500 se muestra como "no hay datos"').toBe(false);
});

test('un 403 no deja la pantalla en blanco', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, 'noAutorizado');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const visible = (await page.locator('body').innerText()).trim();
  expect(visible.length, 'un 403 dejó la pantalla en blanco').toBeGreaterThan(20);
});

test('mientras carga hay señal, y desaparece', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, 'lento');
  const ir = page.goto('/dashboard');
  // Una espera de tres segundos sin señal parece que la aplicación se colgó.
  await expect(page.locator(SEL.cargando).first()).toBeVisible({ timeout: 2_000 });
  await ir;
  await expect(page.locator(SEL.cargando)).toHaveCount(0, { timeout: 15_000 });
});

test('el estado vacío legítimo se distingue del error', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, 'vacio');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  // Sin datos de verdad: se explica, y NO se muestra como alerta de error.
  await expect(page.locator(SEL.bannerError)).toHaveCount(0);
  expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(20);
});
