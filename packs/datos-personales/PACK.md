# Pack · datos-personales

**Se activa si:** el sistema guarda datos de personas. Casi siempre.

**Sale de** el único proyecto de la cantera con esto resuelto: 5 documentos de
clasificación, 89 ficheros con supresión o anonimización, 14 con exportación. De los otros
tres, dos tienen **cero** — y uno de ellos es una aplicación clínica.

---

## Qué instala

| Fichero | Qué es |
|---|---|
| `knowledge/wiki/inventario-datos-personales.md` | el documento a rellenar; lo instala el pack |
| `clasificacion.mjs` | comprueba que el inventario no se queda atrás |

---

## Por qué un inventario, y no solo buenas intenciones

Sin él **no se puede responder** a quien pida sus datos, ni borrarlos, ni saber qué se
filtró si algo se filtra. En la mayoría de jurisdicciones es obligación legal, con plazos.

Pero el motivo práctico es otro: un inventario que se escribe una vez y no se comprueba
**caduca en tres semanas**, en cuanto alguien añade una tabla. Por eso el pack trae el
detector.

```bash
node agente/packs/datos-personales/clasificacion.mjs --estatico   # sobre las migraciones
node agente/packs/datos-personales/clasificacion.mjs              # contra la base viva
```

Señala columnas que parecen datos personales y no están declaradas, entradas del inventario
que ya no existen, y el texto libre.

> **Medido sobre una aplicación clínica real sin inventario:** 40 columnas sospechosas en
> 15 tablas, incluidas `historias_clinicas.alergias` y `.medicamentos` —categoría especial—
> y 18 columnas de texto libre.

---

## La idea que más rinde: reglas de salida por canal

Clasificar no sirve de nada por sí solo. Lo que importa es **qué puede salir por cada
salida**, y que sea verificable:

| Canal | S4 · S3 | S2 · S1 |
|---|---|---|
| registros | prohibido | permitido |
| modelos de lenguaje externos | prohibido | según contrato |
| analítica de terceros | prohibido | pseudonimizado |
| copias de seguridad | permitido, cifrado, con retención declarada | permitido |

Y para que la primera fila sea verdad y no un deseo, la redacción tiene que ser **central**
— la trae el pack `observabilidad`.

### Tres reglas para quien escribe registros

1. **El dato va en el contexto, nunca interpolado en el mensaje.** La redacción opera sobre
   claves, no sobre texto.
2. **Nunca volcar una entidad entera ni un cuerpo de petición.** La lista de redacción es
   una red, no una licencia.
3. Al añadir un término, **comprobar la sobre-redacción**: uno corto puede vaciar campos
   legítimos.

---

## Las trampas, que son lo que un detector nunca ve

Están en la plantilla como lista para marcar. Las que más aparecen:

**El borrado lógico conserva el dato.** Una fila «borrada» retiene todo. La supresión real
necesita anonimizar — y hay que comprobar **qué tablas no toca** el anonimizador, que suele
ser más de las que uno cree.

**Los derivados heredan la clasificación.** Un vector calculado sobre texto sensible es
sensible. No son «solo números», y esa frase es exactamente cómo se cuelan.

**El texto libre es un sumidero.** En `notas` y `observaciones` acaba cualquier cosa: un
diagnóstico, un teléfono, la vida de alguien.

**Un clasificador por tipo se pierde lo importante.** Dinero guardado como texto porque el
criterio es lenguaje natural; un campo `referencia` que guarda un documento.

**Las copias de seguridad tienen su propia retención.** Borrar de la base no borra de las
copias, y ese plazo hay que declararlo.

---

## Lo que este detector NO puede hacer

Adivinar. Va por **nombre de columna**: sirve para que el inventario no se quede atrás
cuando alguien añade una tabla. **Clasificar lo hace una persona**, y las trampas de arriba
son exactamente lo que ninguna herramienta va a ver por ti.

---

## Checklist

- [ ] Existe el inventario, y `clasificacion.mjs` pasa
- [ ] Las tablas **sin** datos personales están listadas explícitamente
- [ ] Cada dato tiene nivel, base legal y **retención**
- [ ] Los derechos del titular tienen implementación, o se dice que van a mano y con qué plazo
- [ ] Las reglas de salida por canal están escritas y son verificables
- [ ] La redacción en registros es central — pack `observabilidad`
- [ ] Las trampas de la plantilla, revisadas una a una
- [ ] Si hay menores, el tratamiento reforzado está resuelto
