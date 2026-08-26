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

## Lo que quedó fuera, y sigue pendiente

  · El **documento de cobro de la suscripción** —lo que hipismo le cobra a sus empresas—.
  · La **factura fiscal a esas empresas**, que pulso tampoco tiene y su propio esquema lo
    dice por escrito.
  · La **impresión** del documento: el PDF con la forma que exige la providencia.

Los cinco encargos anteriores están en [`../2026-08-25/`](../2026-08-25/) y siguen vigentes.
