# Pack · frontend-web

**Se activa si:** hay interfaz de usuario en navegador — SPA, SSR, panel, sitio público.

**Prompts:** `DESIGN_PROMPT.md`
**Fuente de verdad que exige:** `knowledge/wiki/product-design.md` relleno (no NO APLICA).

---

## Reglas

### Tokens, no valores crudos

En el código no hay colores, sombras, radios ni espaciados literales. Solo tokens de
`product-design.md`. **Lo que entra crudo se queda para siempre**: nadie vuelve a buscar un
`#3b82f6` seis meses después.

### Los controles nativos se envuelven una vez

`<input>`, `<select>`, `<textarea>`, `<button>` sueltos por la aplicación garantizan que el
foco, el error y el estado deshabilitado se comporten distinto en cada pantalla. Se
envuelven en componentes propios y **fuera de ellos no se usan**.

### Estados obligatorios en todo control

reposo · hover · **foco visible** · activo · deshabilitado · cargando · error.
El foco visible es el que siempre falta y el que rompe la navegación por teclado.

### Nada depende solo del color

Un estado comunicado únicamente por color no existe para quien no lo distingue. Icono,
texto o forma, además.

### El error se anuncia

Banner con `role="alert"`, campo con `aria-describedby` apuntando al mensaje. Un error que
solo se pinta en rojo no lo recibe un lector de pantalla.

### 320 px es el ancho de prueba

Es donde se rompe todo lo que en un portátil parece correcto: tablas, barras de
herramientas, modales con el teclado abierto. Se prueba ahí, no en el monitor del que
programa.

### Claro y oscuro, los dos

Un token definido solo dentro de un `@media (prefers-color-scheme: dark)` es un token que
falta en el otro tema. Paleta completa en la raíz; en el bloque oscuro **solo** se
redefine.

---

## Ratchets

Los ocho detectores ya escritos y probados están en
[`detectores/DETECTORES.md`](detectores/DETECTORES.md), con el comando exacto de cada uno y
por qué duele lo que atrapan.

```bash
bash agente/packs/frontend-web/detectores/detectores.sh instalar   # fija las líneas base
bash agente/packs/frontend-web/detectores/detectores.sh validar    # las comprueba
```

Y en `package.json`, para que entren en la puerta:

```jsonc
"ratchets": "bash agente/packs/frontend-web/detectores/detectores.sh validar"
```

---

## La suite e2e

Los cinco specs están escritos, no solo nombrados:
[`e2e/README.md`](e2e/README.md). Cada uno cubre una familia de fallo que los otros no ven
— `app-smoke`, `error-states`, `wcag`, `mobile-smoke`, `rbac` — y la red se simula, así que
corren en cualquier máquina sin tocar el backend.

```bash
cp -r agente/packs/frontend-web/e2e ./e2e
npm i -D @playwright/test @axe-core/playwright && npx playwright install chromium
```

## Puerta de calidad — lo que este pack añade

- **Build completo**, no solo chequeo de tipos.
- **axe** sobre las páginas principales, en claro y oscuro, con `wcag2a wcag21aa`.
- **E2E con la red simulada**, corriendo en local antes de cualquier commit que se vaya a
  subir. Si tocaste un componente compartido, un fixture o un banner de error: **se vuelve
  a correr aunque los unitarios pasen.**

---

## Checklist antes de dar por hecho

- [ ] Sin valores crudos nuevos — ratchets sin subir
- [ ] Los siete estados del control, incluido foco visible
- [ ] Teclado: se llega a todo, en orden lógico, y se ve dónde estás
- [ ] Contraste 4.5:1 texto / 3:1 bordes interactivos — medido
- [ ] 320 px sin desbordes horizontales
- [ ] Claro y oscuro
- [ ] `features.md` y `product-design.md` actualizados en este mismo commit
