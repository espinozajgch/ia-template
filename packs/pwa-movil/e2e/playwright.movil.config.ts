/**
 * Configuración de las pruebas móviles, aparte de las de escritorio.
 *
 * ── Por qué construye en producción ──────────────────────────────────────────
 *
 * `npm run build && npm run preview`, no el servidor de desarrollo. En desarrollo **el
 * service worker no se registra** en la mayoría de configuraciones, así que toda la suite
 * de PWA pasaría sin probar nada: los tests estarían verdes y la aplicación instalada
 * seguiría rota.
 *
 * Es más lento. Es la única forma de que signifique algo.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /(pwa|mobile-).*\.spec\.ts/,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,   // el build entra en este tiempo
  },
});
