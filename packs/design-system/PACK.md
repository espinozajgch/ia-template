# Pack · design-system

**Se activa si:** el proyecto tiene interfaz y va a tener más de diez pantallas.

**Sale de** el sistema de diseño más maduro de la cantera —15 componentes y 812 líneas de
documentación—, con los tokens renombrados a genéricos y sin la deuda que arrastraba.

---

## Tres capas, y la de arriba sirve a todos

| Capa | Qué es | A quién sirve |
|---|---|---|
| **El catálogo y las reglas** | qué piezas hacen falta, qué debe hacer cada una, los siete estados | cualquier interfaz, en cualquier framework |
| **Implementaciones de referencia** (`react/`) | los componentes, sobre tokens CSS · **20 tests** | React |
| **Los detectores** | los ocho ratchets del pack `frontend-web` | cualquiera, ajustando rutas |

La separación importa: la **regla** «todo campo va envuelto en algo que asocie etiqueta,
error y control» vale en Vue, Svelte o plantillas de servidor. El **código** solo vale para
quien comparta stack.

---

## La idea que sostiene todo el pack

**La accesibilidad se pone de fábrica, no se recuerda.**

```tsx
<Envoltorio etiqueta="Fecha de nacimiento" error={errores.fecha}>
  <Entrada type="date" />
</Envoltorio>
```

Ese envoltorio inyecta solo el `id`, el `htmlFor`, el `aria-invalid` y el
`aria-describedby`, y pinta el error en un `role="alert"`. **Quien escribe el formulario no
necesita saber qué es `aria-describedby`.**

El proyecto del que sale pasó de **cero** ocurrencias de `aria-invalid` a todas, y no fue
formando al equipo: fue haciendo que el camino fácil fuera el correcto. Ahí está la
diferencia entre una regla y un mecanismo — una regla se olvida, un mecanismo no.

---

## El catálogo: quince piezas

Todo lo demás se construye encima. Si algo no se puede hacer con estas quince, falta una
pieza: se añade **al catálogo**, no a la pantalla.

| Pieza | Qué resuelve | Lo que casi siempre falta |
|---|---|---|
| **Envoltorio de campo** | etiqueta + control + ayuda + error, asociados | que el error esté en `role="alert"` |
| **Entrada** | texto, número, fecha | 44 px de alto y foco visible |
| **Área de texto** | texto largo | que crezca a lo alto y no a lo ancho |
| **Selector** | elegir de una lista | el teclado completo, si no es el nativo |
| **Casilla / Opción** | sí-no, y una de varias | que el texto sea parte del área pulsable |
| **Fichero** | subir algo | el control real oculto pero enfocable |
| **Botón** | acción | distinguir la primaria de las demás, y el estado cargando |
| **Distintivo** | estado de una fila | que no dependa solo del color |
| **Avatar** | identidad | las iniciales cuando no hay imagen |
| **Modal** | interrumpir | atrapar el foco, y devolverlo al cerrar |
| **Menú** | acciones secundarias | el patrón de botón de menú, con teclado |
| **Pestañas** | agrupar sin navegar | flechas para moverse, no solo tabulador |
| **Envoltorio de tabla** | el contenedor canónico | que desborde **él**, no la página |
| **Ordenación** | ordenar columnas | `aria-sort`, que nadie pone |
| **Estado vacío** | no hay datos | distinguir «no hay» de «falló» |
| **Aviso** | confirmar que algo pasó | que se anuncie sin robar el foco |

> Son dieciséis contando el envoltorio de campo aparte de la entrada: la lista importa
> menos que la costumbre de mirarla antes de escribir un componente nuevo.

---

## Los siete estados

Todo control los tiene, y se comprueban en este orden porque es el orden en que se olvidan:

**reposo · hover · foco visible · activo · deshabilitado · cargando · error**

El **foco visible** es el que siempre falta, y es el que decide si la aplicación se puede
usar con teclado. Va con `:focus-visible` y no con `:focus`: el ratón no debe dejar el
anillo puesto.

---

## Las reglas

### Nada de controles nativos sueltos

Si en la aplicación hay `<input>` o `<select>` fuera de estos componentes, cada formulario
acaba con su propio foco, su propio error y su propio deshabilitado. El detector
`inputs-nativos` vigila exactamente eso.

