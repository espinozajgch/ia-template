# Pack · i18n

**Se activa si:** la interfaz se muestra en más de un idioma, o va a mostrarse.

**Prompts:** `I18N_PROMPT.md`

---

## Reglas

### Ningún texto visible sin pasar por la función de traducción

Incluye lo que siempre se olvida: `placeholder`, `title`, `aria-label`, `alt`, textos de
error, opciones de un desplegable, unidades, y el contenido generado en el servidor.

### Paridad de claves, verificada por la puerta

Una clave que existe en un idioma y no en otro produce, según la librería, o el nombre
crudo de la clave en pantalla o una excepción. Se comprueba automáticamente, no a ojo.

### La frase no se construye por concatenación

`"Tienes " + n + " mensajes"` no se puede traducir a un idioma con otro orden ni con otras
reglas de plural. Interpolación con parámetros y plurales de la librería.

### Fecha, número y moneda se formatean por locale

Nunca a mano. El separador decimal, el orden de la fecha y el símbolo de moneda cambian, y
un `.` por una `,` en un importe es un error de dinero.

### El idioma no decide la lógica

Ninguna comparación contra un texto traducido. El estado se compara contra su código.

---

## El validador

Tres comprobaciones en un comando, sobre ficheros `.json`, `.ts` o `.js`:

```bash
node agente/packs/i18n/validar-i18n.mjs todo        # paridad + variante + formato
```

| Comprobación | Qué atrapa |
|---|---|
| **paridad** | claves que faltan o sobran, y las idénticas al idioma base que parecen sin traducir |
| **variante** | la variante regional prohibida (por defecto voseo → tuteo neutro) |
| **formato** | interpolaciones que no cuadran entre idiomas |

> Un aviso sobre expresiones regulares y acentos: en JavaScript `\w` es `[A-Za-z0-9_]`, así
> que **las vocales acentuadas no son caracteres de palabra** y `\bimportá\b` casa dentro
> del portugués «Importáveis». El validador cierra con `(?![\wáéíóúüñ])`, y acota cada
> variante a los idiomas a los que pertenece.

## Ratchet

```bash
# Texto con acentos españoles en JSX fuera de t(...) — ajustar al idioma base del proyecto
agente/tools/ratchet.sh baseline literales-i18n \
  "grep -rnE '>[^<>{}]*[áéíóúñÁÉÍÓÚÑ][^<>{}]*<' src/ --include=*.tsx"
```

---

## Checklist

- [ ] Todo texto nuevo pasa por la función de traducción, atributos incluidos
- [ ] Paridad de claves entre **todos** los idiomas — comprobada por comando
- [ ] Sin concatenación de frases; plurales por la librería
- [ ] Fechas, números y monedas formateados por locale
- [ ] Ninguna comparación lógica contra texto traducido
- [ ] El idioma más largo no rompe la interfaz (el alemán suele ser el que la rompe)
