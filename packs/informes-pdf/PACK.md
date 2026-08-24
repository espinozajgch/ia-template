# Pack · informes-pdf

**Se activa si:** el producto genera PDF que alguien de fuera abre — informes, facturas,
resultados, certificados.

**Sale de dos implementaciones reales:** futbot-v2 (generación con maquetación probada) y
Professional Football Hub (entrega cifrada). Resuelven mitades distintas del mismo problema.

---

## Qué instala

| Fichero | Qué resuelve |
|---|---|
| `huella.mjs` | comparar un PDF contra una referencia, sin comparar bytes |
| `entrega-segura.md` | descifrar al vuelo sin dejar copia en claro |

---

## El problema de probar un PDF

Un PDF **no se puede comparar byte a byte**: lleva la fecha de generación dentro, el orden
de sus objetos internos cambia entre versiones de la librería, y las imágenes no se
reproducen igual en dos máquinas.

Así que la costumbre es no comprobarlo. Y entonces **un fallo de maquetación se descubre
cuando alguien lo abre** — normalmente el cliente.

## La salida: comparar la forma, no el contenido

| Se compara | No se compara |
|---|---|
| número de páginas | los bytes |
| las líneas de texto de cada página | las imágenes |
| cuántos objetos gráficos lleva cada página | la fecha de generación |
| el orden de las secciones | los identificadores internos |

```bash
node agente/packs/informes-pdf/huella.mjs fijar    informe.pdf
node agente/packs/informes-pdf/huella.mjs comparar informe.pdf   # en la puerta
```

> **Verificado:** con la hora del pie cambiada no da falso positivo; al desaparecer una
> fila de una tabla dice cuál, y al perderse una página entera lo dice también. Código 1
> en los dos casos, para que rompa la puerta.

### Dos detalles que lo hacen usable

**Se normaliza lo que varía sin que el documento cambie.** Sin eso la referencia falla
cada día por el pie de página, y una referencia que falla siempre se acaba borrando.

Pero se normaliza **anclando a la línea y conservando su prefijo**, no con expresiones
sueltas. Una expresión como `\d{1,2}:\d{2}` reescribe cualquier cosa con esa forma esté
donde esté —un marcador «1:23», una coordenada—: eso no quita ruido, borra datos, y en
silencio, porque la comparación sigue saliendo verde sobre un documento del que ya no se
mira la mitad.

Y **cada regla lleva su propia marca**. La primera versión de esto en futbot-v2 devolvía
`<fecha>` para todo lo volátil; al añadir la duración se guardó como si fuera una fecha y
la comparación seguía saliendo bien con el nombre equivocado. Lo cazó un test.

**Las líneas se agrupan por posición vertical.** Un PDF no tiene líneas, tiene fragmentos
con coordenadas: sin agrupar, un simple cambio de fuente parte una línea en dos y la
comparación falla sin que nada haya cambiado de verdad.

### La regla que la mantiene honesta

**La referencia se commitea.** Sin ella en el repositorio, nadie ve en el diff que el
informe cambió — que es justo lo que se quería conseguir.

Y si hay que excluir una parte —texto generado por un modelo, por ejemplo— se usa
`--ignorar` y **se dice en la revisión**. Una referencia que tapa en silencio la mitad del
documento no es una red: es un adorno.

---

## Probar la maquetación sin generar el PDF

El otro hallazgo de futbot-v2, y es más barato de lo que parece: **capturar lo que decide
la función de estilo, en vez de mirar el resultado**.

```python
class _TablaFalsa:
    """Recoge el estilo que se le pone, en vez de aplicarlo."""
```

Hace falta porque las librerías de PDF **aplican el estilo y no lo guardan**: una vez
puesto, ya no se puede preguntar qué se pidió, solo qué quedó repartido por dentro.

Su comentario dice lo que de verdad se aprendió, y vale para cualquier función larga:

> *«El coste real de una función de 950 líneas no es que sea larga: es que nada de lo que
> hay dentro se puede probar por separado.»*

---

## La otra mitad: entregar el PDF

Ver [`entrega-segura.md`](entrega-segura.md). Resumen: si el documento es de alguien —una
analítica, una nómina, un informe médico— **no basta con generarlo bien**.

---

## Checklist

- [ ] Hay una referencia de huella por cada informe, **commiteada**
- [ ] La puerta compara contra ella
- [ ] Lo que varía por naturaleza está normalizado, no ignorado
- [ ] Lo que se ignora de verdad está **dicho**, no silenciado
- [ ] La maquetación se prueba sin generar el PDF donde se pueda
- [ ] Si el documento es de alguien, la entrega está resuelta (ver `entrega-segura.md`)
