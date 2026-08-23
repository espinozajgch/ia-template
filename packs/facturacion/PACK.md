# Pack · facturacion

**Se activa si:** el producto emite facturas, recibos o documentos con numeración fiscal.

**Sale de dos implementaciones reales:** laboratorio (Venezuela — Providencia SNAT, IVA
16/8, tratamientos exento/general/reducida) y ppsport (Argentina — IVA 21 %, retención,
varias entidades emisoras). Lo que aparecía en las **dos** es el núcleo de este pack; lo
que cambiaba entre ellas es configuración.

---

## Qué instala

| Fichero | Qué es |
|---|---|
| `calculo.ts` | el cálculo completo, puro y sin dependencias · **25 tests** |
| `calculo.test.ts` | los dos regímenes reales, más los casos que rompen |
| `series.sql` | numeración correlativa atómica e inmutabilidad de lo emitido |

---

## Las cuatro reglas

### 1 · Una sola fuente de los importes

Cliente y servidor llaman a la **misma** función. Dos implementaciones del mismo cálculo
divergen en el redondeo, y el día que un total no cuadra con la suma de sus líneas nadie
sabe cuál de las dos mintió.

### 2 · Se redondea por línea, no al final

Lo exigen casi todos los regímenes, y además es lo que hace que la factura impresa cuadre:
**el lector suma las líneas que ve, no los decimales que no ve.** Tres líneas de 0,335 al
16 % dan 0,15 de impuesto redondeando por línea y 0,16 redondeando al final; el cliente que
suma lo impreso obtiene 0,15 y tiene razón.

### 3 · Lo emitido no se recalcula

Una factura **guarda** sus importes, su desglose y su tasa de cambio. Que la alícuota o la
tasa cambien mañana no puede alterar lo ya emitido: eso no es recalcular, es falsificar un
documento.

`series.sql` lo impone con un trigger, no con una convención: intentar cambiar el total o
las líneas de una factura emitida da error. Se corrige emitiendo otra —nota de crédito o
rectificativa, según el régimen—, nunca editando la original.

### 4 · El correlativo lo asigna la base, no la aplicación

Es lo único de una factura que **no se puede arreglar después**. Un salto o un duplicado es
un problema con la administración tributaria, no un fallo de software, y no hay migración
que lo repare: los documentos ya se emitieron.

Cualquier variante de «leer el último y sumar uno» en el código tiene una carrera: dos
peticiones simultáneas leen el mismo último y emiten el mismo número. Con poco tráfico
tarda meses en aparecer, **y aparece**.

```sql
SELECT app.siguiente_correlativo('SDG', 2026);
```

Una sola sentencia que crea la serie si es el primer documento del año, incrementa y
devuelve el número, con la fila bloqueada hasta el fin de la transacción.

> Verificado con **20 procesos simultáneos** sobre la misma serie: 20 números distintos,
> sin huecos ni repetidos. Y dos entidades emisoras avanzan por separado sin colisionar.

---

## Lo que es configuración, no estructura

Esto es lo que aprendimos de tener dos regímenes delante:

| Cambia entre países | Se declara en |
|---|---|
| Los porcentajes y qué tratamientos existen | `ConfiguracionFiscal.alicuotas` |
| Si hay retención y cómo se llama | `ConfiguracionFiscal.retencion` |
| Cómo se llama el identificador fiscal (RIF, CUIT, NIF, RFC) y su forma | `FORMATOS` |
| Decimales del importe | `ConfiguracionFiscal.decimales` |
| El ancho del correlativo y el formato del número | `numeroVisible`, `numeroControl` |

Y lo que **no** cambia: línea → tratamiento → base → impuesto → totales, el desglose por
alícuota que pide cualquier libro de ventas, y la serie correlativa.

### La retención se calcula sobre la base, no sobre el total

El error clásico. El cliente retiene una parte de lo que te debe **por el servicio** y la
ingresa en tu nombre; el impuesto repercutido no se toca. Sobre 1.000 + 21 % con retención
del 6 %: se retienen 60, no 72,60.

---

## Doble moneda

El importe canónico vive en una moneda y **cada documento guarda la tasa con la que se
convirtió**. Si se recalculara, la factura de marzo cambiaría de importe en abril y el
cliente tendría razón al quejarse.

En `series.sql` la conversión se congela en cuatro columnas: `moneda_base`,
`moneda_destino`, `tasa` y `fecha_tasa`.

---

## Sobre los dígitos de control del identificador fiscal

`calculo.ts` valida la **forma** y no el dígito verificador, a propósito. Un verificador
escrito de memoria rechaza identificadores válidos —que es el fallo caro, porque bloquea a
un cliente real— mientras que uno mal tecleado se descubre en el primer trámite.

Si lo implementas, confirma el algoritmo con la fuente oficial del país y añádelo como
`FormatoFiscal.verificar`.

> **Esto no es asesoría fiscal.** Los requisitos de cada régimen —qué debe aparecer en el
> documento, qué plazos, qué libros— se confirman con un asesor del país antes de emitir a
> un contribuyente real. El pack resuelve la mecánica, no la norma.

---

## Instalación

```bash
cp agente/packs/facturacion/calculo.ts      src/lib/
cp agente/packs/facturacion/calculo.test.ts src/lib/
psql "$DATABASE_URL" -f agente/packs/facturacion/series.sql   # ajusta el esquema antes
```

---

## Checklist antes de emitir en producción

- [ ] El cálculo lo hace **una** función, llamada desde cliente y servidor
- [ ] El correlativo lo asigna la base en la misma transacción que crea la factura
- [ ] Probado con varias peticiones simultáneas: sin huecos ni repetidos
- [ ] Los importes se guardan; ninguna pantalla los recalcula al leer
- [ ] La tasa de cambio queda congelada en el documento
- [ ] Una factura emitida no se puede editar ni borrar — comprobado con el trigger puesto
- [ ] La corrección se hace emitiendo el documento que exija el régimen, no editando
- [ ] Los requisitos del país, confirmados con un asesor
