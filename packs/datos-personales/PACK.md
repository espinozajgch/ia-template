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
| `bitacora.sql` | la tabla de auditoría sólo-añadir (ver § Bitácora) |

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

## Bitácora: quién hizo qué, y que nadie pueda reescribirlo

`bitacora.sql` — la tabla de auditoría en PostgreSQL, idempotente y probada contra una base
real (acepta `INSERT`; rechaza `UPDATE`, `DELETE` y `TRUNCATE`).

A 2026-09-28 había cuatro bitácoras en cuatro proyectos y ninguna tenía todo. Esta reúne
lo mejor de cada una:

| Regla | De dónde | Por qué |
|---|---|---|
| **Misma transacción** que el cambio | Pulso, futbot-web-app | Si el cambio se deshace, su evento también: no queda constancia de algo que no ocurrió. Un registro que «si falla, se anota en el log y se sigue» pierde justo los eventos de los días malos. |
| **Sólo se añade**: `REVOKE` y disparador | hipismo | El `REVOKE` ata a la aplicación; el disparador sobrevive a la migración futura que conceda de nuevo `UPDATE/DELETE` a todas las tablas de una pasada. Un registro que el registrado puede editar no registra nada. |
| `TRUNCATE` con **su propio disparador** | — | Los disparadores de fila no lo detienen. Ninguna de las cuatro lo cubría. |
| **Actor copiado** en la fila | Pulso | Si la cuenta se renombra o cambia de rol, el evento sigue diciendo quién era. Un `JOIN` reescribiría la historia con el presente. |
| **Antes y después**, ya tachados | Pulso · hipismo | Sin el antes no se sabe qué cambió. Contraseñas, testigos y claves se tachan en la aplicación antes de escribir. |
| **Catálogo cerrado de acciones** | hipismo | Un mapa `{nombre: {objeto, accion}}` en el código: una acción mal escrita no compila, en vez de crear una categoría nueva en silencio. |
| Petición y **huella** de la sesión | Pulso | Enlaza el evento con el log de la petición sin guardar el testigo. |

Purgar por retención se hace como propietario y en tres órdenes deliberadas; están al pie
de `bitacora.sql`.

**Si la bitácora ya existe y la aplicación la modifica.** Al adoptarla sobre una tabla
viva aparecen casos legítimos que el disparador rechazaría. El disparador no se relaja: se
nombra cada caso con su forma exacta, y lo demás se sigue rechazando. Estos son los que
aparecieron al adoptarla en futbot-web-app y ElevenOffice (2026-09-28):

- **FK `ON DELETE SET NULL`** hacia usuarios: borrar la cuenta hace que Postgres anule la
  columna con un `UPDATE`. Se admite ese `UPDATE` y sólo ese: las columnas de la FK pasan a
  `NULL` y nada más cambia. Salió en los dos proyectos. Búscalo antes de instalar.
- **Anonimización RGPD** del actor: se admite el `UPDATE` que deja la PII con sus valores
  anónimos exactos, sin tocar qué pasó, sobre qué ni cuándo. A medias, se rechaza.
- **Purgas que declara la propia transacción** (`set_config(..., true)`): la de una empresa
  (qué empresa) y la de retención (qué ventana, con un suelo en el disparador). Una purga
  sin declarar, o de otra empresa, se rechaza.

Cada caso lleva su prueba contra una base real, porque un mock no ejercita un disparador.

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
- [ ] Bitácora: en la transacción del cambio, sólo-añadir con disparador (también `TRUNCATE`), actor copiado

## Lo que se le debe al usuario, y no está en el esquema

El inventario y los derechos son la mitad de dentro. La de fuera son tres páginas que casi
siempre se dejan para el final y entonces se escriben mal:

- **Política de privacidad** — qué se recoge, para qué, cuánto se conserva y con quién se
  comparte. Sale del inventario: si el inventario está bien, esto se redacta leyéndolo.
- **Términos y condiciones** — accesibles ANTES de registrarse, no después de aceptar.
- **Banner y consentimiento de cookies** — sólo si hay cookies que lo exijan, sin patrón
  oscuro, y **revocable tan fácil como se dio**. Nada no esencial se carga antes del
  consentimiento: un banner que aparece después de haber cargado la analítica no consiente
  nada, sólo lo documenta.

Las tres van en el checklist de preproducción, puerta G9.
