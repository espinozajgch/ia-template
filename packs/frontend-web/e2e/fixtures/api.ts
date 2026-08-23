/**
 * Simula la red. Toda petición a /api se responde desde aquí.
 *
 * Por qué: un e2e que necesita el backend real solo corre donde está el backend, así que
 * no se corre. Simulada, la suite va en cualquier máquina y en cualquier momento — y por
 * eso puede ser obligatoria antes de cada subida.
 *
 * Y da algo que el backend real no da: poder provocar el 500, el 403 y el timeout a
 * voluntad, que es justo lo que `error-states` necesita.
 */
import { test as base, type Page } from '@playwright/test';

export type Escenario = 'ok' | 'error500' | 'noAutorizado' | 'vacio' | 'lento';

/** AJUSTAR: la forma real de las respuestas de este proyecto. */
const DATOS: Record<string, unknown> = {
  '/api/health':  { ok: true },
  '/api/session': { usuario: { id: 1, nombre: 'Prueba', rol: 'admin' } },
  '/api/items':   { items: [{ id: 1, nombre: 'Primero' }, { id: 2, nombre: 'Segundo' }] },
};

export async function simularApi(page: Page, escenario: Escenario = 'ok') {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const clave = url.pathname;

    if (escenario === 'lento') await new Promise(r => setTimeout(r, 3000));
    if (escenario === 'error500')
      return route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'fallo interno' }) });
    if (escenario === 'noAutorizado')
      return route.fulfill({ status: 403, contentType: 'application/json',
        body: JSON.stringify({ error: 'sin permiso' }) });

    const cuerpo = escenario === 'vacio' ? { items: [] } : (DATOS[clave] ?? {});
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
}

/** Deja la aplicación con sesión iniciada, sin pasar por el formulario en cada test. */
export async function conSesion(page: Page) {
  const { SESION } = await import('../rutas');
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [SESION.clave, SESION.valor]);
}

export const test = base.extend<{ api: void }>({
  api: [async ({ page }, use) => { await simularApi(page, 'ok'); await use(); }, { auto: true }],
});
export { expect } from '@playwright/test';
