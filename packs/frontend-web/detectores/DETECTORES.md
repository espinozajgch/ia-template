# Detectores de ratchet — catálogo probado

> El kit trae el motor (`agente/tools/ratchet.sh`). Esto son los **detectores**: los ocho
> comandos que de verdad encuentran cada problema, sacados de un proyecto que lleva meses
> conviviendo con ellos.
>
> Instálalos con `detectores.sh instalar`. Cada uno acepta lo que hay hoy y solo prohíbe
> que empeore.

---

## Por qué un trinquete y no una regla

Un repositorio real llega con 340 colores crudos. Prohibirlos de golpe bloquea el trabajo
el primer día, así que la regla se desactiva y deja de medir. El trinquete acepta los 340 y
falla en el 341. La deuda deja de crecer sin que nadie tenga que pararlo todo.

**Un detector solo entra si su ausencia se puede demostrar con un comando.** Si el problema
no se puede detectar, no es un ratchet: es una regla de revisión, y va al `PACK.md`.

---

## Los ocho

| # | Ratchet | Qué atrapa | Por qué duele |
|---|---|---|---|
| 1 | `colores` | `#hex`, `rgb()`, `bg-white`, `text-gray-*` | el color crudo no responde al tema oscuro y nadie vuelve a buscarlo |
| 2 | `sombras` | `box-shadow:`, `shadow-sm/md/lg/xl` | cinco elevaciones distintas en la misma pantalla |
| 3 | `inputs-nativos` | `<input>` `<select>` `<textarea>` fuera de los componentes propios | foco, error y estado deshabilitado distintos en cada formulario |
| 4 | `radios` | `rounded-lg` en controles interactivos | la esquina del botón deja de coincidir con la del campo |
| 5 | `componentes-esquivados` | markup que reimplementa a mano un componente del sistema | dos tablas que se parecen y se comportan distinto |
| 6 | `loc` | archivos que crecen | el componente dios y el router dios |
| 7 | `literales-i18n` | texto visible sin pasar por la traducción | la pantalla que solo existe en un idioma |
| 8 | `supresiones` | `@ts-nocheck`, `: any`, `# type: ignore` | el tipado se erosiona en silencio |

---

## Los comandos

Ajusta rutas y extensiones a tu proyecto. **Corre cada uno a mano antes de fijarlo** y mira
lo que devuelve: un detector que encuentra 4.000 ocurrencias está mal escrito, no es que el
proyecto esté mal.

### 1 · colores

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(bg|text|border)-(white|black|gray|slate|zinc|neutral|stone)-[0-9]{2,3}\b' \
  src/ --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.css' \
  | grep -vE '(tokens|theme|variables|design-system)\.(css|ts)'
```

> Excluye el fichero donde los tokens **se definen** — ahí los valores crudos son lo correcto.

### 2 · sombras

```bash
grep -rnE 'box-shadow:|(^|[ "'"'"'])shadow-(sm|md|lg|xl|2xl)\b' src/ --include='*.tsx' --include='*.css'
```

### 3 · inputs-nativos

```bash
grep -rnE '<(input|select|textarea)[ >]' src/ --include='*.tsx' \
  | grep -vE 'src/(components/ui|design-system|shared/form)/'
```

> La segunda mitad es la que importa: los nativos **dentro** del sistema de diseño son
> justo donde deben estar.

### 4 · radios en controles interactivos

```bash
grep -rnE 'rounded-lg[^"'"'"']*' src/ --include='*.tsx' \
  | grep -E '<(button|a |input|select)|role="(button|tab|menuitem)"'
```

### 5 · componentes esquivados

Uno por componente compartido que quieras proteger. El patrón: buscar el markup que lo
reimplementa a mano.

```bash
# ejemplo: tablas que no usan el contenedor propio
grep -rn '<table' src/ --include='*.tsx' | grep -v 'TableShell\|DataTable'
# ejemplo: pestañas hechas a mano
grep -rn 'role="tablist"' src/ --include='*.tsx' | grep -v 'SegmentedTabs'
```

### 6 · loc

```bash
# usa el verificador dedicado, que además detecta ficheros nuevos grandes
node agente/tools/tamano.mjs validate src
```

### 7 · literales sin traducir

```bash
# texto visible con acentos del idioma base dentro del JSX
grep -rnE '>[^<>{}]*[áéíóúñÁÉÍÓÚÑ¿¡][^<>{}]*<' src/ --include='*.tsx'
# y los atributos que casi siempre se olvidan
grep -rnE '(placeholder|title|aria-label|alt)="[^"{]*[a-záéíóúñ]{4,}[^"]*"' src/ --include='*.tsx'
```

> Ajusta los acentos a tu idioma base. Para proyectos en inglés, el detector útil es el
> segundo: atributos con texto literal en vez de una llamada a la traducción.

### 8 · supresiones de tipo

```bash
grep -rnE '@ts-nocheck|@ts-ignore|:\s*any\b|# type: ignore|//\s*nolint|eslint-disable(-next)?-line' \
  src/ server/ --include='*.ts' --include='*.tsx' --include='*.py'
```

---

## Instalación

```bash
bash agente/packs/frontend-web/detectores/detectores.sh instalar   # fija todas las líneas base
bash agente/packs/frontend-web/detectores/detectores.sh validar    # las comprueba todas
```

Y en el `package.json`, para que la puerta los incluya:

```jsonc
"scripts": {
  "ratchets": "bash agente/packs/frontend-web/detectores/detectores.sh validar",
  "quality:check": "npm run lint && npm run ratchets && npm run build && npm run coverage"
}
```

---

## La regla que los mantiene honestos

Un ratchet que falla por crecimiento **deliberado y aceptado** se re-baseliniza, y el
commit dice por qué. **Nunca se re-baseliniza para esconder un descuido**: el día que eso
se normaliza, el ratchet deja de medir nada y solo queda el ruido.

Y el camino completo, que es a donde va todo esto:

```
hallazgo → patrón con ID AP-* → detector → ratchet → la regresión es imposible
```

Ahí es donde una lección deja de necesitar que alguien la recuerde.