### El color nunca comunica solo

Un campo inválido cambia **el grosor del borde**, no solo su color. Un distintivo de estado
lleva texto o forma además de color. Hay quien no distingue el rojo del verde, y hay quien
lo imprime en blanco y negro.

### El nativo, si te sirve, se usa

`Selector` existe porque un `<select>` nativo no se puede estilar igual entre navegadores.
Ese es el motivo real y conviene decirlo: el nativo trae gratis el teclado, el anuncio y el
comportamiento en móvil. **Sustituirlo cuesta 180 líneas** — este pack las trae, pero si el
nativo encaja, es mejor.

Lo que **nunca** vale es la tercera vía: un `<div onClick>`. No es operable con teclado y no
existe para un lector de pantalla.

### 44 píxeles

El alto mínimo de cualquier cosa pulsable. Lo que con el ratón funciona, con el pulgar
falla — y el usuario no sabe por qué.

### El catálogo se documenta o se reinventa

Sin un documento que diga **cuándo** usar cada pieza, la pantalla número cincuenta se
escribe su propio modal. El proyecto de origen tiene 812 líneas de documentación para 15
componentes: parece mucho hasta que ves las pantallas.

---

## Qué instala en `react/`

| Fichero | Qué trae |
|---|---|
| `campos.tsx` | `Envoltorio`, `Entrada`, `AreaTexto`, `Casilla`, `Opcion`, `Fichero` |
| `selector.tsx` | el combobox WAI-ARIA completo |
| `campos.test.tsx` | **20 tests**, todos sobre el cableado de accesibilidad |
| `../estilos.css` | los tokens y las clases, con tema oscuro |

**Los 14 pares de contraste se verificaron con su mínimo real**: 4,5:1 en texto y **3:1 en
bordes de control**, en los dos temas. Ese 3:1 es la razón de que `--ds-borde` parezca más
oscuro de lo habitual: el gris claro de costumbre se queda en 1,35:1 y deja el campo
invisible para quien tiene poca visión.

---

## Lo que se dejó fuera a propósito

**Las clases de un framework de utilidades.** El original tenía `text-text-primary` 17
veces y `border-surface-border` 22: copiarlo era adoptar su nomenclatura de tokens, que es
una decisión de proyecto, no una descarga gratis. Aquí van variables CSS, que se mapean a
Tailwind si lo usas y funcionan solas si no.

**Los `eslint-disable` de la regla de hooks.** El original tenía cuatro, por usar nombres en
minúscula dentro de un objeto. Aquí los componentes se declaran con mayúscula y la regla no
protesta.

**El modal con 158 clases en línea.** Buena pieza, mala plantilla: era la más difícil de
adaptar de las quince. Está en el catálogo como regla; la implementación es tuya.

---

## Un fallo que apareció al portarlo

El selector original recoge sus opciones con `Children.toArray`, que **no desenvuelve un
fragmento**. Si las opciones llegan dentro de `<>…</>` —lo natural cuando se guardan en una
variable— ve un solo hijo y la lista sale vacía, **sin ningún error**: todo parece bien y no
funciona nada.

La versión de aquí atraviesa fragmentos, y hay un test que lo cubre. El original sigue
teniendo ese límite.

---

## Instalación

```bash
cp -r agente/packs/design-system/react/* src/components/ui/
cp    agente/packs/design-system/estilos.css src/estilos-base.css
npm i -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Y los detectores, que son los que impiden que esto se erosione:

```bash
bash agente/packs/frontend-web/detectores/detectores.sh instalar
```

---

## Checklist

- [ ] Ningún `<input>`, `<select>` ni `<textarea>` fuera de los componentes base
- [ ] Todo campo dentro de un envoltorio que asocie etiqueta, ayuda y error
- [ ] Los siete estados en cada control, empezando por el foco visible
- [ ] Ningún estado comunicado **solo** por color
- [ ] 44 px de alto en todo lo pulsable
- [ ] Contraste 4,5:1 en texto y **3:1 en bordes de control**, en los dos temas
- [ ] Un documento que diga cuándo usar cada pieza
- [ ] Los ocho detectores instalados y en la puerta de calidad
