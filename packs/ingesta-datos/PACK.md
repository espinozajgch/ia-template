# Pack · ingesta-datos

**Se activa si:** el sistema trae datos de fuera —webs, ficheros, APIs de terceros— y los
tiene que convertir en registros propios.

**Sale de dos implementaciones reales:** hipismo (cuatro webs que publican resultados
hípicos, a veces contradiciéndose) y futbot-v2 (datos de partidos de un proveedor). Los dos
llegaron por su cuenta a la misma forma, y eso es la mejor señal de que la forma es
correcta.

---

## Qué instala

| Fichero | Qué resuelve |
|---|---|
| `identidades.ts` | ¿son la misma entidad dos nombres de fuentes distintas? · **puro** |
| `consenso.ts` | ¿a qué fuente se cree cuando se contradicen? · **puro** |
| `ingesta.test.ts` | 29 tests, incluidos los casos que rompen |

---

## La forma: parsear y traer son dos cosas

```
scrape(entrada)          →   parse(contenido)        →   persistir(normalizado)
  toca la red                  PURO, sin red              toca la base
  no se puede probar           se prueba con un            se prueba con base
  sin conexión                 fichero guardado            efímera
```

**El parser no toca la red ni la base.** Recibe el contenido y devuelve datos tipados. Esa
separación es lo que permite guardar la página de un día raro —el que traía la tabla
partida, el que llevaba una columna de más— y tener un test que lo reproduce para siempre.

Cuando el parser y la descarga están mezclados, arreglar un caso raro exige volver a
pedirle a la web que se comporte raro. Suele no volver a pasar hasta el día del incidente.

```ts
// bien: se prueba con un fichero
export function parsearResultados(html: string): Resultado[] { … }

// aparte: lo que toca el mundo
export async function traerResultados(url: string) {
  const html = await descargar(url);
  return parsearResultados(html);
}
```

### Guarda lo que trajiste

El contenido crudo, con su fecha y su origen. Cuando dentro de tres meses un dato salga
raro, la pregunta será «¿lo parseamos mal o vino mal?», y sin el crudo no hay forma de
responderla.

---

## Cotejo de identidades

El problema: la misma persona escrita de cuatro maneras en cuatro fuentes.

### La postura, que es lo que hay que entender antes de tocar los umbrales

Las reglas son **deliberadamente conservadoras**. Fusionar dos entidades distintas corrompe
el histórico **en silencio** y es casi imposible de deshacer; dejar un duplicado solo lo
fragmenta, se ve enseguida y se arregla después.

**Ante la duda, no se fusiona.**

### Los homóglifos: el fallo que no se ve

Hay letras griegas y cirílicas **exactamente idénticas** a las latinas. Un nombre con una
alfa griega dentro parece igual y es distinto para la máquina, así que la misma persona
queda en dos fichas y nadie entiende por qué.

Pasa más de lo que parece: copiar desde un PDF, un teclado con otra distribución, o una web
que mezcla alfabetos en su plantilla. `normalizar()` los pliega.

### Iniciales: la asimetría que importa

«PÉREZ J» y «PÉREZ JUAN» son la misma persona: la inicial es **compatible** con la palabra.
«PÉREZ J» y «PÉREZ LUIS» no lo son: la inicial **contradice**.

Una fuente que abrevia no está diciendo algo distinto; una que da otra inicial sí.

### Calificadores entre paréntesis

«ACME» y «ACME (ES)» coinciden. «ACME (ES)» y «ACME (MX)» **no**: ahí las fuentes están
afirmando cosas distintas, y creerles a las dos es inventar.

### El plan de fusión pasa por una persona

`planificarFusiones()` devuelve un **plan**, no lo aplica. Conserva el candidato con más
registros —mover pocos a muchos rompe menos referencias— y con empate el nombre más largo,
que suele ser el completo y no el abreviado.

Aplicarlo sin revisión es cómo se corrompe un histórico. Una pantalla que enseñe el plan,
con cuántos registros mueve cada fusión, cuesta poco y evita el desastre.

---

## Consenso entre fuentes

Cuando varias publican el mismo hecho y se contradicen, el orden de las reglas es:

1. **Lo oficial manda.** Tres periódicos coincidiendo no cambian lo que publicó el
   organismo.
2. **Mayoría ponderada por confianza.** Dos lecturas de un OCR borroso no valen más que un
   CSV limpio, aunque sean dos.
3. **Empate → la fuente más fiable, y se marca conflicto igualmente.** Un empate real
   significa que el dato no está claro, aunque haya que elegir uno para seguir.

### La regla que sostiene todo lo demás

**Un conflicto no resuelto se marca, no se esconde.**

Elegir en silencio entre dos valores que se contradicen produce un dato que parece firme y
no lo es, y nadie vuelve a mirarlo. Marcarlo cuesta una revisión; esconderlo cuesta poder
confiar en todo lo demás.

`reconciliar()` devuelve el registro **y la lista de campos en disputa** — no «este
registro tiene un problema», sino cuál y entre qué valores.

---

## Lo que hay que decidir en cada proyecto

| Decisión | Por qué es tuya |
|---|---|
| Qué fuente es «oficial» | depende del dominio, y a veces no hay ninguna |
| La confianza de cada fuente | se ajusta viendo cuántas veces acierta, no de entrada |
| Cuántas coincidencias bastan | dos con cuatro fuentes es distinto de dos con dos |
| Cada cuánto se ingiere | y qué pasa si dos ejecuciones se solapan — ver el pack `bot-automatizacion` |

---

## Checklist

- [ ] El parser es **puro** y se prueba con un fichero guardado, sin red
- [ ] El contenido crudo se guarda con su origen y su fecha
- [ ] La ingesta es idempotente: correrla dos veces no duplica
- [ ] Ejecuciones solapadas contempladas (cerrojo, o diseño que lo tolere)
- [ ] Las identidades se cotejan con reglas conservadoras, y las fusiones las revisa alguien
- [ ] Los conflictos entre fuentes se **marcan** y hay dónde verlos
- [ ] Una fuente que cambia de formato **falla ruidosamente**, no devuelve cero resultados
      en silencio — ese es el fallo que tarda semanas en descubrirse
