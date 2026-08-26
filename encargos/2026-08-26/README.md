# Encargos del 2026-08-26

| Proyecto | Encargo | Estado |
|---|---|---|
| [hipismo](hipismo-facturacion.md) | Factura fiscal venezolana para venta al público | ✅ **hecho** — rama `facturacion/venta-al-publico` |

## Cómo quedó

**El receptor se identifica por cédula**, como decidió el propietario. El tipo de documento
va aparte del número porque el prefijo es parte de la identidad, y se admite `J` porque
tarde o temprano compra una empresa. Es obligatorio: aquí no se factura a quien no se
identifique.

**Las reglas viven en la base**, no en zod: rango coherente con «agotado» expresado como
`siguiente = hasta+1`, tasa positiva, anular exige motivo y fecha, una línea exenta no puede
llevar IVA. Y una factura no se borra — lo impide un disparador, no una costumbre.

**El número se asigna bajo bloqueo.** `SELECT … FOR UPDATE` sobre la fila del rango, el
primer bloqueo explícito del repositorio. Tres emisiones en paralelo se llevan 1, 2, 3.

**El aviso llega antes de agotarse**, no al agotarse: conseguir un rango nuevo depende de
una imprenta y tarda días.

**34 pruebas nuevas**, y la puerta entera del proyecto en verde: 723 unitarias y 793 e2e.

## El documento imprimible — hecho el 2026-08-26

El PDF con la forma que exige la Providencia SNAT/2011/00071, generado en el servidor con
`pdfkit`: `GET /api/v1/facturas/:id/documento.pdf`.

**Está partido en dos a propósito.** `documento.ts` es puro —qué va impreso y qué campo
obligatorio falta— y `documento-pdf.ts` sólo dibuja. Las dos mitades fallan de formas
distintas: que falte un campo es incumplimiento, que salga en el sitio equivocado es
maquetación. Juntas, la única prueba posible sería mirar el papel.

**Se comprueba leyendo el PDF de verdad**, con el mismo `pdfjs-dist` que el proyecto ya usa
para los programas oficiales. Un campo que se calcula pero no se dibuja no lo detecta
ninguna prueba del modelo.

**PDF de servidor y no una página para imprimir**: un HTML con hoja de impresión sale
distinto según el navegador y sus márgenes, y esto se archiva por años.

**Un documento incompleto se genera igual, y lo dice** — en el propio papel y en la cabecera
`X-Factura-Incompleta`. Negarse a imprimir una factura ya emitida no la des-emite: deja al
cliente sin papel y el problema sin resolver.

**Faltaba un dato y sólo apareció al ponerlo en el papel:** la factura congelaba el número de
la providencia de la imprenta pero no su fecha, y la providencia exige los dos. Migración
`20260826180000_fecha_de_la_providencia_en_la_factura`.

**+41 pruebas** (19 del modelo, 17 del PDF leído, 5 contra la base) y la puerta en verde.

## Lo que quedó fuera, y sigue pendiente

  · El **documento de cobro de la suscripción** —lo que hipismo le cobra a sus empresas—.
  · La **factura fiscal a esas empresas**, que pulso tampoco tiene y su propio esquema lo
    dice por escrito.

Los cinco encargos anteriores están en [`../2026-08-25/`](../2026-08-25/) y **ya no están
vigentes**: cuatro se cerraron —tres los cerró otra sesión— y el de pulso caducó. El estado
de cada uno, con quién lo resolvió, está en su propio índice.
