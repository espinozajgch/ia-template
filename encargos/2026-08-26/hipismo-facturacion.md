# Encargo · hipismo · facturación fiscal para venta al público

> Para un agente que trabaja **solo en `~/hipismo`** y no ha visto ninguna conversación previa.

## Por qué existe este encargo

Decisión de negocio del propietario, **2026-08-26**: hipismo pasa a **vender al público**.
Hasta ahora cobraba suscripción a empresas y no emitía ningún documento. A partir de esa
venta necesita **emitir factura fiscal venezolana**, que no es una funcionalidad más: es un
requisito legal con forma obligatoria.

Hay una implementación de referencia funcionando en otro repositorio del grupo —`~/pulso`,
migración `db/migrations/006_facturacion_fiscal.sql`— que sigue la **Providencia
SNAT/2011/00071**. Se puede leer, y conviene, pero **no se puede copiar entera**: la mitad
de sus decisiones dependen de que sus receptores sean pacientes de una clínica.

## Estado medido el 2026-08-26

- Rama `main`, árbol limpio, nada sin publicar. **720 pruebas en verde.**
- Express 5 + Prisma + zod. Esquema en `apps/api/prisma/schema.prisma`.
- **Cero modelos de factura.** Lo que hay es la relación comercial en `Company`:
  `plan`, `subscriptionStatus` y `monthlyPriceCents` —congelado por empresa, para no
  cambiarle el precio a quien ya firmó—.
- El aislamiento entre empresas vive **en la aplicación**: 345 usos de `companyId`, cero
  Row Level Security en el esquema. Esto importa para este encargo; ver más abajo.

## El encargo

Emitir factura fiscal venezolana para las ventas al público.

### Lo que se copia de pulso, porque son las cuatro cosas que suelen hacerse mal

1. **La numeración no se reutiliza.** Serie y número consecutivos por emisor. Una factura
   anulada **conserva su número**: por eso las facturas **no se borran nunca**, se marcan
   anuladas con motivo, fecha y autor. Índice único por (emisor, serie, número).

2. **El número de control no lo inventa el sistema.** Lo asigna la **imprenta autorizada**
   en rangos, y cada factura declara de qué rango salió. El rango es su propia tabla con
   `desde`, `hasta` y `siguiente`, y la restricción `siguiente <= hasta + 1` representa
   «agotado» sin necesidad de inventar un estado. Índice único por (emisor, número de
   control).

3. **Los datos del emisor y de la imprenta se copian dentro de cada factura** —razón social,
   RIF, domicilio, providencia de la imprenta y su fecha—. Si mañana cambia el domicilio
   fiscal, **lo ya emitido no se reescribe**. Es la misma regla que hipismo ya aplica al
   congelar `monthlyPriceCents`.

4. **El IVA va por línea, no por factura.** Y la tasa del día se congela en el documento:
   totales en una moneda, los bolívares derivados de la tasa guardada, nunca recalculados.

### Lo que NO se copia, y hay que decidir aquí

- **El consumidor final.** pulso exige `receptor_rif NOT NULL` porque sus receptores son
  pacientes con documento. **Quien compra al público muchas veces no da RIF.** Es el primer
  cambio de modelo y hay que resolverlo antes de escribir el esquema, no después.

- **El IVA deja de ser la excepción.** En pulso el grueso está **exento** —servicios
  médico-asistenciales, LIVA art. 19— así que su alícuota general es el camino menos
  recorrido y menos probado. Aquí será el principal. **No confíes en que esa parte de pulso
  esté bien ejercitada.**

- **El volumen.** Vender al público son muchas facturas pequeñas y los rangos de imprenta se
  consumen deprisa. pulso modela el rango pero **no avisa cuando se está agotando**, y
  quedarse sin números es dejar de poder cobrar. Eso hay que añadirlo: un aviso con margen,
  no un fallo cuando ya no quedan.

- **El aislamiento.** Este módulo va sobre 345 usos de `companyId` en la aplicación. Los
  datos fiscales son donde una fuga entre empresas duele más. Como mínimo: que **ninguna**
  consulta de facturación pueda escribirse sin el filtro, y una prueba que lo compruebe
  recorriendo el código —no confiando en la revisión.

### Lo que NO entra en este encargo

El **documento de cobro de la suscripción** —lo que hipismo le cobra a sus empresas
cliente— es un trabajo distinto y menos urgente. Y la **factura fiscal a esas empresas** es
un tercero que **pulso tampoco tiene**: su tabla lo dice por escrito. No los mezcles.

## Cómo se verifica aquí

```bash
npm test                 # vitest, excluyendo la e2e
npm run typecheck        # los dos paquetes
npm run check:cycles
npm run check:file-size
```

La suite **e2e está excluida a propósito**: exige una base efímera y se niega a correr
contra la de desarrollo porque borra datos. Esa negativa es una guarda, no un fallo — no la
desactives.

Migraciones con Prisma: `npx prisma migrate dev --schema apps/api/prisma/schema.prisma`.

## Reglas que no se negocian

- **No se hace `push` sin autorización explícita** del propietario. Commits locales sí.
- Estás en `main`: **abre una rama antes de tocar código**.
- **Una factura emitida no se modifica ni se borra.** Si algo está mal, se anula con motivo
  y se emite otra. Cualquier diseño que permita editarla está mal, por conveniente que
  parezca.

## Lo que NO debes hacer

- **No inventes números de control.** Vienen de la imprenta autorizada. Un sistema que los
  genera solo produce facturas inválidas con muy buena pinta.
- **No borres facturas** para «limpiar» pruebas ni para corregir. La numeración consecutiva
  es la prueba de que no falta ninguna.
- **No copies el esquema SQL de pulso a Prisma tal cual.** Lo que transfiere es el diseño y
  las cuatro reglas; los tipos, los nombres y las restricciones se escriben en el idioma de
  este repositorio.
- **No toques `apps/api/src/exchange-rates/`** sin leer el módulo entero: ahí hay un arreglo
  de cadena TLS que **nunca** se resuelve con `rejectUnauthorized: false`.
