# Pack · tasas-de-cambio

**Se activa si:** el producto muestra o calcula importes en más de una moneda y necesita una
tasa oficial — precios de referencia, coste de inventario, facturación, informes.

> Destilado de la integración con el **Banco Central de Venezuela** de hipismo, que lleva en
> producción desde el 2026-07-31. Lo que está aquí funcionó allí; lo que costó un día
> averiguar está escrito, que es la única forma de que no cueste otro día en el proyecto
> siguiente.

---

## Qué instala

```text
provider.ts       el PUERTO: el contrato del que depende todo lo demás
validation.ts     las reglas que deciden qué se guarda, antes de tocar la base
bcv-tls.ts        el arreglo de la cadena TLS incompleta del BCV
bcv-parser.ts     lectura del HTML público, anclada al código de moneda
*.test.ts         las pruebas de las tres piezas puras
```

Los cuatro son **independientes del framework**: solo usan `node:https`, `node:tls`,
`node:crypto` y `cheerio`. Lo que NO viaja —el almacén, el trabajo programado y las rutas—
es lo que está atado al ORM y al servidor de cada proyecto, y se escribe allí contra el
puerto.

---

## Lo primero: no hay API

El BCV **no publica una API**. Se lee su HTML. Todo lo demás de este pack sale de aceptar
eso y hacerlo bien, en vez de fingir que es un servicio.

De ahí salen las dos decisiones que sostienen el diseño:

**El puerto tiene dos errores distintos, no uno.** `ExchangeRateFetchError` es «no llegué al
origen» —red, tiempo agotado, código HTTP—. `ExchangeRateStructureError` es «llegué, y ya no
se parece a lo que esperaba». Confundirlos hace que un rediseño de la página se reporte como
caída de red y se reintente cien veces en vez de avisar a una persona.

**El parser no se ancla en clases CSS.** Cambian con cada rediseño. El anclaje es el **código
de moneda** —`USD`, `EUR`—, que es el dato que la página tiene que mostrar sí o sí para
significar algo; desde él se sube al contenedor y se busca el número. Y es una función pura:
recibe HTML, devuelve tasas. Así se prueba el caso real, el borde y el cambio de estructura
**sin tocar la red**, que es donde de verdad se rompe un scraper.

---

## Las tres reglas que cuestan un día cada una

### 1 · No se apaga la verificación TLS. Nunca.

El BCV publica una **cadena TLS incompleta**: su certificado lo emite una CA cuyo intermedio
el servidor no adjunta. El navegador y `curl` funcionan porque el sistema operativo guarda
intermedios ya vistos; Node solo trae raíces, así que falla con *«unable to verify the first
certificate»*.

El atajo que aparece en todas las respuestas de internet es `rejectUnauthorized: false`. Eso
no arregla el certificado: **abre el proceso entero a un intermediario**, y para leer un dato
público se acepta que cualquiera pueda suplantar cualquier destino TLS de la aplicación.

`bcv-tls.ts` hace lo correcto: aporta el intermedio que el servidor omite —tomado de la URL
que el propio certificado declara en su extensión *Authority Information Access*— y deja que
la cadena se valide como cualquier otra. La huella SHA-256 del intermedio está escrita en el
fichero: si algún día no coincide, se entera.

### 2 · Una variación diaria grande es un error de lectura hasta que se demuestre lo contrario

`MAX_DAILY_CHANGE_RATIO = 0.3` **no es un límite de negocio**. Es un detector: un punto
decimal mal interpretado multiplica o divide por cien, y eso salta aquí antes de llegar a la
base.

Una devaluación real de más del 30 % en un día también se marca, y **es correcto que lo
haga**: se prefiere una revisión humana a publicar un dato inventado. En un país con
inflación alta esto se va a disparar de verdad alguna vez; que se dispare es el diseño, no un
fallo.

### 3 · Tres tiempos distintos, y ninguno sustituye a otro

| Campo | Qué responde |
|---|---|
| `effectiveDate` | para qué **día rige** la tasa |
| `publishedAt` | cuándo lo **publicó el origen**, si lo indica |
| `retrievedAt` | cuándo lo **leímos nosotros** |

Colapsarlos en una fecha parece inofensivo y no lo es: sin los tres no se puede responder «con
qué publicación se hizo esta conversión», que es justo la pregunta que llega meses después,
cuando alguien discute un importe histórico.

Y `rawHash` —huella del fragmento del que se extrajo— distingue **releer** de **cambiar**. Sin
él, cada lectura parece un dato nuevo y el histórico se llena de ruido.

---

## Atribución: es obligatoria y va en el código

`provider.ts` la lleva como constante de primera clase, no como comentario:

```ts
export const SOURCE_DISCLAIMER =
  "Esta API no está afiliada ni respaldada por el Banco Central de Venezuela. "
  + "Únicamente consume información pública publicada por dicho organismo.";
```

El dato no es tuyo. Se consume información pública y hay que decirlo donde el usuario lo vea,
no en un README. Si el producto expone las tasas por su propia API, el aviso viaja con ellas.

---

## Lo que hay que escribir en cada proyecto

Contra el puerto, con el ORM y el servidor de casa:

- **Almacén** — histórico por moneda y día. La clave natural es `(moneda, fecha efectiva)`, y
  una relectura con el mismo `rawHash` **no** crea fila nueva.
- **Origen manual** — segundo proveedor, `MANUAL`, para cuando el BCV no responde o publica
  tarde. El puerto ya distingue la fuente; sin esta salida, un día sin tasa bloquea la
  operación entera.
- **Trabajo programado** — con bitácora de cada intento, y sin reintentar en bucle un
  `ExchangeRateStructureError`: eso es trabajo para una persona.
- **Exposición** — la tasa que se guarda va con todos sus decimales (el BCV publica ocho);
  redondear es cosa de la presentación. Cualquier cálculo parte del valor guardado, nunca del
  texto formateado.

---

## Checklist de cierre

- [ ] Ningún módulo de negocio importa el adaptador: todos dependen del puerto.
- [ ] `rejectUnauthorized` no aparece en el repositorio.
- [ ] El parser se prueba con HTML guardado, sin red — incluido un caso de estructura rota.
- [ ] Una tasa inválida se rechaza y se registra; nunca llega a pantalla como `Infinity`,
      `NaN` ni cero.
- [ ] `effectiveDate`, `publishedAt` y `retrievedAt` se guardan por separado.
- [ ] La atribución se muestra donde el usuario ve la tasa.
- [ ] Existe una vía manual para el día en que el origen no responda.
