# Pack · notificaciones

**Se activa si:** el sistema manda algo hacia fuera — correo, notificaciones push,
webhooks, mensajes.

**Sale de** una implementación real que envía correo con reintentos, lista de supresión
alimentada por rebotes y un panel de administración que no filtra datos personales.

---

## Por qué una bandeja y no enviar directamente

Enviar dentro de la petición ata dos cosas que no deberían estar atadas:

- si el proveedor **tarda**, la petición tarda;
- si el proveedor **falla**, la operación del usuario falla — cuando el usuario solo quería
  guardar algo y el correo era un efecto secundario.

Con bandeja, la petición **escribe una fila y termina**. Un worker envía aparte. Un
proveedor caído retrasa el correo; no rompe el producto.

---

## Qué instala

`bandeja.sql` — la tabla, la lista de supresión, y las funciones de encolar, reclamar,
informar y rescatar. **Verificado contra PostgreSQL real**, incluida la concurrencia.

---

## Los cinco mecanismos

### 1 · Clave única: no duplicar en origen

Dos peticiones que encolan «bienvenida a este usuario» producen **una** fila. Es más barato
y más fiable que deduplicar al enviar.

### 2 · Reclamar sin pisarse

`FOR UPDATE SKIP LOCKED`: varios workers tiran de la misma cola sin bloquearse ni repartirse
el mismo mensaje. Sin él, o se serializan (lento) o mandan el mismo correo dos veces.

> Comprobado: dos workers simultáneos pidiendo dos mensajes cada uno se llevaron conjuntos
> **disjuntos**.

### 3 · Testigo de vigencia

Al reclamar, el worker recibe el número de intento. Cuando informa del resultado lo
devuelve, y si **ya no coincide** —porque se quedó colgado, venció el plazo y otro worker
tomó el mensaje— el informe **se descarta**.

Sin esto, un worker rezagado marca como enviado un mensaje que otro está mandando ahora, y
el correo sale dos veces sin que ningún log lo explique.

> Comprobado: A informa con testigo obsoleto → `false`, no toca nada. B informa con el
> vigente → `true`, y el identificador del proveedor que queda es el de B.

### 4 · Rescate de los colgados

Un worker que muere a mitad deja el mensaje en «procesando» **para siempre**.
`rescatar_mensajes()` lo devuelve a la cola pasado un plazo, o lo da por fallido si ya agotó
los intentos.

Sin rescate la cola se degrada sola: cada caída deja mensajes que nadie volverá a tocar, y
nadie se entera porque no hay error — **solo silencio**.

### 5 · Lista de supresión

Direcciones a las que no se vuelve a escribir: rebotes permanentes y quejas de abuso,
alimentadas por el webhook del proveedor.

**Es global, no por cliente, a propósito.** Un buzón que no existe no existe para nadie, y
seguir escribiéndole desde otro cliente hunde la reputación de envío de **todos**.

Se comprueba al encolar **y** el worker vuelve a comprobarla antes de enviar: entre una cosa
y la otra puede haber llegado un rebote.

---

## El panel no puede filtrar lo que la cola guarda

La bandeja contiene direcciones de correo y errores del proveedor, y esos errores traen
dentro lo que el proveedor decidió incluir — a veces un token.

La vista `mensajes_panel` enmascara el destinatario (`ro***@ej.com`) y sanea el error
(`falló para [correo] token=[oculto]`).

Un panel que lista correos completos es una fuga con permisos, y un error sin sanear
arrastra al panel el token que venía en la respuesta.

---

## Lo que hay que decidir

| Decisión | Notas |
|---|---|
| Espera entre reintentos | creciente con *jitter*: sin él, mil mensajes fallidos reintentan a la vez |
| Cuántos intentos antes de rendirse | cinco es razonable; más suele ser insistir con un buzón muerto |
| Cada cuánto corre el rescate | menos que el plazo de abandono |
| Qué datos van en `datos` | se guardan porque el mensaje puede salir mucho después: **se manda lo que era verdad al encolarlo** |
| Si hay varios canales | un worker por canal escala mejor que uno que hace de todo |

---

## Checklist

- [ ] Nada se envía dentro de la petición del usuario
- [ ] Clave única donde el duplicado sería visible para quien lo recibe
- [ ] Reclamo con `SKIP LOCKED`, probado con **dos workers a la vez**
- [ ] Testigo de vigencia comprobado al informar
- [ ] Rescate de colgados, programado
- [ ] Supresión comprobada al encolar **y** antes de enviar
- [ ] El webhook de rebotes alimenta la supresión — y su **firma se verifica**
- [ ] El panel enmascara destinatarios y sanea errores
- [ ] Un fallo del proveedor **no** rompe la operación que originó el mensaje
