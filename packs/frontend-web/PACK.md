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

### Si el proyecto adopta Tailwind sobre un sistema que ya existe

Salió de migrar un SaaS clínico con 3.600 líneas de CSS propio y 453 clases (pulso, 2026-08-23).
Tailwind **no trae un sistema de diseño: adopta el que hay**. Cada utilidad apunta a un token del
producto, así el tema oscuro sigue funcionando sin una sola clase `dark:`.

**Se borran la paleta y los puntos de corte de fábrica.** `--color-*: initial` y
`--breakpoint-*: initial`, y se declaran sólo los del proyecto. Que `bg-blue-500` compile significa
que cualquier pantalla puede inventarse un azul que nadie verificó; que compile `lg:` significa un
punto de corte que nadie decidió. Una regla escrita en un comentario la incumple alguien; una que
no compila, no.

**Sin preflight si el proyecto ya tiene su reinicio.** Se importan `theme` y `utilities` por
separado, nunca el paquete entero: el preflight borra los controles dibujados a mano.

**El orden de capas se declara, y es lo primero que hay que entender.** El CSS **sin capa gana a
cualquier capa**, pase lo que pase con la especificidad. En un proyecto con CSS propio sin capas,
una utilidad de Tailwind no puede con `.panel` — y no da ningún error, simplemente no se aplica.

```
@layer theme, vendor, base, componentes, utilities, contexto;
```

`contexto` es la única capa por encima de `utilities` y es la excepción medida: un contenedor que
debe pisar la apariencia de un componente que no escribe él. **Si lo que hay ahí describe cómo *es*
un componente y no dónde *está*, va en el sitio equivocado.**

### Las cinco trampas de una migración de CSS

Cada una costó un fallo real, y **ninguna dio un error**:

1. **Dos utilidades de la misma propiedad en la misma capa: decide el orden de emisión, no el orden
   en que las escribes.** `border-transparent` en la base y `border-<color>` en la variante dejó
   todos los botones secundarios sin filete. Una propiedad se declara en un solo sitio del
   componente.
2. **Subir una regla de capa cambia contra qué gana.** Llevar `.campo input { width: 100% }` al
   componente la pasó a `utilities` y empezó a ganarle a `.sr-only` y a `input[type="color"]`: un
   control oculto se estiró a 298 px. Antes de mover una regla, buscar **qué la pisaba y qué pisaba
   ella**.
3. **Una clase puede ser un gancho de posición, no de apariencia.** Si veinte reglas colocan `.btn`
   desde fuera —`.panel > .btn`, `.form-actions .btn`—, eso es del contenedor. Borrar la clase las
   rompe en silencio. Se conserva hasta que el contenedor esté migrado.
4. **Lo que no se puede etiquetar en el sitio de uso se alcanza por dato.** Un contenedor que recibe
   componentes como `children` no puede ponerles una clase: el componente publica
   `data-variante`. Un nombre de clase lo mueve la siguiente migración; el dato no.
5. **No toda hoja se carga en toda página.** Una regla que parece global puede vivir en la hoja del
   portal y no en la del acceso. Comprobar qué hojas entran en cada ruta antes de borrar nada.

### Verificar una migración de estilos

**Comparar capturas no sirve.** Se midió: tres capturas de la misma página, en el mismo Chromium sin
cabeza, sin tocar nada, dan tres hashes y tres tamaños distintos. Con eso, 120 de 123 pantallas
salen «cambiadas» y la red no vale nada.

Lo que sí es exacto es lo que el navegador calcula. [`regresion-visual.mjs`](regresion-visual.mjs)
toma una **huella estructural** —caja y estilo computado de cada elemento visible— de cada pantalla
y compara dos corridas. Comprobado determinista: tres tomas, 415 elementos, 0 diferencias. Y dice
**qué propiedad cambió en qué elemento**, que es lo que hace falta, no un porcentaje de píxeles.

```bash
node agente/packs/frontend-web/regresion-visual.mjs capturar antes
# …se migra…
node agente/packs/frontend-web/regresion-visual.mjs capturar despues
node agente/packs/frontend-web/regresion-visual.mjs comparar antes despues
```

Se captura con `reducedMotion: "reduce"`: la caja de un elemento animado o rotado depende del
fotograma, y sin eso salen diferencias en cada corrida sin que nada haya cambiado.

**Y una expectativa que conviene corregir antes de empezar:** migrar primitivas **no encoge el
CSS**. En pulso, botón y campo cubrían 531 sitios de uso y su CSS eran 43 declaraciones: el neto fue
−52. El peso de una hoja está en las **clases de un solo uso** —eran 323 de 453—, que es donde se
acumula sin dar nada a cambio. Medir el éxito en líneas borradas lleva a migrar lo que no toca.

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
