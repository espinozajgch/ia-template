# La suite canónica — cinco specs

> El workflow `e2e.yml` los nombraba y no existían. Aquí están.
>
> Cinco ficheros, **cada uno cubre una familia de fallo que los otros no ven**. No es una
> lista arbitraria: sale de las regresiones que de verdad se colaron en estos proyectos.

| Spec | La familia de fallo que atrapa |
|---|---|
| `app-smoke` | la pantalla no carga, la ruta no existe, el bundle se rompió al desplegar |
| `error-states` | la API falla y la interfaz no lo cuenta, o lo cuenta donde nadie lo oye |
| `wcag` | roles inválidos, contraste, foco, `alt`, formularios sin etiqueta |
| `mobile-smoke` | desborde horizontal, área táctil pequeña, el teclado tapa el botón |
| `rbac` | un rol ve o hace lo que no le toca |

## La regla que los hace útiles

**La red se simula.** `fixtures/api.ts` intercepta todo `/api`, así que la suite no toca
el backend ni la base de datos: se puede correr en cualquier máquina, en cualquier momento,
y por eso es obligatoria **en local** antes de subir.

Un e2e que necesita levantar producción para correr es un e2e que nadie corre.

## Instalación

```bash
cp -r agente/packs/frontend-web/e2e ./e2e
npm i -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

`playwright.config.ts`, con lo mínimo que importa:

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,       // un .only olvidado deja de gatear el resto
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil',      use: { ...devices['Pixel 7'] }, testMatch: /mobile-.*\.spec\.ts/ },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
});
```

```jsonc
"e2e": "playwright test"
```

## Una trampa que cuesta media hora

`reuseExistingServer: true` reutiliza **cualquier** servidor que ya escuche en ese puerto.
Si tienes otro proyecto corriendo en el 5173, la suite se ejecuta contra **esa** aplicación
y los fallos no tienen ningún sentido. Pasó al validar estos specs.

Usa un puerto propio del proyecto, y `false` en la integración continua.

## Qué ajustar

Los cinco specs leen `e2e/rutas.ts`: **es el único fichero que hay que tocar** para
adaptarlos. Rutas, roles y selectores en un sitio.

## Verificado

Los cinco specs se ejecutaron contra una aplicación mínima: **23 pasan, 0 fallan**. Y al
introducir fallos a propósito los detectaron —contraste insuficiente solo en tema oscuro,
`h1` fuera de un landmark, indicador de carga sin `aria-busy`—, que es la mitad que
importa: un test que no falla nunca no está probando nada.

## Y la regla operativa

Si tocaste un componente compartido, un fixture o un banner de error, **se re-corre la
suite aunque los unitarios pasen**. Varias regresiones de accesibilidad se colaron
exactamente por saltarse ese paso.
